import { getDocs, query, serverTimestamp, where, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Actor } from '@/lib/auth/auth-provider';
import { newId, sd } from '@/lib/firebase/paths';
import type { Writer } from '@/lib/firebase/writer';
import type { DataRole } from '@/types';

export interface NotifyInput { title: string; body: string; link?: string; type: string }

export function addNotifications(w: Writer, actor: Actor, toUids: string[], n: NotifyInput) {
  [...new Set(toUids)].filter((u) => u && u !== actor.uid).forEach((toUid) => {
    w.set(sd(actor.schoolId, 'notifications', newId(actor.schoolId, 'notifications')), {
      ...n, toUid, fromUid: actor.uid, read: false, createdAt: serverTimestamp(),
    });
  });
}
export async function uidsWithRoles(schoolId: string, roles: DataRole[]): Promise<string[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('roles', 'array-contains-any', roles)));
  return snap.docs.filter((d) => d.data().status === 'ACTIVE').map((d) => d.id);
}
