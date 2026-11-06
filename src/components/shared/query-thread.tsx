'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection, useDoc } from '@/lib/firebase/hooks';
import { sd, sheetSub } from '@/lib/firebase/paths';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Writer } from '@/lib/firebase/writer';
import { addNotifications } from '@/lib/notify';
import { Alert, Badge, Button, Card, CardHeader, Field, PageHeader, PageLoader, Select, Textarea, useToast, errMsg } from '@/components/ui';
import { timeAgo, cn } from '@/lib/utils';

export function QueryThread({ back, staff }: { back: string; staff?: boolean }) {
  const { queryId } = useParams<{ queryId: string }>();
  const a = useActor(); const toast = useToast();
  const { data: q, loading } = useDoc<any>(useMemo(() => sd(a.schoolId, 'queries', queryId), [a.schoolId, queryId]));
  const msgs = useCollection<any>(useMemo(() => collection(db, 'schools', a.schoolId, 'queries', queryId, 'messages'), [a.schoolId, queryId]));
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [resolution, setResolution] = useState('');
  void sheetSub;
  if (loading) return <PageLoader />;
  if (!q) return <Alert tone="error" title="Query not found" />;
  const sorted = [...msgs.data].sort((x, y) => (x.createdAt?.seconds ?? 0) - (y.createdAt?.seconds ?? 0));

  async function send() {
    if (!text.trim()) return; setBusy(true);
    try {
      await addDoc(collection(db, 'schools', a.schoolId, 'queries', queryId, 'messages'), { authorUid: a.uid, authorName: a.name, authorRole: a.role, body: text.trim(), createdAt: serverTimestamp() });
      const w = new Writer();
      const to = staff ? [q!.raisedByUid] : (q!.assignedToUid ? [q!.assignedToUid] : []);
      addNotifications(w, a, to, { type: 'QUERY', title: 'Result query update', body: `${a.name}: ${text.trim().slice(0, 80)}`, link: staff ? `/parent/queries/${queryId}` : `/admin/queries/${queryId}` });
      if (staff && q!.status === 'OPEN') w.update(sd(a.schoolId, 'queries', queryId), { status: 'IN_REVIEW', assignedToUid: a.uid });
      await w.commit(); setText('');
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function setStatus(status: string) {
    try { await updateDoc(sd(a.schoolId, 'queries', queryId), { status, ...(status === 'RESOLVED' || status === 'REJECTED' ? { resolution, resolvedAt: serverTimestamp() } : {}) }); toast.success('Status updated.'); }
    catch (e) { toast.error(errMsg(e)); }
  }
  const closed = q.status === 'RESOLVED' || q.status === 'REJECTED';
  return (
    <>
      <PageHeader back={<Link href={back} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back</Link>}
        title={q.title} description={`${q.studentName} · ${q.armLabel} · ${q.termLabel ?? ''}${q.subjectName ? ` · ${q.subjectName}` : ''}`}
        actions={<Badge tone={q.status === 'OPEN' ? 'amber' : q.status === 'RESOLVED' ? 'green' : 'blue'}>{q.status.toLowerCase().replace('_', ' ')}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Conversation" />
          <div className="space-y-3 p-5">
            {sorted.map((m) => (
              <div key={m.id} className={cn('flex', m.authorUid === a.uid ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', m.authorUid === a.uid ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800')}>
                  <p className={cn('mb-0.5 text-xs', m.authorUid === a.uid ? 'text-brand-100' : 'text-slate-500')}>{m.authorName} · {timeAgo(m.createdAt)}</p>{m.body}
                </div>
              </div>))}
            {sorted.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No messages yet.</p>}
          </div>
          {!closed && (
            <div className="space-y-3 border-t border-slate-100 p-5">
              <Textarea placeholder="Write a reply…" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex justify-end"><Button icon={<Send className="h-4 w-4" />} loading={busy} onClick={send}>Send</Button></div>
            </div>)}
        </Card>
        {staff && (
          <Card className="h-fit"><CardHeader title="Resolution" /><div className="space-y-4 p-5">
            <Field label="Status"><Select value={q.status} onChange={(e) => setStatus(e.target.value)} options={['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((v) => ({ value: v, label: v.toLowerCase().replace('_', ' ') }))} /></Field>
            <Field label="Outcome note" hint="Saved when you mark the query resolved or rejected"><Textarea value={resolution || q.resolution || ''} onChange={(e) => setResolution(e.target.value)} /></Field>
          </div></Card>)}
      </div>
    </>
  );
}
