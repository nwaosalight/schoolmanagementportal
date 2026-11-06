import { addDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import type { Actor } from '@/lib/auth/auth-provider';
import { db } from '@/lib/firebase/client';
import { sc, sd, sheetSub } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { addNotifications } from '@/lib/notify';
import { randomCode } from '@/lib/utils';
import type { Doc, Report, SchoolDoc, Sheet, Term } from '@/types';

async function load(schoolId: string, termId: string, armId: string) {
  const [rs, ss] = await Promise.all([
    getDocs(query(sc(schoolId, 'reports'), where('termId', '==', termId), where('armId', '==', armId))),
    getDocs(query(sc(schoolId, 'sheets'), where('termId', '==', termId), where('armId', '==', armId))),
  ]);
  return {
    reports: rs.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Report>),
    sheets: ss.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Sheet>),
  };
}

export interface Preflight { ok: boolean; checks: { label: string; ok: boolean; detail?: string }[]; reports: Doc<Report>[]; sheets: Doc<Sheet>[] }

export async function preflight(schoolId: string, termId: string, armId: string): Promise<Preflight> {
  const { reports, sheets } = await load(schoolId, termId, armId);
  const unapproved = sheets.filter((s) => !['APPROVED', 'PUBLISHED', 'LOCKED'].includes(s.status));
  const uncomputed = reports.filter((r) => !r.subjects?.length);
  const checks = [
    { label: 'Result sheets exist for this class', ok: sheets.length > 0, detail: `${sheets.length} sheet(s)` },
    { label: 'All sheets approved', ok: sheets.length > 0 && unapproved.length === 0, detail: unapproved.length ? `${unapproved.length} pending: ${unapproved.map((s) => s.subjectName).join(', ')}` : undefined },
    { label: 'Results computed', ok: reports.length > 0 && uncomputed.length === 0, detail: reports.length ? `${reports.length} report card(s)` : 'Run computation first' },
    { label: 'Class positions assigned', ok: reports.length > 0 && reports.every((r) => r.position != null || r.average == null) },
  ];
  return { ok: checks.every((c) => c.ok), checks, reports, sheets };
}

export async function publishArm(p: {
  actor: Actor; school: Doc<SchoolDoc>; term: Doc<Term>; termLabel: string; armId: string; armLabel: string; notify: boolean;
}) {
  const { actor, school, term } = p;
  const { reports, sheets } = await load(actor.schoolId, term.id, p.armId);
  const w = new Writer();
  const batchRef = doc(sc(actor.schoolId, 'publishBatches'));

  reports.forEach((r) => {
    const code = r.verificationCode || randomCode(10);
    w.update(sd(actor.schoolId, 'reports', r.id), { status: 'PUBLISHED', published: true, publishedAt: serverTimestamp(), verificationCode: code, publishBatchId: batchRef.id });
    w.set(doc(db, 'verifications', code), {
      schoolId: actor.schoolId, schoolName: school.name, studentName: r.studentName, admissionNumber: r.admissionNumber,
      termLabel: p.termLabel, armLabel: p.armLabel, average: r.average ?? null, position: r.position ?? null, classSize: r.classSize ?? null,
      overallGrade: r.overallGrade ?? null, valid: true, publishedAt: serverTimestamp(),
    });
    if (p.notify) {
      addNotifications(w, actor, [...(r.guardianUids ?? []), ...(r.studentUserId ? [r.studentUserId] : [])], {
        type: 'RESULTS_PUBLISHED', title: 'Results published', body: `${r.studentName}: ${p.termLabel} results are now available.`, link: `/results/${r.id}`,
      });
    }
  });
  sheets.forEach((s) => {
    w.update(sd(actor.schoolId, 'sheets', s.id), { status: 'PUBLISHED' });
    w.set(doc(sheetSub(actor.schoolId, s.id, 'events')), { action: 'PUBLISH', fromStatus: s.status, toStatus: 'PUBLISHED', actorUid: actor.uid, actorName: actor.name, comment: '', createdAt: serverTimestamp() });
  });
  w.set(batchRef, { termId: term.id, armId: p.armId, armLabel: p.armLabel, termLabel: p.termLabel, status: 'PUBLISHED', reportCount: reports.length, notified: p.notify, publishedAt: serverTimestamp(), publishedByUid: actor.uid, publishedByName: actor.name, createdAt: serverTimestamp() });
  addAudit(w, actor, { action: 'WORKFLOW', entityType: 'PublishBatch', entityId: batchRef.id, summary: `Published ${p.armLabel} · ${p.termLabel} (${reports.length} report cards)` });
  await w.commit();
}

export async function unpublishArm(p: { actor: Actor; term: Doc<Term>; termLabel: string; armId: string; armLabel: string }) {
  const { actor, term } = p;
  const { reports, sheets } = await load(actor.schoolId, term.id, p.armId);
  const w = new Writer();
  reports.filter((r) => r.published).forEach((r) => {
    w.update(sd(actor.schoolId, 'reports', r.id), { status: 'COMPUTED', published: false });
    if (r.verificationCode) w.update(doc(db, 'verifications', r.verificationCode), { valid: false });
  });
  sheets.filter((s) => s.status === 'PUBLISHED').forEach((s) => {
    w.update(sd(actor.schoolId, 'sheets', s.id), { status: 'APPROVED' });
    w.set(doc(sheetSub(actor.schoolId, s.id, 'events')), { action: 'UNPUBLISH', fromStatus: 'PUBLISHED', toStatus: 'APPROVED', actorUid: actor.uid, actorName: actor.name, comment: '', createdAt: serverTimestamp() });
  });
  w.set(doc(sc(actor.schoolId, 'publishBatches')), { termId: term.id, armId: p.armId, armLabel: p.armLabel, termLabel: p.termLabel, status: 'UNPUBLISHED', unpublishedAt: serverTimestamp(), publishedByUid: actor.uid, publishedByName: actor.name, createdAt: serverTimestamp() });
  addAudit(w, actor, { action: 'WORKFLOW', entityType: 'PublishBatch', summary: `Unpublished ${p.armLabel} · ${p.termLabel}` });
  await w.commit();
}

/** Lock a term: sheets and reports become read-only; corrections need an approved unlock request. */
export async function lockTerm(actor: Actor, term: Doc<Term>) {
  const [ss, rs] = await Promise.all([
    getDocs(query(sc(actor.schoolId, 'sheets'), where('termId', '==', term.id))),
    getDocs(query(sc(actor.schoolId, 'reports'), where('termId', '==', term.id))),
  ]);
  const w = new Writer();
  ss.docs.forEach((d) => w.update(d.ref, { status: 'LOCKED' }));
  rs.docs.forEach((d) => w.update(d.ref, { status: 'LOCKED' }));
  w.update(sd(actor.schoolId, 'terms', term.id), { status: 'LOCKED' });
  addAudit(w, actor, { action: 'WORKFLOW', entityType: 'Term', entityId: term.id, summary: `Locked term ${term.name}` });
  await w.commit();
}

export async function scheduleBatch(actor: Actor, p: { termId: string; armId: string; armLabel: string; termLabel: string; at: string; notify: boolean }) {
  await addDoc(sc(actor.schoolId, 'publishBatches'), { ...p, status: 'SCHEDULED', scheduledFor: p.at, publishedByUid: actor.uid, publishedByName: actor.name, createdAt: serverTimestamp() });
}
