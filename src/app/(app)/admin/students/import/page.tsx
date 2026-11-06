'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { createAccount } from '@/lib/accounts';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { doc } from 'firebase/firestore';
import { ImportWizard } from '@/components/shared/import-wizard';
import { PageHeader } from '@/components/ui';
import type { Student, UserDoc } from '@/types';

type R = { adm: string; first: string; last: string; other: string; gender: 'MALE' | 'FEMALE'; dob: string; armId: string; armLabel: string; gName: string; gPhone: string; gEmail: string };

export default function ImportStudentsPage() {
  const a = useActor();
  const { school } = useAuth();
  const { arms, armLabel } = useSchoolData();
  const existing = useCollection<Student>(sc(a.schoolId, 'students')).data;
  const labelMap = new Map(arms.map((x) => [armLabel(x.id).toLowerCase().replace(/\s+/g, ''), x.id]));
  const have = new Set(existing.map((s) => s.admissionNumber.toLowerCase()));

  return (
    <>
      <PageHeader back={<Link href="/admin/students" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Students</Link>} title="Import students" description="Upload a CSV, review every row, then import. Guardian accounts are created automatically when contact details are given." />
      <ImportWizard<R>
        title="Student import" description="Class must match an existing class exactly, e.g. “JSS1 A”."
        headers={['admissionNumber', 'firstName', 'lastName', 'otherNames', 'gender', 'dob', 'class', 'guardianName', 'guardianPhone', 'guardianEmail']}
        example={['GRM/2026/014', 'Chidi', 'Eze', '', 'MALE', '2014-05-02', 'JSS1 A', 'Mrs Eze', '08031234567', 'eze@mail.com']}
        previewCols={[{ header: 'Adm. no', get: (r) => r.adm }, { header: 'Name', get: (r) => `${r.last} ${r.first}` }, { header: 'Class', get: (r) => r.armLabel }, { header: 'Guardian', get: (r) => [r.gName, r.gPhone || r.gEmail].filter(Boolean).join(' · ') }]}
        parse={(rows) => {
          const valid: R[] = []; const errors: { row: number; message: string }[] = []; const seen = new Set<string>();
          rows.forEach((r, i) => {
            const row = i + 2; const adm = r.admissionNumber?.trim();
            if (!adm || !r.firstName || !r.lastName) return errors.push({ row, message: 'admissionNumber, firstName and lastName are required.' });
            if (have.has(adm.toLowerCase()) || seen.has(adm.toLowerCase())) return errors.push({ row, message: `Admission number ${adm} already exists.` });
            const armId = labelMap.get((r.class || '').toLowerCase().replace(/\s+/g, ''));
            if (!armId) return errors.push({ row, message: `Class "${r.class}" does not exist.` });
            const gender = (r.gender || '').toUpperCase().startsWith('F') ? 'FEMALE' : (r.gender || '').toUpperCase().startsWith('M') ? 'MALE' : null;
            if (!gender) return errors.push({ row, message: 'gender must be MALE or FEMALE.' });
            if (r.guardianEmail && !/^\S+@\S+\.\S+$/.test(r.guardianEmail)) return errors.push({ row, message: 'guardianEmail is not a valid email.' });
            seen.add(adm.toLowerCase());
            valid.push({ adm, first: r.firstName, last: r.lastName, other: r.otherNames || '', gender, dob: r.dob || '', armId, armLabel: armLabel(armId), gName: r.guardianName || '', gPhone: r.guardianPhone || '', gEmail: (r.guardianEmail || '').toLowerCase() });
          });
          return { valid, errors };
        }}
        run={async (valid, progress) => {
          // 1) find or create guardians (deduplicated by email / phone)
          const parents = await getDocs(query(collection(db, 'users'), where('schoolId', '==', a.schoolId), where('roles', 'array-contains', 'parent')));
          const byKey = new Map<string, string>();
          parents.docs.forEach((d) => { const u = d.data() as UserDoc; if (u.email) byKey.set(u.email.toLowerCase(), d.id); if (u.phone) byKey.set(u.phone, d.id); });
          const creds: string[][] = []; let failed = 0;
          const guardianFor: Record<string, string> = {};
          const uniq = [...new Map(valid.filter((v) => v.gEmail || v.gPhone).map((v) => [v.gEmail || v.gPhone, v])).values()];
          for (let i = 0; i < uniq.length; i++) {
            const v = uniq[i]; const key = v.gEmail || v.gPhone;
            const found = byKey.get(v.gEmail) ?? byKey.get(v.gPhone);
            if (found) guardianFor[key] = found;
            else {
              try {
                const [fn, ...ln] = (v.gName || 'Parent').split(' ');
                const c = await createAccount(a, school!.code, { firstName: fn, lastName: ln.join(' ') || v.last, roles: ['parent'], email: v.gEmail || undefined, phone: v.gPhone, loginId: v.gPhone });
                guardianFor[key] = c.uid; byKey.set(key, c.uid); creds.push([c.name, c.login, c.password, c.schoolCode]);
              } catch { failed++; }
            }
            progress(i + 1, uniq.length + 1);
          }
          // 2) students
          const w = new Writer();
          valid.forEach((v) => {
            const g = guardianFor[v.gEmail || v.gPhone];
            const ref = doc(sc(a.schoolId, 'students'));
            w.set(ref, { admissionNumber: v.adm, firstName: v.first, lastName: v.last, otherNames: v.other, gender: v.gender, dob: v.dob, armId: v.armId, status: 'ACTIVE', guardianUids: g ? [g] : [], userId: null, electives: [], history: [{ armId: v.armId, armLabel: v.armLabel, at: new Date().toISOString(), note: 'Imported' }] });
          });
          addAudit(w, a, { action: 'CREATE', entityType: 'Student', summary: `Imported ${valid.length} students from CSV` });
          await w.commit(); progress(uniq.length + 1, uniq.length + 1);
          return { summary: `${valid.length} student(s) imported. ${creds.length} new guardian account(s) created${failed ? `, ${failed} guardian(s) could not be created` : ''}.`, credentials: creds };
        }} />
    </>
  );
}
