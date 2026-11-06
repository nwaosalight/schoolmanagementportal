'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, GraduationCap, Plus, Upload } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { moveStudents } from '@/lib/students';
import { Badge, Button, DataTable, EmptyState, Field, Modal, PageHeader, Select, useToast, errMsg, type Column } from '@/components/ui';
import type { Doc, Student } from '@/types';

export default function StudentsPage() {
  const a = useActor();
  const router = useRouter();
  const toast = useToast();
  const { arms, armLabel, levelOfArm } = useSchoolData();
  const { data, loading } = useCollection<Student>(useMemo(() => sc(a.schoolId, 'students'), [a.schoolId]));
  const [arm, setArm] = useState(''); const [status, setStatus] = useState('ACTIVE');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [move, setMove] = useState(false); const [target, setTarget] = useState(''); const [note, setNote] = useState('Promoted'); const [busy, setBusy] = useState(false);

  const rows = data.filter((s) => (!arm || s.armId === arm) && (!status || s.status === status));
  const cols: Column<Doc<Student>>[] = [
    { key: 'admissionNumber', header: 'Admission no.', sortable: true, className: 'font-mono text-xs' },
    { key: 'name', header: 'Name', sortable: true, value: (s) => `${s.lastName} ${s.firstName}`, render: (s) => <span className="font-medium text-slate-900">{s.lastName} {s.firstName}</span> },
    { key: 'class', header: 'Class', sortable: true, value: (s) => armLabel(s.armId) },
    { key: 'gender', header: 'Gender', value: (s) => (s.gender === 'MALE' ? 'M' : 'F') },
    { key: 'guardians', header: 'Guardians', value: (s) => s.guardianUids?.length ?? 0, render: (s) => (s.guardianUids?.length ? s.guardianUids.length : <Badge tone="amber">None linked</Badge>) },
    { key: 'status', header: 'Status', value: (s) => s.status, render: (s) => <Badge tone={s.status === 'ACTIVE' ? 'green' : 'slate'}>{s.status.toLowerCase()}</Badge> },
  ];
  const targetLevel = levelOfArm(target || null);

  async function doMove() {
    if (!target) return toast.error('Choose the destination class.');
    setBusy(true);
    try { await moveStudents(a, data.filter((s) => sel.has(s.id)), target, armLabel(target), note || 'Moved'); toast.success(`${sel.size} student(s) moved to ${armLabel(target)}.`); setSel(new Set()); setMove(false); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Students" description="Admit, search and manage students. Select several to promote or move them together."
        actions={<><Link href="/admin/students/import" className="btn btn-md btn-secondary"><Upload className="h-4 w-4" />Import CSV</Link><Link href="/admin/students/new" className="btn btn-md btn-primary"><Plus className="h-4 w-4" />Add student</Link></>} />
      <DataTable rows={rows} columns={cols} loading={loading} selectable selected={sel} onSelectedChange={setSel} onRowClick={(s) => router.push(`/admin/students/${s.id}`)} searchPlaceholder="Search by name or admission number…"
        toolbar={<>
          <Select aria-label="Class filter" className="w-auto" value={arm} onChange={(e) => setArm(e.target.value)} placeholder="All classes" options={arms.map((x) => ({ value: x.id, label: armLabel(x.id) }))} />
          <Select aria-label="Status filter" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any status" options={['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN'].map((v) => ({ value: v, label: v.toLowerCase() }))} />
          {sel.size > 0 && <Button size="sm" icon={<ArrowUpRight className="h-4 w-4" />} onClick={() => setMove(true)}>Move {sel.size} to class…</Button>}
        </>}
        empty={<EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No students found" description="Add students one by one or import a CSV." action={<Link href="/admin/students/new" className="btn btn-md btn-primary">Add student</Link>} />} />
      <Modal open={move} onClose={() => setMove(false)} title={`Move ${sel.size} student(s)`} description="Use this to promote a class to the next level, repeat a year, or reassign arms."
        footer={<><Button variant="secondary" onClick={() => setMove(false)}>Cancel</Button><Button loading={busy} onClick={doMove}>Move students</Button></>}>
        <div className="space-y-4">
          <Field label="Destination class" required><Select value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Select class" options={arms.map((x) => ({ value: x.id, label: armLabel(x.id) }))} /></Field>
          <Field label="Reason / note"><Select value={note} onChange={(e) => setNote(e.target.value)} options={['Promoted', 'Repeated', 'Re-assigned', 'Transferred in'].map((v) => ({ value: v, label: v }))} /></Field>
          {targetLevel && <p className="text-xs text-slate-500">Destination level: {targetLevel.name}. Existing result sheets for the old class are not changed.</p>}
        </div>
      </Modal>
    </>
  );
}
