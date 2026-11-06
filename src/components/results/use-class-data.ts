'use client';
import { useMemo } from 'react';
import { query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { byName } from '@/lib/utils';
import type { Doc, Report, Student } from '@/types';

/** Students + report-card inputs (attendance, traits, comments) for one class in the current term. */
export function useClassData(armId: string) {
  const a = useActor();
  const { currentTerm: term, armLabel } = useSchoolData();
  const stu = useCollection<Student>(useMemo(() => query(sc(a.schoolId, 'students'), where('armId', '==', armId)), [a.schoolId, armId]));
  const reps = useCollection<Report>(useMemo(() => (term ? query(sc(a.schoolId, 'reports'), where('termId', '==', term.id), where('armId', '==', armId)) : null), [a.schoolId, term, armId]));
  const students = useMemo(() => stu.data.filter((s) => s.status === 'ACTIVE').sort(byName), [stu.data]);
  const reportOf = (studentId: string) => reps.data.find((r) => r.studentId === studentId);

  async function save(s: Doc<Student>, patch: Record<string, unknown>) {
    if (!term) throw new Error('No current term is set.');
    await setDoc(sd(a.schoolId, 'reports', `${term.id}_${s.id}`), {
      termId: term.id, sessionId: term.sessionId, armId, armLabel: armLabel(armId), studentId: s.id, studentName: `${s.lastName} ${s.firstName}`,
      admissionNumber: s.admissionNumber, gender: s.gender, guardianUids: s.guardianUids ?? [], studentUserId: s.userId ?? null, ...patch, updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  return { term, students, reportOf, save, loading: stu.loading || reps.loading };
}
