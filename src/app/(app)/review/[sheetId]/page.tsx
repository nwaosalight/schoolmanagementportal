'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Check, CornerUpLeft, MessageSquarePlus } from 'lucide-react';
import { addDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useDoc } from '@/lib/firebase/hooks';
import { rowsCol, sd, sheetSub } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { approveSheet, returnSheet, sheetId as mkSheetId, startReview } from '@/lib/results/sheets';
import { WorkflowTimeline } from '@/components/results/workflow-timeline';
import { Alert, Badge, Button, Card, Field, Modal, PageHeader, PageLoader, StatusBadge, Textarea, useToast, errMsg } from '@/components/ui';
import { fmt } from '@/lib/utils';
import type { Doc, Row, Sheet } from '@/types';

export default function ReviewSheetPage() {
  const { sheetId } = useParams<{ sheetId: string }>();
  const a = useActor(); const router = useRouter(); const toast = useToast(); const d = useSchoolData();
  const sheet = useDoc<Sheet>(useMemo(() => sd(a.schoolId, 'sheets', sheetId), [a.schoolId, sheetId]));
  const [rows, setRows] = useState<Doc<Row>[] | null>(null); const [prev, setPrev] = useState<Map<string, number | null>>(new Map());
  const [prevAvg, setPrevAvg] = useState<number | null>(null);
  const [ret, setRet] = useState(false); const [reason, setReason] = useState(''); const [cmt, setCmt] = useState<Doc<Row> | null>(null); const [cmtText, setCmtText] = useState('');
  const [busy, setBusy] = useState(false);
  const s = sheet.data;

  useEffect(() => { getDocs(rowsCol(a.schoolId, sheetId)).then((sn) => setRows(sn.docs.map((x) => ({ id: x.id, ...x.data() }) as Doc<Row>).sort((x, y) => x.name.localeCompare(y.name)))); }, [a.schoolId, sheetId]);
  useEffect(() => {
    if (!s) return; const pt = d.prevTerm(s.termId); if (!pt) return;
    const pid = mkSheetId(pt.id, s.armId, s.subjectId);
    getDoc(sd(a.schoolId, 'sheets', pid)).then(async (ps) => {
      if (!ps.exists()) return; setPrevAvg((ps.data() as Sheet).stats?.classAverage ?? null);
      const rs = await getDocs(rowsCol(a.schoolId, pid)); setPrev(new Map(rs.docs.map((x) => [x.id, (x.data() as Row).total])));
    });
  }, [s?.termId, s?.armId, s?.subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const analysis = useMemo(() => {
    if (!rows || !s) return null;
    const counted = rows.filter((r) => r.flag === 'NONE' && r.total != null);
    const avg = counted.length ? counted.reduce((x, r) => x + (r.total as number), 0) / counted.length : null;
    const freq = new Map<number, number>(); counted.forEach((r) => freq.set(r.total as number, (freq.get(r.total as number) ?? 0) + 1));
    const topSame = Math.max(0, ...freq.values());
    const sheetFlags: string[] = [];
    if (counted.length >= 5 && topSame / counted.length >= 0.6) sheetFlags.push(`${topSame} students share the same total — check for copied scores.`);
    if (avg != null && avg > 80) sheetFlags.push(`Unusually high class average (${fmt(avg)}).`);
    if (avg != null && avg < s.passMark) sheetFlags.push(`Class average (${fmt(avg)}) is below the pass mark.`);
    if (prevAvg != null && avg != null && Math.abs(avg - prevAvg) >= 15) sheetFlags.push(`Class average moved ${avg > prevAvg ? 'up' : 'down'} by ${fmt(Math.abs(avg - prevAvg))} since last term.`);
    const rowFlags = new Map<string, string[]>();
    rows.forEach((r) => {
      const f: string[] = [];
      if (r.flag === 'NONE' && s.components.some((c) => r.scores?.[c.code] == null)) f.push('Missing score');
      const p = prev.get(r.id); if (p != null && r.total != null && Math.abs(r.total - p) >= 25) f.push(`${r.total > p ? '+' : '−'}${fmt(Math.abs(r.total - p), 0)} vs last term`);
      if (r.total != null && topSame >= 5 && freq.get(r.total) === topSame && topSame / counted.length >= 0.6) f.push('Repeated total');
      if (f.length) rowFlags.set(r.id, f);
    });
    return { avg, sheetFlags, rowFlags };
  }, [rows, s, prev, prevAvg]);

  if (sheet.loading || !rows) return <PageLoader />;
  if (!s) return <Alert tone="error" title="Sheet not found" />;
  const canAct = s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW';
  const run = async (fn: () => Promise<void>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); } catch (e) { toast.error(errMsg(e)); } setBusy(false); };

  return (
    <>
      <PageHeader back={<Link href="/review" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Review queue</Link>}
        title={`${s.subjectName} · ${s.armLabel}`} description={`${s.teacherName} · ${d.termLabel(s.termId)}`}
        actions={<><StatusBadge status={s.status} />
          {canAct && <>{s.status === 'SUBMITTED' && <Button variant="secondary" size="sm" onClick={() => run(() => startReview(a, s), 'Marked as under review.')}>Start review</Button>}
            <Button variant="secondary" icon={<CornerUpLeft className="h-4 w-4" />} onClick={() => setRet(true)}>Return</Button>
            <Button icon={<Check className="h-4 w-4" />} loading={busy} onClick={() => run(async () => { await approveSheet(a, s); router.push('/review'); }, 'Approved.')}>Approve</Button></>}</>} />
      {analysis && analysis.sheetFlags.length > 0 && <Alert tone="warn" title="Things to check" className="mb-5"><ul className="mt-1 list-disc pl-5">{analysis.sheetFlags.map((f) => <li key={f}>{f}</li>)}</ul></Alert>}
      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="overflow-x-auto xl:col-span-3">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className="th">Student</th>{s.components.map((c) => <th key={c.code} className="th text-center">{c.code}</th>)}<th className="th text-center">Total</th><th className="th text-center">Grade</th><th className="th text-center">Last term</th><th className="th">Flags</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => { const fl = analysis?.rowFlags.get(r.id) ?? []; return (
                <tr key={r.id} className={fl.length ? 'bg-amber-50/50' : ''}>
                  <td className="td font-medium text-slate-900">{r.name}</td>
                  {s.components.map((c) => <td key={c.code} className="td text-center tabular-nums">{r.flag !== 'NONE' ? '—' : r.scores?.[c.code] ?? <span className="text-red-400">—</span>}</td>)}
                  <td className="td text-center font-semibold">{r.flag !== 'NONE' ? <Badge>{r.flag === 'ABSENT' ? 'ABS' : 'EXC'}</Badge> : fmt(r.total)}</td><td className="td text-center">{r.grade ?? '—'}</td>
                  <td className="td text-center text-slate-500">{prev.get(r.id) != null ? fmt(prev.get(r.id), 0) : '—'}</td>
                  <td className="td"><div className="flex flex-wrap gap-1">{fl.map((f) => <Badge key={f} tone="amber"><AlertTriangle className="h-3 w-3" />{f}</Badge>)}</div></td>
                  <td className="td text-right">{canAct && <Button variant="ghost" size="sm" aria-label={`Comment on ${r.name}`} onClick={() => { setCmt(r); setCmtText(''); }}><MessageSquarePlus className="h-4 w-4" /></Button>}</td>
                </tr>); })}
            </tbody>
          </table>
        </Card>
        <WorkflowTimeline sheetId={s.id} />
      </div>
      <Modal open={ret} onClose={() => setRet(false)} title="Return to teacher" description="The teacher is notified and can edit and resubmit."
        footer={<><Button variant="secondary" onClick={() => setRet(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => reason.trim().length < 5 ? toast.error('A reason is required.') : run(async () => { await returnSheet(a, s, reason.trim()); setRet(false); router.push('/review'); }, 'Returned to teacher.')}>Return sheet</Button></>}>
        <Field label="Reason" required hint="Mandatory. Row-level comments you added are shown to the teacher too."><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Several exam scores look transposed; please verify against the scripts." /></Field>
      </Modal>
      <Modal open={!!cmt} onClose={() => setCmt(null)} title={`Comment on ${cmt?.name}`} footer={<><Button variant="secondary" onClick={() => setCmt(null)}>Cancel</Button><Button onClick={async () => { if (!cmtText.trim()) return; try { await addDoc(sheetSub(a.schoolId, s.id, 'comments'), { studentId: cmt!.id, studentName: cmt!.name, body: cmtText.trim(), authorUid: a.uid, authorName: a.name, createdAt: serverTimestamp(), resolvedAt: null }); toast.success('Comment saved. It is sent to the teacher when you return the sheet.'); setCmt(null); } catch (e) { toast.error(errMsg(e)); } }}>Save comment</Button></>}>
        <Textarea value={cmtText} onChange={(e) => setCmtText(e.target.value)} placeholder="What should the teacher check?" />
      </Modal>
    </>
  );
}
