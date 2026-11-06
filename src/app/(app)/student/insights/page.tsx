'use client';
import { Target } from 'lucide-react';
import { useMyReports } from '@/components/portal/use-portal';
import { TrendsView } from '@/components/portal/trends-view';
import { Card, CardHeader, PageHeader, PageLoader } from '@/components/ui';
import { fmt } from '@/lib/utils';

export default function Insights() {
  const r = useMyReports();
  if (r.loading) return <PageLoader />;
  const latest = r.data[0];
  const targets = (latest?.subjects ?? []).filter((l) => l.total != null).map((l) => {
    const sorted = [...(latest!.bands ?? [])].sort((a, b) => a.min - b.min);
    const next = sorted.find((b) => b.min > (l.total as number));
    return { name: l.name, total: l.total as number, next: next?.grade, gap: next ? next.min - (l.total as number) : 0 };
  }).sort((a, b) => a.total - b.total).slice(0, 4).filter((t) => t.next);
  return (
    <>
      <PageHeader title="Performance insights" description="See how you're doing and where to focus." />
      {targets.length > 0 && (
        <Card className="mb-6"><CardHeader title="Your next targets" description="The smallest improvements that lift a grade" />
          <ul className="divide-y divide-slate-100">{targets.map((t) => <li key={t.name} className="flex items-center gap-3 px-5 py-3 text-sm"><Target className="h-4 w-4 text-brand-500" /><span className="flex-1"><strong>{t.name}</strong> — you scored {fmt(t.total, 0)}</span><span className="text-slate-600">+{fmt(t.gap, 0)} marks reaches grade {t.next}</span></li>)}</ul></Card>)}
      <TrendsView reports={r.data} />
    </>
  );
}
