'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { Badge, DataTable, EmptyState, PageHeader, Select, type Column } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import type { Doc } from '@/types';

export default function QueriesInbox() {
  const a = useActor(); const router = useRouter();
  const { data, loading } = useCollection<any>(useMemo(() => sc(a.schoolId, 'queries'), [a.schoolId]));
  const [status, setStatus] = useState('');
  const rows = data.filter((q) => !status || q.status === status).sort((x, y) => (y.createdAt?.seconds ?? 0) - (x.createdAt?.seconds ?? 0));
  const cols: Column<Doc<any>>[] = [
    { key: 'title', header: 'Query', sortable: true, render: (q) => <div><p className="font-medium text-slate-900">{q.title}</p><p className="text-xs text-slate-500">{q.studentName} · {q.armLabel}</p></div>, value: (q) => q.title },
    { key: 'by', header: 'Raised by', value: (q) => q.raisedByName },
    { key: 'status', header: 'Status', value: (q) => q.status, render: (q) => <Badge tone={q.status === 'OPEN' ? 'amber' : q.status === 'RESOLVED' ? 'green' : 'blue'}>{q.status.toLowerCase().replace('_', ' ')}</Badge> },
    { key: 'when', header: 'Opened', value: (q) => q.createdAt?.seconds ?? 0, render: (q) => timeAgo(q.createdAt) },
  ];
  return (
    <>
      <PageHeader title="Result queries" description="Questions raised by parents about a child's result." />
      <DataTable rows={rows} columns={cols} loading={loading} onRowClick={(q) => router.push(`/admin/queries/${q.id}`)}
        toolbar={<Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" options={['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map((v) => ({ value: v, label: v.toLowerCase().replace('_', ' ') }))} />}
        empty={<EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No queries" description="Parent queries will appear here." />} />
    </>
  );
}
