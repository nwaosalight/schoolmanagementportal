'use client';
import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await sendPasswordResetEmail(auth, email.trim()); setSent(true); }
    catch (err: any) { if (err?.code === 'auth/user-not-found') setSent(true); else setError('Could not send the reset email. Check the address and try again.'); }
    setBusy(false);
  }
  return (
    <Card className="p-7">
      <h1 className="text-xl font-semibold">Reset your password</h1>
      {sent ? (
        <div className="mt-5 space-y-4">
          <Alert tone="success" title="Check your inbox">If an account exists for {email}, a reset link is on its way.</Alert>
          <Link href="/login" className="btn btn-md btn-secondary w-full">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <p className="text-sm text-slate-500">Enter your email and we'll send you a link. Students and parents without an email should ask the school office for a new password.</p>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
          <Button type="submit" loading={busy} className="w-full">Send reset link</Button>
          <Link href="/login" className="block text-center text-sm text-slate-500 hover:text-slate-700">Back to sign in</Link>
        </form>
      )}
    </Card>
  );
}
