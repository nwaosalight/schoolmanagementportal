import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { env } from '@/config/env';

const app = getApps().length ? getApp() : initializeApp(env.firebase);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

const g = globalThis as any;
if (env.useEmulators && !g.__fbEmulators) {
  g.__fbEmulators = true;
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export { app };

/**
 * Create a Firebase Auth account WITHOUT signing the current admin out, by using a
 * short-lived secondary app instance. Returns the new user's uid.
 */
export async function createAuthAccount(email: string, password: string): Promise<string> {
  const secondary = initializeApp(env.firebase, `secondary-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const secAuth = getAuth(secondary);
  if (env.useEmulators) connectAuthEmulator(secAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, email, password);
    return cred.user.uid;
  } finally {
    await signOut(secAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}
