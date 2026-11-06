'use client';
import { useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { newId, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { DEFAULT_COMPONENTS } from '@/lib/seed';
import { Alert, Badge, Button, Card, Checkbox, ConfirmDialog, Field, Input, Modal, PageHeader, useToast, errMsg } from '@/components/ui';
import type { Component, Doc, Structure } from '@/types';

export default function AssessmentPage() {
  const a = useActor();
  const toast = useToast();
  const { structures } = useSchoolData();
  const [edit, setEdit] = useState<{ id?: string; name: string; components: Component[]; isDefault: boolean } | null>(null);
  const [del, setDel] = useState<Doc<Structure> | null>(null);
  const [busy, setBusy] = useState(false);
  const total = edit ? edit.components.reduce((s, c) => s + (Number(c.max) || 0), 0) : 0;
  const codes = edit?.components.map((c) => c.code.trim().toUpperCase()) ?? [];
  const problem = !edit ? null : edit.components.length === 0 ? 'Add at least one component.'
    : codes.some((c) => !c) ? 'Every component needs a code.' : new Set(codes).size !== codes.length ? 'Component codes must be unique.'
    : total !== 100 ? `Component maximums must add up to 100 (currently ${total}).` : null;
  const setC = (i: number, patch: Partial<Component>) => setEdit((e) => e && { ...e, components: e.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  async function save() {
    if (!edit) return;
    if (!edit.name.trim()) return toast.error('Give the structure a name.');
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      const id = edit.id ?? newId(a.schoolId, 'assessmentStructures');
      const isDefault = edit.isDefault || structures.length === 0;
      const w = new Writer();
      w.set(sd(a.schoolId, 'assessmentStructures', id), { name: edit.name.trim(), total: 100, isDefault, components: edit.components.map((c) => ({ code: c.code.trim().toUpperCase(), name: c.name.trim() || c.code, max: Number(c.max), isExam: !!c.isExam })) });
      if (isDefault) structures.filter((s) => s.id !== id && s.isDefault).forEach((s) => w.update(sd(a.schoolId, 'assessmentStructures', s.id), { isDefault: false }));
      addAudit(w, a, { action: edit.id ? 'UPDATE' : 'CREATE', entityType: 'AssessmentStructure', entityId: id, summary: `Saved assessment structure "${edit.name}"` });
      await w.commit(); toast.success('Assessment structure saved.'); setEdit(null);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function remove() {
    if (!del) return; setBusy(true);
    try { const w = new Writer(); w.delete(sd(a.schoolId, 'assessmentStructures', del.id)); addAudit(w, a, { action: 'DELETE', entityType: 'AssessmentStructure', entityId: del.id, summary: `Deleted assessment structure "${del.name}"` }); await w.commit(); setDel(null); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  return (
    <>
      <PageHeader title="Assessment structure" description="How a subject's 100 marks are split across continuous assessments and the exam."
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ name: '', components: DEFAULT_COMPONENTS.map((c) => ({ ...c })), isDefault: false })}>New structure</Button>} />
      <Alert tone="info" className="mb-5">New result sheets copy the default structure at the moment they are created. Existing sheets are not affected by later edits.</Alert>
      <div className="grid gap-4 lg:grid-cols-2">
        {structures.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">{s.name} {s.isDefault && <Badge tone="brand" className="ml-1">Default</Badge>}</h3>
              <div className="flex gap-1">
                {!s.isDefault && <Button variant="ghost" size="sm" title="Set as default" onClick={async () => { const w = new Writer(); structures.forEach((x) => w.update(sd(a.schoolId, 'assessmentStructures', x.id), { isDefault: x.id === s.id })); await w.commit(); }}><Star className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEdit({ id: s.id, name: s.name, components: s.components.map((c) => ({ ...c })), isDefault: s.isDefault })}><Pencil className="h-4 w-4" /></Button>
                {!s.isDefault && <Button variant="ghost" size="sm" aria-label="Delete" className="text-red-600 hover:bg-red-50" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            <div className="mt-4 flex h-9 overflow-hidden rounded-lg text-xs font-medium text-white">
              {s.components.map((c, i) => <div key={c.code} style={{ width: `${c.max}%` }} className={['bg-brand-400', 'bg-brand-500', 'bg-brand-700', 'bg-sky-500', 'bg-emerald-500'][i % 5] + ' flex items-center justify-center'}>{c.code} {c.max}</div>)}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit structure' : 'New assessment structure'} size="lg"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save structure</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Name" required><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr>{['Code', 'Name', 'Max score', 'Exam', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {edit.components.map((c, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5"><Input className="w-24" value={c.code} onChange={(e) => setC(i, { code: e.target.value.toUpperCase() })} /></td>
                      <td className="px-2 py-1.5"><Input value={c.name} onChange={(e) => setC(i, { name: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="w-24" type="number" value={c.max} onChange={(e) => setC(i, { max: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5"><Checkbox checked={!!c.isExam} onChange={(e) => setC(i, { isExam: e.target.checked })} /></td>
                      <td className="px-2 py-1.5"><Button variant="ghost" size="sm" aria-label="Remove" onClick={() => setEdit({ ...edit, components: edit.components.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ ...edit, components: [...edit.components, { code: '', name: '', max: 0 }] })}>Add component</Button>
              <Checkbox checked={edit.isDefault} onChange={(e) => setEdit({ ...edit, isDefault: e.target.checked })} label="Use as default" />
            </div>
            {problem ? <Alert tone="warn">{problem}</Alert> : <Alert tone="success">Components add up to 100.</Alert>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger confirmLabel="Delete" title="Delete structure?" message={<>"{del?.name}" will be removed.</>} />
    </>
  );
}
