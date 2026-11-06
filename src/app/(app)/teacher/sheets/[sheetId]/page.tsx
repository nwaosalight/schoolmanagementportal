'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3, MessageSquareWarning } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useDoc } from '@/lib/firebase/hooks';
import { sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { ensureSheet } from '@/lib/results/sheets';
import { ScoreGrid } from '@/components/results/score-grid';
import { WorkflowTimeline } from '@/components/results/workflow-timeline';
import { RequestUnlockButton } from '@/components/shared/unlock-panel';
import { Alert, PageHeader, PageLoader, StatusBadge, useToast, errMsg } from '@/components/ui';
import type { Allocation, Sheet } from '@/types';

export default function SheetPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const a = useActor(); const toast = useToast();
  const d = useSchoolData();
  const sheet = useDoc<Sheet>(useMemo(() => sd(a.schoolId, 'sheets', sheetId), [a.schoolId, sheetId]));
  const alloc = useDoc<Allocation>(useMemo(() => sd(a.schoolId, 'allocations', sheetId), [a.schoolId, sheetId]));
  const [creating, setCreating] = useState(false);
  const tried = useRef(false);
  const isAdmin = a.role === 'school_admin' || a.role === 'exam_officer';

  useEffect(() => {
    if (tried.current || sheet.loading || alloc.loading || sheet.data || !alloc.data || creating) return;
    if (alloc.data.teacherUid !== a.uid && !isAdmin) return;
    if (!d.defaultScheme || !d.defaultStructure || !d.terms.length) return;
    tried.current = true; setCreating(true);
    const term = d.terms.find((t) => t.id === alloc.data!.termId)!;
    ensureSheet({ actor: a, alloc: alloc.data, sessionId: term.sessionId, armLabel: d.armLabel(alloc.data.armId), subjectName: d.subjectName(alloc.data.subjectId), scheme: d.defaultScheme, structure: d.defaultStructure, teacherUid: alloc.data.teacherUid, teacherName: alloc.data.teacherName })
      .catch((e) => toast.error(errMsg(e))).finally(() => setCreating(false));
  }, [sheet.loading, alloc.loading, sheet.data, alloc.data, d.defaultScheme, d.defaultStructure, d.terms.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sheet.loading || alloc.loading || creating) return <PageLoader label={creating ? 'Preparing your class list…' : 'Loading sheet…'} />;
  if (!sheet.data) return <Alert tone="warn" title="Sheet not available">This subject isn't allocated to you for the selected term, or grading and assessment settings are missing.</Alert>;
  const s = sheet.data; const mine = s.teacherUid === a.uid;

  return (
    <>
      <PageHeader back={<Link href="/teacher/sheets" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />My sheets</Link>}
        title={`${s.subjectName} · ${s.armLabel}`} description={d.termLabel(s.termId)}
        actions={<><StatusBadge status={s.status} />
          {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'LOCKED'].includes(s.status) && <Link href={`/teacher/sheets/${s.id}/analysis`} className="btn btn-sm btn-secondary"><BarChart3 className="h-4 w-4" />Analysis</Link>}
          {mine && ['APPROVED', 'PUBLISHED', 'LOCKED'].includes(s.status) && <RequestUnlockButton sheet={s} />}</>} />
      {s.status === 'RETURNED' && (
        <Alert tone="error" title="Returned for correction" className="mb-5"><p>{s.returnedReason}</p><Link href={`/teacher/sheets/${s.id}/returned`} className="mt-1 inline-flex items-center gap-1 font-medium underline"><MessageSquareWarning className="h-4 w-4" />See per-student comments</Link></Alert>)}
      <div className="grid gap-6 xl:grid-cols-4">
        <div className="xl:col-span-3"><ScoreGrid sheet={s} canEdit={mine || isAdmin} /></div>
        <div><WorkflowTimeline sheetId={s.id} /></div>
      </div>
    </>
  );
}
