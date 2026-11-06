'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { buildArmResults, type ArmResults } from '@/lib/results/compute';
import { Alert, Badge, Card, PageLoader, StatusBadge } from '@/components/ui';
import { fmt, ordinal } from '@/lib/utils';

export default function ClassOverview() {
  const { armId } = useParams<{ armId: string }>();
  const a = useActor(); const { currentTerm, arms, subjects, armLabel, defaultScheme } = useSchoolData();
  const [res, setRes] = useState<ArmResults | null>(null);
  useEffect(() => {
    const arm = arms.find((x) => x.id === armId);
    if (!currentTerm || !arm) return;
    buildArmResults({ schoolId: a.schoolId, term: currentTerm, arm, armLabel: armLabel(armId), subjects, scheme: defaultScheme }).then(setRes);
  }, [a.schoolId, currentTerm?.id, armId, arms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!res) return <PageLoader />;
  const ex = res.exceptions;
  return (
    <div className="space-y-5">
      {(ex.noSheet.length > 0 || ex.missingScores.length > 0) && <Alert tone="warn" title="Missing subjects or scores">{ex.noSheet.length > 0 && <p>No sheet yet for: {ex.noSheet.map((s) => s.name).join(', ')}.</p>}{ex.missingScores.length > 0 && <p>{ex.missingScores.length} student–subject entries have incomplete scores.</p>}</Alert>}
      <Card><div className="flex flex-wrap gap-3 p-4">{res.sheets.map((s) => <span key={s.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">{s.subjectName}<StatusBadge status={s.status} /></span>)}{res.sheets.length === 0 && <span className="text-sm text-slate-500">No result sheets for this class yet.</span>}</div></Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm"><thead><tr><th className="th">Student</th>{res.sheets.map((s) => <th key={s.id} className="th text-center">{s.subjectName.slice(0, 6)}</th>)}<th className="th text-right">Avg</th><th className="th text-center">Position (preview)</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{res.students.map((r) => (
            <tr key={r.studentId}><td className="td font-medium text-slate-900">{r.studentName}</td>
              {r.subjects?.map((l) => <td key={l.subjectId} className="td text-center">{l.flag !== 'NONE' ? <Badge>{l.flag === 'ABSENT' ? 'ABS' : 'EXC'}</Badge> : l.total == null ? <span className="text-red-400">—</span> : fmt(l.total, 0)}</td>)}
              <td className="td text-right font-semibold">{fmt(r.average)}</td><td className="td text-center">{ordinal(r.position)}</td></tr>))}</tbody></table>
      </Card>
    </div>
  );
}
