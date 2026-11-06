'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { useClassData } from '@/components/results/use-class-data';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings } from '@/lib/school/use-settings';
import { Alert, Button, Card, Field, PageHeader, PageLoader, Select, Textarea, useToast, errMsg } from '@/components/ui';
import { fmt } from '@/lib/utils';

export default function RemarksPage() {
  const { armId } = useParams<{ armId: string }>();
  const { armLabel } = useSchoolData(); const { settings } = useSettings(); const toast = useToast();
  const { term, students, reportOf, save, loading } = useClassData(armId);
  const [draft, setDraft] = useState<Record<string, string>>({}); const [bulk, setBulk] = useState(''); const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  const suggest = (avg?: number | null) => [...settings.principalPhrases].sort((x, y) => y.min - x.min).find((p) => (avg ?? 0) >= p.min)?.text ?? '';
  const commit = async (id: string, text: string) => { try { await save(students.find((s) => s.id === id)!, { principalRemark: text }); setDraft((d) => { const n = { ...d }; delete n[id]; return n; }); } catch (e) { toast.error(errMsg(e)); } };
  async function fill(useBulk: boolean) {
    setBusy(true);
    try { let n = 0; for (const s of students) { const r = reportOf(s.id); if (!r?.principalRemark) { const t = useBulk ? bulk : suggest(r?.average); if (t) { await save(s, { principalRemark: t }); n++; } } } toast.success(`${n} remark(s) added.`); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader back={<Link href="/review/remarks" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Classes</Link>} title={`${armLabel(armId)} — remarks`} description={term?.name} />
      {!term && <Alert tone="warn" title="No current term" className="mb-4" />}
      <Card className="mb-5 p-5"><div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
        <Field label="Default remark for students with no remark yet"><Textarea rows={2} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="e.g. A commendable effort. Keep it up." /></Field>
        <Button variant="secondary" loading={busy} disabled={!bulk.trim()} onClick={() => fill(true)}>Apply default</Button>
        <Button variant="secondary" icon={<Wand2 className="h-4 w-4" />} loading={busy} onClick={() => fill(false)}>Suggest by average</Button></div></Card>
      <Card className="divide-y divide-slate-100">
        {students.map((s) => { const r = reportOf(s.id); const v = draft[s.id] ?? r?.principalRemark ?? ''; return (
          <div key={s.id} className="grid gap-3 p-5 md:grid-cols-[14rem_1fr]">
            <div><p className="font-medium text-slate-900">{s.lastName} {s.firstName}</p><p className="text-xs text-slate-500">{r?.average != null ? `Average ${fmt(r.average)} · position ${r.position ?? '—'}` : 'Not computed yet'}</p></div>
            <div className="space-y-2"><Textarea rows={2} value={v} aria-label={`Remark for ${s.firstName}`} onChange={(e) => setDraft({ ...draft, [s.id]: e.target.value })} onBlur={() => draft[s.id] !== undefined && commit(s.id, draft[s.id])} />
              <Select className="w-full text-xs sm:w-80" aria-label="Quick pick" value="" onChange={(e) => e.target.value && commit(s.id, e.target.value)} placeholder="Quick pick a phrase…" options={settings.principalPhrases.map((p) => ({ value: p.text, label: p.text.slice(0, 70) }))} /></div>
          </div>); })}
        {students.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No students in this class.</p>}
      </Card>
    </>
  );
}
