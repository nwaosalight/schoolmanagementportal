import { serverTimestamp } from 'firebase/firestore';
import type { Actor } from '@/lib/auth/auth-provider';
import { newId, sd } from '@/lib/firebase/paths';
import type { Writer } from '@/lib/firebase/writer';

export interface AuditInput {
  action: string; entityType: string; entityId?: string; summary: string;
  changes?: { field: string; old: unknown; new: unknown; label?: string }[];
}
export function addAudit(w: Writer, actor: Actor, a: AuditInput) {
  w.set(sd(actor.schoolId, 'auditLogs', newId(actor.schoolId, 'auditLogs')), {
    actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, ...a, changes: a.changes ?? [], createdAt: serverTimestamp(),
  });
}
