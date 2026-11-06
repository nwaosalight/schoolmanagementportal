'use client';
import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings, useTraits } from '@/lib/school/use-settings';
import { ReportCard } from '@/components/shared/report-card';
import { Button, EmptyState, PageLoader } from '@/components/ui';
import { useMyReports } from './use-portal';
import { FileQuestion } from 'lucide-react';

export function ReportView({ studentId, termId }: { studentId?: string; termId: string }) {
  const { school } = useAuth();
  const { terms, termLabel } = useSchoolData();
  const { settings } = useSettings(); const traits = useTraits().data;
  const reports = useMyReports(studentId);
  const report = useMemo(() => reports.data.find((r) => r.termId === termId && (!studentId || r.studentId === studentId)), [reports.data, termId, studentId]);
  if (reports.loading) return <PageLoader />;
  if (!report) return <EmptyState icon={<FileQuestion className="h-6 w-6" />} title="Result not available yet" description="This report card hasn't been published. You'll be notified when it is." />;
  const term = terms.find((t) => t.id === termId);
  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end"><Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Download / print PDF</Button></div>
      <ReportCard report={report} school={school} settings={settings} termLabel={termLabel(termId)} nextTermBegins={term?.nextTermBegins} daysOpen={term?.daysOpen} traits={traits} />
      <p className="no-print text-center text-xs text-slate-500">Tip: in the print window choose “Save as PDF”.</p>
    </div>
  );
}
