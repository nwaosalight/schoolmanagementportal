'use client';
import { useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { newId, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { validateBands } from '@/lib/grading';
import { DEFAULT_BANDS } from '@/lib/seed';
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, Checkbox, useToast, errMsg } from '@/components/ui';
import type { Band, Doc, GradingScheme } from '@/types';

export default function GradingPage() {
  const a = useActor();
  const toast = useToast();
  const { schemes } = useSchoolData();
  const [edit, setEdit] = useState<{ id?: string; name: string; passMark: number; bands: Band[]; isDefault: boolean } | null>(null);
  const [del, setDel] = useState<Doc<GradingScheme> | null>(null);
  const [busy, setBusy] = useState(false);
  const problem = edit ? validateBands(edit.bands) : null;

  const setBand = (i: number, patch: Partial<Band>) => setEdit((e) => e && { ...e, bands: e.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  async function save() {
    if (!edit) return;
    if (!edit.name.trim()) return toast.error('Give the scheme a name.');
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      const id = edit.id ?? newId(a.schoolId, 'gradingSchemes');
      const w = new Writer();
      const isDefault = edit.isDefault || schemes.length === 0;
      w.set(sd(a.schoolId, 'gradingSchemes', id), { name: edit.name.trim(), passMark: Number(edit.passMark), bands: edit.bands.map((b) => ({ ...b, min: Number(b.min), max: Number(b.max), gpa: Number(b.gpa ?? 0) })), isDefault });
      if (isDefault) schemes.filter((s) => s.id !== id && s.isDefault).forEach((s) => w.update(sd(a.schoolId, 'gradingSchemes', s.id), { isDefault: false }));
      addAudit(w, a, { action: edit.id ? 'UPDATE' : 'CREATE', entityType: 'GradingScheme', entityId: id, summary: `Saved grading scheme "${edit.name}"` });
      await w.commit(); toast.success('Grading scheme saved.'); setEdit(null);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function makeDefault(s: Doc<GradingScheme>) {
    const w = new Writer();
    schemes.forEach((x) => w.update(sd(a.schoolId, 'gradingSchemes', x.id), { isDefault: x.id === s.id }));
    await w.commit(); toast.success(`"${s.name}" is now the default.`);
  }
  async function remove() {
    if (!del) return; setBusy(true);
    try { const w = new Writer(); w.delete(sd(a.schoolId, 'gradingSchemes', del.id)); addAudit(w, a, { action: 'DELETE', entityType: 'GradingScheme', entityId: del.id, summary: `Deleted grading scheme "${del.name}"` }); await w.commit(); setDel(null); toast.success('Deleted.'); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Grading scale" description="Score ranges, letter grades, remarks and the pass mark."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ name: '', passMark: 40, bands: DEFAULT_BANDS.map((b) => ({ ...b })), isDefault: false })}>New scheme</Button>} />
      <Alert tone="info" className="mb-5">Result sheets keep a copy of the grading scale they were created with, so changing a scheme never alters existing results.</Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        {schemes.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold text-slate-900">{s.name} {s.isDefault && <Badge tone="brand" className="ml-1">Default</Badge>}</h3><p className="text-sm text-slate-500">Pass mark {s.passMark}</p></div>
              <div className="flex gap-1">
                {!s.isDefault && <Button variant="ghost" size="sm" title="Set as default" onClick={() => makeDefault(s)}><Star className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="sm" onClick={() => setEdit({ id: s.id, name: s.name, passMark: s.passMark, bands: s.bands.map((b) => ({ ...b })), isDefault: s.isDefault })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                {!s.isDefault && <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDel(s)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...s.bands].sort((x, y) => y.min - x.min).map((b) => (
                <span key={b.grade} className={`rounded-lg border px-2.5 py-1.5 text-xs ${b.isPass ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  <strong className="text-sm">{b.grade}</strong> <span className="text-slate-500">{b.min}–{b.max}</span> · {b.remark}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit grading scheme' : 'New grading scheme'} size="xl"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save scheme</Button></>}>
        {edit && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name" required className="sm:col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Pass mark" required><Input type="number" value={edit.passMark} onChange={(e) => setEdit({ ...edit, passMark: Number(e.target.value) })} /></Field>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr>{['Grade', 'From', 'To', 'Remark', 'GPA', 'Pass', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {edit.bands.map((b, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5"><Input className="w-16" value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value.toUpperCase() })} /></td>
                      <td className="px-2 py-1.5"><Input className="w-20" type="number" value={b.min} onChange={(e) => setBand(i, { min: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5"><Input className="w-20" type="number" value={b.max} onChange={(e) => setBand(i, { max: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5"><Input value={b.remark} onChange={(e) => setBand(i, { remark: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="w-16" type="number" value={b.gpa ?? 0} onChange={(e) => setBand(i, { gpa: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5"><Checkbox checked={b.isPass} onChange={(e) => setBand(i, { isPass: e.target.checked })} /></td>
                      <td className="px-2 py-1.5"><Button variant="ghost" size="sm" onClick={() => setEdit({ ...edit, bands: edit.bands.filter((_, j) => j !== i) })} aria-label="Remove band"><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ ...edit, bands: [...edit.bands, { grade: '', min: 0, max: 0, remark: '', gpa: 0, isPass: true }] })}>Add band</Button>
              <Checkbox checked={edit.isDefault} onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })} label="Use as default scheme" />
            </div>
            {problem ? <Alert tone="warn">{problem}</Alert> : <Alert tone="success">Bands cover 0–100 with no gaps or overlaps.</Alert>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger confirmLabel="Delete" title="Delete grading scheme?" message={<>"{del?.name}" will be removed. Existing result sheets keep their own copy.</>} />
    </>
  );
}
