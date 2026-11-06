'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { collection, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { sc, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { DEFAULT_BANDS, DEFAULT_COMPONENTS, DEFAULT_SETTINGS, DEFAULT_TRAITS } from '@/lib/seed';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ schoolName: '', code: '', firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: k === 'code' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!/^[A-Z0-9]{3,10}$/.test(f.code)) return setError('School code must be 3–10 letters or numbers.');
    if (f.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    let created: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;
    try {
      if ((await getDoc(doc(db, 'schoolCodes', f.code))).exists()) throw new Error('That school code is already taken. Try another.');
      created = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
      const uid = created.user.uid;
      const schoolRef = doc(collection(db, 'schools'));
      const b = writeBatch(db);
      b.set(schoolRef, { code: f.code, name: f.schoolName.trim(), status: 'ACTIVE', ownerUid: uid, email: f.email.trim(), phone: f.phone, createdAt: serverTimestamp() });
      b.set(doc(db, 'schoolCodes', f.code), { schoolId: schoolRef.id, name: f.schoolName.trim() });
      b.set(doc(db, 'users', uid), {
        schoolId: schoolRef.id, roles: ['school_admin'], firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim(), phone: f.phone,
        status: 'ACTIVE', mustChangePassword: false, termsAcceptedAt: serverTimestamp(), createdAt: serverTimestamp(),
      });
      await b.commit();

      // Seed sensible defaults (now that the admin profile exists)
      const w = new Writer();
      const sid = schoolRef.id;
      w.set(doc(sc(sid, 'gradingSchemes')), { name: 'Standard A–F', passMark: 40, bands: DEFAULT_BANDS, isDefault: true });
      w.set(doc(sc(sid, 'assessmentStructures')), { name: 'Standard 15 / 15 / 70', total: 100, components: DEFAULT_COMPONENTS, isDefault: true });
      DEFAULT_TRAITS.forEach((t) => w.set(doc(sc(sid, 'traits')), t));
      w.set(sd(sid, 'settings', 'general'), DEFAULT_SETTINGS);
      await w.commit();
      router.replace('/admin');
    } catch (err: any) {
      if (created) await deleteUser(created.user).catch(() => {});
      setError(err?.code === 'auth/email-already-in-use' ? 'An account with this email already exists. Sign in instead.' : err?.message?.replace('Firebase: ', '') ?? 'Registration failed.');
      setBusy(false);
    }
  }

  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Register your school</h1>
      <p className="mt-1 text-sm text-slate-500">Create the school and its first administrator account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="School name" required><Input value={f.schoolName} onChange={set('schoolName')} required /></Field>
        <Field label="School code" required hint="Short code used on login slips, e.g. GRM001"><Input value={f.code} onChange={set('code')} required maxLength={10} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required><Input value={f.firstName} onChange={set('firstName')} required /></Field>
          <Field label="Last name" required><Input value={f.lastName} onChange={set('lastName')} required /></Field>
        </div>
        <Field label="Admin email" required><Input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        <Field label="Password" required hint="At least 8 characters"><Input type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" /></Field>
        <Button type="submit" loading={busy} className="w-full">Create school</Button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link href="/login" className="font-medium text-brand-600">Sign in</Link></p>
      </form>
    </Card>
  );
}
