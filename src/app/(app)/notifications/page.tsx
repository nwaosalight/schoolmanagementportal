'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useActor } from '@/lib/auth/auth-provider';
import { markRead, useMyNotifications } from '@/components/layout/notification-bell';
import { Button, Card, EmptyState, PageHeader, PageLoader, useToast, errMsg } from '@/components/ui';
import { Writer } from '@/lib/firebase/writer';
import { sd } from '@/lib/firebase/paths';
import { timeAgo } from '@/lib/utils';
import { enablePush } from '@/lib/firebase/messaging';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const a = useActor();
  const toast = useToast();
  const { items, unread, loading } = useMyNotifications();
  const [pushBusy, setPushBusy] = useState(false);

  async function readAll() {
    const w = new Writer();
    items.filter((n) => !n.read).forEach((n) => w.update(sd(a.schoolId, 'notifications', n.id), { read: true }));
    await w.commit();
  }
  async function push() {
    setPushBusy(true);
    try {
      const token = await enablePush();
      await updateDoc(doc(db, 'users', a.uid), { fcmTokens: arrayUnion(token) });
      toast.success('Push notifications enabled on this device.');
    } catch (e) { toast.error(errMsg(e)); }
    setPushBusy(false);
  }
  return (
    <>
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : 'Everything is read'}
        actions={<>
          <Button variant="secondary" size="sm" icon={<BellRing className="h-4 w-4" />} loading={pushBusy} onClick={push}>Enable push</Button>
          <Button variant="secondary" size="sm" icon={<CheckCheck className="h-4 w-4" />} disabled={!unread} onClick={readAll}>Mark all read</Button>
        </>} />
      {loading ? <PageLoader /> : items.length === 0 ? (
        <Card><EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications yet" description="You'll see result updates and school messages here." /></Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {items.map((n) => (
            <Link key={n.id} href={n.link || '#'} onClick={() => !n.read && markRead(a.schoolId, n.id)} className={cn('flex gap-3 px-5 py-4 hover:bg-slate-50', !n.read && 'bg-brand-50/40')}>
              <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : 'bg-brand-500')} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900">{n.title}</span><span className="block text-sm text-slate-600">{n.body}</span></span>
              <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
