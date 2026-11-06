'use client';
import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings, useTraits } from '@/lib/school/use-settings';
import { buildArmResults, type ArmResults } from '@/lib/results/compute';
import { downloadFile, fmt, ordinal, toCsv } from '@/lib/utils';
import { Button, Card, EmptyState, Modal, PageHeader, PageLoader, useToast, errMsg } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';
import { ReportCard } from '@/components/shared/report-card';

export default function BroadsheetPage() {
  const a = useActor(); const { school } = useAuth(); const toast = useToast();
  const { termId, setTermId, armId, setArmId, term, arm } = useTermArm();
  const { subjects, armLabel, defaultScheme, termLabel } = useSchoolData();
  const { settings } = useSettings(); const traits = useTraits().data;
  const [res, setRes] = useState<ArmResults | null>(null); const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!term || !arm) { setRes(null); return; }
    let live = true; setLoading(true);
    buildArmResults({ schoolId: a.schoolId, term, arm, armLabel: armLabel(arm.id), subjects, scheme: defaultScheme })
      .then((r) => live && setRes(r)).catch((e) => toast.error(errMsg(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term?.id, arm?.id]);

  const sorted = res ? [...res.students].sort((x, y) => (x.position ?? 999) - (y.position ?? 999)) : [];
  const table = () => [['Pos', 'Admission no.', 'Student', ...(res?.sheets.map((s) => s.subjectName) ?? []), 'Total', 'Average', 'Grade'],
    ...sorted.map((r) => [r.position ?? '', r.admissionNumber, r.studentName, ...(r.subjects?.map((l) => (l.flag !== 'NONE' ? l.flag : l.total ?? '')) ?? []), r.totalScore ?? '', r.average ?? '', r.overallGrade ?? ''])];
  const name = `broadsheet-${armLabel(armId).replace(/\s+/g, '')}`;
  async function xlsx() { const X = await import('xlsx'); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(table()), 'Broadsheet'); X.writeFile(wb, `${name}.xlsx`); }
  const opened = sorted.find((r) => r.studentId === open);

  return (
    <>
      <PageHeader title="Broadsheet" description="Full class mastersheet, live from the result sheets. Click a student to preview their report card." actions={<>
        <TermArmPicker termId={termId} armId={armId} onTerm={setTermId} onArm={setArmId} />
        <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} disabled={!res} onClick={() => downloadFile(`${name}.csv`, toCsv(table()))}>CSV</Button>
        <Button variant="secondary" size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} disabled={!res} onClick={xlsx}>Excel</Button>
        <Button variant="secondary" size="sm" icon={<Printer className="h-4 w-4" />} disabled={!res} onClick={() => window.print()}>PDF / Print</Button></>} />
      {loading ? <PageLoader label="Building broadsheet…" /> : !res || res.sheets.length === 0 ? <Card><EmptyState title={arm ? 'No result sheets for this class yet' : 'Choose a class'} description="Sheets appear once teachers open their allocated subjects." /></Card> : (
        <Card className="print-area overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">{school?.name} — {armLabel(armId)}</h2><p className="text-sm text-slate-500">{termLabel(termId)}</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr><th className="th">Pos</th><th className="th">Student</th>{res.sheets.map((s) => <th key={s.id} className="th text-center" title={s.subjectName}>{s.subjectName.slice(0, 6)}</th>)}<th className="th text-right">Total</th><th className="th text-right">Avg</th><th className="th text-center">Grade</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((r) => (
                  <tr key={r.studentId} onClick={() => setOpen(r.studentId)} className="cursor-pointer hover:bg-slate-50">
                    <td className="td font-medium">{ordinal(r.position)}</td><td className="td"><span className="font-medium text-slate-900">{r.studentName}</span><span className="block text-xs text-slate-400">{r.admissionNumber}</span></td>
                    {r.subjects?.map((l) => <td key={l.subjectId} className={`td text-center ${l.total != null && l.total < res.passMark ? 'text-red-600' : ''}`}>{l.flag !== 'NONE' ? <span className="text-slate-400">{l.flag === 'ABSENT' ? 'ABS' : 'EXC'}</span> : fmt(l.total, 0)}</td>)}
                    <td className="td text-right">{fmt(r.totalScore)}</td><td className="td text-right font-semibold">{fmt(r.average)}</td><td className="td text-center">{r.overallGrade ?? '—'}</td>
                  </tr>))}
              </tbody>
              <tfoot><tr className="bg-slate-50 font-medium"><td className="td" colSpan={2}>Class average</td>{res.sheets.map((s) => <td key={s.id} className="td text-center">{fmt(sorted[0]?.subjects?.find((l) => l.subjectId === s.subjectId)?.classAverage ?? null, 0)}</td>)}<td className="td" colSpan={3} /></tr></tfoot>
            </table>
          </div>
        </Card>
      )}
      <Modal open={!!opened} onClose={() => setOpen(null)} size="xl" title="Report card preview" description="Live preview — the official card is created when results are published.">
        {opened && <ReportCard report={{ ...opened, status: 'COMPUTED' } as any} school={school} settings={settings} termLabel={termLabel(termId)} nextTermBegins={term?.nextTermBegins} daysOpen={term?.daysOpen} traits={traits} preview />}
      </Modal>
    </>
  );
}
