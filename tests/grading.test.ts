// Run with: npm test
import { gradeFor, rank, sumScores, validateBands } from '../src/lib/grading';
import { DEFAULT_BANDS, DEFAULT_COMPONENTS } from '../src/lib/seed';
import { sheetStats } from '../src/lib/results/sheets';

const eq = (a: unknown, b: unknown, m: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { console.error('FAIL', m, a, b); process.exit(1); }
  console.log('ok  ', m);
};
eq(validateBands(DEFAULT_BANDS), null, 'default bands valid');
eq(validateBands(DEFAULT_BANDS.map((b) => (b.grade === 'C' ? { ...b, min: 52 } : b))) !== null, true, 'gap detected');
eq(gradeFor(69.5, DEFAULT_BANDS)?.grade, 'B', '69.5 -> B');
eq(gradeFor(70, DEFAULT_BANDS)?.grade, 'A', '70 -> A');
eq(gradeFor(39.9, DEFAULT_BANDS)?.grade, 'F', '39.9 -> F');
eq(gradeFor(null, DEFAULT_BANDS), null, 'null grade');
eq(sumScores({ CA1: 10, CA2: 12.5, EXAM: 50 }, DEFAULT_COMPONENTS), 72.5, 'sum of components');
eq(sumScores({}, DEFAULT_COMPONENTS), null, 'no scores -> null');
const r = rank([{ id: 'a', value: 90 }, { id: 'b', value: 80 }, { id: 'c', value: 80 }, { id: 'd', value: 70 }, { id: 'e', value: null }]);
eq([r.get('a'), r.get('b'), r.get('c'), r.get('d'), r.get('e')], [1, 2, 2, 4, undefined], 'ties share a position (1,2,2,4)');
const st = sheetStats([
  { total: 80, flag: 'NONE', scores: { CA1: 1, CA2: 1, EXAM: 1 } },
  { total: 30, flag: 'NONE', scores: { CA1: 1, CA2: null, EXAM: 1 } },
  { total: null, flag: 'ABSENT', scores: {} },
], 40, DEFAULT_COMPONENTS);
eq([st.classAverage, st.highest, st.lowest, st.passRate, st.blanks, st.studentCount], [55, 80, 30, 50, 1, 3], 'sheet stats exclude absent students');
console.log('\nAll tests passed.');
