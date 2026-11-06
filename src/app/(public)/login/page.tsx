'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/auth-provider';
import { loginEmail } from '@/lib/login-id';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

const friendly = (code: string) =>
  ({ 'auth/invalid-credential': 'Incorrect ID or password.', 'auth/user-not-found': 'No account found with those details.', 'auth/wrong-password': 'Incorrect ID or password.',
     'auth/too-many-requests': 'Too many attempts. Wait a few minutes or reset your password.', 'auth/user-disabled': 'This account has been disabled.',
     'auth/network-request-failed': 'Network problem. Check your connection.' } as Record<string, string>)[code] ?? 'Sign-in failed. Please try again.';

export default function LoginPage() {
  const router = useRouter();
  const { fbUser, profile, loading } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsCode = id.trim() !== '' && !id.includes('@');

  useEffect(() => { if (!loading && fbUser && profile) router.replace('/'); }, [loading, fbUser, profile, router]);

  async function lookupSchool() {
    setSchoolName(null);
    if (code.trim().length < 3) return;
    try { const s = await getDoc(doc(db, 'schoolCodes', code.trim().toUpperCase())); setSchoolName(s.exists() ? s.data().name : 'Unknown school code'); } catch { /* ignore */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const email = id.includes('@') ? id.trim() : loginEmail(code.trim().toUpperCase(), id);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      updateDoc(doc(db, 'users', cred.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
      router.replace('/');
    } catch (err: any) { setError(friendly(err?.code ?? '')); setBusy(false); }
  }

  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to view or manage results.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Email, phone or admission number" required>
          <Input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoFocus required placeholder="you@school.com or GRM/2026/014" />
        </Field>
        {needsCode && (
          <Field label="School code" required hint={schoolName ?? 'Printed on your login slip, e.g. GRM001'}>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onBlur={lookupSchool} required maxLength={10} placeholder="GRM001" />
          </Field>
        )}
        <Field label="Password" required>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">Forgot password?</Link>
          <Link href="/register" className="text-slate-500 hover:text-slate-700">Register a school</Link>
        </div>
      </form>
    </Card>
  );
}
