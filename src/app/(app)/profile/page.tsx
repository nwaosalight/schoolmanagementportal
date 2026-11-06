'use client';
import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/auth-provider';
import { ROLE_LABEL } from '@/config/routes';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, useToast, errMsg } from '@/components/ui';

export default function ProfilePage() {
  const { profile, roles } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', phone: profile?.phone ?? '' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [b1, setB1] = useState(false); const [b2, setB2] = useState(false);
  if (!profile) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setB1(true);
    try { await updateDoc(doc(db, 'users', profile!.id), f); toast.success('Profile updated.'); } catch (err) { toast.error(errMsg(err)); }
    setB1(false);
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) return toast.error('Use 8+ characters with a letter and a number.');
    if (pw.next !== pw.confirm) return toast.error('Passwords do not match.');
    setB2(true);
    try {
      const u = auth.currentUser!;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email!, pw.current));
      await updatePassword(u, pw.next);
      setPw({ current: '', next: '', confirm: '' }); toast.success('Password changed.');
    } catch (err: any) { toast.error(err?.code === 'auth/invalid-credential' ? 'Current password is incorrect.' : errMsg(err)); }
    setB2(false);
  }
  return (
    <>
      <PageHeader title="Profile & security" description="Manage your details and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your details" description={profile.email || profile.loginId || ''} />
          <form onSubmit={saveProfile} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} required /></Field>
              <Field label="Last name"><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} required /></Field>
            </div>
            <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <div><p className="label">Roles</p><div className="flex flex-wrap gap-1.5">{roles.map((r) => <Badge key={r} tone="brand">{ROLE_LABEL[r]}</Badge>)}</div></div>
            <Button type="submit" loading={b1}>Save changes</Button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={changePw} className="space-y-4 p-5">
            <Field label="Current password"><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required autoComplete="current-password" /></Field>
            <Field label="New password" hint="8+ characters with a letter and a number"><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required autoComplete="new-password" /></Field>
            <Field label="Confirm new password"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required autoComplete="new-password" /></Field>
            <Button type="submit" loading={b2}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
