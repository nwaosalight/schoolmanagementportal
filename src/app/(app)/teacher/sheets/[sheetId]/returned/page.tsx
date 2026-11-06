'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, PencilLine } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection, useDoc } from '@/lib/firebase/hooks';
import { sd, sheetSub } from '@/lib/firebase/paths';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import type { Sheet } from '@/types';

export default function ReturnedPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const a = useActor();
  const sheet = useDoc<Sheet>(useMemo(() => sd(a.schoolId, 'sheets', sheetId), [a.schoolId, sheetId]));
  const comments = useCollection<any>(useMemo(() => sheetSub(a.schoolId, sheetId, 'comments'), [a.schoolId, sheetId]));
  if (sheet.loading) return <PageLoader />;
  if (!sheet.data) return <Alert tone="error" title="Sheet not found" />;
  const s = sheet.data; const list = [...comments.data].sort((x, y) => (y.createdAt?.seconds ?? 0) - (x.createdAt?.seconds ?? 0));
  return (
    <>
      <PageHeader back={<Link href={`/teacher/sheets/${sheetId}`} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Back to sheet</Link>}
        title="Reviewer feedback" description={`${s.subjectName} · ${s.armLabel}`} actions={<Link href={`/teacher/sheets/${sheetId}`} className="btn btn-md btn-primary"><PencilLine className="h-4 w-4" />Edit & resubmit</Link>} />
      {s.returnedReason && <Alert tone="error" title="Why it was returned" className="mb-5">{s.returnedReason}</Alert>}
      <Card>
        <CardHeader title="Comments" />
        {list.length === 0 ? <EmptyState title="No per-student comments" description="The reviewer only left the general note above." /> : (
          <ul className="divide-y divide-slate-100">{list.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-4">
              <div className="flex-1"><p className="text-sm font-medium text-slate-900">{c.studentName ?? 'General'} {c.resolvedAt && <Badge tone="green" className="ml-1">resolved</Badge>}</p><p className="text-sm text-slate-600">{c.body}</p><p className="text-xs text-slate-400">{c.authorName} · {timeAgo(c.createdAt)}</p></div>
              {!c.resolvedAt && <Button size="sm" variant="secondary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => updateDoc(doc(sheetSub(a.schoolId, sheetId, 'comments'), c.id), { resolvedAt: serverTimestamp() })}>Mark fixed</Button>}
            </li>))}</ul>)}
      </Card>
    </>
  );
}
