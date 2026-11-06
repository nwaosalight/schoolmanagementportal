import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

/**
 * Lets a school admin set a new temporary password for any account in their school.
 * Needed for accounts without a real mailbox (students, phone-only parents) where
 * "email me a reset link" is impossible. Firebase client SDK cannot do this.
 */
export const resetUserPassword = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const { uid, password } = req.data as { uid?: string; password?: string };
  if (!uid || !password || password.length < 8) throw new HttpsError('invalid-argument', 'uid and a password of 8+ characters are required.');

  const db = getFirestore();
  const [caller, target] = await Promise.all([db.doc(`users/${req.auth.uid}`).get(), db.doc(`users/${uid}`).get()]);
  const c = caller.data();
  const t = target.data();
  const isAdmin = !!c && c.status === 'ACTIVE' && (c.roles || []).some((r: string) => r === 'school_admin' || r === 'exam_officer');
  if (!isAdmin || !t || t.schoolId !== c!.schoolId) throw new HttpsError('permission-denied', 'Not allowed.');

  await getAuth().updateUser(uid, { password });
  await db.doc(`users/${uid}`).update({ mustChangePassword: true });
  await db.collection(`schools/${c!.schoolId}/auditLogs`).add({
    actorUid: req.auth.uid, actorName: `${c!.firstName} ${c!.lastName}`, actorRole: 'school_admin',
    action: 'PASSWORD_RESET', entityType: 'User', entityId: uid, summary: `Reset password for ${t.firstName} ${t.lastName}`,
    createdAt: new Date(),
  });
  return { ok: true };
});
