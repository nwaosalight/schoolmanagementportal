'use client';
import { useParams } from 'next/navigation';
import { useSchoolData } from '@/lib/school/school-data';
import { useMyChildren, useMyReports } from '@/components/portal/use-portal';
import { Card, CardHeader, Stat } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

export default function ChildOverview() {
  const { studentId } = useParams<{ studentId: string }>();
  const { armLabel, terms } = useSchoolData();
  const k = useMyChildren().data.find((x) => x.id === studentId)!; const reports = useMyReports(studentId).data;
  const latest = reports[0]; const term = terms.find((t) => t.id === latest?.termId);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Profile" />
        <dl className="grid gap-x-8 gap-y-3 p-5 text-sm sm:grid-cols-2">
          {[['Admission number', k.admissionNumber], ['Class', armLabel(k.armId)], ['Gender', k.gender === 'MALE' ? 'Male' : 'Female'], ['Date of birth', k.dob ? fmtDate(k.dob) : '—']].map(([a, b]) => <div key={a}><dt className="text-slate-500">{a}</dt><dd className="font-medium text-slate-900">{b}</dd></div>)}</dl></Card>
      <div className="space-y-4">
        <Stat label="Attendance (latest term)" value={latest?.daysPresent != null && term?.daysOpen ? `${latest.daysPresent}/${term.daysOpen}` : '—'} hint={latest?.daysAbsent != null ? `${latest.daysAbsent} day(s) absent` : undefined} tone="green" />
        <Stat label="Published results" value={reports.length} />
      </div>
    </div>
  );
}
