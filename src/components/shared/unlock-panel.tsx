'use client';
import { useMemo, useState } from 'react';
import { Check, Unlock, X } from 'lucide-react';
import { addDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { transitionSheet } from '@/lib/results/sheets';
import { unpublishArm } from '@/lib/results/publish';
import { Badge, Button, DataTable, EmptyState, Field, Modal, Textarea, useToast, errMsg, type Column } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import type { Doc, Sheet } from '@/types';

export function RequestUnlockButton({ sheet }: { sheet: Doc<Sheet> }) {
  const a = useActor(); const toast = useToast();
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  async function send() {
    if (reason.trim().length < 10) return toast.error('Please explain why (at least 10 characters).');
    setBusy(true);
    try {
      await addDoc(sc(a.schoolId, 'unlockRequests'), { termId: sheet.termId, resultSheetId: sheet.id, sheetLabel: `${sheet.subjectName} · ${sheet.armLabel}`, reason: reason.trim(), status: 'PENDING', requestedByUid: a.uid, requestedByName: a.name, createdAt: serverTimestamp() });
      toast.success('Unlock request sent.'); setOpen(false); setReason('');
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <Button variant="secondary" size="sm" icon={<Unlock className="h-4 w-4" />} onClick={() => setOpen(true)}>Request unlock</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request unlock" description={`${sheet.subjectName} · ${sheet.armLabel}`}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} onClick={send}>Send request</Button></>}>
        <Field label="Why does this result need to change?" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Exam score for two students was transposed." /></Field>
      </Modal>
    </>
  );
}

export function UnlockPanel({ canDecide }: { canDecide?: boolean }) {
  const a = useActor(); const toast = useToast();
  const { terms, termLabel, armLabel } = useSchoolData();
  const { data, loading } = useCollection<any>(useMemo(() => sc(a.schoolId, 'unlockRequests'), [a.schoolId]));
  const [busy, setBusy] = useState<string | null>(null);
  const rows = [...data].sort((x, y) => (y.createdAt?.seconds ?? 0) - (x.createdAt?.seconds ?? 0));

  async function decide(r: Doc<any>, approve: boolean) {
    setBusy(r.id);
    try {
      if (approve) {
        const snap = await getDoc(sd(a.schoolId, 'sheets', r.resultSheetId));
        if (!snap.exists()) throw new Error('The result sheet no longer exists.');
        let sheet = { id: snap.id, ...snap.data() } as Doc<Sheet>;
        const term = terms.find((t) => t.id === sheet.termId);
        if (term) await unpublishArm({ actor: a, term, termLabel: termLabel(term.id), armId: sheet.armId, armLabel: armLabel(sheet.armId) });
        sheet = { id: snap.id, ...(await getDoc(snap.ref)).data() } as Doc<Sheet>;
        await transitionSheet({ actor: a, sheet, to: 'RETURNED', action: 'UNLOCK', comment: r.reason, extra: { returnedReason: `Unlocked: ${r.reason}` },
          notifyUids: [r.requestedByUid], notifyTitle: 'Unlock approved', notifyBody: `${r.sheetLabel} is open for correction.`, notifyLink: `/teacher/sheets/${sheet.id}` });
      }
      await updateDoc(sd(a.schoolId, 'unlockRequests', r.id), { status: approve ? 'APPROVED' : 'REJECTED', reviewedByUid: a.uid, reviewedByName: a.name, reviewedAt: serverTimestamp() });
      toast.success(approve ? 'Approved. The sheet is open for correction and the class was unpublished.' : 'Request rejected.');
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(null);
  }
  const cols: Column<Doc<any>>[] = [
    { key: 'sheet', header: 'Result sheet', value: (r) => r.sheetLabel, render: (r) => <div><p className="font-medium text-slate-900">{r.sheetLabel}</p><p className="max-w-md text-xs text-slate-500">{r.reason}</p></div> },
    { key: 'by', header: 'Requested by', value: (r) => r.requestedByName },
    { key: 'when', header: 'When', value: (r) => r.createdAt?.seconds ?? 0, render: (r) => timeAgo(r.createdAt) },
    { key: 'status', header: 'Status', value: (r) => r.status, render: (r) => <Badge tone={r.status === 'PENDING' ? 'amber' : r.status === 'APPROVED' ? 'green' : 'red'}>{r.status.toLowerCase()}</Badge> },
    ...(canDecide ? [{ key: 'act', header: '', className: 'text-right', render: (r: Doc<any>) => r.status === 'PENDING' ? (
      <div className="flex justify-end gap-1.5"><Button size="sm" variant="secondary" loading={busy === r.id} icon={<X className="h-4 w-4" />} onClick={() => decide(r, false)}>Reject</Button><Button size="sm" loading={busy === r.id} icon={<Check className="h-4 w-4" />} onClick={() => decide(r, true)}>Approve</Button></div>) : null } as Column<Doc<any>>] : []),
  ];
  return <DataTable rows={rows} columns={cols} loading={loading} empty={<EmptyState icon={<Unlock className="h-6 w-6" />} title="No unlock requests" description="Teachers can request an unlock from a published or approved sheet." />} />;
}
