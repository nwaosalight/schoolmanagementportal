import { arrayRemove, arrayUnion, getDocs, query, where } from 'firebase/firestore';
import type { Actor } from '@/lib/auth/auth-provider';
import { sc, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import type { Doc, Student } from '@/types';

/** Report cards carry a copy of guardian/student uids (for security rules). Keep them in step with the student. */
async function syncReports(w: Writer, schoolId: string, studentId: string, patch: Record<string, unknown>) {
  const rs = await getDocs(query(sc(schoolId, 'reports'), where('studentId', '==', studentId)));
  rs.docs.forEach((d) => w.update(d.ref, patch));
}
export async function linkGuardian(actor: Actor, student: Doc<Student>, guardianUid: string, guardianName: string) {
  const w = new Writer();
  const next = [...new Set([...(student.guardianUids ?? []), guardianUid])];
  w.update(sd(actor.schoolId, 'students', student.id), { guardianUids: arrayUnion(guardianUid) });
  await syncReports(w, actor.schoolId, student.id, { guardianUids: next });
  addAudit(w, actor, { action: 'UPDATE', entityType: 'Student', entityId: student.id, summary: `Linked guardian ${guardianName} to ${student.firstName} ${student.lastName}` });
  await w.commit();
}
export async function unlinkGuardian(actor: Actor, student: Doc<Student>, guardianUid: string, guardianName: string) {
  const w = new Writer();
  w.update(sd(actor.schoolId, 'students', student.id), { guardianUids: arrayRemove(guardianUid) });
  await syncReports(w, actor.schoolId, student.id, { guardianUids: (student.guardianUids ?? []).filter((u) => u !== guardianUid) });
  addAudit(w, actor, { action: 'UPDATE', entityType: 'Student', entityId: student.id, summary: `Unlinked guardian ${guardianName} from ${student.firstName} ${student.lastName}` });
  await w.commit();
}
export async function setStudentUser(actor: Actor, student: Doc<Student>, userId: string) {
  const w = new Writer();
  w.update(sd(actor.schoolId, 'students', student.id), { userId });
  await syncReports(w, actor.schoolId, student.id, { studentUserId: userId });
  await w.commit();
}
export async function moveStudents(actor: Actor, students: Doc<Student>[], armId: string | null, armLabel: string, note: string) {
  const w = new Writer();
  const at = new Date().toISOString();
  students.forEach((s) => {
    w.update(sd(actor.schoolId, 'students', s.id), { armId, history: [...(s.history ?? []), { armId, armLabel, at, note }] });
  });
  addAudit(w, actor, { action: 'UPDATE', entityType: 'Student', summary: `${note}: ${students.length} student(s) → ${armLabel}` });
  await w.commit();
}
