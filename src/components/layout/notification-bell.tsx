'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { query, where, updateDoc } from 'firebase/firestore';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { timeAgo, toDate } from '@/lib/utils';
import type { Notification } from '@/types';

export function useMyNotifications() {
  const a = useActor();
  const q = useMemo(() => query(sc(a.schoolId, 'notifications'), where('toUid', '==', a.uid)), [a.schoolId, a.uid]);
  const { data, loading } = useCollection<Notification>(q);
  const sorted = useMemo(() => [...data].sort((x, y) => (+(toDate(y.createdAt) ?? 0)) - (+(toDate(x.createdAt) ?? 0))), [data]);
  return { items: sorted, unread: sorted.filter((n) => !n.read).length, loading };
}
export const markRead = (schoolId: string, id: string) => updateDoc(sd(schoolId, 'notifications', id), { read: true });

export function NotificationBell() {
  const a = useActor();
  const { items, unread } = useMyNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="text-sm font-semibold">Notifications</p><Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-600">View all</Link></div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.slice(0, 6).map((n) => (
              <Link key={n.id} href={n.link || '/notifications'} onClick={() => { setOpen(false); if (!n.read) markRead(a.schoolId, n.id); }} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-500'}`} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{n.title}</span><span className="block truncate text-xs text-slate-500">{n.body}</span><span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span></span>
              </Link>
            ))}
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
