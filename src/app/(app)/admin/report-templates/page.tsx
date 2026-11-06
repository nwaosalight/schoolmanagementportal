'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { setDoc } from 'firebase/firestore';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useSettings } from '@/lib/school/use-settings';
import { useSchoolData } from '@/lib/school/school-data';
import { sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { CrudManager } from '@/components/shared/crud-manager';
import { ReportCard } from '@/components/shared/report-card';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Switch, Tabs, Textarea, useToast, errMsg } from '@/components/ui';
import { DEFAULT_BANDS, DEFAULT_COMPONENTS } from '@/lib/seed';
import type { Settings } from '@/types';

export default function ReportTemplatesPage() {
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const { settings } = useSettings();
  const { currentTerm } = useSchoolData();
  const [tab, setTab] = useState<'layout' | 'traits' | 'phrases'>('layout');
  const [f, setF] = useState<Settings>(settings); const [busy, setBusy] = useState(false);
  useEffect(() => setF(settings), [settings]);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    try { await setDoc(sd(a.schoolId, 'settings', 'general'), f, { merge: true }); const w = new Writer(); addAudit(w, a, { action: 'SETTINGS_CHANGE', entityType: 'Settings', summary: 'Updated report card settings' }); await w.commit(); toast.success('Saved.'); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  const Phrases = ({ k, title }: { k: 'teacherPhrases' | 'principalPhrases'; title: string }) => (
    <Card>
      <CardHeader title={title} description="Quick-pick comments, suggested by the student's average (highest matching “from” value)." />
      <div className="space-y-3 p-5">
        {f[k].map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input type="number" className="w-20 shrink-0" aria-label="From average" value={p.min} onChange={(e) => set(k, f[k].map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)))} />
            <Textarea rows={2} value={p.text} onChange={(e) => set(k, f[k].map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <Button variant="ghost" size="sm" aria-label="Remove" onClick={() => set(k, f[k].filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>))}
        <div className="flex gap-2"><Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => set(k, [...f[k], { min: 0, text: '' }])}>Add phrase</Button></div>
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader title="Report cards" description="Choose what appears on report cards, manage conduct traits and comment phrases." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'layout', label: 'Layout & content' }, { value: 'traits', label: 'Conduct traits' }, { value: 'phrases', label: 'Comment phrases' }]} />
      {tab === 'layout' && (
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-2"><div className="space-y-4 p-5">
            <Field label="Layout"><Select value={f.layout} onChange={(e) => set('layout', e.target.value as any)} options={[{ value: 'classic', label: 'Classic (roomy)' }, { value: 'compact', label: 'Compact (fits many subjects)' }]} /></Field>
            <Switch label="Show class position" checked={f.showPosition} onChange={(v) => set('showPosition', v)} />
            <Switch label="Show class average per subject" checked={f.showClassAverage} onChange={(v) => set('showClassAverage', v)} />
            <Switch label="Show attendance" checked={f.showAttendance} onChange={(v) => set('showAttendance', v)} />
            <Switch label="Show conduct & skills" checked={f.showTraits} onChange={(v) => set('showTraits', v)} />
            <Switch label="Show grade key" checked={f.showGradeKey} onChange={(v) => set('showGradeKey', v)} />
            <Field label="Fee notice" hint="Printed at the bottom, e.g. next term fees"><Textarea value={f.feeNotice ?? ''} onChange={(e) => set('feeNotice', e.target.value)} /></Field>
            <Field label="Footer note"><Input value={f.footerNote ?? ''} onChange={(e) => set('footerNote', e.target.value)} /></Field>
            <Button loading={busy} onClick={save}>Save</Button>
            <p className="text-xs text-slate-500">The “next term begins” date and school days come from the term under Sessions & terms.</p>
          </div></Card>
          <div className="xl:col-span-3"><ReportCard preview school={school} settings={f} termLabel="Sample Term" nextTermBegins={currentTerm?.nextTermBegins} daysOpen={currentTerm?.daysOpen ?? 60} traits={[]}
            report={{ studentName: 'Sample Student', admissionNumber: 'ADM/001', armLabel: 'JSS1 A', gender: 'FEMALE', average: 68.3, totalScore: 546, overallGrade: 'B', position: 3, classSize: 32, daysPresent: 54, passMark: 40, components: DEFAULT_COMPONENTS, bands: DEFAULT_BANDS,
              teacherComment: 'A very good result.', principalRemark: 'Commendable.', subjects: [
                { subjectId: '1', name: 'Mathematics', scores: { CA1: 13, CA2: 12, EXAM: 51 }, total: 76, grade: 'A', remark: 'Excellent', position: 2, classAverage: 58, flag: 'NONE' },
                { subjectId: '2', name: 'English Language', scores: { CA1: 11, CA2: 12, EXAM: 42 }, total: 65, grade: 'B', remark: 'Very Good', position: 5, classAverage: 55, flag: 'NONE' }] }} /></div>
        </div>
      )}
      {tab === 'traits' && <CrudManager path="traits" singular="Trait" sort={(x, y) => String(x.category).localeCompare(String(y.category)) || x.name.localeCompare(y.name)}
        fields={[{ name: 'name', label: 'Trait', type: 'text', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, default: 'AFFECTIVE', options: [{ value: 'AFFECTIVE', label: 'Affective' }, { value: 'PSYCHOMOTOR', label: 'Psychomotor' }] },
          { name: 'maxRating', label: 'Max rating', type: 'number', default: 5 }, { name: 'isActive', label: 'Active', type: 'checkbox', default: true }]} />}
      {tab === 'phrases' && <div className="space-y-6"><Phrases k="teacherPhrases" title="Class teacher phrases" /><Phrases k="principalPhrases" title="Principal phrases" /><Button loading={busy} onClick={save}>Save phrases</Button></div>}
    </>
  );
}
