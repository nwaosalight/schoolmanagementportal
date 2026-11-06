'use client';
import Link from 'next/link';
import { ChevronRight, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { useMyChildren, useMyReports } from '@/components/portal/use-portal';
import { Badge, Card, EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { fmt, initials, ordinal } from '@/lib/utils';

export default function ParentHome() {
  const { profile } = useAuth(); const { armLabel, termLabel } = useSchoolData();
  const kids = useMyChildren(); const reports = useMyReports();
  if (kids.loading) return <PageLoader />;
  return (
    <>
      <PageHeader title={`Hello, ${profile?.firstName}`} description="Select a child to see their published results." />
      {kids.data.length === 0 ? <Card><EmptyState icon={<Users className="h-6 w-6" />} title="No children linked yet" description="Ask the school office to link your account to your child." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2">
          {kids.data.map((k) => { const latest = reports.data.find((r) => r.studentId === k.id); return (
            <Link key={k.id} href={`/parent/children/${k.id}`} className="card p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials(`${k.firstName} ${k.lastName}`)}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{k.firstName} {k.lastName}</p><p className="text-sm text-slate-500">{armLabel(k.armId)} · {k.admissionNumber}</p></div><ChevronRight className="h-5 w-5 text-slate-300" /></div>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                {latest ? <div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{termLabel(latest.termId)}</p><p className="font-medium">Average {fmt(latest.average)} · {latest.position ? `${ordinal(latest.position)} of ${latest.classSize}` : '—'}</p></div><Badge tone="brand">New</Badge></div>
                  : <p className="flex items-center gap-2 text-slate-500"><GraduationCap className="h-4 w-4" />Results not yet available</p>}</div>
            </Link>); })}
        </div>)}
    </>
  );
}
