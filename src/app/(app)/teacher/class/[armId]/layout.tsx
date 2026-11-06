'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Alert, PageHeader, PageLoader } from '@/components/ui';
import { useMyClassArms } from '@/components/layout/app-shell';
import { useSchoolData } from '@/lib/school/school-data';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn } from '@/lib/utils';

const TABS = [['overview', 'Overview'], ['attendance', 'Attendance'], ['traits', 'Conduct & skills'], ['comments', 'Comments']];
export default function ClassLayout({ children }: { children: ReactNode }) {
  const { armId } = useParams<{ armId: string }>();
  const path = usePathname();
  const { armLabel, loading, currentTerm } = useSchoolData();
  const { loading: authLoading } = useAuth();
  const mine = useMyClassArms();
  if (loading || authLoading) return <PageLoader />;
  if (!mine.some((c) => c.armId === armId)) return <Alert tone="warn" title="You are not the class teacher of this class">Only the assigned class teacher can enter attendance, conduct ratings and comments.</Alert>;
  return (
    <>
      <PageHeader title={`${armLabel(armId)} — class teacher`} description={currentTerm ? `${currentTerm.name} · ${currentTerm.daysOpen ?? '—'} school days` : 'No current term set'} />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">{TABS.map(([k, label]) => (
        <Link key={k} href={`/teacher/class/${armId}/${k}`} className={cn('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium', path.endsWith(`/${k}`) ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{label}</Link>))}</div>
      {children}
    </>
  );
}
