'use client';
import { useMemo } from 'react';
import { CheckCircle2, CornerUpLeft, Eye, FilePlus2, Lock, Send, Unlock } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sheetSub } from '@/lib/firebase/paths';
import { Card, CardHeader } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

const ICON: Record<string, any> = { CREATE: FilePlus2, SUBMIT: Send, RESUBMIT: Send, START_REVIEW: Eye, APPROVE: CheckCircle2, RETURN: CornerUpLeft, PUBLISH: Send, UNPUBLISH: Eye, LOCK: Lock, UNLOCK: Unlock };
export function WorkflowTimeline({ sheetId }: { sheetId: string }) {
  const a = useActor();
  const { data } = useCollection<any>(useMemo(() => sheetSub(a.schoolId, sheetId, 'events'), [a.schoolId, sheetId]));
  const sorted = [...data].sort((x, y) => (y.createdAt?.seconds ?? 0) - (x.createdAt?.seconds ?? 0));
  return (
    <Card>
      <CardHeader title="Activity" />
      <ol className="space-y-4 p-5">
        {sorted.map((e) => { const I = ICON[e.action] ?? Send; return (
          <li key={e.id} className="flex gap-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><I className="h-3.5 w-3.5" /></span>
            <div className="text-sm"><p className="font-medium text-slate-900">{e.action.replace('_', ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())} <span className="font-normal text-slate-500">by {e.actorName}</span></p>
              {e.comment && <p className="text-slate-600">“{e.comment}”</p>}<p className="text-xs text-slate-400">{fmtDate(e.createdAt, true)}</p></div></li>); })}
        {sorted.length === 0 && <li className="text-sm text-slate-500">No activity yet.</li>}
      </ol>
    </Card>
  );
}
