'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, ShieldCheck } from 'lucide-react';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { approveSheet } from '@/lib/results/sheets';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Stat, StatusBadge, Tabs, useToast, errMsg, type Column } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import { toDate } from '@/lib/utils';
import type { Doc, Sheet } from '@/types';

export default function ReviewQueue() {
  const a = useActor(); const router = useRouter(); const toast = useToast();
  const { termId, setTermId } = useTermArm();
  const sheets = useCollection<Sheet>(useMemo(() => (termId ? query(sc(a.schoolId, 'sheets'), where('termId', '==', termId)) : null), [a.schoolId, termId]));
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [sel, setSel] = useState<Set<string>>(new Set()); const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false);
  const pending = sheets.data.filter((s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW');
  const rows = (tab === 'pending' ? pending : sheets.data).sort((x, y) => (toDate(x.submittedAt)?.getTime() ?? 0) - (toDate(y.submittedAt)?.getTime() ?? 0));
  const age = (s: Sheet) => { const d = toDate(s.submittedAt); return d ? Math.floor((Date.now() - +d) / 86400000) : null; };
  const count = (st: string) => sheets.data.filter((s) => s.status === st).length;

  const cols: Column<Doc<Sheet>>[] = [
    { key: 'subject', header: 'Subject', sortable: true, value: (s) => s.subjectName, render: (s) => <span className="font-medium text-slate-900">{s.subjectName}</span> },
    { key: 'class', header: 'Class', sortable: true, value: (s) => s.armLabel },
    { key: 'teacher', header: 'Teacher', value: (s) => s.teacherName },
    { key: 'avg', header: 'Class avg', value: (s) => s.stats?.classAverage ?? 0, render: (s) => s.stats?.classAverage ?? '—' },
    { key: 'blanks', header: 'Missing', value: (s) => s.stats?.blanks ?? 0, render: (s) => (s.stats?.blanks ? <Badge tone="amber">{s.stats.blanks}</Badge> : <span className="text-slate-300">0</span>) },
    { key: 'age', header: 'Waiting', value: (s) => age(s) ?? -1, render: (s) => { const d = age(s); return d == null ? '—' : <Badge tone={d >= 3 ? 'red' : d >= 1 ? 'amber' : 'slate'}>{d === 0 ? 'today' : `${d}d`}</Badge>; } },
    { key: 'status', header: 'Status', value: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
  ];
  async function bulk() {
    setBusy(true);
    try { for (const s of pending.filter((x) => sel.has(x.id))) await approveSheet(a, s); toast.success(`${sel.size} sheet(s) approved.`); setSel(new Set()); setConfirm(false); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Review queue" description="Check submitted results, then approve or return them with comments." actions={<TermArmPicker termId={termId} onTerm={setTermId} showArm={false} />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Awaiting review" value={pending.length} tone={pending.length ? 'amber' : 'green'} icon={<ShieldCheck className="h-5 w-5" />} />
        <Stat label="Approved" value={count('APPROVED') + count('PUBLISHED') + count('LOCKED')} tone="green" />
        <Stat label="Returned" value={count('RETURNED')} tone="red" />
        <Stat label="Still drafting" value={count('DRAFT')} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'Needs review', count: pending.length }, { value: 'all', label: 'All sheets' }]} />
      <DataTable rows={rows} columns={cols} loading={sheets.loading} selectable={tab === 'pending'} selected={sel} onSelectedChange={setSel} onRowClick={(s) => router.push(`/review/${s.id}`)} searchPlaceholder="Search subject, class or teacher…"
        toolbar={sel.size > 0 ? <Button size="sm" icon={<CheckCheck className="h-4 w-4" />} onClick={() => setConfirm(true)}>Approve {sel.size} selected</Button> : undefined}
        empty={<EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Nothing waiting for review" description="Submitted results will appear here." />} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={bulk} loading={busy} confirmLabel="Approve all" title="Approve selected sheets?" message="Bulk approval skips line-by-line review. Open a sheet instead if you want to inspect its scores first." />
    </>
  );
}
