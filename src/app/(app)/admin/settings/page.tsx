'use client';
import { useEffect, useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useSettings } from '@/lib/school/use-settings';
import { sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Switch, useToast, errMsg } from '@/components/ui';

export default function SettingsPage() {
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const { settings } = useSettings();
  const [f, setF] = useState({ allowQueries: true, notifyOnPublish: true, scoreDeadline: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => setF({ allowQueries: settings.allowQueries, notifyOnPublish: settings.notifyOnPublish, scoreDeadline: settings.scoreDeadline ?? '' }), [settings]);
  async function save() {
    setBusy(true);
    try { await setDoc(sd(a.schoolId, 'settings', 'general'), f, { merge: true }); const w = new Writer(); addAudit(w, a, { action: 'SETTINGS_CHANGE', entityType: 'Settings', summary: 'Updated school settings' }); await w.commit(); toast.success('Settings saved.'); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Settings" description="Notifications, deadlines and parent features." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Workflow" />
          <div className="space-y-5 p-5">
            <Field label="Score entry deadline" hint="Shown on teachers' dashboards"><Input type="date" value={f.scoreDeadline} onChange={(e) => setF({ ...f, scoreDeadline: e.target.value })} /></Field>
            <Switch label="Parents can raise result queries" checked={f.allowQueries} onChange={(v) => setF({ ...f, allowQueries: v })} />
            <Switch label="Notify parents and students on publish (default)" checked={f.notifyOnPublish} onChange={(v) => setF({ ...f, notifyOnPublish: v })} />
            <Button loading={busy} onClick={save}>Save settings</Button>
          </div>
        </Card>
        <Card>
          <CardHeader title="Account & data" />
          <dl className="divide-y divide-slate-100 text-sm">
            {[['School code', school?.code], ['Plan', school?.planId ?? 'Standard'], ['Status', school?.status]].map(([k, v]) => <div key={k as string} className="flex justify-between px-5 py-3"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            <div className="px-5 py-3 text-slate-600">Backups: enable scheduled Firestore exports in the Google Cloud console. All score changes are kept in the <Badge tone="brand">Audit log</Badge>.</div>
          </dl>
        </Card>
      </div>
    </>
  );
}
