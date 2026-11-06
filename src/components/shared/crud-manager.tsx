'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { collection, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { newId, sc, sd } from '@/lib/firebase/paths';
import { Writer } from '@/lib/firebase/writer';
import { addAudit } from '@/lib/audit';
import { fmtDate } from '@/lib/utils';
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, EmptyState, Field, Input, Modal, Select, Textarea, useToast, errMsg, type Column } from '@/components/ui';
import type { Doc } from '@/types';

export interface FieldDef {
  name: string; label: string; type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'multiselect';
  options?: { value: string; label: string }[]; required?: boolean; placeholder?: string; hint?: string; default?: any;
  table?: boolean; span2?: boolean;
}
type Row = Doc<Record<string, any>>;

/** Generic, config-driven CRUD screen for simple Firestore collections under /schools/{id}/{path}. */
export function CrudManager({
  path, singular, fields, columns, rowActions, exclusive, validate, filter, sort, canDelete = true, emptyHint, scoped, global,
}: {
  path: string; singular: string; fields: FieldDef[]; columns?: Column<Row>[]; rowActions?: (r: Row) => ReactNode; exclusive?: string;
  validate?: (v: Record<string, any>, rows: Row[], editing: Row | null) => string | null; filter?: (r: Row) => boolean;
  sort?: (a: Row, b: Row) => number; canDelete?: boolean; emptyHint?: string; scoped?: Record<string, any>; global?: boolean;
}) {
  const actor = useActor();
  const toast = useToast();
  const q = useMemo(() => (global ? collection(db, path) : sc(actor.schoolId, path)), [global, path, actor.schoolId]);
  const { data, loading } = useCollection<Record<string, any>>(q);
  const rows = useMemo(() => data.filter((r) => (filter ? filter(r) : true)).sort(sort ?? ((a, b) => String(a[fields[0].name]).localeCompare(String(b[fields[0].name]), undefined, { numeric: true }))), [data, filter, sort, fields]);

  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Row | null>(null);

  const blank = () => Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '')]));
  const openNew = () => { setEditing(null); setVals(blank()); setOpen(true); };
  const openEdit = (r: Row) => { setEditing(r); setVals({ ...blank(), ...r }); setOpen(true); };
  const ref = (id: string) => (global ? doc2(path, id) : sd(actor.schoolId, path, id));

  async function save() {
    for (const f of fields) {
      const v = vals[f.name];
      if (f.required && (v === '' || v == null || (Array.isArray(v) && !v.length))) return toast.error(`${f.label} is required.`);
    }
    const err = validate?.(vals, rows, editing); if (err) return toast.error(err);
    setBusy(true);
    try {
      const data: Record<string, any> = { ...(scoped ?? {}) };
      fields.forEach((f) => { const v = vals[f.name]; data[f.name] = f.type === 'number' ? (v === '' || v == null ? deleteField() : Number(v)) : v ?? ''; });
      const id = editing?.id ?? newId(actor.schoolId, path);
      const w = new Writer();
      w.set(ref(id), data, { merge: true });
      if (exclusive && data[exclusive] === true) rows.filter((r) => r.id !== id && r[exclusive]).forEach((r) => w.update(ref(r.id), { [exclusive]: false }));
      if (!global) addAudit(w, actor, { action: editing ? 'UPDATE' : 'CREATE', entityType: singular, entityId: id, summary: `${editing ? 'Updated' : 'Created'} ${singular.toLowerCase()} "${vals[fields[0].name]}"` });
      await w.commit();
      toast.success(`${singular} saved.`); setOpen(false);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function remove() {
    if (!del) return; setBusy(true);
    try {
      const w = new Writer(); w.delete(ref(del.id));
      if (!global) addAudit(w, actor, { action: 'DELETE', entityType: singular, entityId: del.id, summary: `Deleted ${singular.toLowerCase()} "${del[fields[0].name]}"` });
      await w.commit(); toast.success(`${singular} deleted.`); setDel(null);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }

  const cols: Column<Row>[] = [
    ...fields.filter((f) => f.table !== false && f.type !== 'textarea').slice(0, 6).map<Column<Row>>((f) => ({
      key: f.name, header: f.label, sortable: true,
      value: (r) => (f.type === 'select' ? f.options?.find((o) => o.value === r[f.name])?.label ?? r[f.name] : r[f.name]),
      render: (r) => {
        const v = r[f.name];
        if (f.type === 'checkbox') return v ? <Badge tone="green">Yes</Badge> : <span className="text-slate-300">—</span>;
        if (f.type === 'date') return fmtDate(v);
        if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? (v || '—');
        if (f.type === 'multiselect') return <span className="text-slate-500">{(v ?? []).length} selected</span>;
        return v === '' || v == null ? '—' : String(v);
      },
    })),
    ...(columns ?? []),
    { key: '_actions', header: '', className: 'w-px text-right', render: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {rowActions?.(r)}
        <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        {canDelete && <Button variant="ghost" size="sm" onClick={() => setDel(r)} aria-label="Delete" className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    ) },
  ];

  return (
    <>
      <DataTable rows={rows} columns={cols} loading={loading} searchPlaceholder={`Search ${singular.toLowerCase()}s…`}
        toolbar={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openNew}>Add {singular.toLowerCase()}</Button>}
        empty={<EmptyState title={`No ${singular.toLowerCase()}s yet`} description={emptyHint} action={<Button size="sm" onClick={openNew} icon={<Plus className="h-4 w-4" />}>Add {singular.toLowerCase()}</Button>} />} />
      <Modal open={open} onClose={() => setOpen(false)} title={`${editing ? 'Edit' : 'Add'} ${singular.toLowerCase()}`}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.name} label={f.type === 'checkbox' ? undefined : f.label} required={f.required} hint={f.hint} className={f.type === 'textarea' || f.type === 'multiselect' || f.span2 ? 'sm:col-span-2' : ''}>
              {f.type === 'textarea' ? <Textarea value={vals[f.name] ?? ''} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder} />
                : f.type === 'select' ? <Select value={vals[f.name] ?? ''} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} options={f.options} placeholder="Select…" />
                : f.type === 'checkbox' ? <Checkbox checked={!!vals[f.name]} onChange={(e) => setVals({ ...vals, [f.name]: e.target.checked })} label={f.label} />
                : f.type === 'multiselect' ? (
                  <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                    {f.options?.map((o) => (
                      <Checkbox key={o.value} label={o.label} checked={(vals[f.name] ?? []).includes(o.value)}
                        onChange={(e) => setVals({ ...vals, [f.name]: e.target.checked ? [...(vals[f.name] ?? []), o.value] : (vals[f.name] ?? []).filter((x: string) => x !== o.value) })} />
                    ))}
                    {!f.options?.length && <p className="col-span-3 text-sm text-slate-500">Nothing to choose from yet.</p>}
                  </div>)
                : <Input type={f.type} value={vals[f.name] ?? ''} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder} />}
            </Field>
          ))}
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger confirmLabel="Delete" title={`Delete ${singular.toLowerCase()}?`}
        message={<>This permanently removes <strong>{del?.[fields[0].name]}</strong>. Existing results that reference it keep their saved copy.</>} />
    </>
  );
}
import { doc } from 'firebase/firestore';
const doc2 = (path: string, id: string) => doc(db, path, id);
