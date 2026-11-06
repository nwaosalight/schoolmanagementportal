'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Plus, Unlink, UserPlus } from 'lucide-react';
import { collection, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useCollection, useDoc } from '@/lib/firebase/hooks';
import { sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { createAccount, resetPassword, type Credentials } from '@/lib/accounts';
import { linkGuardian, moveStudents, setStudentUser, unlinkGuardian } from '@/lib/students';
import { fmtDate, fullName } from '@/lib/utils';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, PageLoader, Select, Tabs, useToast, errMsg } from '@/components/ui';
import { StudentForm } from '@/components/shared/student-form';
import { CredentialsDialog } from '@/components/shared/credentials-dialog';
import type { Student, UserDoc } from '@/types';

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const { arms, armLabel } = useSchoolData();
  const { data: s, loading } = useDoc<Student>(useMemo(() => sd(a.schoolId, 'students', studentId), [a.schoolId, studentId]));
  const parents = useCollection<UserDoc>(useMemo(() => query(collection(db, 'users'), where('schoolId', '==', a.schoolId), where('roles', 'array-contains', 'parent')), [a.schoolId])).data;
  const [tab, setTab] = useState<'profile' | 'guardians' | 'class' | 'account'>('profile');
  const [creds, setCreds] = useState<Credentials[]>([]);
  const [link, setLink] = useState(''); const [busy, setBusy] = useState(false);
  const [newG, setNewG] = useState<{ firstName: string; lastName: string; email: string; phone: string } | null>(null);
  const [mv, setMv] = useState({ armId: '', note: 'Promoted' });
  if (loading) return <PageLoader />;
  if (!s) return <Alert tone="error" title="Student not found" />;

  const linked = parents.filter((p) => s.guardianUids?.includes(p.id));
  const unlinked = parents.filter((p) => !s.guardianUids?.includes(p.id));
  const guard = async (fn: () => Promise<void>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); } catch (e) { toast.error(errMsg(e)); } setBusy(false); };

  return (
    <>
      <PageHeader back={<Link href="/admin/students" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Students</Link>}
        title={`${s.firstName} ${s.lastName}`} description={`${s.admissionNumber} · ${armLabel(s.armId)}`}
        actions={<Badge tone={s.status === 'ACTIVE' ? 'green' : 'slate'}>{s.status.toLowerCase()}</Badge>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'profile', label: 'Profile' }, { value: 'guardians', label: 'Guardians', count: linked.length }, { value: 'class', label: 'Class & status' }, { value: 'account', label: 'Student login' }]} />

      {tab === 'profile' && <Card className="max-w-3xl p-6"><StudentForm student={s} onSaved={() => {}} /></Card>}

      {tab === 'guardians' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Linked guardians" description="Linked parents see this student's published results." />
            {linked.length === 0 ? <EmptyState title="No guardian linked" description="Link an existing parent or create a new account." /> : (
              <ul className="divide-y divide-slate-100">{linked.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div><p className="text-sm font-medium text-slate-900">{fullName(p)}</p><p className="text-xs text-slate-500">{p.email || p.loginId || p.phone}</p></div>
                  <Button variant="ghost" size="sm" icon={<Unlink className="h-4 w-4" />} onClick={() => guard(() => unlinkGuardian(a, s, p.id, fullName(p)), 'Guardian unlinked.')}>Unlink</Button>
                </li>))}</ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Add a guardian" />
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Select className="flex-1" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Choose existing parent…" options={unlinked.map((p) => ({ value: p.id, label: `${fullName(p)} (${p.email || p.phone || p.loginId})` }))} />
                <Button disabled={!link} loading={busy} onClick={() => guard(async () => { const p = parents.find((x) => x.id === link)!; await linkGuardian(a, s, p.id, fullName(p)); setLink(''); }, 'Guardian linked.')}>Link</Button>
              </div>
              <div className="relative text-center text-xs text-slate-400"><span className="bg-white px-2">or</span><div className="absolute inset-x-0 top-1/2 -z-10 border-t border-slate-100" /></div>
              <Button variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setNewG({ firstName: '', lastName: s.lastName, email: '', phone: '' })}>Create a new parent account</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'class' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Move to another class" description={`Currently ${armLabel(s.armId)}`} />
            <div className="space-y-4 p-5">
              <Field label="Class"><Select value={mv.armId} onChange={(e) => setMv({ ...mv, armId: e.target.value })} placeholder="Select class" options={arms.map((x) => ({ value: x.id, label: armLabel(x.id) }))} /></Field>
              <Field label="Reason"><Select value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} options={['Promoted', 'Repeated', 'Re-assigned', 'Transferred in'].map((v) => ({ value: v, label: v }))} /></Field>
              <Button disabled={!mv.armId} loading={busy} onClick={() => guard(() => moveStudents(a, [s], mv.armId, armLabel(mv.armId), mv.note), 'Student moved.')}>Move student</Button>
            </div>
            <div className="border-t border-slate-100 p-5">
              <Field label="Enrolment status"><Select value={s.status} onChange={(e) => guard(() => updateDoc(sd(a.schoolId, 'students', s.id), { status: e.target.value }), 'Status updated.')} options={['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() }))} /></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Class history" />
            <ol className="divide-y divide-slate-100">{[...(s.history ?? [])].reverse().map((h, i) => (
              <li key={i} className="flex justify-between px-5 py-3 text-sm"><span className="font-medium text-slate-800">{h.armLabel}</span><span className="text-slate-500">{h.note} · {fmtDate(h.at)}</span></li>))}
              {!s.history?.length && <li className="px-5 py-8 text-center text-sm text-slate-500">No history yet.</li>}</ol>
          </Card>
        </div>
      )}

      {tab === 'account' && (
        <Card className="max-w-xl">
          <CardHeader title="Student portal login" description="Optional. Younger pupils usually view results through a parent account." />
          <div className="space-y-4 p-5">
            {s.userId ? (
              <>
                <Alert tone="success">This student has a login. They sign in with their admission number and the school code <strong>{school?.code}</strong>.</Alert>
                <Button variant="secondary" icon={<KeyRound className="h-4 w-4" />} onClick={() => guard(async () => { const r = await resetPassword({ id: s.userId!, email: null }); setCreds([{ uid: s.userId!, name: `${s.firstName} ${s.lastName}`, login: s.admissionNumber, password: r.password!, schoolCode: school!.code }]); }, 'New temporary password generated.')}>Reset password</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">Create an account so this student can sign in with <strong>{s.admissionNumber}</strong> and the school code.</p>
                <Button icon={<Plus className="h-4 w-4" />} loading={busy} onClick={() => guard(async () => { const c = await createAccount(a, school!.code, { firstName: s.firstName, lastName: s.lastName, roles: ['student'], loginId: s.admissionNumber }); await setStudentUser(a, s, c.uid); setCreds([c]); }, 'Student login created.')}>Create student login</Button>
              </>
            )}
          </div>
        </Card>
      )}

      <Modal open={!!newG} onClose={() => setNewG(null)} title="New parent account" footer={<><Button variant="secondary" onClick={() => setNewG(null)}>Cancel</Button>
        <Button loading={busy} onClick={() => guard(async () => {
          if (!newG!.firstName || !newG!.lastName || (!newG!.email && !newG!.phone)) throw new Error('Enter a name and an email or phone number.');
          const c = await createAccount(a, school!.code, { ...newG!, email: newG!.email || undefined, loginId: newG!.phone, roles: ['parent'] });
          await linkGuardian(a, s, c.uid, c.name); setCreds([c]); setNewG(null);
        }, 'Parent account created and linked.')}>Create & link</Button></>}>
        {newG && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required><Input value={newG.firstName} onChange={(e) => setNewG({ ...newG, firstName: e.target.value })} /></Field>
          <Field label="Last name" required><Input value={newG.lastName} onChange={(e) => setNewG({ ...newG, lastName: e.target.value })} /></Field>
          <Field label="Email" hint="Optional if a phone number is given"><Input type="email" value={newG.email} onChange={(e) => setNewG({ ...newG, email: e.target.value })} /></Field>
          <Field label="Phone" hint="Parent signs in with this + school code if no email"><Input value={newG.phone} onChange={(e) => setNewG({ ...newG, phone: e.target.value })} /></Field>
        </div>}
      </Modal>
      <CredentialsDialog items={creds} onClose={() => setCreds([])} />
    </>
  );
}
