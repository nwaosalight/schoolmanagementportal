'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { Card, PageLoader } from '@/components/ui';
import { fmt, ordinal } from '@/lib/utils';

export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<{ loading: boolean; data: any | null }>({ loading: true, data: null });
  useEffect(() => {
    getDoc(doc(db, 'verifications', String(code).toUpperCase()))
      .then((s) => setState({ loading: false, data: s.exists() ? s.data() : null }))
      .catch(() => setState({ loading: false, data: null }));
  }, [code]);
  if (state.loading) return <PageLoader label="Verifying…" />;
  const d = state.data;
  if (!d || !d.valid) {
    return (
      <Card className="p-7 text-center">
        <ShieldX className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-3 text-xl font-semibold">Could not verify this report card</h1>
        <p className="mt-1 text-sm text-slate-500">{d ? 'This report card has been withdrawn by the school.' : 'No report card matches this code. It may be forged or mistyped.'}</p>
      </Card>
    );
  }
  return (
    <Card className="p-7">
      <div className="text-center"><BadgeCheck className="mx-auto h-12 w-12 text-emerald-500" /><h1 className="mt-3 text-xl font-semibold">Authentic report card</h1><p className="text-sm text-slate-500">Issued by {d.schoolName}</p></div>
      <dl className="mt-6 divide-y divide-slate-100 text-sm">
        {[['Student', d.studentName], ['Admission no.', d.admissionNumber], ['Class', d.armLabel], ['Term', d.termLabel], ['Average', fmt(d.average)], ['Position', d.position ? `${ordinal(d.position)} of ${d.classSize}` : '—'], ['Overall grade', d.overallGrade ?? '—']].map(([k, v]) => (
          <div key={k as string} className="flex justify-between py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-center text-xs text-slate-400">Code {String(code).toUpperCase()}</p>
    </Card>
  );
}
