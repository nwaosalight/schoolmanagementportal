'use client';
import { useParams } from 'next/navigation';
import { ResultsList } from '@/components/portal/results-list';
import { useMyReports } from '@/components/portal/use-portal';
import { PageLoader } from '@/components/ui';

export default function ChildResults() {
  const { studentId } = useParams<{ studentId: string }>();
  const r = useMyReports(studentId);
  if (r.loading) return <PageLoader />;
  return <ResultsList reports={r.data} hrefFor={(x) => `/parent/children/${studentId}/results/${x.termId}`} />;
}
