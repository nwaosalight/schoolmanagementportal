'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CloudOff, Download, Loader2, RefreshCw, Send, Upload, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import { getDocs, updateDoc } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { rowsCol, sd } from '@/lib/firebase/paths';
import { ConflictError, EDITABLE, saveRows, sheetStats, submitSheet, syncRows } from '@/lib/results/sheets';
import { gradeFor, sumScores } from '@/lib/grading';
import { downloadFile, fmt, toCsv } from '@/lib/utils';
import { Alert, Badge, Button, Card, Modal, Select, Spinner, useToast, errMsg } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Doc, Row, RowFlag, Sheet } from '@/types';

type R = Doc<Row>;
type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export function ScoreGrid({ sheet, canEdit }: { sheet: Doc<Sheet>; canEdit: boolean }) {
  const a = useActor();
  const toast = useToast();
  const comps = sheet.components;
  const editable = canEdit && EDITABLE.includes(sheet.status);

  const [rows, setRows] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>('saved');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rev = useRef(0);
  const live = useRef({ rows, dirty });
  live.current = { rows, dirty };

  const load = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(rowsCol(a.schoolId, sheet.id));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as R).sort((x, y) => x.name.localeCompare(y.name));
    setRows(list); setDirty({}); setBad(new Set()); setRaw({}); setSave('saved'); setLoading(false);
  }, [a.schoolId, sheet.id]);
  useEffect(() => { load().catch((e) => toast.error(errMsg(e))); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- editing ---------- */
  const setScore = useCallback((studentId: string, code: string, text: string) => {
    const max = comps.find((c) => c.code === code)!.max;
    const key = `${studentId}|${code}`;
    setRaw((r) => ({ ...r, [key]: text }));
    const t = text.trim();
    const n = t === '' ? null : Number(t);
    const invalid = n !== null && (isNaN(n) || n < 0 || n > max);
    setBad((b) => { const s = new Set(b); invalid ? s.add(key) : s.delete(key); return s; });
    if (invalid) return;
    setRows((rs) => rs.map((r) => {
      if (r.id !== studentId) return r;
      const scores = { ...r.scores, [code]: n };
      const total = sumScores(scores, comps); const band = gradeFor(total, sheet.bands);
      return { ...r, scores, total, grade: band?.grade ?? null, remark: band?.remark ?? null };
    }));
    setDirty((d) => ({ ...d, [studentId]: ++rev.current })); setSave('dirty');
  }, [comps, sheet.bands]);

  const setFlag = (studentId: string, flag: RowFlag) => {
    setRows((rs) => rs.map((r) => (r.id === studentId ? { ...r, flag } : r)));
    setDirty((d) => ({ ...d, [studentId]: ++rev.current })); setSave('dirty');
  };

  /* ---------- autosave (debounced) with optimistic concurrency ---------- */
  const flush = useCallback(async (): Promise<boolean> => {
    const { rows: rs, dirty: dt } = live.current;
    const ids = Object.keys(dt);
    if (!ids.length) return true;
    setSave('saving');
    try {
      const edits = ids.map((id) => { const r = rs.find((x) => x.id === id)!; return { studentId: id, scores: r.scores ?? {}, flag: r.flag, version: r.version ?? 1 }; });
      const saved = await saveRows(a, sheet, edits);
      setRows((cur) => cur.map((r) => (saved.has(r.id) ? { ...r, version: saved.get(r.id)!.version, total: saved.get(r.id)!.total, grade: saved.get(r.id)!.grade, remark: saved.get(r.id)!.remark } : r)));
      setDirty((cur) => { const n = { ...cur }; ids.forEach((id) => { if (cur[id] === dt[id]) delete n[id]; }); return n; });
      setSave(Object.keys(live.current.dirty).some((k) => !ids.includes(k) || live.current.dirty[k] !== dt[k]) ? 'dirty' : 'saved');
      const stats = sheetStats(live.current.rows, sheet.passMark, comps);
      updateDoc(sd(a.schoolId, 'sheets', sheet.id), { progress: { filled: live.current.rows.filter((r) => r.flag !== 'NONE' || comps.every((c) => r.scores?.[c.code] != null)).length, total: stats.studentCount } }).catch(() => {});
      return true;
    } catch (e) {
      if (e instanceof ConflictError) { setSave('conflict'); toast.error(`${e.studentIds.length} row(s) were changed by someone else. Reload to see their changes.`); }
      else { setSave('error'); toast.error(errMsg(e)); }
      return false;
    }
  }, [a, sheet, comps, toast]);

  useEffect(() => {
    if (!editable || save !== 'dirty' || !Object.keys(dirty).length) return;
    const t = setTimeout(() => { flush(); }, 1200);
    return () => clearTimeout(t);
  }, [dirty, save, editable, flush]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (Object.keys(live.current.dirty).length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  /* ---------- keyboard + paste ---------- */
  const focusCell = (r: number, c: number) => (document.querySelector(`[data-cell="${r}:${c}"]`) as HTMLInputElement | null)?.focus();
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const k = e.key;
    if (k === 'Enter' || k === 'ArrowDown') { e.preventDefault(); focusCell(r + 1, c); }
    else if (k === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, c); }
    else if (k === 'ArrowRight' && (e.currentTarget.selectionStart ?? 0) >= e.currentTarget.value.length) { e.preventDefault(); focusCell(r, c + 1); }
    else if (k === 'ArrowLeft' && (e.currentTarget.selectionStart ?? 0) === 0) { e.preventDefault(); focusCell(r, c - 1); }
  };
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    text.trim().split(/\r?\n/).forEach((line, i) => line.split('\t').forEach((v, j) => {
      const row = rows[r + i]; const comp = comps[c + j];
      if (row && comp) setScore(row.id, comp.code, v.trim());
    }));
  };

  /* ---------- derived ---------- */
  const stats = useMemo(() => sheetStats(rows, sheet.passMark, comps), [rows, sheet.passMark, comps]);
  const filled = rows.filter((r) => r.flag !== 'NONE' || comps.every((c) => r.scores?.[c.code] != null)).length;

  async function doSubmit() {
    setBusy(true);
    try {
      if (!(await flush())) { setBusy(false); return; }
      await submitSheet(a, sheet, live.current.rows);
      toast.success('Results submitted for review.'); setSubmitOpen(false);
    } catch (e) { toast.error(errMsg(e)); }
    setBusy(false);
  }
  async function sync() {
    try { const n = await syncRows(a, sheet); toast.success(n ? `${n} student(s) added.` : 'Class list is up to date.'); if (n) await load(); }
    catch (e) { toast.error(errMsg(e)); }
  }
  function exportTemplate() {
    downloadFile(`${sheet.subjectName}-${sheet.armLabel}-scores.csv`.replace(/\s+/g, '_'), toCsv([['admissionNumber', 'name', ...comps.map((c) => c.code)], ...rows.map((r) => [r.admissionNumber, r.name, ...comps.map((c) => r.scores?.[c.code] ?? '')])]));
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>;
  const indicator = {
    saved: <span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" />All changes saved</span>,
    dirty: <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Unsaved changes…</span>,
    saving: <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Saving…</span>,
    error: <button onClick={flush} className="inline-flex items-center gap-1.5 text-red-600"><CloudOff className="h-4 w-4" />Not saved — retry</button>,
    conflict: <button onClick={load} className="inline-flex items-center gap-1.5 text-amber-600"><RefreshCw className="h-4 w-4" />Conflict — reload</button>,
  }[save];

  return (
    <div className="space-y-4">
      {!editable && <Alert tone="info" title={canEdit ? `This sheet is ${sheet.status.toLowerCase().replace('_', ' ')} and read-only.` : 'Read-only view'}>
        {sheet.status === 'SUBMITTED' || sheet.status === 'UNDER_REVIEW' ? 'It is with the reviewer. If it comes back you can edit and resubmit.' : sheet.status === 'APPROVED' || sheet.status === 'PUBLISHED' || sheet.status === 'LOCKED' ? 'To correct a score, request an unlock.' : null}</Alert>}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-4 text-sm"><span className="font-medium text-slate-900">{filled}/{rows.length} complete</span><span className="text-xs">{editable ? indicator : null}</span></div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportTemplate}>Export</Button>
            {editable && <>
              <Button size="sm" variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={sync}>Sync class list</Button>
              <Button size="sm" variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>Import</Button>
              <Button size="sm" icon={<Send className="h-4 w-4" />} disabled={bad.size > 0 || rows.length === 0} onClick={() => setSubmitOpen(true)}>Submit</Button></>}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="th sticky left-0 top-0 z-20 w-10 border-b border-slate-100">#</th>
                <th className="th sticky left-10 top-0 z-20 min-w-[11rem] border-b border-slate-100">Student</th>
                {comps.map((c) => <th key={c.code} className="th sticky top-0 z-10 w-24 border-b border-slate-100 text-center">{c.name}<span className="block text-[10px] font-normal normal-case text-slate-400">max {c.max}</span></th>)}
                <th className="th sticky top-0 z-10 w-20 border-b border-slate-100 text-center">Total</th>
                <th className="th sticky top-0 z-10 w-16 border-b border-slate-100 text-center">Grade</th>
                <th className="th sticky top-0 z-10 w-28 border-b border-slate-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const off = r.flag !== 'NONE';
                return (
                  <tr key={r.id} className="group hover:bg-slate-50/60">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-400 group-hover:bg-slate-50">{ri + 1}</td>
                    <td className="sticky left-10 z-10 border-b border-slate-100 bg-white px-4 py-1.5 group-hover:bg-slate-50"><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.admissionNumber}</p></td>
                    {comps.map((c, ci) => {
                      const key = `${r.id}|${c.code}`; const isBad = bad.has(key);
                      const val = raw[key] ?? (r.scores?.[c.code] ?? '');
                      return (
                        <td key={c.code} className="border-b border-slate-100 px-2 py-1">
                          <input data-cell={`${ri}:${ci}`} inputMode="decimal" aria-label={`${r.name} ${c.name}`} aria-invalid={isBad} disabled={!editable || off}
                            value={String(val)} onChange={(e) => setScore(r.id, c.code, e.target.value)} onKeyDown={(e) => onKey(e, ri, ci)} onPaste={(e) => onPaste(e, ri, ci)} onFocus={(e) => e.target.select()}
                            className={cn('w-full rounded-md border px-2 py-1.5 text-center tabular-nums', isBad ? 'border-red-400 bg-red-50 text-red-700' : 'border-transparent bg-slate-50 hover:border-slate-300 focus:border-brand-500 focus:bg-white', (!editable || off) && 'cursor-not-allowed opacity-60')} />
                        </td>);
                    })}
                    <td className="border-b border-slate-100 px-2 text-center font-semibold tabular-nums">{off ? <span className="text-slate-400">—</span> : fmt(r.total)}</td>
                    <td className={cn('border-b border-slate-100 px-2 text-center font-semibold', r.total != null && r.total < sheet.passMark && 'text-red-600')}>{off ? '' : r.grade ?? '—'}</td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {editable ? <Select aria-label={`Status for ${r.name}`} className="py-1 text-xs" value={r.flag} onChange={(e) => setFlag(r.id, e.target.value as RowFlag)} options={[{ value: 'NONE', label: 'Present' }, { value: 'ABSENT', label: 'Absent' }, { value: 'EXCUSED', label: 'Excused' }]} />
                        : off ? <Badge>{r.flag.toLowerCase()}</Badge> : null}
                    </td>
                  </tr>);
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No students in this class yet.</p>}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>Class average <strong className="text-slate-800">{fmt(stats.classAverage)}</strong></span><span>Highest <strong className="text-slate-800">{fmt(stats.highest, 0)}</strong></span>
          <span>Lowest <strong className="text-slate-800">{fmt(stats.lowest, 0)}</strong></span><span>Pass rate <strong className="text-slate-800">{stats.passRate != null ? `${stats.passRate}%` : '—'}</strong></span>
          {editable && <span className="ml-auto hidden sm:inline">Tip: arrow keys move between cells · paste a block from Excel</span>}
        </div>
      </Card>

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit results for review" description={`${sheet.subjectName} · ${sheet.armLabel}`}
        footer={<><Button variant="secondary" onClick={() => setSubmitOpen(false)}>Keep editing</Button><Button loading={busy} icon={<Send className="h-4 w-4" />} onClick={doSubmit}>Submit</Button></>}>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[['Students', stats.studentCount], ['Scores incomplete', stats.blanks], ['Class average', fmt(stats.classAverage)], ['Pass rate', stats.passRate != null ? `${stats.passRate}%` : '—'], ['Highest', fmt(stats.highest, 0)], ['Lowest', fmt(stats.lowest, 0)]].map(([k, v]) => (
            <div key={k as string} className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-lg font-semibold text-slate-900">{v}</dd></div>))}
        </dl>
        {stats.blanks > 0 ? <Alert tone="warn" className="mt-4">{stats.blanks} student(s) have missing scores. Mark them Absent/Excused if appropriate — blanks are flagged to the reviewer.</Alert>
          : <Alert tone="success" className="mt-4">Every student has a complete set of scores.</Alert>}
        <p className="mt-3 text-xs text-slate-500">After submitting, scores lock for editing unless the reviewer returns them.</p>
      </Modal>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} rows={rows} comps={comps} onApply={(entries) => { entries.forEach(([id, code, v]) => setScore(id, code, String(v))); toast.success(`${entries.length} score(s) imported — review then they autosave.`); setImportOpen(false); }} />
    </div>
  );
}

function ImportDialog({ open, onClose, rows, comps, onApply }: { open: boolean; onClose: () => void; rows: R[]; comps: Sheet['components']; onApply: (e: [string, string, number][]) => void }) {
  const [res, setRes] = useState<{ entries: [string, string, number][]; errors: string[] } | null>(null);
  function onFile(f?: File) {
    if (!f) return;
    Papa.parse<Record<string, string>>(f, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(), complete: (p) => {
      const entries: [string, string, number][] = []; const errors: string[] = [];
      const byAdm = new Map(rows.map((r) => [r.admissionNumber.toLowerCase(), r]));
      p.data.forEach((line, i) => {
        const adm = (line.admissionNumber ?? '').trim().toLowerCase(); const st = byAdm.get(adm);
        if (!st) return errors.push(`Row ${i + 2}: unknown admission number "${line.admissionNumber}".`);
        comps.forEach((c) => {
          const v = (line[c.code] ?? '').trim(); if (v === '') return;
          const n = Number(v);
          if (isNaN(n) || n < 0 || n > c.max) errors.push(`Row ${i + 2}: ${c.code} "${v}" must be between 0 and ${c.max}.`); else entries.push([st.id, c.code, n]);
        });
      });
      setRes({ entries, errors });
    } });
  }
  return (
    <Modal open={open} onClose={() => { setRes(null); onClose(); }} title="Import scores from CSV" description="Use Export to get a template with the right columns, fill it in, and upload it here."
      footer={<><Button variant="secondary" onClick={() => { setRes(null); onClose(); }}>Cancel</Button><Button disabled={!res?.entries.length} onClick={() => { onApply(res!.entries); setRes(null); }}>Apply {res?.entries.length ?? 0} score(s)</Button></>}>
      <input type="file" accept=".csv" className="input" onChange={(e) => onFile(e.target.files?.[0])} />
      {res && (<div className="mt-4 space-y-3"><p className="text-sm"><strong>{res.entries.length}</strong> valid score(s) found.</p>
        {res.errors.length > 0 && <Alert tone="warn" title={`${res.errors.length} problem(s) — these cells will be skipped`}><ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5">{res.errors.slice(0, 40).map((e, i) => <li key={i}>{e}</li>)}</ul></Alert>}</div>)}
    </Modal>
  );
}
