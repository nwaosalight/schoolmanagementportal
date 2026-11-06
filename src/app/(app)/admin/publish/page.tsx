'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, EyeOff, Send, XCircle } from 'lucide-react';
import { query, updateDoc, where } from 'firebase/firestore';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings } from '@/lib/school/use-settings';
import { preflight, publishArm, scheduleBatch, unpublishArm, type Preflight } from '@/lib/results/publish';
import { fmtDate, timeAgo } from '@/lib/utils';
import { Alert, Badge, Button, Card, CardHeader, Checkbox, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Spinner, useToast, errMsg } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';

export default function PublishPage() {
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const { termId, setTermId, armId, setArmId, term } = useTermArm();
  const { armLabel, termLabel, arms } = useSchoolData();
  const { settings } = useSettings();
  const batches = useCollection<any>(useMemo(() => (termId ? query(sc(a.schoolId, 'publishBatches'), where('termId', '==', termId)) : null), [a.schoolId, termId]));
  const [pf, setPf] = useState<Preflight | null>(null); const [loading, setLoading] = useState(false); const [tick, setTick] = useState(0);
  const [notify, setNotify] = useState(true); const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'unpublish' | null>(null);
  const [sched, setSched] = useState(false); const [at, setAt] = useState('');
  useEffect(() => setNotify(settings.notifyOnPublish), [settings.notifyOnPublish]);

  useEffect(() => {
    if (!termId || !armId) { setPf(null); return; }
    let live = true; setLoading(true);
    preflight(a.schoolId, termId, armId).then((r) => live && setPf(r)).catch((e) => toast.error(errMsg(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.schoolId, termId, armId, tick]);

  // Scheduled batches run when an admin opens this page (no server scheduler in the free Firebase tier).
  useEffect(() => {
    if (!school || !term) return;
    const due = batches.data.filter((b) => b.status === 'SCHEDULED' && b.scheduledFor && new Date(b.scheduledFor) <= new Date());
    due.forEach(async (b) => { try { await publishArm({ actor: a, school, term, termLabel: termLabel(term.id), armId: b.armId, armLabel: armLabel(b.armId), notify: !!b.notify }); await updateDoc(sd(a.schoolId, 'publishBatches', b.id), { status: 'PUBLISHED', publishedAt: new Date() }); toast.success(`Scheduled publish ran for ${armLabel(b.armId)}.`); setTick((t) => t + 1); } catch (e) { toast.error(errMsg(e)); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches.data.length, term?.id]);

  const published = pf?.reports.length ? pf.reports.every((r) => r.published) : false;
  async function run(kind: 'publish' | 'unpublish') {
    if (!school || !term) return; setBusy(true);
    try {
      if (kind === 'publish') await publishArm({ actor: a, school, term, termLabel: termLabel(term.id), armId, armLabel: armLabel(armId), notify });
      else await unpublishArm({ actor: a, term, termLabel: termLabel(term.id), armId, armLabel: armLabel(armId) });
      toast.success(kind === 'publish' ? 'Results published.' : 'Results unpublished.'); setConfirm(null); setTick((t) => t + 1);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function schedule() {
    if (!at) return toast.error('Pick a date and time.');
    setBusy(true);
    try { await scheduleBatch(a, { termId, armId, armLabel: armLabel(armId), termLabel: termLabel(termId), at: new Date(at).toISOString(), notify }); toast.success('Publish scheduled.'); setSched(false); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  const history = [...batches.data].sort((x, y) => String(y.createdAt?.seconds ?? 0).localeCompare(String(x.createdAt?.seconds ?? 0)));

  return (
    <>
      <PageHeader title="Publish centre" description="Run final checks, then release report cards to parents and students." actions={<TermArmPicker termId={termId} armId={armId} onTerm={setTermId} onArm={setArmId} />} />
      {!armId ? <Card><EmptyState icon={<Send className="h-6 w-6" />} title="Choose a class" description="Pick a term and class to see whether it is ready to publish." /></Card> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title={`${armLabel(armId)} · ${termLabel(termId)}`} description="Pre-publish checklist" action={published ? <Badge tone="brand">Published</Badge> : pf?.ok ? <Badge tone="green">Ready</Badge> : <Badge tone="amber">Not ready</Badge>} />
            {loading || !pf ? <div className="flex justify-center p-10"><Spinner /></div> : (
              <>
                <ul className="divide-y divide-slate-100">{pf.checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3 px-5 py-3.5">{c.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-400" />}
                    <div><p className="text-sm font-medium text-slate-900">{c.label}</p>{c.detail && <p className="text-xs text-slate-500">{c.detail}</p>}</div></li>))}</ul>
                <div className="space-y-4 border-t border-slate-100 p-5">
                  <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label="Notify parents and students when published" />
                  <div className="flex flex-wrap gap-2">
                    <Button icon={<Send className="h-4 w-4" />} disabled={!pf.ok || published} onClick={() => setConfirm('publish')}>Publish now</Button>
                    <Button variant="secondary" icon={<CalendarClock className="h-4 w-4" />} disabled={!pf.ok || published} onClick={() => setSched(true)}>Schedule…</Button>
                    <Button variant="secondary" icon={<EyeOff className="h-4 w-4" />} disabled={!published} onClick={() => setConfirm('unpublish')}>Unpublish</Button>
                  </div>
                  {!pf.ok && <Alert tone="warn">Resolve the failed checks first. Use Computation to compute results once every sheet is approved.</Alert>}
                </div>
              </>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="History" />
            <ul className="divide-y divide-slate-100">{history.map((b) => (
              <li key={b.id} className="px-5 py-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">{b.armLabel}</span><Badge tone={b.status === 'PUBLISHED' ? 'brand' : b.status === 'SCHEDULED' ? 'amber' : 'slate'}>{b.status.toLowerCase()}</Badge></div>
                <p className="text-xs text-slate-500">{b.status === 'SCHEDULED' ? `Scheduled for ${fmtDate(b.scheduledFor, true)}` : `${b.publishedByName} · ${timeAgo(b.publishedAt ?? b.unpublishedAt ?? b.createdAt)}`}</p></li>))}
              {history.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">Nothing published for this term yet.</li>}</ul>
          </Card>
        </div>
      )}
      <ConfirmDialog open={confirm === 'publish'} onClose={() => setConfirm(null)} loading={busy} onConfirm={() => run('publish')} confirmLabel="Publish" title="Publish results?"
        message={<>{pf?.reports.length} report card(s) for <strong>{armLabel(armId)}</strong> become visible to linked parents and students{notify ? ', and they will be notified' : ''}.</>} />
      <ConfirmDialog open={confirm === 'unpublish'} onClose={() => setConfirm(null)} loading={busy} danger onConfirm={() => run('unpublish')} confirmLabel="Unpublish" title="Unpublish results?"
        message="Parents and students will immediately lose access, and verification codes on printed cards will show as withdrawn." />
      <Modal open={sched} onClose={() => setSched(false)} title="Schedule publishing" size="sm" description="The batch runs the next time an admin opens this page after the chosen time."
        footer={<><Button variant="secondary" onClick={() => setSched(false)}>Cancel</Button><Button loading={busy} onClick={schedule}>Schedule</Button></>}>
        <Field label="Publish at"><Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
      </Modal>
    </>
  );
}
