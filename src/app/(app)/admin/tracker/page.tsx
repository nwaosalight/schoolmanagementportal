'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { sheetId } from '@/lib/results/sheets';
import { Writer } from '@/lib/firebase/writer';
import { addNotifications } from '@/lib/notify';
import { Alert, Button, Card, EmptyState, Modal, PageHeader, StatusBadge, useToast, errMsg } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import type { Allocation, Sheet } from '@/types';
import { fmtDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const DOT: Record<string, string> = { NOT_STARTED: 'bg-slate-300', DRAFT: 'bg-slate-400', SUBMITTED: 'bg-sky-500', UNDER_REVIEW: 'bg-amber-500', APPROVED: 'bg-emerald-500', RETURNED: 'bg-red-500', PUBLISHED: 'bg-brand-600', LOCKED: 'bg-slate-700', UNALLOCATED: 'bg-amber-200' };

export default function TrackerPage() {
  const a = useActor(); const toast = useToast();
  const { termId, setTermId } = useTermArm();
  const { arms, subjects, armLabel, levelOfArm } = useSchoolData();
  const sheets = useCollection<Sheet>(useMemo(() => (termId ? query(sc(a.schoolId, 'sheets'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const allocs = useCollection<Allocation>(useMemo(() => (termId ? query(sc(a.schoolId, 'allocations'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const [cell, setCell] = useState<{ armId: string; subjectId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const active = subjects.filter((s) => s.isActive);

  const info = (armId: string, subjectId: string) => {
    const lvl = levelOfArm(armId); const sub = subjects.find((s) => s.id === subjectId);
    if (!lvl || !sub?.levelIds.includes(lvl.id)) return null;
    const id = sheetId(termId, armId, subjectId);
    const sh = sheets.find((x) => x.id === id); const al = allocs.find((x) => x.id === id);
    return { sheet: sh, alloc: al, status: sh?.status ?? (al ? 'NOT_STARTED' : 'UNALLOCATED') } as const;
  };
  const pendingList = arms.flatMap((arm) => active.map((s) => ({ arm, s, i: info(arm.id, s.id) }))).filter((x) => x.i && ['NOT_STARTED', 'DRAFT', 'RETURNED'].includes(x.i.status) && x.i.alloc);

  async function remind(items: { armId: string; subjectId: string; uid: string }[]) {
    setBusy(true);
    try {
      const w = new Writer();
      items.forEach((it) => addNotifications(w, a, [it.uid], { type: 'REMINDER', title: 'Result submission reminder', body: `Please complete ${subjects.find((s) => s.id === it.subjectId)?.name} results for ${armLabel(it.armId)}.`, link: '/teacher/sheets' }));
      await w.commit(); toast.success(`Reminder sent to ${new Set(items.map((i) => i.uid)).size} teacher(s).`); setCell(null);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  const sel = cell ? info(cell.armId, cell.subjectId) : null;

  return (
    <>
      <PageHeader title="Submission tracker" description="Where every class and subject stands in the results workflow." actions={<>
        <TermArmPicker termId={termId} onTerm={setTermId} showArm={false} />
        <Button size="sm" variant="secondary" icon={<Bell className="h-4 w-4" />} disabled={!pendingList.length} loading={busy} onClick={() => remind(pendingList.map((x) => ({ armId: x.arm.id, subjectId: x.s.id, uid: x.i!.alloc!.teacherUid })))}>Remind all pending ({pendingList.length})</Button></>} />
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-600">{(['NOT_STARTED', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED', 'PUBLISHED', 'UNALLOCATED'] as const).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-full', DOT[k])} />{k === 'UNALLOCATED' ? 'No teacher' : k.replace('_', ' ').toLowerCase()}</span>)}</div>
      {arms.length === 0 || active.length === 0 ? <Card><EmptyState title="Nothing to track yet" description="Add classes and subjects first." /></Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr><th className="th sticky left-0 z-10 bg-slate-50">Class</th>{active.map((s) => <th key={s.id} className="th text-center" title={s.name}>{s.code}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {arms.map((arm) => (
                <tr key={arm.id}>
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-slate-900">{armLabel(arm.id)}</td>
                  {active.map((s) => { const i = info(arm.id, s.id); return (
                    <td key={s.id} className="px-2 py-2.5 text-center">
                      {!i ? <span className="text-slate-200">·</span> : <button aria-label={`${s.name} ${armLabel(arm.id)}: ${i.status}`} onClick={() => setCell({ armId: arm.id, subjectId: s.id })} className="rounded-md p-1.5 hover:bg-slate-100"><span className={cn('block h-3.5 w-3.5 rounded-full', DOT[i.status])} /></button>}
                    </td>); })}
                </tr>))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={!!cell && !!sel} onClose={() => setCell(null)} title={cell ? `${subjects.find((s) => s.id === cell.subjectId)?.name} · ${armLabel(cell.armId)}` : ''} size="sm"
        footer={<>{sel?.sheet && <Link href={`/review/${sel.sheet.id}`} className="btn btn-md btn-secondary">Open sheet</Link>}
          {sel?.alloc && ['NOT_STARTED', 'DRAFT', 'RETURNED'].includes(sel.status) && <Button icon={<Bell className="h-4 w-4" />} loading={busy} onClick={() => remind([{ armId: cell!.armId, subjectId: cell!.subjectId, uid: sel.alloc!.teacherUid }])}>Send reminder</Button>}</>}>
        {sel && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={sel.status as any} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Teacher</dt><dd className="font-medium">{sel.alloc?.teacherName ?? '—'}</dd></div>
            {sel.sheet?.stats && <><div className="flex justify-between"><dt className="text-slate-500">Class average</dt><dd>{sel.sheet.stats.classAverage ?? '—'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Pass rate</dt><dd>{sel.sheet.stats.passRate ?? '—'}%</dd></div></>}
            {sel.sheet?.submittedAt && <div className="flex justify-between"><dt className="text-slate-500">Submitted</dt><dd>{fmtDate(sel.sheet.submittedAt, true)}</dd></div>}
            {sel.status === 'UNALLOCATED' && <Alert tone="warn">No teacher is allocated. Assign one under Teacher allocation.</Alert>}
          </dl>
        )}
      </Modal>
    </>
  );
}
