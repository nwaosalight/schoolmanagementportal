'use client';
import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { useSchoolData } from '@/lib/school/school-data';
import { Badge, Card, EmptyState } from '@/components/ui';
import { fmt, ordinal } from '@/lib/utils';
import type { Doc, Report } from '@/types';

export function ResultsList({ reports, hrefFor, showName }: { reports: Doc<Report>[]; hrefFor: (r: Doc<Report>) => string; showName?: boolean }) {
  const { termLabel } = useSchoolData();
  if (!reports.length) return <Card><EmptyState icon={<FileText className="h-6 w-6" />} title="Not yet available" description="Results appear here as soon as the school publishes them." /></Card>;
  return (
    <Card className="divide-y divide-slate-100">
      {reports.map((r) => (
        <Link key={r.id} href={hrefFor(r)} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><FileText className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{showName && `${r.studentName} · `}{termLabel(r.termId)}</p><p className="text-sm text-slate-500">{r.armLabel} · Average {fmt(r.average)} · Position {r.position ? `${ordinal(r.position)} of ${r.classSize}` : '—'}</p></div>
          <Badge tone="brand">Published</Badge><ChevronRight className="h-4 w-4 text-slate-300" />
        </Link>))}
    </Card>
  );
}
