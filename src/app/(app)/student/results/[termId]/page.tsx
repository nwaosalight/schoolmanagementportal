'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ReportView } from '@/components/portal/report-view';
export default function StudentReport() {
  const { termId } = useParams<{ termId: string }>();
  return (<><Link href="/student/results" className="no-print mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />My results</Link><ReportView termId={termId} /></>);
}
