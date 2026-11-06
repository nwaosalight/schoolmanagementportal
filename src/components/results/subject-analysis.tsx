'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDocs } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { rowsCol } from '@/lib/firebase/paths';
import { average } from '@/lib/grading';
import { Card, CardHeader, PageLoader, Stat } from '@/components/ui';
import { fmt } from '@/lib/utils';
import type { Doc, Row, Sheet } from '@/types';

export function SubjectAnalysis({ sheet, prev }: { sheet: Doc<Sheet>; prev?: Doc<Sheet> | null }) {
  const a = useActor();
  const [rows, setRows] = useState<Doc<Row>[] | null>(null);
  useEffect(() => { getDocs(rowsCol(a.schoolId, sheet.id)).then((s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<Row>))); }, [a.schoolId, sheet.id]);
  const counted = useMemo(() => (rows ?? []).filter((r) => r.flag === 'NONE' && r.total != null), [rows]);
  const dist = useMemo(() => [...sheet.bands].sort((x, y) => x.min - y.min).map((b) => ({ grade: b.grade, students: counted.filter((r) => r.grade === b.grade).length })), [sheet.bands, counted]);
  if (!rows) return <PageLoader />;
  const avg = average(counted.map((r) => r.total)); const below = counted.filter((r) => (r.total as number) < sheet.passMark).sort((x, y) => (x.total as number) - (y.total as number));
  const delta = prev?.stats?.classAverage != null && avg != null ? avg - prev.stats.classAverage : null;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Class average" value={fmt(avg)} hint={delta != null ? `${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta))} vs last term` : undefined} />
        <Stat label="Pass rate" value={counted.length ? `${fmt((counted.length - below.length) / counted.length * 100, 0)}%` : '—'} tone="green" />
        <Stat label="Highest" value={fmt(Math.max(...counted.map((r) => r.total as number), 0), 0)} />
        <Stat label="Below pass mark" value={below.length} tone={below.length ? 'red' : 'green'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Grade distribution" />
          <div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={dist}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="grade" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="students" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Needs attention" description={`Below the pass mark of ${sheet.passMark}`} />
          <ul className="divide-y divide-slate-100">{below.slice(0, 12).map((r) => <li key={r.id} className="flex justify-between px-5 py-2.5 text-sm"><span>{r.name}</span><span className="font-semibold text-red-600">{fmt(r.total, 0)}</span></li>)}
            {below.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">Everyone is at or above the pass mark.</li>}</ul></Card>
      </div>
    </div>
  );
}
