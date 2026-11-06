'use client';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { average } from '@/lib/grading';
import { Card, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import { fmt } from '@/lib/utils';
import type { Report, Sheet } from '@/types';

const group = <T,>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, T[]>>((m, x) => { (m[key(x)] ||= []).push(x); return m; }, {});

export default function AnalyticsPage() {
  const a = useActor(); const { termId, setTermId } = useTermArm();
  const sheets = useCollection<Sheet>(useMemo(() => (termId ? query(sc(a.schoolId, 'sheets'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data.filter((s) => s.stats?.classAverage != null);
  const reports = useCollection<Report>(useMemo(() => (termId ? query(sc(a.schoolId, 'reports'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data.filter((r) => r.average != null);

  const byArm = Object.entries(group(sheets, (s) => s.armLabel)).map(([name, ss]) => ({ name, average: Math.round((average(ss.map((s) => s.stats!.classAverage)) ?? 0) * 10) / 10, passRate: Math.round((average(ss.map((s) => s.stats!.passRate)) ?? 0) * 10) / 10 })).sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
  const bySubject = Object.entries(group(sheets, (s) => s.subjectName)).map(([name, ss]) => ({ name, average: Math.round((average(ss.map((s) => s.stats!.classAverage)) ?? 0) * 10) / 10 })).sort((x, y) => y.average - x.average);
  const byTeacher = Object.entries(group(sheets, (s) => s.teacherName)).map(([name, ss]) => ({ name, average: Math.round((average(ss.map((s) => s.stats!.classAverage)) ?? 0) * 10) / 10, sheets: ss.length })).sort((x, y) => y.average - x.average);
  const ranked = [...reports].sort((x, y) => (y.average as number) - (x.average as number));
  const schoolAvg = average(reports.map((r) => r.average));

  return (
    <>
      <PageHeader title="Performance analytics" description="School-wide, per-class and per-subject results for the term." actions={<TermArmPicker termId={termId} onTerm={setTermId} showArm={false} />} />
      {sheets.length === 0 ? <Card><EmptyState title="No submitted results for this term yet" description="Charts appear once teachers submit their sheets." /></Card> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4"><Stat label="School average" value={fmt(schoolAvg)} /><Stat label="Sheets analysed" value={sheets.length} /><Stat label="Report cards" value={reports.length} /><Stat label="Top student avg" value={fmt(ranked[0]?.average as number)} tone="green" /></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader title="Class performance" description="Average score and pass rate" /><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={byArm}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="average" name="Average" fill="#4f46e5" radius={[4, 4, 0, 0]} /><Bar dataKey="passRate" name="Pass rate %" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            <Card><CardHeader title="Subject averages" /><div className="h-72 p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={bySubject} layout="vertical" margin={{ left: 30 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} fontSize={12} /><YAxis type="category" dataKey="name" width={110} fontSize={12} /><Tooltip /><Bar dataKey="average" fill="#6366f1" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card><CardHeader title="Top performers" /><ul className="divide-y divide-slate-100">{ranked.slice(0, 8).map((r, i) => <li key={r.studentId} className="flex justify-between px-5 py-2.5 text-sm"><span><span className="mr-2 text-slate-400">{i + 1}.</span>{r.studentName} <span className="text-xs text-slate-400">{r.armLabel}</span></span><strong>{fmt(r.average)}</strong></li>)}</ul></Card>
            <Card><CardHeader title="Needs support" /><ul className="divide-y divide-slate-100">{[...ranked].reverse().slice(0, 8).map((r) => <li key={r.studentId} className="flex justify-between px-5 py-2.5 text-sm"><span>{r.studentName} <span className="text-xs text-slate-400">{r.armLabel}</span></span><strong className="text-red-600">{fmt(r.average)}</strong></li>)}</ul></Card>
            <Card><CardHeader title="Teacher comparison" description="Mean of class averages" /><ul className="divide-y divide-slate-100">{byTeacher.map((t) => <li key={t.name} className="flex justify-between px-5 py-2.5 text-sm"><span>{t.name} <span className="text-xs text-slate-400">{t.sheets} sheet(s)</span></span><strong>{t.average}</strong></li>)}</ul></Card>
          </div>
        </div>)}
    </>
  );
}
