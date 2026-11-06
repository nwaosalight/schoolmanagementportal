'use client';
import { useParams } from 'next/navigation';
import { TrendsView } from '@/components/portal/trends-view';
import { useMyReports } from '@/components/portal/use-portal';
import { PageLoader } from '@/components/ui';
export default function ChildTrends() {
  const { studentId } = useParams<{ studentId: string }>(); const r = useMyReports(studentId);
  return r.loading ? <PageLoader /> : <TrendsView reports={r.data} />;
}
