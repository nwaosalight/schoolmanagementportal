'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, ClipboardList } from 'lucide-react';
import { query, where } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { useSettings } from '@/lib/school/use-settings';
import { useMyClassArms } from '@/components/layout/app-shell';
import { sheetId } from '@/lib/results/sheets';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Progress, Stat, StatusBadge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import type { Allocation, Sheet } from '@/types';

export default function TeacherDashboard() {
  const a = useActor();
  const { currentTerm, armLabel, subjectName, termLabel } = useSchoolData();
  const { settings } = useSettings();
  const classArms = useMyClassArms();
  const tid = currentTerm?.id;
  const allocs = useCollection<Allocation>(useMemo(() => (tid ? query(sc(a.schoolId, 'allocations'), where('termId', '==', tid), where('teacherUid', '==', a.uid)) : null), [a.schoolId, tid, a.uid])).data;
  const sheets = useCollection<Sheet>(useMemo(() => (tid ? query(sc(a.schoolId, 'sheets'), where('termId', '==', tid), where('teacherUid', '==', a.uid)) : null), [a.schoolId, tid, a.uid])).data;
  const items = allocs.map((al) => ({ al, sh: sheets.find((s) => s.id === sheetId(al.termId, al.armId, al.subjectId)) }));
  const done = items.filter((i) => i.sh && !['DRAFT', 'RETURNED'].includes(i.sh.status)).length;
  const returned = items.filter((i) => i.sh?.status === 'RETURNED');
  const deadline = settings.scoreDeadline; const daysLeft = deadline ? Math.ceil((+new Date(deadline) - Date.now()) / 86400000) : null;

  return (
    <>
      <PageHeader title={`Hello, ${a.name.split(' ')[0]}`} description={tid ? `${termLabel(tid)} · ${items.length} subject allocation(s)` : 'No current term has been set by the school yet.'} />
      {returned.length > 0 && <Alert tone="error" title={`${returned.length} sheet(s) returned for correction`} className="mb-5"><Link className="font-medium underline" href={`/teacher/sheets/${returned[0].sh!.id}/returned`}>See the reviewer's comments</Link></Alert>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Allocated sheets" value={items.length} icon={<ClipboardList className="h-5 w-5" />} />
        <Stat label="Submitted" value={`${done}/${items.length}`} tone="green" />
        <Stat label="Deadline" value={deadline ? fmtDate(deadline) : '—'} hint={daysLeft != null ? (daysLeft >= 0 ? `${daysLeft} day(s) left` : `${-daysLeft} day(s) overdue`) : 'Not set'} tone={daysLeft != null && daysLeft < 3 ? 'red' : 'amber'} icon={<CalendarClock className="h-5 w-5" />} />
      </div>
      <Card>
        <CardHeader title="My result sheets" action={<Link href="/teacher/sheets" className="text-sm font-medium text-brand-600">View all</Link>} />
        {items.length === 0 ? <EmptyState title="Nothing allocated yet" description="Your school administrator will allocate your subjects and classes." /> : (
          <ul className="divide-y divide-slate-100">{items.slice(0, 6).map(({ al, sh }) => (
            <li key={al.id}><Link href={`/teacher/sheets/${al.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
              <div className="min-w-0 flex-1"><p className="font-medium text-slate-900">{subjectName(al.subjectId)} <span className="text-slate-400">·</span> {armLabel(al.armId)}</p>
                <div className="mt-1.5 flex items-center gap-3"><Progress className="w-40" value={sh?.progress ? (sh.progress.filled / Math.max(1, sh.progress.total)) * 100 : 0} /><span className="text-xs text-slate-500">{sh?.progress ? `${sh.progress.filled}/${sh.progress.total}` : 'Not started'}</span></div></div>
              <StatusBadge status={sh?.status ?? 'NOT_STARTED'} /><ArrowRight className="h-4 w-4 text-slate-300" /></Link></li>))}</ul>
        )}
      </Card>
      {classArms.length > 0 && (
        <Card className="mt-6"><CardHeader title="Class teacher" description="Attendance, conduct ratings and comments for your class." />
          <div className="flex flex-wrap gap-2 p-5">{classArms.map((c) => <Link key={c.id} href={`/teacher/class/${c.armId}/overview`} className="btn btn-md btn-secondary">{armLabel(c.armId)} <Badge tone="brand">Open</Badge></Link>)}</div></Card>
      )}
    </>
  );
}
