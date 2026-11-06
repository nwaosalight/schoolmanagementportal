import type { Band, Component, RowFlag } from '@/types';

export function sumScores(scores: Record<string, number | null | undefined>, components: Component[]): number | null {
  let any = false, t = 0;
  for (const c of components) {
    const v = scores[c.code];
    if (typeof v === 'number' && !isNaN(v)) { any = true; t += v; }
  }
  return any ? Math.round(t * 100) / 100 : null;
}
export function gradeFor(total: number | null | undefined, bands: Band[]): Band | null {
  if (total == null) return null;
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => total >= b.min) ?? sorted[sorted.length - 1] ?? null;
}
/** Competition ranking: ties share a position (1, 2, 2, 4). */
export function rank(items: { id: string; value: number | null }[]): Map<string, number> {
  const valid = items.filter((i) => i.value != null).sort((a, b) => (b.value as number) - (a.value as number));
  const out = new Map<string, number>();
  valid.forEach((it, i) => {
    out.set(it.id, i > 0 && valid[i - 1].value === it.value ? (out.get(valid[i - 1].id) as number) : i + 1);
  });
  return out;
}
export function validateBands(bands: Band[], maxTotal = 100): string | null {
  if (!bands.length) return 'Add at least one grade band.';
  const s = [...bands].sort((a, b) => a.min - b.min);
  if (s.some((b) => !b.grade.trim())) return 'Every band needs a grade letter.';
  if (new Set(s.map((b) => b.grade)).size !== s.length) return 'Grade letters must be unique.';
  if (s[0].min !== 0) return 'The lowest band must start at 0.';
  for (let i = 0; i < s.length; i++) {
    if (s[i].max < s[i].min) return `Band ${s[i].grade}: max is lower than min.`;
    if (i > 0 && s[i].min !== s[i - 1].max + 1) return `Bands ${s[i - 1].grade} and ${s[i].grade} overlap or leave a gap.`;
  }
  if (s[s.length - 1].max !== maxTotal) return `The highest band must end at ${maxTotal}.`;
  return null;
}
export const flagLabel = (f: RowFlag) => (f === 'ABSENT' ? 'ABS' : f === 'EXCUSED' ? 'EXC' : '');
export const average = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
