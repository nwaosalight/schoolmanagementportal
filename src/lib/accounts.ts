import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, createAuthAccount, db, functions } from '@/lib/firebase/client';
import type { Actor } from '@/lib/auth/auth-provider';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { isRealEmail, loginEmail } from '@/lib/login-id';
import { tempPassword } from '@/lib/utils';
import type { DataRole } from '@/types';

export interface NewAccount {
  firstName: string; lastName: string; roles: DataRole[]; email?: string; phone?: string; loginId?: string;
  staffNumber?: string; department?: string;
}
export interface Credentials { uid: string; name: string; login: string; password: string; schoolCode: string }

/** Creates a Firebase Auth account (via a secondary app so the admin stays signed in) and the matching /users profile. */
export async function createAccount(actor: Actor, schoolCode: string, p: NewAccount): Promise<Credentials> {
  const real = p.email?.trim().toLowerCase();
  const loginId = (p.loginId || p.phone || '').trim();
  if (!real && !loginId) throw new Error('Provide an email, phone number or login ID.');
  const email = real || loginEmail(schoolCode, loginId);
  const password = tempPassword();
  const uid = await createAuthAccount(email, password);
  const w = new Writer();
  w.set(doc(db, 'users', uid), {
    schoolId: actor.schoolId, roles: p.roles, firstName: p.firstName.trim(), lastName: p.lastName.trim(),
    email: real ?? null, loginId: real ? null : loginId, phone: p.phone?.trim() ?? '', status: 'ACTIVE', mustChangePassword: true,
    staffNumber: p.staffNumber ?? null, department: p.department ?? null, createdAt: serverTimestamp(),
  });
  addAudit(w, actor, { action: 'CREATE', entityType: 'User', entityId: uid, summary: `Created ${p.roles.join('/')} account for ${p.firstName} ${p.lastName}` });
  await w.commit();
  return { uid, name: `${p.firstName} ${p.lastName}`, login: real || loginId, password, schoolCode };
}

/** Real mailbox → reset email. Synthetic login → callable function sets a new temporary password. */
export async function resetPassword(user: { id: string; email?: string | null }): Promise<{ method: 'email' | 'temp'; password?: string }> {
  if (isRealEmail(user.email)) { await sendPasswordResetEmail(auth, user.email!); return { method: 'email' }; }
  const password = tempPassword();
  await httpsCallable(functions, 'resetUserPassword')({ uid: user.id, password });
  return { method: 'temp', password };
}
