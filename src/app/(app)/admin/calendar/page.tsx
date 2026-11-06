'use client';
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useActor } from '@/lib/auth/auth-provider';
import { useSchoolData } from '@/lib/school/school-data';
import { CrudManager } from '@/components/shared/crud-manager';
import { Button, ConfirmDialog, PageHeader, Tabs, useToast, errMsg } from '@/components/ui';
import { lockTerm } from '@/lib/results/publish';
import type { Doc, Term } from '@/types';

export default function CalendarPage() {
  const a = useActor();
  const toast = useToast();
  const { sessions, termLabel } = useSchoolData();
  const [tab, setTab] = useState<'sessions' | 'terms'>('sessions');
  const [lock, setLock] = useState<Doc<Term> | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader title="Sessions & terms" description="Create academic sessions and their terms. Exactly one term should be marked as current." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'sessions', label: 'Sessions' }, { value: 'terms', label: 'Terms' }]} />
      {tab === 'sessions' ? (
        <CrudManager path="sessions" singular="Session" exclusive="isCurrent" sort={(x, y) => y.startDate.localeCompare(x.startDate)}
          fields={[
            { name: 'name', label: 'Session name', type: 'text', required: true, placeholder: '2026/2027' },
            { name: 'startDate', label: 'Starts', type: 'date', required: true },
            { name: 'endDate', label: 'Ends', type: 'date', required: true },
            { name: 'isCurrent', label: 'Current session', type: 'checkbox' },
          ]}
          validate={(v) => (v.endDate <= v.startDate ? 'The end date must be after the start date.' : null)} />
      ) : (
        <CrudManager path="terms" singular="Term" exclusive="isCurrent" sort={(x, y) => y.startDate.localeCompare(x.startDate)}
          fields={[
            { name: 'name', label: 'Term name', type: 'text', required: true, placeholder: 'First Term' },
            { name: 'sessionId', label: 'Session', type: 'select', required: true, options: sessions.map((s) => ({ value: s.id, label: s.name })) },
            { name: 'sequence', label: 'Order in session', type: 'number', required: true, default: 1 },
            { name: 'startDate', label: 'Starts', type: 'date', required: true },
            { name: 'endDate', label: 'Ends', type: 'date', required: true },
            { name: 'nextTermBegins', label: 'Next term begins', type: 'date' },
            { name: 'daysOpen', label: 'School days (for attendance)', type: 'number' },
            { name: 'status', label: 'Status', type: 'select', required: true, default: 'UPCOMING', options: ['UPCOMING', 'ACTIVE', 'CLOSED', 'LOCKED'].map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() })) },
            { name: 'isCurrent', label: 'Current term', type: 'checkbox' },
          ]}
          columns={[]}
          validate={(v) => (v.endDate <= v.startDate ? 'The end date must be after the start date.' : null)}
          rowActions={(r) => r.status !== 'LOCKED' ? <Button variant="ghost" size="sm" aria-label="Lock term" title="Lock term" onClick={() => setLock(r as Doc<Term>)}><Lock className="h-4 w-4" /></Button> : null} />
      )}
      <ConfirmDialog open={!!lock} onClose={() => setLock(null)} loading={busy} confirmLabel="Lock term" danger title="Lock this term?"
        message={<>All result sheets and report cards for <strong>{lock && termLabel(lock.id)}</strong> become read-only. Corrections afterwards need an approved unlock request.</>}
        onConfirm={async () => { setBusy(true); try { await lockTerm(a, lock!); toast.success('Term locked.'); setLock(null); } catch (e) { toast.error(errMsg(e)); } setBusy(false); }} />
    </>
  );
}
