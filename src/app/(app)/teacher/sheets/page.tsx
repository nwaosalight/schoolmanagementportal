'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { sheetId } from '@/lib/results/sheets';
import { Card, EmptyState, PageHeader, Progress, StatusBadge } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import type { Allocation, Sheet } from '@/types';

export default function MySheets() {
  const a = useActor();
  const { termId, setTermId } = useTermArm();
  const { armLabel, subjectName } = useSchoolData();
  const allocs = useCollection<Allocation>(useMemo(() => (termId ? query(sc(a.schoolId, 'allocations'), where('termId', '==', termId), where('teacherUid', '==', a.uid)) : null), [a.schoolId, termId, a.uid])).data;
  const sheets = useCollection<Sheet>(useMemo(() => (termId ? query(sc(a.schoolId, 'sheets'), where('termId', '==', termId), where('teacherUid', '==', a.uid)) : null), [a.schoolId, termId, a.uid])).data;
  return (
    <>
      <PageHeader title="My result sheets" description="One sheet per class and subject you teach this term." actions={<TermArmPicker termId={termId} onTerm={setTermId} showArm={false} />} />
      {allocs.length === 0 ? <Card><EmptyState title="No allocations for this term" description="Ask your administrator to allocate subjects to you." /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {allocs.map((al) => { const sh = sheets.find((s) => s.id === sheetId(al.termId, al.armId, al.subjectId)); const pct = sh?.progress ? (sh.progress.filled / Math.max(1, sh.progress.total)) * 100 : 0; return (
            <Link key={al.id} href={`/teacher/sheets/${al.id}`} className="card block p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{subjectName(al.subjectId)}</p><p className="text-sm text-slate-500">{armLabel(al.armId)}</p></div><StatusBadge status={sh?.status ?? 'NOT_STARTED'} /></div>
              <div className="mt-4"><Progress value={pct} /><p className="mt-1.5 text-xs text-slate-500">{sh?.progress ? `${sh.progress.filled} of ${sh.progress.total} students complete` : 'Not started'}</p></div>
            </Link>); })}
        </div>)}
    </>
  );
}
