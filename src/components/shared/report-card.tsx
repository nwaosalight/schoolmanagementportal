'use client';
import { QRCodeSVG } from 'qrcode.react';
import { fmt, fmtDate, ordinal, cn } from '@/lib/utils';
import type { Doc, Report, SchoolDoc, Settings, Trait } from '@/types';

type RC = Partial<Report> & { studentName: string; admissionNumber: string; armLabel: string };

export function ReportCard({ report, school, settings, termLabel, nextTermBegins, daysOpen, traits, preview }: {
  report: RC; school: Doc<SchoolDoc> | null; settings: Settings; termLabel: string; nextTermBegins?: string; daysOpen?: number; traits: Doc<Trait>[]; preview?: boolean;
}) {
  const comps = report.components ?? [];
  const lines = report.subjects ?? [];
  const compact = settings.layout === 'compact';
  const verifyUrl = report.verificationCode && typeof window !== 'undefined' ? `${window.location.origin}/verify/${report.verificationCode}` : null;
  const traitGroups = (['AFFECTIVE', 'PSYCHOMOTOR'] as const).map((c) => ({ c, items: traits.filter((t) => t.category === c && t.isActive && report.traits?.[t.id] != null) }));

  return (
    <div className="print-area relative mx-auto w-full max-w-[860px] rounded-xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      {preview && <div className="no-print pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"><span className="-rotate-12 text-6xl font-bold text-slate-100">PREVIEW</span></div>}
      <header className="relative flex items-center gap-4 border-b-2 border-brand-600 pb-4">
        {school?.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={school.logoUrl} alt="" className="h-16 w-16 rounded object-contain" />}
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">{school?.name}</h2>
          {school?.motto && <p className="text-xs italic text-slate-500">{school.motto}</p>}
          <p className="text-xs text-slate-500">{[school?.address, school?.phone, school?.email].filter(Boolean).join(' · ')}</p>
        </div>
        {verifyUrl ? <QRCodeSVG value={verifyUrl} size={64} /> : <div className="w-16" />}
      </header>
      <p className="mt-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-700">Terminal Report · {termLabel}</p>

      <section className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-3">
        {[['Name', report.studentName], ['Admission no.', report.admissionNumber], ['Class', report.armLabel],
          ...(settings.showPosition ? [['Position', report.position ? `${ordinal(report.position)} of ${report.classSize}` : '—']] : []),
          ['Average', fmt(report.average)], ['Overall grade', report.overallGrade ?? '—'],
          ...(settings.showAttendance ? [['Attendance', report.daysPresent != null ? `${report.daysPresent} / ${daysOpen ?? '—'} days` : '—']] : []),
          ['Next term begins', nextTermBegins ? fmtDate(nextTermBegins) : '—'],
          ...(report.cumulativeAverage != null ? [['Cumulative avg.', fmt(report.cumulativeAverage)]] : [])]
          .map(([k, v]) => <div key={k}><span className="text-slate-500">{k}: </span><span className="font-medium text-slate-900">{v}</span></div>)}
      </section>

      <div className="mt-4 overflow-x-auto">
        <table className={cn('w-full border-collapse text-sm', compact && 'text-xs')}>
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-2 py-2 text-left font-medium">Subject</th>
              {comps.map((c) => <th key={c.code} className="px-2 py-2 text-center font-medium">{c.name}<span className="block text-[10px] font-normal opacity-80">/{c.max}</span></th>)}
              <th className="px-2 py-2 text-center font-medium">Total</th><th className="px-2 py-2 text-center font-medium">Grade</th>
              {settings.showPosition && <th className="px-2 py-2 text-center font-medium">Pos.</th>}
              {settings.showClassAverage && <th className="px-2 py-2 text-center font-medium">Class avg</th>}
              <th className="px-2 py-2 text-left font-medium">Remark</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.subjectId} className={cn('border-b border-slate-100', i % 2 && 'bg-slate-50/60')}>
                <td className="px-2 py-1.5 font-medium text-slate-900">{l.name}</td>
                {comps.map((c) => <td key={c.code} className="px-2 py-1.5 text-center">{l.flag !== 'NONE' ? (l.flag === 'ABSENT' ? 'ABS' : 'EXC') : l.scores?.[c.code] ?? '—'}</td>)}
                <td className="px-2 py-1.5 text-center font-semibold">{fmt(l.total)}</td>
                <td className={cn('px-2 py-1.5 text-center font-semibold', l.total != null && report.passMark != null && l.total < report.passMark && 'text-red-600')}>{l.grade ?? '—'}</td>
                {settings.showPosition && <td className="px-2 py-1.5 text-center">{l.position ? ordinal(l.position) : '—'}</td>}
                {settings.showClassAverage && <td className="px-2 py-1.5 text-center">{fmt(l.classAverage)}</td>}
                <td className="px-2 py-1.5 text-slate-600">{l.remark ?? '—'}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-semibold"><td className="px-2 py-2" colSpan={comps.length + 1}>Total / Average</td><td className="px-2 py-2 text-center">{fmt(report.totalScore)}</td><td className="px-2 py-2 text-center" colSpan={settings.showPosition ? 1 : 0}>{fmt(report.average)}</td><td colSpan={5} /></tr>
          </tbody>
        </table>
      </div>

      {settings.showTraits && traitGroups.some((g) => g.items.length) && (
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          {traitGroups.filter((g) => g.items.length).map((g) => (
            <div key={g.c}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.c === 'AFFECTIVE' ? 'Affective domain' : 'Psychomotor skills'}</h3>
              <table className="w-full text-sm"><tbody>{g.items.map((t) => (
                <tr key={t.id} className="border-b border-slate-100"><td className="py-1">{t.name}</td><td className="py-1 text-right font-medium tracking-widest text-brand-600">{'●'.repeat(report.traits![t.id])}<span className="text-slate-200">{'●'.repeat(Math.max(0, t.maxRating - report.traits![t.id]))}</span></td></tr>
              ))}</tbody></table>
            </div>
          ))}
        </section>
      )}

      <section className="mt-5 space-y-3 text-sm">
        <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Class teacher's comment</p><p className="mt-1 min-h-[1.5rem] text-slate-800">{report.teacherComment || '—'}</p></div>
        <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Principal's remark</p><p className="mt-1 min-h-[1.5rem] text-slate-800">{report.principalRemark || '—'}</p>
          {school?.signatureUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={school.signatureUrl} alt="Principal signature" className="mt-2 h-10 object-contain" />}
          {school?.principalName && <p className="text-xs text-slate-500">{school.principalName}</p>}
        </div>
      </section>

      {settings.showGradeKey && report.bands && (
        <p className="mt-4 text-[11px] leading-relaxed text-slate-500"><span className="font-semibold">Grade key: </span>{[...report.bands].sort((a, b) => b.min - a.min).map((b) => `${b.grade} ${b.min}–${b.max} (${b.remark})`).join(' · ')}</p>
      )}
      {(settings.feeNotice || settings.footerNote) && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{[settings.feeNotice, settings.footerNote].filter(Boolean).join(' · ')}</p>}
      {verifyUrl && <p className="mt-2 text-[10px] text-slate-400">Verify authenticity: {verifyUrl}</p>}
    </div>
  );
}
