'use client';
import { useRef, useState } from 'react';
import Papa from 'papaparse';
import { CheckCircle2, Download, FileUp, Upload } from 'lucide-react';
import { Alert, Button, Card, CardHeader, Progress, useToast, errMsg } from '@/components/ui';
import { downloadFile, toCsv } from '@/lib/utils';

export interface ImportOutcome { summary: string; credentials?: string[][] }
export type ParseResult<T> = { valid: T[]; errors: { row: number; message: string }[] };

export function ImportWizard<T>({ title, description, headers, example, parse, run, previewCols }: {
  title: string; description: string; headers: string[]; example: string[];
  parse: (rows: Record<string, string>[]) => ParseResult<T>;
  run: (valid: T[], progress: (done: number, total: number) => void) => Promise<ImportOutcome>;
  previewCols: { header: string; get: (r: T) => string }[];
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult<T> | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<[number, number] | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  function onFile(f?: File) {
    if (!f) return;
    setFileName(f.name); setOutcome(null);
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true, transformHeader: (h) => h.trim(),
      complete: (r) => {
        setResult(parse(r.data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim(), String(v ?? '').trim()])))));
      },
      error: (e) => toast.error(e.message),
    });
  }
  async function start() {
    if (!result?.valid.length) return;
    setBusy(true);
    try { setOutcome(await run(result.valid, (d, t) => setProg([d, t]))); setResult(null); toast.success('Import finished.'); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(false); setProg(null);
  }
  return (
    <Card>
      <CardHeader title={title} description={description}
        action={<Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => downloadFile(`${title.toLowerCase().replace(/\W+/g, '-')}-template.csv`, toCsv([headers, example]))}>Download template</Button>} />
      <div className="space-y-5 p-5">
        <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/30">
          <FileUp className="h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">{fileName || 'Click to choose a CSV file'}</p>
          <p className="text-xs text-slate-500">Columns: {headers.join(', ')}</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {result && (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">{result.valid.length} ready to import</span>
              {result.errors.length > 0 && <span className="rounded-lg bg-red-50 px-3 py-1.5 font-medium text-red-700">{result.errors.length} row(s) with problems</span>}
            </div>
            {result.errors.length > 0 && (
              <Alert tone="warn" title="Rows that will be skipped">
                <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5">{result.errors.slice(0, 50).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}</ul>
              </Alert>
            )}
            {result.valid.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm"><thead><tr>{previewCols.map((c) => <th key={c.header} className="th">{c.header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">{result.valid.slice(0, 8).map((r, i) => <tr key={i}>{previewCols.map((c) => <td key={c.header} className="td">{c.get(r) || '—'}</td>)}</tr>)}</tbody></table>
                {result.valid.length > 8 && <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">…and {result.valid.length - 8} more</p>}
              </div>
            )}
            {prog && <div><Progress value={(prog[0] / prog[1]) * 100} /><p className="mt-1 text-xs text-slate-500">Importing {prog[0]} of {prog[1]}…</p></div>}
            <div className="flex justify-end"><Button icon={<Upload className="h-4 w-4" />} loading={busy} disabled={!result.valid.length} onClick={start}>Import {result.valid.length} row(s)</Button></div>
          </>
        )}
        {outcome && (
          <Alert tone="success" title="Import complete">
            <p>{outcome.summary}</p>
            {outcome.credentials && outcome.credentials.length > 0 && (
              <Button className="mt-3" size="sm" variant="secondary" icon={<Download className="h-4 w-4" />}
                onClick={() => downloadFile('new-account-credentials.csv', toCsv([['Name', 'Login', 'Temporary password', 'School code'], ...outcome.credentials!]))}>Download login slips (CSV)</Button>
            )}
            {outcome.credentials && outcome.credentials.length > 0 && <p className="mt-2 text-xs">Temporary passwords are shown only once. Users must change them on first sign-in.</p>}
          </Alert>
        )}
        {!result && !outcome && <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-3.5 w-3.5" />You'll preview every row and its problems before anything is saved.</p>}
      </div>
    </Card>
  );
}
