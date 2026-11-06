'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { limit, orderBy, query } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { Badge, Card, EmptyState, Input, PageHeader, Select, Skeleton } from '@/components/ui';
import { fmtDate } from '@/lib/utils';

export default function AuditLogPage() {
  const a = useActor();
  const { data, loading } = useCollection<any>(useMemo(() => query(sc(a.schoolId, 'auditLogs'), orderBy('createdAt', 'desc'), limit(300)), [a.schoolId]));
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const types = [...new Set(data.map((d) => d.entityType))];
  const rows = data.filter((d) => (!type || d.entityType === type) && (!q || `${d.summary} ${d.actorName}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Audit log" description="An append-only record of who changed what, and when. Entries cannot be edited or deleted." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <Input className="max-w-xs" placeholder="Search activity or person…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select className="w-auto" value={type} onChange={(e) => setType(e.target.value)} placeholder="All records" options={types.map((t) => ({ value: t, label: t }))} />
        </div>
        {loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div> : rows.length === 0 ? <EmptyState title="No matching activity" /> : (
          <ul className="divide-y divide-slate-100">{rows.map((l) => (
            <li key={l.id}>
              <button className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50" onClick={() => setOpen(open === l.id ? null : l.id)} disabled={!l.changes?.length}>
                {l.changes?.length ? (open === l.id ? <ChevronDown className="mt-0.5 h-4 w-4 text-slate-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />) : <span className="w-4" />}
                <span className="min-w-0 flex-1"><span className="block text-sm text-slate-900">{l.summary}</span><span className="text-xs text-slate-500">{l.actorName} ({String(l.actorRole).replace('_', ' ')}) · {fmtDate(l.createdAt, true)}</span></span>
                <Badge tone="slate">{l.entityType}</Badge>
              </button>
              {open === l.id && (
                <div className="mx-5 mb-3 overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-sm"><thead><tr><th className="th">Student / item</th><th className="th">Field</th><th className="th">Before</th><th className="th">After</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{l.changes.map((c: any, i: number) => <tr key={i}><td className="td">{c.label ?? '—'}</td><td className="td font-mono text-xs">{c.field}</td><td className="td text-red-600">{String(c.old ?? '—')}</td><td className="td text-emerald-700">{String(c.new ?? '—')}</td></tr>)}</tbody></table></div>)}
            </li>))}</ul>
        )}
      </Card>
    </>
  );
}
