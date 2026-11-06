'use client';
import { useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Save } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { buildArmResults, commitResults, type ArmResults } from '@/lib/results/compute';
import { fmt, ordinal } from '@/lib/utils';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, useToast, errMsg } from '@/components/ui';
import { TermArmPicker, useTermArm } from '@/components/shared/term-arm-picker';

export default function ComputationPage() {
  const a = useActor(); const toast = useToast();
  const { termId, setTermId, armId, setArmId, term, arm } = useTermArm();
  const { subjects, armLabel, defaultScheme } = useSchoolData();
  const [res, setRes] = useState<ArmResults | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);

  async function preview() {
    if (!term || !arm) return toast.error('Choose a term and class.');
    setBusy('preview'); setRes(null);
    try { setRes(await buildArmResults({ schoolId: a.schoolId, term, arm, armLabel: armLabel(arm.id), subjects, scheme: defaultScheme })); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(null);
  }
  async function commit() {
    if (!res) return; setBusy('commit');
    try { const r = await commitResults(a, res); toast.success(`Computed ${r.written} report card(s)${r.skipped ? `, ${r.skipped} skipped (already published)` : ''}.`); }
    catch (e) { toast.error(errMsg(e)); }
    setBusy(null);
  }
  const ex = res?.exceptions;
  const issues = ex ? ex.unapproved.length + ex.noSheet.length : 0;

  return (
    <>
      <PageHeader title="Result computation" description="Totals, grades, subject positions, class positions and cumulative averages. Preview first, then commit."
        actions={<><TermArmPicker termId={termId} armId={armId} onTerm={setTermId} onArm={setArmId} /><Button icon={<Calculator className="h-4 w-4" />} loading={busy === 'preview'} onClick={preview}>Preview</Button></>} />
      {!res ? <Card><EmptyState icon={<Calculator className="h-6 w-6" />} title="Nothing computed yet" description="Select a class and press Preview. Nothing is saved until you commit." /></Card> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Students" value={res.students.length} />
            <Stat label="Subjects" value={res.sheets.length} />
            <Stat label="Sheets approved" value={`${res.sheets.filter((s) => ['APPROVED', 'PUBLISHED', 'LOCKED'].includes(s.status)).length}/${res.sheets.length}`} tone={ex!.unapproved.length ? 'amber' : 'green'} />
            <Stat label="Class average" value={fmt(res.students.reduce((s, r) => s + (r.average ?? 0), 0) / Math.max(1, res.students.filter((r) => r.average != null).length))} />
          </div>

          <Card>
            <CardHeader title="Pre-commit checks" description={issues || ex!.missingScores.length ? 'Review these exceptions before committing.' : 'No blocking problems.'} />
            <div className="space-y-3 p-5">
              {ex!.unapproved.length > 0 && <Alert tone="error" title="Sheets not yet approved (blocks commit)"><ul className="mt-1 space-y-1">{ex!.unapproved.map((s) => <li key={s.id} className="flex items-center gap-2">{s.subjectName} <StatusBadge status={s.status} /> <span className="text-xs">({s.teacherName})</span></li>)}</ul></Alert>}
              {ex!.noSheet.length > 0 && <Alert tone="warn" title="Subjects offered but with no result sheet">{ex!.noSheet.map((s) => s.name).join(', ')}</Alert>}
              {ex!.missingScores.length > 0 && <Alert tone="warn" title={`${ex!.missingScores.length} missing score(s)`}><ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">{ex!.missingScores.slice(0, 30).map((m, i) => <li key={i}>{m.student} — {m.subject} ({m.codes.join(', ')})</li>)}</ul></Alert>}
              {ex!.absent.length > 0 && <Alert tone="info" title={`${ex!.absent.length} absent / excused entries (excluded from averages)`}>{ex!.absent.slice(0, 10).map((m) => `${m.student} (${m.subject})`).join(', ')}{ex!.absent.length > 10 && '…'}</Alert>}
              {res.canCommit && !ex!.missingScores.length && !ex!.noSheet.length && <Alert tone="success">All sheets approved with complete scores.</Alert>}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Preview" action={<Button icon={<Save className="h-4 w-4" />} disabled={!res.canCommit} loading={busy === 'commit'} onClick={commit}>Commit results</Button>} />
            {!res.canCommit && <div className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-sm text-amber-800"><AlertTriangle className="mr-1.5 inline h-4 w-4" />Commit is disabled until every sheet is approved.</div>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr><th className="th">#</th><th className="th">Student</th>{res.sheets.map((s) => <th key={s.id} className="th text-center" title={s.subjectName}>{s.subjectName.slice(0, 5)}</th>)}<th className="th text-right">Total</th><th className="th text-right">Avg</th><th className="th text-center">Grade</th><th className="th text-center">Pos.</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {[...res.students].sort((x, y) => (x.position ?? 999) - (y.position ?? 999)).map((r, i) => (
                    <tr key={r.studentId} className="hover:bg-slate-50/70">
                      <td className="td text-slate-400">{i + 1}</td><td className="td font-medium text-slate-900">{r.studentName}</td>
                      {r.subjects?.map((l) => <td key={l.subjectId} className="td text-center">{l.flag !== 'NONE' ? <Badge>{l.flag === 'ABSENT' ? 'ABS' : 'EXC'}</Badge> : fmt(l.total, 0)}</td>)}
                      <td className="td text-right">{fmt(r.totalScore)}</td><td className="td text-right font-semibold">{fmt(r.average)}</td><td className="td text-center">{r.overallGrade ?? '—'}</td><td className="td text-center font-medium">{ordinal(r.position)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            {res.students.length === 0 && <EmptyState title="No active students in this class" />}
          </Card>
          {res.canCommit && <p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Committing creates or refreshes report cards (attendance, traits and comments already entered are kept) and writes subject positions to each sheet.</p>}
        </div>
      )}
    </>
  );
}
