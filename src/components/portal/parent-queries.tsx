'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Plus } from 'lucide-react';
import { query, serverTimestamp, where, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings } from '@/lib/school/use-settings';
import { useMyChildren, useMyReports } from './use-portal';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Textarea, useToast, errMsg } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

export function ParentQueries({ studentId }: { studentId?: string }) {
  const a = useActor(); const { settings } = useSettings();
  const { data, loading } = useCollection<any>(useMemo(() => query(sc(a.schoolId, 'queries'), where('raisedByUid', '==', a.uid)), [a.schoolId, a.uid]));
  const rows = data.filter((q) => !studentId || q.studentId === studentId).sort((x, y) => (y.createdAt?.seconds ?? 0) - (x.createdAt?.seconds ?? 0));
  const newHref = studentId ? `/parent/children/${studentId}/queries/new` : '/parent';
  return (
    <div className="space-y-4">
      {settings.allowQueries && studentId && <div className="flex justify-end"><Link href={newHref} className="btn btn-md btn-primary"><Plus className="h-4 w-4" />Raise a query</Link></div>}
      {!settings.allowQueries && <Alert tone="info">The school is not accepting result queries online right now. Please contact the school office.</Alert>}
      <Card className="divide-y divide-slate-100">
        {rows.map((q) => (
          <Link key={q.id} href={`/parent/queries/${q.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
            <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{q.title}</p><p className="text-sm text-slate-500">{q.studentName} · {timeAgo(q.createdAt)}</p></div>
            <Badge tone={q.status === 'OPEN' ? 'amber' : q.status === 'RESOLVED' ? 'green' : 'blue'}>{q.status.toLowerCase().replace('_', ' ')}</Badge>
          </Link>))}
        {!loading && rows.length === 0 && <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No queries yet" description="If something on a report card looks wrong, raise a query and the school will respond here." />}
      </Card>
    </div>
  );
}

export function NewQueryForm({ studentId }: { studentId: string }) {
  const a = useActor(); const router = useRouter(); const toast = useToast();
  const { termLabel, armLabel } = useSchoolData();
  const kid = useMyChildren().data.find((k) => k.id === studentId); const reports = useMyReports(studentId).data;
  const [f, setF] = useState({ termId: '', subject: '', title: '', body: '' }); const [busy, setBusy] = useState(false);
  const report = reports.find((r) => r.termId === (f.termId || reports[0]?.termId));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kid || !report) return toast.error('Choose a published result to ask about.');
    setBusy(true);
    try {
      const ref = doc(sc(a.schoolId, 'queries')); const w = new Writer();
      w.set(ref, { studentId, studentName: `${kid.firstName} ${kid.lastName}`, armLabel: armLabel(kid.armId), termId: report.termId, termLabel: termLabel(report.termId), subjectName: f.subject || null, title: f.title.trim(), status: 'OPEN', raisedByUid: a.uid, raisedByName: a.name, assignedToUid: null, createdAt: serverTimestamp() });
      w.set(doc(collection(db, 'schools', a.schoolId, 'queries', ref.id, 'messages')), { authorUid: a.uid, authorName: a.name, authorRole: a.role, body: f.body.trim(), createdAt: serverTimestamp() });
      await w.commit(); toast.success('Your query was sent to the school.'); router.replace(`/parent/queries/${ref.id}`);
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }
  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Which result?" required><Select value={f.termId || reports[0]?.termId || ''} onChange={(e) => setF({ ...f, termId: e.target.value })} options={reports.map((r) => ({ value: r.termId, label: termLabel(r.termId) }))} /></Field>
        <Field label="Subject (optional)"><Select value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Whole report card" options={(report?.subjects ?? []).map((s) => ({ value: s.name, label: s.name }))} /></Field>
        <Field label="Short title" required><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={120} placeholder="e.g. Mathematics exam score looks too low" /></Field>
        <Field label="Details" required><Textarea rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></Field>
        <Button type="submit" loading={busy} disabled={!reports.length}>Send query</Button>
        {!reports.length && <Alert tone="info">Queries can be raised once a result has been published.</Alert>}
      </form>
    </Card>
  );
}
