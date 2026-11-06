'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/auth-provider';
import { Alert, Button, Card, Checkbox, Field, Input, PageLoader } from '@/components/ui';
import { GraduationCap } from 'lucide-react';

export default function FirstLoginPage() {
  const router = useRouter();
  const { fbUser, profile, loading } = useAuth();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (loading) return;
    if (!fbUser) router.replace('/login');
    else if (profile && !profile.mustChangePassword) router.replace('/');
  }, [loading, fbUser, profile, router]);
  if (loading || !profile) return <PageLoader />;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return setError('Include at least one letter and one number.');
    if (pw !== pw2) return setError('Passwords do not match.');
    if (!terms) return setError('Please accept the terms to continue.');
    setBusy(true);
    try {
      await updatePassword(auth.currentUser!, pw);
      await updateDoc(doc(db, 'users', profile!.id), { mustChangePassword: false, termsAcceptedAt: serverTimestamp() });
      router.replace('/');
    } catch (err: any) {
      setError(err?.code === 'auth/requires-recent-login' ? 'For security, please sign in again, then set your password.' : 'Could not update your password. Try again.'); setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><GraduationCap className="h-6 w-6" /></span><span className="text-lg font-semibold">School Results Portal</span></div>
        <Card className="p-7">
          <h1 className="text-xl font-semibold">Welcome, {profile.firstName}</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password to secure your account.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="New password" required hint="8+ characters with a letter and a number"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></Field>
            <Field label="Confirm password" required><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required /></Field>
            <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} label="I accept the terms of use and privacy policy, including how my child's data is handled." />
            <Button type="submit" loading={busy} className="w-full">Save and continue</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
