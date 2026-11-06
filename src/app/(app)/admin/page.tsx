'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ClipboardCheck, GraduationCap, Send, Users, CalendarDays } from 'lucide-react';
import { limit, orderBy, query, where } from 'firebase/firestore';
import { useActor, useAuth } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useCount } from '@/hooks/use-count';
import { Badge, Card, CardHeader, PageHeader, Progress, Stat } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import type { Report, Sheet, Allocation } from '@/types';

export default function AdminDashboard() {
  const a = useActor();
  const { school, profile } = useAuth();
  const d = useSchoolData();
  const studentCount = useCount(useMemo(() => query(sc(a.schoolId, 'students'), where('status', '==', 'ACTIVE')), [a.schoolId]), a.schoolId);
  const termId = d.currentTerm?.id;
  const sheets = useCollection<Sheet>(useMemo(() => (termId ? query(sc(a.schoolId, 'sheets'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const reports = useCollection<Report>(useMemo(() => (termId ? query(sc(a.schoolId, 'reports'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const allocs = useCollection<Allocation>(useMemo(() => (termId ? query(sc(a.schoolId, 'allocations'), where('termId', '==', termId)) : null), [a.schoolId, termId])).data;
  const audit = useCollection<any>(useMemo(() => query(sc(a.schoolId, 'auditLogs'), orderBy('createdAt', 'desc'), limit(8)), [a.schoolId])).data;

  const pending = sheets.filter((s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW').length;
  const publishedArms = new Set(reports.filter((r) => r.published).map((r) => r.armId)).size;
  const submitted = sheets.filter((s) => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'LOCKED'].includes(s.status)).length;

  const steps = [
    { label: 'Complete school profile', href: '/admin/school', done: !!(school?.address && school?.principalName) },
    { label: 'Create a session and set the current term', href: '/admin/calendar', done: !!d.currentTerm },
    { label: 'Add class levels and arms', href: '/admin/classes', done: d.arms.length > 0 },
    { label: 'Add subjects', href: '/admin/subjects', done: d.subjects.length > 0 },
    { label: 'Review grading scale', href: '/admin/grading', done: d.schemes.length > 0 },
    { label: 'Review assessment structure', href: '/admin/assessment', done: d.structures.length > 0 },
    { label: 'Add teachers and staff', href: '/admin/users', done: d.teachers.length > 0 },
    { label: 'Enrol students', href: '/admin/students', done: (studentCount ?? 0) > 0 },
    { label: 'Allocate teachers to subjects', href: '/admin/allocations', done: allocs.length > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageHeader title={`Welcome, ${profile?.firstName}`} description={d.currentTerm ? `${d.termLabel(d.currentTerm.id)} is the current term.` : 'Set the current term to begin the results cycle.'} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active students" value={studentCount ?? '…'} icon={<GraduationCap className="h-5 w-5" />} />
        <Stat label="Sheets submitted" value={`${submitted}/${sheets.length || allocs.length}`} hint="This term" icon={<ClipboardCheck className="h-5 w-5" />} tone="green" />
        <Stat label="Awaiting approval" value={pending} hint={pending ? 'Principal / HOD review' : 'Nothing pending'} icon={<Users className="h-5 w-5" />} tone={pending ? 'amber' : 'green'} />
        <Stat label="Classes published" value={`${publishedArms}/${d.arms.length}`} icon={<Send className="h-5 w-5" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Setup progress" description={`${doneCount} of ${steps.length} steps complete`} />
          <div className="px-5 pt-4"><Progress value={(doneCount / steps.length) * 100} /></div>
          <ul className="divide-y divide-slate-100 p-2">
            {steps.map((s) => (
              <li key={s.label}><Link href={s.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50">
                {s.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
                <span className={s.done ? 'text-slate-500' : 'font-medium text-slate-800'}>{s.label}</span>
                {!s.done && <Badge tone="amber" className="ml-auto">To do</Badge>}
              </Link></li>
            ))}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" action={<Link href="/admin/audit-log" className="text-sm font-medium text-brand-600">View all</Link>} />
          <ul className="divide-y divide-slate-100">
            {audit.map((l) => (
              <li key={l.id} className="px-5 py-3"><p className="text-sm text-slate-800">{l.summary}</p><p className="text-xs text-slate-500">{l.actorName} · {timeAgo(l.createdAt)}</p></li>
            ))}
            {audit.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">Activity will appear here.</li>}
          </ul>
        </Card>
      </div>
      {!d.currentTerm && !d.loading && (
        <Card className="mt-6 flex items-center gap-4 p-5"><CalendarDays className="h-8 w-8 text-brand-500" /><div><p className="font-medium">No current term</p><p className="text-sm text-slate-500">Go to <Link href="/admin/calendar" className="font-medium text-brand-600">Sessions & terms</Link>, create a session and mark a term as current.</p></div></Card>
      )}
    </>
  );
}
