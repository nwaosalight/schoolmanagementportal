'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSchoolData } from '@/lib/school/school-data';
import { Card, CardHeader, EmptyState, Stat } from '@/components/ui';
import { fmt } from '@/lib/utils';
import type { Doc, Report } from '@/types';

export function TrendsView({ reports }: { reports: Doc<Report>[] }) {
  const { terms, termLabel } = useSchoolData();
  const order = new Map(terms.map((t, i) => [t.id, i]));
  const asc = [...reports].sort((x, y) => (order.get(x.termId) ?? 0) - (order.get(y.termId) ?? 0));
  if (asc.length === 0) return <Card><EmptyState title="No published results yet" description="Trends appear after the first term's results are published." /></Card>;
  const data = asc.map((r) => ({ term: termLabel(r.termId).split(' · ').reverse().join(' '), average: r.average ?? 0 }));
  const latest = asc[asc.length - 1]; const prev = asc[asc.length - 2];
  const delta = prev && latest.average != null && prev.average != null ? latest.average - prev.average : null;
  const lines = [...(latest.subjects ?? [])].filter((l) => l.total != null).sort((x, y) => (y.total as number) - (x.total as number));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Latest average" value={fmt(latest.average)} />
        <Stat label="Change since last term" value={delta == null ? '—' : `${delta >= 0 ? '+' : ''}${fmt(delta)}`} tone={delta == null ? 'brand' : delta >= 0 ? 'green' : 'red'} icon={delta != null && delta < 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />} />
        <Stat label="Class position" value={latest.position ? `${latest.position}/${latest.classSize}` : '—'} />
      </div>
      <Card><CardHeader title="Average across terms" /><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="term" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Line type="monotone" dataKey="average" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader title="Strongest subjects" /><ul className="divide-y divide-slate-100">{lines.slice(0, 3).map((l) => <li key={l.subjectId} className="flex justify-between px-5 py-3 text-sm"><span>{l.name}</span><strong className="text-emerald-600">{fmt(l.total, 0)}</strong></li>)}</ul></Card>
        <Card><CardHeader title="Needs more attention" /><ul className="divide-y divide-slate-100">{[...lines].reverse().slice(0, 3).map((l) => <li key={l.subjectId} className="flex justify-between px-5 py-3 text-sm"><span>{l.name}</span><strong className="text-amber-600">{fmt(l.total, 0)}</strong></li>)}</ul></Card>
      </div>
    </div>
  );
}
