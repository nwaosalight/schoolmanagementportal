'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useClassData } from '@/components/results/use-class-data';
import { Alert, Card, Input, PageLoader, useToast, errMsg } from '@/components/ui';

export default function AttendancePage() {
  const { armId } = useParams<{ armId: string }>();
  const { term, students, reportOf, save, loading } = useClassData(armId);
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});
  if (loading) return <PageLoader />;
  if (!term?.daysOpen) return <Alert tone="warn" title="School days not set">Ask the administrator to set “School days” on the current term so attendance can be validated.</Alert>;
  const open = term.daysOpen;
  async function commit(id: string, text: string) {
    const s = students.find((x) => x.id === id)!; const n = Math.round(Number(text));
    if (text === '' || isNaN(n) || n < 0 || n > open) { toast.error(`Enter a number between 0 and ${open}.`); setDraft((d) => { const x = { ...d }; delete x[id]; return x; }); return; }
    try { await save(s, { daysPresent: n, daysAbsent: open - n }); } catch (e) { toast.error(errMsg(e)); }
  }
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">Enter days present out of <strong className="text-slate-800">{open}</strong>. Saves automatically when you leave a field.</div>
      <table className="w-full text-sm"><thead><tr><th className="th">Student</th><th className="th w-40 text-center">Days present</th><th className="th w-32 text-center">Days absent</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{students.map((s) => { const r = reportOf(s.id); const v = draft[s.id] ?? (r?.daysPresent ?? ''); return (
          <tr key={s.id}><td className="td font-medium text-slate-900">{s.lastName} {s.firstName}</td>
            <td className="td"><Input type="number" min={0} max={open} aria-label={`Days present for ${s.firstName}`} className="mx-auto w-24 text-center" value={String(v)} onChange={(e) => setDraft({ ...draft, [s.id]: e.target.value })} onBlur={(e) => { if (draft[s.id] !== undefined) commit(s.id, e.target.value); }} /></td>
            <td className="td text-center text-slate-500">{draft[s.id] !== undefined && draft[s.id] !== '' ? open - Number(draft[s.id]) : r?.daysAbsent ?? '—'}</td></tr>); })}</tbody></table>
      {students.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No students in this class.</p>}
    </Card>
  );
}
