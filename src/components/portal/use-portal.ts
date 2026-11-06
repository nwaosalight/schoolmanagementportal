'use client';
import { useMemo } from 'react';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import type { Doc, Report, Student } from '@/types';

/** Children linked to the signed-in parent (or the student's own record). */
export function useMyChildren() {
  const a = useActor();
  const q = useMemo(() => (a.role === 'student' ? query(sc(a.schoolId, 'students'), where('userId', '==', a.uid)) : query(sc(a.schoolId, 'students'), where('guardianUids', 'array-contains', a.uid))), [a.schoolId, a.uid, a.role]);
  return useCollection<Student>(q);
}
/** Published report cards visible to the signed-in parent/student (optionally one child). */
export function useMyReports(studentId?: string) {
  const a = useActor();
  const q = useMemo(() => {
    const base = a.role === 'student' ? [where('studentUserId', '==', a.uid)] : [where('guardianUids', 'array-contains', a.uid)];
    return query(sc(a.schoolId, 'reports'), ...base, where('published', '==', true), ...(studentId ? [where('studentId', '==', studentId)] : []));
  }, [a.schoolId, a.uid, a.role, studentId]);
  const r = useCollection<Report>(q);
  const sorted = useMemo(() => [...r.data].sort((x, y) => String(y.termId).localeCompare(String(x.termId))), [r.data]);
  return { ...r, data: sorted as Doc<Report>[] };
}
