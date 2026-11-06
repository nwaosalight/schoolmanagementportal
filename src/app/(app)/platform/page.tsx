'use client';
import { useMemo } from 'react';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useCollection } from '@/lib/firebase/hooks';
import { Badge, Button, DataTable, PageHeader, useToast, errMsg, type Column } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import type { Doc, SchoolDoc } from '@/types';

export default function PlatformSchools() {
  const toast = useToast();
  const { data, loading } = useCollection<SchoolDoc>(useMemo(() => collection(db, 'schools'), []));
  async function flip(s: Doc<SchoolDoc>) {
    try { await updateDoc(doc(db, 'schools', s.id), { status: s.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }); toast.success(`${s.name} ${s.status === 'ACTIVE' ? 'suspended' : 'reactivated'}.`); } catch (e) { toast.error(errMsg(e)); }
  }
  const cols: Column<Doc<SchoolDoc>>[] = [
    { key: 'name', header: 'School', sortable: true, render: (s) => <div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div>, value: (s) => s.name },
    { key: 'code', header: 'Code', value: (s) => s.code, className: 'font-mono text-xs' },
    { key: 'plan', header: 'Plan', value: (s) => s.planId ?? 'Standard' },
    { key: 'created', header: 'Registered', value: (s) => (s.createdAt as any)?.seconds ?? 0, render: (s) => fmtDate(s.createdAt) },
    { key: 'status', header: 'Status', value: (s) => s.status, render: (s) => <Badge tone={s.status === 'ACTIVE' ? 'green' : 'red'}>{s.status.toLowerCase()}</Badge> },
    { key: 'act', header: '', className: 'text-right', render: (s) => <Button size="sm" variant="secondary" onClick={() => flip(s)}>{s.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</Button> },
  ];
  return (<><PageHeader title="Schools" description="Every school (tenant) on the platform." /><DataTable rows={data} columns={cols} loading={loading} /></>);
}
