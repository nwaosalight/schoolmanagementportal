'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import type { Doc, Role, SchoolDoc, UserDoc } from '@/types';
import { fullName } from '@/lib/utils';

export interface Actor { schoolId: string; uid: string; name: string; role: Role }
interface AuthState {
  fbUser: User | null;
  profile: Doc<UserDoc> | null;
  school: Doc<SchoolDoc> | null;
  loading: boolean;
  roles: Role[];
  role: Role | null;
  setRole: (r: Role) => void;
  actor: Actor | null;
  signOutUser: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
const PRIORITY: Role[] = ['platform', 'school_admin', 'exam_officer', 'principal', 'hod', 'teacher', 'parent', 'student'];
const ROLE_KEY = 'srp.activeRole';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Doc<UserDoc> | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [school, setSchool] = useState<Doc<SchoolDoc> | null>(null);
  const [picked, setPicked] = useState<Role | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setFbUser(u);
    setAuthReady(true);
    if (!u) { setProfile(null); setSchool(null); setProfileReady(true); } else setProfileReady(false);
  }), []);

  useEffect(() => {
    if (!fbUser) return;
    return onSnapshot(doc(db, 'users', fbUser.uid), (s) => {
      setProfile(s.exists() ? ({ id: s.id, ...s.data() } as Doc<UserDoc>) : null);
      setProfileReady(true);
    }, () => setProfileReady(true));
  }, [fbUser]);

  const schoolId = profile?.schoolId;
  useEffect(() => {
    if (!schoolId || schoolId === 'platform') { setSchool(null); return; }
    return onSnapshot(doc(db, 'schools', schoolId), (s) => setSchool(s.exists() ? ({ id: s.id, ...s.data() } as Doc<SchoolDoc>) : null), () => {});
  }, [schoolId]);

  useEffect(() => { setPicked((localStorage.getItem(ROLE_KEY) as Role) || null); }, []);

  const roles = useMemo<Role[]>(() => {
    if (!profile) return [];
    const r: Role[] = [...(profile.roles ?? [])];
    if (profile.isPlatformAdmin) r.push('platform');
    return PRIORITY.filter((p) => r.includes(p));
  }, [profile]);
  const role = roles.length ? (picked && roles.includes(picked) ? picked : roles[0]) : null;

  const setRole = useCallback((r: Role) => { localStorage.setItem(ROLE_KEY, r); setPicked(r); }, []);
  const signOutUser = useCallback(async () => { await signOut(auth); localStorage.removeItem(ROLE_KEY); setPicked(null); }, []);
  const actor = useMemo<Actor | null>(() => (profile && role ? { schoolId: profile.schoolId, uid: profile.id, name: fullName(profile), role } : null), [profile, role]);

  const value: AuthState = { fbUser, profile, school, loading: !authReady || (!!fbUser && !profileReady), roles, role, setRole, actor, signOutUser };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
/** Use inside the authenticated area, where an actor always exists. */
export function useActor(): Actor {
  const { actor } = useAuth();
  if (!actor) throw new Error('No active user');
  return actor;
}
