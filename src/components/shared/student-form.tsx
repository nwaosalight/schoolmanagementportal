'use client';
import { useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { newId, sc, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { Button, Checkbox, Field, Input, Select, useToast, errMsg } from '@/components/ui';
import type { Doc, Student } from '@/types';

export function StudentForm({ student, onSaved }: { student?: Doc<Student>; onSaved: (id: string) => void }) {
  const a = useActor();
  const toast = useToast();
  const { arms, armLabel, subjects, levelOfArm } = useSchoolData();
  const [f, setF] = useState({
    admissionNumber: student?.admissionNumber ?? '', firstName: student?.firstName ?? '', lastName: student?.lastName ?? '', otherNames: student?.otherNames ?? '',
    gender: student?.gender ?? 'MALE', dob: student?.dob ?? '', armId: student?.armId ?? '', address: student?.address ?? '', electives: student?.electives ?? [] as string[],
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const level = levelOfArm(f.armId || null);
  const electives = subjects.filter((s) => s.type === 'ELECTIVE' && level && s.levelIds.includes(level.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.armId) return toast.error('Choose a class.');
    setBusy(true);
    try {
      const adm = f.admissionNumber.trim();
      if (!student || student.admissionNumber !== adm) {
        const dup = await getDocs(query(sc(a.schoolId, 'students'), where('admissionNumber', '==', adm)));
        if (!dup.empty) { toast.error('That admission number is already in use.'); setBusy(false); return; }
      }
      const id = student?.id ?? newId(a.schoolId, 'students');
      const w = new Writer();
      const label = armLabel(f.armId);
      const base = { admissionNumber: adm, firstName: f.firstName.trim(), lastName: f.lastName.trim(), otherNames: f.otherNames.trim(), gender: f.gender, dob: f.dob, armId: f.armId, address: f.address, electives: f.electives };
      if (student) {
        const moved = student.armId !== f.armId;
        w.update(sd(a.schoolId, 'students', id), { ...base, ...(moved ? { history: [...(student.history ?? []), { armId: f.armId, armLabel: label, at: new Date().toISOString(), note: 'Class changed' }] } : {}) });
      } else {
        w.set(sd(a.schoolId, 'students', id), { ...base, status: 'ACTIVE', guardianUids: [], userId: null, history: [{ armId: f.armId, armLabel: label, at: new Date().toISOString(), note: 'Admitted' }] });
      }
      addAudit(w, a, { action: student ? 'UPDATE' : 'CREATE', entityType: 'Student', entityId: id, summary: `${student ? 'Updated' : 'Admitted'} ${f.firstName} ${f.lastName} (${adm})` });
      await w.commit(); toast.success('Student saved.'); onSaved(id);
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Admission number" required><Input value={f.admissionNumber} onChange={set('admissionNumber')} required placeholder="GRM/2026/014" /></Field>
      <Field label="Class" required><Select value={f.armId} onChange={set('armId')} placeholder="Select class" options={arms.filter((x) => x.isActive).map((x) => ({ value: x.id, label: armLabel(x.id) }))} /></Field>
      <Field label="First name" required><Input value={f.firstName} onChange={set('firstName')} required /></Field>
      <Field label="Last name" required><Input value={f.lastName} onChange={set('lastName')} required /></Field>
      <Field label="Other names"><Input value={f.otherNames} onChange={set('otherNames')} /></Field>
      <Field label="Gender" required><Select value={f.gender} onChange={set('gender')} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }]} /></Field>
      <Field label="Date of birth"><Input type="date" value={f.dob} onChange={set('dob')} /></Field>
      <Field label="Address"><Input value={f.address} onChange={set('address')} /></Field>
      {electives.length > 0 && (
        <div className="sm:col-span-2"><p className="label">Elective subjects</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">{electives.map((s) => (
            <Checkbox key={s.id} label={s.name} checked={f.electives.includes(s.id)} onChange={(e) => setF({ ...f, electives: e.target.checked ? [...f.electives, s.id] : f.electives.filter((x) => x !== s.id) })} />
          ))}</div></div>
      )}
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>{student ? 'Save changes' : 'Add student'}</Button></div>
    </form>
  );
}
