'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSchoolData } from '@/lib/school/school-data';
import { useMyChildren } from '@/components/portal/use-portal';
import { Alert, PageHeader, PageLoader } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function ChildLayout({ children }: { children: ReactNode }) {
  const { studentId } = useParams<{ studentId: string }>(); const path = usePathname();
  const { armLabel } = useSchoolData(); const kids = useMyChildren();
  if (kids.loading) return <PageLoader />;
  const k = kids.data.find((x) => x.id === studentId);
  if (!k) return <Alert tone="error" title="Child not found">This child isn't linked to your account.</Alert>;
  const base = `/parent/children/${studentId}`;
  const tabs = [['', 'Overview'], ['/results', 'Results'], ['/trends', 'Progress'], ['/queries', 'Queries']];
  return (
    <>
      <PageHeader back={<Link href="/parent" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />My children</Link>} title={`${k.firstName} ${k.lastName}`} description={`${armLabel(k.armId)} · ${k.admissionNumber}`} />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map(([h, l]) => { const href = base + h; const active = h === '' ? path === base : path.startsWith(href); return <Link key={h} href={href} className={cn('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium', active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>{l}</Link>; })}</div>
      {children}
    </>
  );
}
