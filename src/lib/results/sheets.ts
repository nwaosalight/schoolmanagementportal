import { doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Actor } from '@/lib/auth/auth-provider';
import { newId, rowsCol, sc, sd, sheetSub } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { addNotifications, uidsWithRoles } from '@/lib/notify';
import { gradeFor, sumScores } from '@/lib/grading';
import type { Allocation, Band, Component, Doc, GradingScheme, ResultStatus, Row, Sheet, Stats, Structure, Student, Subject } from '@/types';

export const sheetId = (t: string, a: string, s: string) => `${t}_${a}_${s}`;
export const EDITABLE: ResultStatus[] = ['DRAFT', 'RETURNED'];

export class ConflictError extends Error {
  constructor(public studentIds: string[]) { super('Another user changed these rows. Reload and try again.'); }
}

export function sheetStats(rows: Pick<Row, 'total' | 'flag' | 'scores'>[], passMark: number, components: Component[]): Stats {
  const counted = rows.filter((r) => r.flag === 'NONE' && r.total != null);
  const totals = counted.map((r) => r.total as number);
  const blanks = rows.filter((r) => r.flag === 'NONE' && components.some((c) => r.scores[c.code] == null)).length;
  return {
    studentCount: rows.length,
    classAverage: totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100 : null,
    highest: totals.length ? Math.max(...totals) : null,
    lowest: totals.length ? Math.min(...totals) : null,
    passRate: totals.length ? Math.round((totals.filter((t) => t >= passMark).length / totals.length) * 1000) / 10 : null,
    blanks,
  };
}

export function studentsForSubject(students: Doc<Student>[], subject: Doc<Subject> | undefined) {
  return students.filter((s) => s.status === 'ACTIVE' && (subject?.type !== 'ELECTIVE' || (s.electives ?? []).includes(subject.id)));
}

const newRow = (s: Doc<Student>) => ({
  studentId: s.id, name: `${s.lastName} ${s.firstName}`, admissionNumber: s.admissionNumber, scores: {}, flag: 'NONE',
  total: null, grade: null, remark: null, position: null, version: 1, updatedAt: serverTimestamp(),
});

/** Creates the sheet (snapshotting grading + assessment config) and one row per student, if missing. */
export async function ensureSheet(p: {
  actor: Actor; alloc: Doc<Allocation>; sessionId: string; armLabel: string; subjectName: string;
  scheme: Doc<GradingScheme>; structure: Doc<Structure>; teacherUid: string; teacherName: string;
}): Promise<string> {
  const { actor, alloc } = p;
  const id = sheetId(alloc.termId, alloc.armId, alloc.subjectId);
  const ref = sd(actor.schoolId, 'sheets', id);
  if ((await getDoc(ref)).exists()) return id;

  const [stuSnap, subSnap] = await Promise.all([
    getDocs(query(sc(actor.schoolId, 'students'), where('armId', '==', alloc.armId))),
    getDoc(sd(actor.schoolId, 'subjects', alloc.subjectId)),
  ]);
  const subject = subSnap.exists() ? ({ id: subSnap.id, ...subSnap.data() } as Doc<Subject>) : undefined;
  const students = studentsForSubject(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Student>), subject);

  const w = new Writer();
  w.set(ref, {
    termId: alloc.termId, sessionId: p.sessionId, armId: alloc.armId, armLabel: p.armLabel,
    subjectId: alloc.subjectId, subjectName: p.subjectName, teacherUid: p.teacherUid, teacherName: p.teacherName,
    status: 'DRAFT', version: 1, components: p.structure.components, bands: p.scheme.bands, passMark: p.scheme.passMark,
    stats: null, createdAt: serverTimestamp(),
  });
  students.forEach((s) => w.set(doc(rowsCol(actor.schoolId, id), s.id), newRow(s)));
  w.set(doc(sheetSub(actor.schoolId, id, 'events')), {
    action: 'CREATE', fromStatus: null, toStatus: 'DRAFT', actorUid: actor.uid, actorName: actor.name, comment: '', createdAt: serverTimestamp(),
  });
  await w.commit();
  return id;
}

/** Add rows for students enrolled after the sheet was created. */
export async function syncRows(actor: Actor, sheet: Doc<Sheet>): Promise<number> {
  const [stuSnap, subSnap, rowSnap] = await Promise.all([
    getDocs(query(sc(actor.schoolId, 'students'), where('armId', '==', sheet.armId))),
    getDoc(sd(actor.schoolId, 'subjects', sheet.subjectId)),
    getDocs(rowsCol(actor.schoolId, sheet.id)),
  ]);
  const subject = subSnap.exists() ? ({ id: subSnap.id, ...subSnap.data() } as Doc<Subject>) : undefined;
  const have = new Set(rowSnap.docs.map((d) => d.id));
  const missing = studentsForSubject(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Student>), subject).filter((s) => !have.has(s.id));
  const w = new Writer();
  missing.forEach((s) => w.set(doc(rowsCol(actor.schoolId, sheet.id), s.id), newRow(s)));
  await w.commit();
  return missing.length;
}

export interface RowEdit { studentId: string; scores: Record<string, number | null>; flag: Row['flag']; version: number }

/** Optimistic-concurrency save: fails with ConflictError if any row changed since it was loaded. */
export async function saveRows(actor: Actor, sheet: Doc<Sheet>, edits: RowEdit[]): Promise<Map<string, Row>> {
  const out = new Map<string, Row>();
  await runTransaction(db, async (tx) => {
    const refs = edits.map((e) => doc(rowsCol(actor.schoolId, sheet.id), e.studentId));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const conflicts = snaps.map((s, i) => (!s.exists() || (s.data().version ?? 1) !== edits[i].version ? edits[i].studentId : null)).filter(Boolean) as string[];
    if (conflicts.length) throw new ConflictError(conflicts);

    const changes: { field: string; old: unknown; new: unknown; label?: string }[] = [];
    edits.forEach((e, i) => {
      const cur = snaps[i].data() as Row;
      const total = e.flag === 'NONE' ? sumScores(e.scores, sheet.components) : sumScores(e.scores, sheet.components);
      const band = gradeFor(total, sheet.bands);
      const next = { scores: e.scores, flag: e.flag, total, grade: band?.grade ?? null, remark: band?.remark ?? null, version: e.version + 1 };
      tx.update(refs[i], { ...next, updatedAt: serverTimestamp(), updatedBy: actor.uid });
      out.set(e.studentId, { ...cur, ...next });
      sheet.components.forEach((c) => {
        const o = cur.scores?.[c.code] ?? null, n = e.scores[c.code] ?? null;
        if (o !== n) changes.push({ field: `${c.code}`, label: cur.name, old: o, new: n });
      });
      if (cur.flag !== e.flag) changes.push({ field: 'flag', label: cur.name, old: cur.flag, new: e.flag });
    });
    if (changes.length) {
      tx.set(doc(sc(actor.schoolId, 'auditLogs')), {
        actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, action: 'SCORE_UPDATE', entityType: 'ResultSheet',
        entityId: sheet.id, summary: `${sheet.subjectName} · ${sheet.armLabel}: ${changes.length} score change(s)`, changes, createdAt: serverTimestamp(),
      });
    }
  });
  return out;
}

export async function transitionSheet(p: {
  actor: Actor; sheet: Doc<Sheet>; to: ResultStatus; action: string; comment?: string;
  extra?: Record<string, unknown>; notifyUids?: string[]; notifyTitle?: string; notifyBody?: string; notifyLink?: string;
}) {
  const { actor, sheet } = p;
  const w = new Writer();
  w.update(sd(actor.schoolId, 'sheets', sheet.id), { status: p.to, version: (sheet.version ?? 1) + 1, ...p.extra });
  w.set(doc(sheetSub(actor.schoolId, sheet.id, 'events')), {
    action: p.action, fromStatus: sheet.status, toStatus: p.to, actorUid: actor.uid, actorName: actor.name, comment: p.comment ?? '', createdAt: serverTimestamp(),
  });
  addAudit(w, actor, {
    action: 'WORKFLOW', entityType: 'ResultSheet', entityId: sheet.id,
    summary: `${p.action}: ${sheet.subjectName} · ${sheet.armLabel} (${sheet.status} → ${p.to})`,
  });
  if (p.notifyUids?.length) {
    addNotifications(w, actor, p.notifyUids, { type: 'WORKFLOW', title: p.notifyTitle ?? 'Result update', body: p.notifyBody ?? '', link: p.notifyLink });
  }
  await w.commit();
}

export async function submitSheet(actor: Actor, sheet: Doc<Sheet>, rows: Row[]) {
  const stats = sheetStats(rows, sheet.passMark, sheet.components);
  const reviewers = await uidsWithRoles(actor.schoolId, ['principal', 'hod']);
  await transitionSheet({
    actor, sheet, to: 'SUBMITTED', action: sheet.status === 'RETURNED' ? 'RESUBMIT' : 'SUBMIT',
    extra: { stats, submittedAt: serverTimestamp(), submittedBy: actor.uid, returnedReason: null },
    notifyUids: reviewers, notifyTitle: 'Results submitted for review',
    notifyBody: `${sheet.subjectName} · ${sheet.armLabel} by ${sheet.teacherName}`, notifyLink: `/review/${sheet.id}`,
  });
}
export const startReview = (actor: Actor, sheet: Doc<Sheet>) => transitionSheet({ actor, sheet, to: 'UNDER_REVIEW', action: 'START_REVIEW' });
export const approveSheet = (actor: Actor, sheet: Doc<Sheet>, note = '') => transitionSheet({
  actor, sheet, to: 'APPROVED', action: 'APPROVE', comment: note, extra: { approvedAt: serverTimestamp(), approvedBy: actor.uid },
  notifyUids: [sheet.teacherUid], notifyTitle: 'Results approved', notifyBody: `${sheet.subjectName} · ${sheet.armLabel}`, notifyLink: `/teacher/sheets/${sheet.id}`,
});
export const returnSheet = (actor: Actor, sheet: Doc<Sheet>, reason: string) => transitionSheet({
  actor, sheet, to: 'RETURNED', action: 'RETURN', comment: reason, extra: { returnedReason: reason },
  notifyUids: [sheet.teacherUid], notifyTitle: 'Results returned for correction', notifyBody: `${sheet.subjectName} · ${sheet.armLabel}: ${reason}`, notifyLink: `/teacher/sheets/${sheet.id}/returned`,
});
export const newCommentRef = (schoolId: string, sheetId: string) => doc(sheetSub(schoolId, sheetId, 'comments'));
export { newId };
export type { Band, Structure };
