import { doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import type { Actor } from '@/lib/auth/auth-provider';
import { rowsCol, sc, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { average, gradeFor, rank } from '@/lib/grading';
import { byName } from '@/lib/utils';
import type { Arm, Band, Component, Doc, GradingScheme, Report, Row, Sheet, Student, SubjectLine, Subject, Term } from '@/types';

export type Computed = Omit<Report, 'status' | 'published'> & { id: string };

export interface ArmResults {
  term: Doc<Term>; armId: string; armLabel: string;
  sheets: Doc<Sheet>[]; rowsBySheet: Map<string, Doc<Row>[]>;
  students: Computed[]; components: Component[]; bands: Band[]; passMark: number;
  exceptions: {
    unapproved: Doc<Sheet>[]; noSheet: Doc<Subject>[];
    missingScores: { student: string; subject: string; codes: string[] }[];
    absent: { student: string; subject: string; flag: string }[];
  };
  canCommit: boolean;
}

const OK = ['APPROVED', 'PUBLISHED', 'LOCKED'];

export async function buildArmResults(p: {
  schoolId: string; term: Doc<Term>; arm: Doc<Arm>; armLabel: string; subjects: Doc<Subject>[]; scheme?: Doc<GradingScheme>;
}): Promise<ArmResults> {
  const { schoolId, term, arm } = p;
  const [stuSnap, sheetSnap, sessReports] = await Promise.all([
    getDocs(query(sc(schoolId, 'students'), where('armId', '==', arm.id))),
    getDocs(query(sc(schoolId, 'sheets'), where('termId', '==', term.id), where('armId', '==', arm.id))),
    getDocs(query(sc(schoolId, 'reports'), where('sessionId', '==', term.sessionId))),
  ]);
  const students = stuSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Student>).filter((s) => s.status === 'ACTIVE').sort(byName);
  const sheets = sheetSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Sheet>).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  const rowSnaps = await Promise.all(sheets.map((s) => getDocs(rowsCol(schoolId, s.id))));
  const rowsBySheet = new Map<string, Doc<Row>[]>();
  sheets.forEach((s, i) => rowsBySheet.set(s.id, rowSnaps[i].docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Row>)));

  const bands = sheets[0]?.bands ?? p.scheme?.bands ?? [];
  const passMark = sheets[0]?.passMark ?? p.scheme?.passMark ?? 40;
  const components = sheets[0]?.components ?? [];

  // per-subject positions and class averages
  const subjPos = new Map<string, Map<string, number>>();
  const subjAvg = new Map<string, number | null>();
  sheets.forEach((s) => {
    const rows = (rowsBySheet.get(s.id) ?? []).filter((r) => r.flag === 'NONE' && r.total != null);
    subjPos.set(s.id, rank(rows.map((r) => ({ id: r.studentId, value: r.total }))));
    subjAvg.set(s.id, average(rows.map((r) => r.total)));
  });

  const exceptions: ArmResults['exceptions'] = { unapproved: sheets.filter((s) => !OK.includes(s.status)), noSheet: [], missingScores: [], absent: [] };
  const offered = p.subjects.filter((s) => s.isActive && s.levelIds.includes(arm.levelId));
  exceptions.noSheet = offered.filter((s) => !sheets.some((sh) => sh.subjectId === s.id));

  const computed: Computed[] = students.map((st) => {
    const subjects: SubjectLine[] = sheets.map((sh) => {
      const row = rowsBySheet.get(sh.id)?.find((r) => r.studentId === st.id);
      if (!row) return { subjectId: sh.subjectId, name: sh.subjectName, scores: {}, total: null, grade: null, remark: null, position: null, classAverage: subjAvg.get(sh.id) ?? null, flag: 'NONE' as const };
      if (row.flag !== 'NONE') exceptions.absent.push({ student: row.name, subject: sh.subjectName, flag: row.flag });
      else {
        const codes = sh.components.filter((c) => row.scores?.[c.code] == null).map((c) => c.code);
        if (codes.length) exceptions.missingScores.push({ student: row.name, subject: sh.subjectName, codes });
      }
      const band = gradeFor(row.total, sh.bands);
      return {
        subjectId: sh.subjectId, name: sh.subjectName, scores: row.scores ?? {}, total: row.total, grade: band?.grade ?? null,
        remark: band?.remark ?? null, position: subjPos.get(sh.id)?.get(st.id) ?? null, classAverage: subjAvg.get(sh.id) ?? null, flag: row.flag,
      };
    });
    const counted = subjects.filter((l) => l.flag === 'NONE' && l.total != null);
    const total = counted.reduce((a, l) => a + (l.total as number), 0);
    const avg = counted.length ? Math.round((total / counted.length) * 100) / 100 : null;
    return {
      id: `${term.id}_${st.id}`, termId: term.id, sessionId: term.sessionId, armId: arm.id, armLabel: p.armLabel,
      studentId: st.id, studentName: `${st.lastName} ${st.firstName}`, admissionNumber: st.admissionNumber, gender: st.gender,
      guardianUids: st.guardianUids ?? [], studentUserId: st.userId ?? null, subjects, components, bands, passMark,
      totalScore: counted.length ? Math.round(total * 100) / 100 : null, average: avg,
      overallGrade: gradeFor(avg, bands)?.grade ?? null, classSize: students.length,
    };
  });

  const positions = rank(computed.map((c) => ({ id: c.studentId, value: c.average ?? null })));
  // cumulative average across terms in the session
  const prior = new Map<string, number[]>();
  sessReports.docs.forEach((d) => {
    const r = d.data() as Report;
    if (r.termId !== term.id && typeof r.average === 'number') prior.set(r.studentId, [...(prior.get(r.studentId) ?? []), r.average]);
  });
  computed.forEach((c) => {
    c.position = positions.get(c.studentId) ?? null;
    const all = [...(prior.get(c.studentId) ?? []), ...(c.average != null ? [c.average] : [])];
    c.cumulativeAverage = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 100) / 100 : null;
  });

  return {
    term, armId: arm.id, armLabel: p.armLabel, sheets, rowsBySheet, students: computed, components, bands, passMark, exceptions,
    canCommit: sheets.length > 0 && exceptions.unapproved.length === 0,
  };
}

/** Persist computed results: report cards, per-subject positions and sheet stats. */
export async function commitResults(actor: Actor, res: ArmResults): Promise<{ written: number; skipped: number }> {
  const { schoolId } = actor;
  const existing = await getDocs(query(sc(schoolId, 'reports'), where('termId', '==', res.term.id), where('armId', '==', res.armId)));
  const locked = new Set(existing.docs.filter((d) => d.data().published || d.data().status === 'LOCKED').map((d) => d.data().studentId as string));
  const w = new Writer();
  let written = 0, skipped = 0;

  res.students.forEach((c) => {
    if (locked.has(c.studentId)) { skipped++; return; }
    const { id, ...data } = c;
    w.set(sd(schoolId, 'reports', id), { ...data, status: 'COMPUTED', published: false, computedAt: serverTimestamp() }, { merge: true });
    written++;
  });
  res.sheets.forEach((sh) => {
    (res.rowsBySheet.get(sh.id) ?? []).forEach((r) => {
      const pos = res.students.find((s) => s.studentId === r.studentId)?.subjects?.find((l) => l.subjectId === sh.subjectId)?.position ?? null;
      if (r.position !== pos) w.update(doc(rowsCol(schoolId, sh.id), r.studentId), { position: pos });
    });
  });
  addAudit(w, actor, {
    action: 'COMPUTE', entityType: 'TermReport', entityId: `${res.term.id}_${res.armId}`,
    summary: `Computed results for ${res.armLabel} (${written} students, ${skipped} skipped as published/locked)`,
  });
  await w.commit();
  return { written, skipped };
}
