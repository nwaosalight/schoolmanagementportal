'use client';
import { ResultsList } from '@/components/portal/results-list';
import { useMyReports } from '@/components/portal/use-portal';
import { PageHeader, PageLoader } from '@/components/ui';
export default function StudentResults() {
  const r = useMyReports();
  return (<><PageHeader title="My results" description="Term-by-term report cards." />{r.loading ? <PageLoader /> : <ResultsList reports={r.data} hrefFor={(x) => `/student/results/${x.termId}`} />}</>);
}
