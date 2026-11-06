'use client';
import { useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { createAccount, resetPassword, type Credentials } from '@/lib/accounts';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { ROLE_LABEL } from '@/config/routes';
import { fmtDate, fullName } from '@/lib/utils';
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, Field, Input, Modal, PageHeader, Tabs, useToast, errMsg, type Column } from '@/components/ui';
import { CredentialsDialog } from '@/components/shared/credentials-dialog';
import { ImportWizard } from '@/components/shared/import-wizard';
import type { DataRole, Doc, UserDoc } from '@/types';

const ROLE_OPTIONS: DataRole[] = ['teacher', 'hod', 'principal', 'exam_officer', 'school_admin', 'parent'];
type Tab = 'staff' | 'parents' | 'students' | 'import';

export default function UsersPage() {
  const a = useActor();
  const { school } = useAuth();
  const toast = useToast();
  const q = useMemo(() => query(collection(db, 'users'), where('schoolId', '==', a.schoolId)), [a.schoolId]);
  const { data: users, loading } = useCollection<UserDoc>(q);
  const [tab, setTab] = useState<Tab>('staff');
  const [form, setForm] = useState<{ id?: string; firstName: string; lastName: string; email: string; phone: string; staffNumber: string; roles: DataRole[] } | null>(null);
  const [creds, setCreds] = useState<Credentials[]>([]);
  const [busy, setBusy] = useState(false);
  const [toggle, setToggle] = useState<Doc<UserDoc> | null>(null);
  const isSuperAdmin = a.role === 'school_admin';

  const rows = users.filter((u) => (tab === 'staff' ? u.roles.some((r) => !['parent', 'student'].includes(r)) : tab === 'parents' ? u.roles.includes('parent') && !u.roles.some((r) => !['parent', 'student'].includes(r)) : u.roles.includes('student') && u.roles.length === 1));

  async function save() {
    if (!form || !school) return;
    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('Enter first and last name.');
    if (!form.roles.length) return toast.error('Choose at least one role.');
    if (!form.id && !form.roles.includes('parent') && !form.email.trim()) return toast.error('Staff accounts need an email address.');
    setBusy(true);
    try {
      if (form.id) {
        const w = new Writer();
        await updateDoc(doc(db, 'users', form.id), { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone, staffNumber: form.staffNumber || null, roles: form.roles });
        addAudit(w, a, { action: 'PERMISSION_CHANGE', entityType: 'User', entityId: form.id, summary: `Updated ${form.firstName} ${form.lastName}: roles ${form.roles.join(', ')}` }); await w.commit();
        toast.success('User updated.');
      } else {
        const c = await createAccount(a, school.code, { ...form, email: form.email || undefined, loginId: form.phone || undefined });
        setCreds([c]);
      }
      setForm(null);
    } catch (e: any) { toast.error(e?.code === 'auth/email-already-in-use' ? 'That email is already registered.' : errMsg(e)); }
    setBusy(false);
  }
  async function doReset(u: Doc<UserDoc>) {
    try {
      const r = await resetPassword({ id: u.id, email: u.email });
      if (r.method === 'email') toast.success(`Reset link sent to ${u.email}.`);
      else setCreds([{ uid: u.id, name: fullName(u), login: u.loginId ?? '', password: r.password!, schoolCode: school!.code }]);
    } catch (e) { toast.error('Could not reset. For accounts without email this needs the "resetUserPassword" Cloud Function to be deployed.'); void e; }
  }
  async function flip() {
    if (!toggle) return; setBusy(true);
    try {
      const next = toggle.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
      await updateDoc(doc(db, 'users', toggle.id), { status: next });
      const w = new Writer(); addAudit(w, a, { action: 'PERMISSION_CHANGE', entityType: 'User', entityId: toggle.id, summary: `${next === 'ACTIVE' ? 'Reactivated' : 'Deactivated'} ${fullName(toggle)}` }); await w.commit();
      toast.success(next === 'ACTIVE' ? 'Account reactivated.' : 'Account deactivated.'); setToggle(null);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }

  const cols: Column<Doc<UserDoc>>[] = [
    { key: 'name', header: 'Name', sortable: true, value: (u) => fullName(u), render: (u) => <div><p className="font-medium text-slate-900">{fullName(u)}</p><p className="text-xs text-slate-500">{u.email || u.loginId || u.phone}</p></div> },
    { key: 'roles', header: 'Roles', value: (u) => u.roles.join(' '), render: (u) => <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="brand">{ROLE_LABEL[r]}</Badge>)}</div> },
    { key: 'phone', header: 'Phone', value: (u) => u.phone },
    { key: 'last', header: 'Last sign-in', value: (u) => u.lastLoginAt as any, render: (u) => (u.lastLoginAt ? fmtDate(u.lastLoginAt) : <span className="text-slate-400">Never</span>) },
    { key: 'status', header: 'Status', value: (u) => u.status, render: (u) => <Badge tone={u.status === 'ACTIVE' ? 'green' : 'slate'}>{u.status === 'ACTIVE' ? 'Active' : 'Deactivated'}</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: (u) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" title="Edit" aria-label="Edit" onClick={() => setForm({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email ?? '', phone: u.phone ?? '', staffNumber: u.staffNumber ?? '', roles: u.roles })}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" title="Reset password" aria-label="Reset password" onClick={() => doReset(u)}><KeyRound className="h-4 w-4" /></Button>
        {u.id !== a.uid && <Button variant="ghost" size="sm" title={u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} aria-label="Toggle active" onClick={() => setToggle(u)}>{u.status === 'ACTIVE' ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-emerald-600" />}</Button>}
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Users & staff" description="Create accounts, assign roles, and manage access." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ firstName: '', lastName: '', email: '', phone: '', staffNumber: '', roles: ['teacher'] })}>Add user</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'staff', label: 'Staff', count: users.filter((u) => u.roles.some((r) => !['parent', 'student'].includes(r))).length }, { value: 'parents', label: 'Parents' }, { value: 'students', label: 'Student logins' }, { value: 'import', label: 'Import CSV' }]} />
      {tab === 'import' ? <StaffImport existingEmails={new Set(users.map((u) => (u.email ?? '').toLowerCase()))} /> : <DataTable rows={rows} columns={cols} loading={loading} searchPlaceholder="Search by name, email or phone…" />}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit user' : 'Add user'} footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button loading={busy} onClick={save}>{form?.id ? 'Save' : 'Create account'}</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
            <Field label="Last name" required><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
            <Field label="Email" hint={form.roles.includes('parent') ? 'Optional for parents — they can sign in with phone + school code' : 'Used to sign in'} className="sm:col-span-2">
              <Input type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Staff number"><Input value={form.staffNumber} onChange={(e) => setForm({ ...form, staffNumber: e.target.value })} /></Field>
            <div className="sm:col-span-2"><p className="label">Roles</p>
              <div className="grid grid-cols-2 gap-2">{ROLE_OPTIONS.filter((r) => isSuperAdmin || r !== 'school_admin').map((r) => (
                <Checkbox key={r} label={ROLE_LABEL[r]} checked={form.roles.includes(r)} onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, r] : form.roles.filter((x) => x !== r) })} />
              ))}</div>
              <p className="mt-1.5 text-xs text-slate-500">Teachers can also be class teachers — assign that under Teacher allocation.</p>
            </div>
          </div>
        )}
      </Modal>
      <CredentialsDialog items={creds} onClose={() => setCreds([])} />
      <ConfirmDialog open={!!toggle} onClose={() => setToggle(null)} onConfirm={flip} loading={busy} danger={toggle?.status === 'ACTIVE'} confirmLabel={toggle?.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
        title={toggle?.status === 'ACTIVE' ? 'Deactivate account?' : 'Reactivate account?'} message={<>{toggle?.status === 'ACTIVE' ? `${fullName(toggle)} will no longer be able to use the portal. Their records are kept.` : `${fullName(toggle)} will be able to sign in again.`}</>} />
    </>
  );
}

function StaffImport({ existingEmails }: { existingEmails: Set<string> }) {
  const a = useActor();
  const { school } = useAuth();
  type R = { firstName: string; lastName: string; email: string; phone: string; role: DataRole; staffNumber: string };
  return (
    <ImportWizard<R>
      title="Import users" description="Create many accounts at once. Each gets a temporary password."
      headers={['firstName', 'lastName', 'email', 'phone', 'role', 'staffNumber']} example={['Ada', 'Okafor', 'ada@school.com', '08030000000', 'teacher', 'T-001']}
      previewCols={[{ header: 'Name', get: (r) => `${r.firstName} ${r.lastName}` }, { header: 'Email', get: (r) => r.email }, { header: 'Role', get: (r) => r.role }]}
      parse={(rows) => {
        const valid: R[] = []; const errors: { row: number; message: string }[] = []; const seen = new Set<string>();
        rows.forEach((r, i) => {
          const role = (r.role || '').toLowerCase() as DataRole; const email = (r.email || '').toLowerCase();
          if (!r.firstName || !r.lastName) return errors.push({ row: i + 2, message: 'First and last name are required.' });
          if (!ROLE_OPTIONS.includes(role)) return errors.push({ row: i + 2, message: `Unknown role "${r.role}". Use: ${ROLE_OPTIONS.join(', ')}.` });
          if (role !== 'parent' && !/^\S+@\S+\.\S+$/.test(email)) return errors.push({ row: i + 2, message: 'A valid email is required for staff.' });
          if (email && (existingEmails.has(email) || seen.has(email))) return errors.push({ row: i + 2, message: `${email} already exists.` });
          if (role === 'parent' && !email && !r.phone) return errors.push({ row: i + 2, message: 'Parents need an email or a phone number.' });
          if (email) seen.add(email);
          valid.push({ firstName: r.firstName, lastName: r.lastName, email, phone: r.phone || '', role, staffNumber: r.staffNumber || '' });
        });
        return { valid, errors };
      }}
      run={async (valid, progress) => {
        const creds: string[][] = []; let failed = 0;
        for (let i = 0; i < valid.length; i++) {
          const v = valid[i];
          try { const c = await createAccount(a, school!.code, { firstName: v.firstName, lastName: v.lastName, roles: [v.role], email: v.email || undefined, phone: v.phone, loginId: v.phone, staffNumber: v.staffNumber }); creds.push([c.name, c.login, c.password, c.schoolCode]); }
          catch { failed++; }
          progress(i + 1, valid.length);
        }
        return { summary: `${creds.length} account(s) created${failed ? `, ${failed} failed (duplicates or invalid)` : ''}.`, credentials: creds };
      }} />
  );
}
