'use client';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { useMyChildren, useMyReports } from '@/components/portal/use-portal';
import { Card, CardHeader, EmptyState, PageHeader, PageLoader, Stat } from '@/components/ui';
import { fmt, ordinal } from '@/lib/utils';

export default function StudentHome() {
  const { profile } = useAuth(); const { armLabel, currentTerm, termLabel } = useSchoolData();
  const me = useMyChildren(); const reports = useMyReports();
  if (me.loading || reports.loading) return <PageLoader />;
  const latest = reports.data[0]; const rec = me.data[0];
  return (
    <>
      <PageHeader title={`Hi, ${profile?.firstName}`} description={`${rec ? armLabel(rec.armId) : ''}${currentTerm ? ` · ${currentTerm.name}` : ''}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Latest average" value={latest ? fmt(latest.average) : '—'} hint={latest ? termLabel(latest.termId) : 'Nothing published yet'} />
        <Stat label="Class position" value={latest?.position ? `${ordinal(latest.position)} of ${latest.classSize}` : '—'} tone="green" />
        <Stat label="Overall grade" value={latest?.overallGrade ?? '—'} tone="amber" />
      </div>
      <Card>
        <CardHeader title="Latest result" action={<Link href="/student/results" className="text-sm font-medium text-brand-600">All results</Link>} />
        {latest ? <Link href={`/student/results/${latest.termId}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"><FileText className="h-6 w-6 text-brand-500" /><div className="flex-1"><p className="font-medium">{termLabel(latest.termId)}</p><p className="text-sm text-slate-500">Open your report card</p></div><ArrowRight className="h-4 w-4 text-slate-300" /></Link>
          : <EmptyState title="Not yet available" description="Your results will appear here once your school publishes them." />}
      </Card>
    </>
  );
}
