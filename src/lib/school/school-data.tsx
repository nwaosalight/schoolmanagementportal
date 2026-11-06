'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { query, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { db } from '@/lib/firebase/client';
import { collection } from 'firebase/firestore';
import type { Arm, Doc, GradingScheme, Level, Session, Structure, Subject, Term, UserDoc } from '@/types';
import { fullName } from '@/lib/utils';

interface SchoolData {
  sessions: Doc<Session>[]; terms: Doc<Term>[]; levels: Doc<Level>[]; arms: Doc<Arm>[]; subjects: Doc<Subject>[];
  schemes: Doc<GradingScheme>[]; structures: Doc<Structure>[]; staff: Doc<UserDoc>[];
  loading: boolean;
  currentSession?: Doc<Session>; currentTerm?: Doc<Term>;
  defaultScheme?: Doc<GradingScheme>; defaultStructure?: Doc<Structure>;
  armLabel: (id?: string | null) => string; subjectName: (id?: string) => string; termLabel: (id?: string) => string;
  staffName: (uid?: string) => string; levelOfArm: (armId?: string | null) => Doc<Level> | undefined;
  prevTerm: (termId?: string) => Doc<Term> | undefined; teachers: Doc<UserDoc>[];
}
const Ctx = createContext<SchoolData | null>(null);

export function SchoolDataProvider({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();
  const sid = profile?.schoolId && profile.schoolId !== 'platform' ? profile.schoolId : null;
  const isStaff = role === 'school_admin' || role === 'exam_officer' || role === 'principal' || role === 'hod' || role === 'teacher';

  const sessions = useCollection<Session>(useMemo(() => (sid ? sc(sid, 'sessions') : null), [sid]));
  const terms = useCollection<Term>(useMemo(() => (sid ? sc(sid, 'terms') : null), [sid]));
  const levels = useCollection<Level>(useMemo(() => (sid ? sc(sid, 'levels') : null), [sid]));
  const arms = useCollection<Arm>(useMemo(() => (sid ? sc(sid, 'arms') : null), [sid]));
  const subjects = useCollection<Subject>(useMemo(() => (sid ? sc(sid, 'subjects') : null), [sid]));
  const schemes = useCollection<GradingScheme>(useMemo(() => (sid ? sc(sid, 'gradingSchemes') : null), [sid]));
  const structures = useCollection<Structure>(useMemo(() => (sid ? sc(sid, 'assessmentStructures') : null), [sid]));
  const staffQ = useMemo(() => (sid && isStaff
    ? query(collection(db, 'users'), where('schoolId', '==', sid), where('roles', 'array-contains-any', ['school_admin', 'exam_officer', 'principal', 'hod', 'teacher']))
    : null), [sid, isStaff]);
  const staff = useCollection<UserDoc>(staffQ);

  const value = useMemo<SchoolData>(() => {
    const sortedTerms = [...terms.data].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const sortedSessions = [...sessions.data].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const lv = [...levels.data].sort((a, b) => a.rank - b.rank);
    const levelById = new Map(lv.map((l) => [l.id, l]));
    const armById = new Map(arms.data.map((a) => [a.id, a]));
    const subById = new Map(subjects.data.map((s) => [s.id, s]));
    const sessById = new Map(sortedSessions.map((s) => [s.id, s]));
    const termById = new Map(sortedTerms.map((t) => [t.id, t]));
    const staffById = new Map(staff.data.map((u) => [u.id, u]));
    const armLabel = (id?: string | null) => {
      const a = id ? armById.get(id) : undefined;
      if (!a) return '—';
      return `${levelById.get(a.levelId)?.name ?? ''} ${a.name}`.trim();
    };
    return {
      sessions: sortedSessions, terms: sortedTerms, levels: lv,
      arms: [...arms.data].sort((a, b) => armLabel(a.id).localeCompare(armLabel(b.id), undefined, { numeric: true })),
      subjects: [...subjects.data].sort((a, b) => a.name.localeCompare(b.name)),
      schemes: schemes.data, structures: structures.data, staff: staff.data,
      teachers: staff.data.filter((u) => u.roles.includes('teacher') && u.status === 'ACTIVE'),
      loading: sessions.loading || terms.loading || levels.loading || arms.loading || subjects.loading,
      currentSession: sortedSessions.find((s) => s.isCurrent),
      currentTerm: sortedTerms.find((t) => t.isCurrent),
      defaultScheme: schemes.data.find((s) => s.isDefault) ?? schemes.data[0],
      defaultStructure: structures.data.find((s) => s.isDefault) ?? structures.data[0],
      armLabel,
      subjectName: (id) => (id ? subById.get(id)?.name ?? '—' : '—'),
      termLabel: (id) => { const t = id ? termById.get(id) : undefined; return t ? `${sessById.get(t.sessionId)?.name ?? ''} · ${t.name}` : '—'; },
      staffName: (uid) => (uid && staffById.get(uid) ? fullName(staffById.get(uid)) : '—'),
      levelOfArm: (armId) => { const a = armId ? armById.get(armId) : undefined; return a ? levelById.get(a.levelId) : undefined; },
      prevTerm: (termId) => { const i = sortedTerms.findIndex((t) => t.id === termId); return i > 0 ? sortedTerms[i - 1] : undefined; },
    };
  }, [sessions, terms, levels, arms, subjects, schemes, structures, staff]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useSchoolData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSchoolData must be used inside <SchoolDataProvider>');
  return c;
}
