'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection, useDoc } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { SubjectAnalysis } from '@/components/results/subject-analysis';
import { Alert, PageHeader, PageLoader } from '@/components/ui';
import type { Sheet } from '@/types';

export default function AnalysisPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const a = useActor(); const d = useSchoolData();
  const sheet = useDoc<Sheet>(useMemo(() => sd(a.schoolId, 'sheets', sheetId), [a.schoolId, sheetId]));
  const prevTerm = d.prevTerm(sheet.data?.termId);
  const prevSheets = useCollection<Sheet>(useMemo(() => (prevTerm && sheet.data ? query(sc(a.schoolId, 'sheets'), where('termId', '==', prevTerm.id), where('armId', '==', sheet.data.armId)) : null), [a.schoolId, prevTerm, sheet.data])).data;
  if (sheet.loading) return <PageLoader />;
  if (!sheet.data) return <Alert tone="error" title="Sheet not found" />;
  const s = sheet.data;
  return (
    <>
      <PageHeader back={<Link href={`/teacher/sheets/${sheetId}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to sheet</Link>} title="Subject analysis" description={`${s.subjectName} · ${s.armLabel} · ${d.termLabel(s.termId)}`} />
      <SubjectAnalysis sheet={s} prev={prevSheets.find((p) => p.subjectId === s.subjectId) ?? null} />
    </>
  );
}
