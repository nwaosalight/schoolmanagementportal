'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Wand2 } from 'lucide-react';
import { useClassData } from '@/components/results/use-class-data';
import { useSettings } from '@/lib/school/use-settings';
import { Button, Card, PageLoader, Select, Textarea, useToast, errMsg } from '@/components/ui';
import { fmt } from '@/lib/utils';

export default function CommentsPage() {
  const { armId } = useParams<{ armId: string }>();
  const { students, reportOf, save, loading } = useClassData(armId);
  const { settings } = useSettings(); const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (loading) return <PageLoader />;
  const suggest = (avg?: number | null) => { const a = avg ?? 0; return [...settings.teacherPhrases].sort((x, y) => y.min - x.min).find((p) => a >= p.min)?.text ?? ''; };
  const commit = async (id: string, text: string) => { try { await save(students.find((s) => s.id === id)!, { teacherComment: text }); setDraft((d) => { const n = { ...d }; delete n[id]; return n; }); } catch (e) { toast.error(errMsg(e)); } };
  async function fillBlank() {
    setBusy(true);
    try { let n = 0; for (const s of students) { const r = reportOf(s.id); if (!r?.teacherComment) { const t = suggest(r?.average); if (t) { await save(s, { teacherComment: t }); n++; } } } toast.success(`${n} blank comment(s) filled from suggestions.`); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button variant="secondary" icon={<Wand2 className="h-4 w-4" />} loading={busy} onClick={fillBlank}>Fill blanks with suggestions</Button></div>
      <Card className="divide-y divide-slate-100">
        {students.map((s) => { const r = reportOf(s.id); const val = draft[s.id] ?? r?.teacherComment ?? ''; return (
          <div key={s.id} className="grid gap-3 p-5 md:grid-cols-[14rem_1fr]">
            <div><p className="font-medium text-slate-900">{s.lastName} {s.firstName}</p><p className="text-xs text-slate-500">{r?.average != null ? `Average ${fmt(r.average)}` : 'Results not computed yet'}</p></div>
            <div className="space-y-2">
              <Textarea rows={2} aria-label={`Comment for ${s.firstName}`} value={val} onChange={(e) => setDraft({ ...draft, [s.id]: e.target.value })} onBlur={() => draft[s.id] !== undefined && commit(s.id, draft[s.id])} />
              <Select className="w-full text-xs sm:w-80" aria-label="Quick pick" value="" onChange={(e) => e.target.value && commit(s.id, e.target.value)} placeholder="Quick pick a phrase…" options={settings.teacherPhrases.map((p) => ({ value: p.text, label: p.text.slice(0, 70) }))} />
            </div>
          </div>); })}
        {students.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No students in this class.</p>}
      </Card>
    </div>
  );
}
