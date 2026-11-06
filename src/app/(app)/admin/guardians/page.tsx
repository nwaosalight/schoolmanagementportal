'use client';
import { useMemo, useState } from 'react';
import { KeyRound, Link2, Plus } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { createAccount, resetPassword, type Credentials } from '@/lib/accounts';
import { linkGuardian } from '@/lib/students';
import { fullName } from '@/lib/utils';
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, Select, useToast, errMsg, type Column } from '@/components/ui';
import { CredentialsDialog } from '@/components/shared/credentials-dialog';
import type { Doc, Student, UserDoc } from '@/types';

export default function GuardiansPage() {
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const parents = useCollection<UserDoc>(useMemo(() => query(collection(db, 'users'), where('schoolId', '==', a.schoolId), where('roles', 'array-contains', 'parent')), [a.schoolId]));
  const students = useCollection<Student>(useMemo(() => sc(a.schoolId, 'students'), [a.schoolId])).data;
  const [creds, setCreds] = useState<Credentials[]>([]);
  const [linkFor, setLinkFor] = useState<Doc<UserDoc> | null>(null); const [stu, setStu] = useState('');
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; phone: string; studentId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const kids = (p: Doc<UserDoc>) => students.filter((s) => s.guardianUids?.includes(p.id));

  const cols: Column<Doc<UserDoc>>[] = [
    { key: 'name', header: 'Guardian', sortable: true, value: (p) => fullName(p), render: (p) => <div><p className="font-medium text-slate-900">{fullName(p)}</p><p className="text-xs text-slate-500">{p.email || p.loginId}</p></div> },
    { key: 'phone', header: 'Phone', value: (p) => p.phone },
    { key: 'kids', header: 'Children', value: (p) => kids(p).map((k) => k.firstName).join(' '), render: (p) => kids(p).length ? <div className="flex flex-wrap gap-1">{kids(p).map((k) => <Badge key={k.id} tone="blue">{k.firstName} {k.lastName}</Badge>)}</div> : <Badge tone="amber">No child linked</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (p) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" title="Link a child" onClick={() => { setLinkFor(p); setStu(''); }}><Link2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" title="Reset password" onClick={async () => { try { const r = await resetPassword({ id: p.id, email: p.email }); if (r.method === 'email') toast.success('Reset email sent.'); else setCreds([{ uid: p.id, name: fullName(p), login: p.loginId ?? '', password: r.password!, schoolCode: school!.code }]); } catch { toast.error('Could not reset (needs the resetUserPassword Cloud Function for accounts without email).'); } }}><KeyRound className="h-4 w-4" /></Button>
      </div>) },
  ];
  const studentOpts = students.filter((s) => s.status === 'ACTIVE').map((s) => ({ value: s.id, label: `${s.lastName} ${s.firstName} (${s.admissionNumber})` }));

  return (
    <>
      <PageHeader title="Parents & guardians" description="One parent can be linked to many children. Linked parents see published results only."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ firstName: '', lastName: '', email: '', phone: '', studentId: '' })}>Add guardian</Button>} />
      <DataTable rows={parents.data} columns={cols} loading={parents.loading} searchPlaceholder="Search guardians…" />
      <Modal open={!!linkFor} onClose={() => setLinkFor(null)} title={`Link a child to ${linkFor ? fullName(linkFor) : ''}`}
        footer={<><Button variant="secondary" onClick={() => setLinkFor(null)}>Cancel</Button><Button disabled={!stu} loading={busy} onClick={async () => { setBusy(true); try { await linkGuardian(a, students.find((s) => s.id === stu)!, linkFor!.id, fullName(linkFor)); toast.success('Linked.'); setLinkFor(null); } catch (e) { toast.error(errMsg(e)); } setBusy(false); }}>Link</Button></>}>
        <Field label="Student"><Select value={stu} onChange={(e) => setStu(e.target.value)} placeholder="Choose student" options={studentOpts} /></Field>
      </Modal>
      <Modal open={!!form} onClose={() => setForm(null)} title="Add guardian" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
        <Button loading={busy} onClick={async () => {
          if (!form!.firstName || !form!.lastName || (!form!.email && !form!.phone)) return toast.error('Enter a name and an email or phone number.');
          setBusy(true);
          try { const c = await createAccount(a, school!.code, { ...form!, email: form!.email || undefined, loginId: form!.phone, roles: ['parent'] }); if (form!.studentId) await linkGuardian(a, students.find((s) => s.id === form!.studentId)!, c.uid, c.name); setCreds([c]); setForm(null); }
          catch (e) { toast.error(errMsg(e)); } setBusy(false);
        }}>Create account</Button></>}>
        {form && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Last name" required><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Link to student (optional)" className="sm:col-span-2"><Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="Choose student" options={studentOpts} /></Field>
        </div>}
      </Modal>
      <CredentialsDialog items={creds} onClose={() => setCreds([])} />
    </>
  );
}
