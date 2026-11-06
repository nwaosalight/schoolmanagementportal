'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, GraduationCap, LogOut, Menu, User, WifiOff, X, Users } from 'lucide-react';
import { query, where } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc } from '@/lib/firebase/paths';
import { useSchoolData } from '@/lib/school/school-data';
import { NAV, type NavGroup } from '@/config/navigation';
import { ROLE_HOME, ROLE_LABEL } from '@/config/routes';
import { cn, initials } from '@/lib/utils';
import { NotificationBell } from './notification-bell';
import type { ClassTeacher, Doc } from '@/types';

export function useMyClassArms() {
  const { actor } = useAuth();
  const { currentSession } = useSchoolData();
  const q = useMemo(() => (actor && currentSession ? query(sc(actor.schoolId, 'classTeachers'), where('teacherUid', '==', actor.uid), where('sessionId', '==', currentSession.id)) : null), [actor, currentSession]);
  return useCollection<ClassTeacher>(q).data as Doc<ClassTeacher>[];
}

function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + '/');
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
                    className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                    <it.icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-600' : 'text-slate-400')} />{it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, school, role, roles, setRole, signOutUser } = useAuth();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [online, setOnline] = useState(true);
  const classArms = useMyClassArms();
  const path = usePathname();
  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const groups = useMemo(() => {
    const base = role ? NAV[role] : [];
    if (role === 'teacher' && classArms.length) {
      return [...base, { title: 'Class teacher', items: classArms.map((c) => ({ label: `My class`, href: `/teacher/class/${c.armId}/overview`, icon: Users })) }];
    }
    return base;
  }, [role, classArms]);

  const name = profile ? `${profile.firstName} ${profile.lastName}` : '';
  const brand = (
    <Link href={role ? ROLE_HOME[role] : '/'} className="flex items-center gap-2.5 px-5 py-4">
      {school?.logoUrl
        ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={school.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
        : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"><GraduationCap className="h-5 w-5" /></span>}
      <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{role === 'platform' ? 'Platform console' : school?.name ?? 'School Results'}</span><span className="block text-xs text-slate-500">Results portal</span></span>
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">{brand}<SidebarNav groups={groups} /></aside>
      {drawer && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <button className="absolute right-3 top-4 rounded-lg p-1 text-slate-400" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            {brand}<SidebarNav groups={groups} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1" />
          {roles.length > 1 && (
            <select aria-label="Switch role" value={role ?? ''} onChange={(e) => { setRole(e.target.value as any); router.push(ROLE_HOME[e.target.value as keyof typeof ROLE_HOME]); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700">
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          )}
          {role !== 'platform' && <NotificationBell />}
          <div className="relative">
            <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(name)}</span>
              <span className="hidden text-left sm:block"><span className="block text-sm font-medium leading-4 text-slate-900">{name}</span><span className="block text-xs text-slate-500">{role ? ROLE_LABEL[role] : ''}</span></span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <Link href="/profile" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><User className="h-4 w-4" />Profile & security</Link>
                  <button onClick={async () => { setMenu(false); await signOutUser(); router.replace('/login'); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />Sign out</button>
                </div>
              </>
            )}
          </div>
        </header>
        {!online && <div className="no-print flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900"><WifiOff className="h-3.5 w-3.5" />You're offline. Changes will sync when you reconnect.</div>}
        {school?.status === 'SUSPENDED' && role !== 'platform' && <div className="bg-red-100 px-4 py-2 text-center text-sm text-red-900">This school's subscription is suspended. Contact the platform administrator.</div>}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
