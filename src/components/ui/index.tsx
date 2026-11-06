'use client';
import {
  createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Info, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResultStatus } from '@/types';

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode;
};
export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...p }: BtnProps) {
  return (
    <button type={type} disabled={disabled || loading} className={cn('btn', `btn-${size}`, `btn-${variant}`, className)} {...p}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------- Form controls ---------- */
export function Field({ label, hint, error, required, children, className }: { label?: string; hint?: string; error?: string | null; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}{required && <span className="text-red-500"> *</span>}</label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...p }, ref) {
  return <input ref={ref} className={cn('input', invalid && 'input-error', className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={cn('input', className)} {...p} />;
});
export function Select({ className, options, placeholder, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options?: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select className={cn('input pr-8', className)} {...p}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      {children}
    </select>
  );
}
export function Checkbox({ label, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" {...p} />
      {label}
    </label>
  );
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-3 text-sm text-slate-700">
      <span className={cn('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

/* ---------- Layout bits ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}
export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div><h3 className="text-base font-semibold text-slate-900">{title}</h3>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div>
      {action}
    </div>
  );
}
export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}</div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
export function Stat({ label, value, hint, icon, tone = 'brand' }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'brand' | 'green' | 'amber' | 'red' }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>
        {icon && <div className={cn('rounded-lg p-2', tones[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700', brand: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700', blue: 'bg-sky-50 text-sky-700',
};
export function Badge({ tone = 'slate', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return <span className={cn('badge', TONES[tone], className)}>{children}</span>;
}
const STATUS: Record<ResultStatus | 'NOT_STARTED' | 'UNALLOCATED', { tone: keyof typeof TONES; label: string }> = {
  DRAFT: { tone: 'slate', label: 'Draft' }, SUBMITTED: { tone: 'blue', label: 'Submitted' }, UNDER_REVIEW: { tone: 'amber', label: 'Under review' },
  APPROVED: { tone: 'green', label: 'Approved' }, RETURNED: { tone: 'red', label: 'Returned' }, PUBLISHED: { tone: 'brand', label: 'Published' },
  LOCKED: { tone: 'slate', label: 'Locked' }, NOT_STARTED: { tone: 'slate', label: 'Not started' }, UNALLOCATED: { tone: 'amber', label: 'No teacher' },
};
export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status] ?? STATUS.DRAFT;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Spinner({ className }: { className?: string }) { return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} />; }
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-slate-500"><Spinner />{label}</div>;
}
export function Skeleton({ className }: { className?: string }) { return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />; }
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">{icon}</div>}
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'warn' | 'error' | 'success'; title?: string; children?: ReactNode; className?: string }) {
  const m = {
    info: ['border-sky-200 bg-sky-50 text-sky-900', <Info key="i" className="h-4 w-4" />], warn: ['border-amber-200 bg-amber-50 text-amber-900', <AlertCircle key="w" className="h-4 w-4" />],
    error: ['border-red-200 bg-red-50 text-red-900', <AlertCircle key="e" className="h-4 w-4" />], success: ['border-emerald-200 bg-emerald-50 text-emerald-900', <CheckCircle2 key="s" className="h-4 w-4" />],
  } as const;
  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm', m[tone][0], className)}>
      <div className="mt-0.5 shrink-0">{m[tone][1]}</div>
      <div>{title && <p className="font-medium">{title}</p>}{children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}</div>
    </div>
  );
}
export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)}><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cn('relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2>{description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}</div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void | Promise<void>; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition', value === t.value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Toasts ---------- */
interface ToastItem { id: number; tone: 'success' | 'error' | 'info'; message: string }
const ToastCtx = createContext<{ success: (m: string) => void; error: (m: string) => void; info: (m: string) => void } | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tone: ToastItem['tone'], message: string) => {
    const id = Date.now() + Math.random();
    setItems((i) => [...i, { id, tone, message }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  const api = useMemo(() => ({ success: (m: string) => push('success', m), error: (m: string) => push('error', m), info: (m: string) => push('info', m) }), [push]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg',
            t.tone === 'success' && 'border-emerald-200', t.tone === 'error' && 'border-red-200', t.tone === 'info' && 'border-slate-200')}>
            {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : t.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" /> : <Info className="mt-0.5 h-4 w-4 text-sky-600" />}
            <span className="text-slate-700">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error('useToast must be used inside <ToastProvider>');
  return c;
}
export const errMsg = (e: unknown) => (e instanceof Error ? e.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim() || 'Something went wrong' : 'Something went wrong');

/* ---------- DataTable ---------- */
export interface Column<T> {
  key: string; header: string; render?: (row: T) => ReactNode; value?: (row: T) => string | number | null | undefined;
  className?: string; sortable?: boolean; align?: 'left' | 'right' | 'center';
}
export function DataTable<T extends { id: string }>({
  rows, columns, loading, searchable = true, searchPlaceholder = 'Search…', pageSize = 15, empty, toolbar, onRowClick,
  selectable, selected, onSelectedChange,
}: {
  rows: T[]; columns: Column<T>[]; loading?: boolean; searchable?: boolean; searchPlaceholder?: string; pageSize?: number;
  empty?: ReactNode; toolbar?: ReactNode; onRowClick?: (r: T) => void;
  selectable?: boolean; selected?: Set<string>; onSelectedChange?: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const val = (c: Column<T>, r: T) => (c.value ? c.value(r) : (r as any)[c.key]);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      out = out.filter((r) => columns.some((c) => String(val(c, r) ?? '').toLowerCase().includes(n)));
    }
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((a, b) => {
        const x = val(c, a) ?? '', y = val(c, b) ?? '';
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort, columns]);

  useEffect(() => setPage(0), [q, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const allOnPage = selectable && view.length > 0 && view.every((r) => selected?.has(r.id));
  const toggleAll = () => {
    const s = new Set(selected);
    view.forEach((r) => (allOnPage ? s.delete(r.id) : s.add(r.id)));
    onSelectedChange?.(s);
  };
  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); onSelectedChange?.(s); };

  return (
    <Card className="overflow-hidden">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {searchable ? (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="input pl-9" aria-label="Search" />
            </div>
          ) : <span />}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {selectable && <th className="th w-10"><input type="checkbox" checked={!!allOnPage} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300" aria-label="Select all" /></th>}
              {columns.map((c) => (
                <th key={c.key} className={cn('th', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                  {c.sortable ? (
                    <button className="inline-flex items-center gap-1 uppercase hover:text-slate-700" onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>
                      {c.header}<ChevronsUpDown className="h-3 w-3" />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>{Array.from({ length: columns.length + (selectable ? 1 : 0) }, (_, j) => <td key={j} className="td"><Skeleton className="h-4 w-full" /></td>)}</tr>
            )) : view.map((r) => (
              <tr key={r.id} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn('hover:bg-slate-50/70', onRowClick && 'cursor-pointer')}>
                {selectable && <td className="td" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={!!selected?.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 rounded border-slate-300" aria-label="Select row" /></td>}
                {columns.map((c) => (
                  <td key={c.key} className={cn('td', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>{c.render ? c.render(r) : String(val(c, r) ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && filtered.length === 0 && (empty ?? <EmptyState title="Nothing here yet" description={q ? 'No results match your search.' : undefined} />)}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} of {filtered.length}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </Card>
  );
}
