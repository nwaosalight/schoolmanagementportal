'use client';
import { useParams } from 'next/navigation';
import { ReportView } from '@/components/portal/report-view';
export default function ChildReport() {
  const { studentId, termId } = useParams<{ studentId: string; termId: string }>();
  return <ReportView studentId={studentId} termId={termId} />;
}
