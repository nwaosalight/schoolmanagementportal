'use client';
import { useParams } from 'next/navigation';
import { useClassData } from '@/components/results/use-class-data';
import { useTraits } from '@/lib/school/use-settings';
import { Alert, Card, PageLoader, Select, useToast, errMsg } from '@/components/ui';

export default function TraitsPage() {
  const { armId } = useParams<{ armId: string }>();
  const { students, reportOf, save, loading } = useClassData(armId);
  const traits = useTraits().data.filter((t) => t.isActive).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const toast = useToast();
  if (loading) return <PageLoader />;
  if (!traits.length) return <Alert tone="warn" title="No traits configured">The administrator can add them under Report cards → Conduct traits.</Alert>;
  const set = async (sid: string, traitId: string, v: string) => {
    const s = students.find((x) => x.id === sid)!;
    try { await save(s, { traits: { [traitId]: Number(v) } }); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Card className="overflow-x-auto">
      <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">Rate each student 1 (poor) to 5 (excellent). Changes save instantly.</div>
      <table className="w-full min-w-[720px] text-sm">
        <thead><tr><th className="th sticky left-0 bg-slate-50">Student</th>{traits.map((t) => <th key={t.id} className="th text-center" title={t.category}>{t.name}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{students.map((s) => { const r = reportOf(s.id); return (
          <tr key={s.id}><td className="td sticky left-0 bg-white font-medium text-slate-900">{s.lastName} {s.firstName}</td>
            {traits.map((t) => <td key={t.id} className="px-2 py-2 text-center"><Select aria-label={`${t.name} for ${s.firstName}`} className="mx-auto w-16 py-1 text-center" value={String(r?.traits?.[t.id] ?? '')} onChange={(e) => set(s.id, t.id, e.target.value)} placeholder="–" options={Array.from({ length: t.maxRating }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} /></td>)}</tr>); })}</tbody>
      </table>
    </Card>
  );
}
