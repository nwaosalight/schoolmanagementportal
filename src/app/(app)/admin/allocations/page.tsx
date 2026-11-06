'use client';
import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { deleteDoc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { sheetId } from '@/lib/results/sheets';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { fullName } from '@/lib/utils';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Modal, PageHeader, Select, useToast, errMsg } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import type { Allocation, ClassTeacher } from '@/types';
import { setDoc } from 'firebase/firestore';

export default function AllocationsPage() {
  const a = useActor(); const toast = useToast();
  const { termId, setTermId, armId, setArmId, term } = useTermArm();
  const { subjects, teachers, armLabel, terms, termLabel, levelOfArm } = useSchoolData();
  const allocs = useCollection<Allocation>(useMemo(() => (termId ? query(sc(a.schoolId, 'allocations'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const cts = useCollection<ClassTeacher>(useMemo(() => (term ? query(sc(a.schoolId, 'classTeachers'), where('sessionId', '==', term.sessionId)) : null), [a.schoolId, term])).data;
  const [copyOpen, setCopyOpen] = useState(false); const [src, setSrc] = useState(''); const [busy, setBusy] = useState(false);
  const level = levelOfArm(armId || null);
  const offered = level ? subjects.filter((s) => s.isActive && s.levelIds.includes(level.id)) : [];
  const teacherOpts = teachers.map((t) => ({ value: t.id, label: fullName(t) }));

  async function assign(subjectId: string, uid: string) {
    try {
      const ref = sd(a.schoolId, 'allocations', sheetId(termId, armId, subjectId));
      if (!uid) { await deleteDoc(ref); }
      else {
        const t = teachers.find((x) => x.id === uid)!;
        await setDoc(ref, { termId, armId, subjectId, teacherUid: uid, teacherName: fullName(t) });
        const sh = await getDoc(sd(a.schoolId, 'sheets', sheetId(termId, armId, subjectId)));
        if (sh.exists() && ['DRAFT', 'RETURNED'].includes(sh.data().status)) await updateDoc(sh.ref, { teacherUid: uid, teacherName: fullName(t) });
      }
      const w = new Writer(); addAudit(w, a, { action: 'UPDATE', entityType: 'Allocation', summary: `${uid ? 'Allocated' : 'Removed'} teacher for ${subjects.find((s) => s.id === subjectId)?.name} · ${armLabel(armId)}` }); await w.commit();
    } catch (e) { toast.error(errMsg(e)); }
  }
  async function setClassTeacher(uid: string) {
    if (!term) return;
    try {
      const ref = sd(a.schoolId, 'classTeachers', `${term.sessionId}_${armId}`);
      if (!uid) await deleteDoc(ref);
      else await setDoc(ref, { sessionId: term.sessionId, armId, teacherUid: uid, teacherName: fullName(teachers.find((t) => t.id === uid)) });
      toast.success('Class teacher updated.');
    } catch (e) { toast.error(errMsg(e)); }
  }
  async function copyFrom() {
    if (!src || !termId || src === termId) return toast.error('Choose a different source term.');
    setBusy(true);
    try {
      const snap = await getDocs(query(sc(a.schoolId, 'allocations'), where('termId', '==', src)));
      const have = new Set(allocs.map((x) => x.id)); const w = new Writer(); let n = 0;
      snap.docs.forEach((d) => { const v = d.data() as Allocation; const id = sheetId(termId, v.armId, v.subjectId); if (!have.has(id)) { w.set(sd(a.schoolId, 'allocations', id), { ...v, termId }); n++; } });
      addAudit(w, a, { action: 'CREATE', entityType: 'Allocation', summary: `Copied ${n} allocations from ${termLabel(src)}` });
      await w.commit(); toast.success(`${n} allocation(s) copied.`); setCopyOpen(false);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  const ct = cts.find((c) => c.armId === armId);

  return (
    <>
      <PageHeader title="Teacher allocation" description="Assign a teacher to each subject of a class for the term, and choose the class teacher."
        actions={<><TermArmPicker termId={termId} armId={armId} onTerm={setTermId} onArm={setArmId} /><Button variant="secondary" size="sm" icon={<Copy className="h-4 w-4" />} onClick={() => setCopyOpen(true)}>Copy from term</Button></>} />
      {!armId ? <Card><EmptyState title="Choose a class" description="Pick a term and class above to allocate teachers." /></Card> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={`${armLabel(armId)} — subjects`} description={`${offered.length} subject(s) offered by ${level?.name}`} />
            {offered.length === 0 ? <EmptyState title="No subjects offered" description="Attach this level to subjects under Subjects." /> : (
              <ul className="divide-y divide-slate-100">{offered.map((s) => {
                const al = allocs.find((x) => x.id === sheetId(termId, armId, s.id));
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div><p className="text-sm font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.code} · {s.type === 'CORE' ? 'Core' : 'Elective'}</p></div>
                    <Select aria-label={`Teacher for ${s.name}`} className="w-56" value={al?.teacherUid ?? ''} onChange={(e) => assign(s.id, e.target.value)} placeholder="— Unallocated —" options={teacherOpts} />
                  </li>);
              })}</ul>
            )}
          </Card>
          <Card className="h-fit">
            <CardHeader title="Class teacher" description="Enters attendance, traits and comments for this class." />
            <div className="space-y-3 p-5">
              <Select value={ct?.teacherUid ?? ''} onChange={(e) => setClassTeacher(e.target.value)} placeholder="— None —" options={teacherOpts} />
              {ct ? <Badge tone="green">{ct.teacherName}</Badge> : <Alert tone="warn">No class teacher assigned for this session.</Alert>}
              <p className="text-xs text-slate-500">The class teacher applies to the whole academic session.</p>
            </div>
          </Card>
        </div>
      )}
      <Modal open={copyOpen} onClose={() => setCopyOpen(false)} title="Copy allocations" description={`Copy every class's teacher allocations into ${termLabel(termId)}. Existing ones are kept.`}
        footer={<><Button variant="secondary" onClick={() => setCopyOpen(false)}>Cancel</Button><Button loading={busy} onClick={copyFrom}>Copy</Button></>}>
        <Select value={src} onChange={(e) => setSrc(e.target.value)} placeholder="Source term" options={terms.filter((t) => t.id !== termId).map((t) => ({ value: t.id, label: termLabel(t.id) }))} />
      </Modal>
    </>
  );
}
