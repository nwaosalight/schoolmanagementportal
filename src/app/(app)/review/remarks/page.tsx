'use client';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useSchoolData } from '@/lib/school/school-data';
import { Card, EmptyState, PageHeader } from '@/components/ui';

export default function RemarksIndex() {
  const { arms, armLabel, currentTerm } = useSchoolData();
  return (
    <>
      <PageHeader title="Principal's remarks" description={`Write remarks for report cards${currentTerm ? ` · ${currentTerm.name}` : ''}. Choose a class.`} />
      {arms.length === 0 ? <Card><EmptyState title="No classes yet" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{arms.map((x) => (
          <Link key={x.id} href={`/review/remarks/${x.id}`} className="card flex items-center justify-between p-4 transition hover:border-brand-300 hover:shadow-md"><span className="font-medium text-slate-900">{armLabel(x.id)}</span><MessageSquare className="h-4 w-4 text-slate-400" /></Link>))}</div>)}
    </>
  );
}
