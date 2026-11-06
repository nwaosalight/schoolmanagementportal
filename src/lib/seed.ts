import type { Band, Component, Settings, Trait } from '@/types';

export const DEFAULT_BANDS: Band[] = [
  { grade: 'A', min: 70, max: 100, remark: 'Excellent', gpa: 5, isPass: true },
  { grade: 'B', min: 60, max: 69, remark: 'Very Good', gpa: 4, isPass: true },
  { grade: 'C', min: 50, max: 59, remark: 'Good', gpa: 3, isPass: true },
  { grade: 'D', min: 45, max: 49, remark: 'Fair', gpa: 2, isPass: true },
  { grade: 'E', min: 40, max: 44, remark: 'Pass', gpa: 1, isPass: true },
  { grade: 'F', min: 0, max: 39, remark: 'Fail', gpa: 0, isPass: false },
];
export const DEFAULT_COMPONENTS: Component[] = [
  { code: 'CA1', name: 'First CA', max: 15 },
  { code: 'CA2', name: 'Second CA', max: 15 },
  { code: 'EXAM', name: 'Examination', max: 70, isExam: true },
];
export const DEFAULT_TRAITS: Trait[] = [
  ...['Punctuality', 'Neatness', 'Honesty', 'Leadership', 'Politeness', 'Cooperation'].map((name) => ({ name, category: 'AFFECTIVE' as const, maxRating: 5, isActive: true })),
  ...['Handwriting', 'Sports', 'Drawing & Painting', 'Musical Skills'].map((name) => ({ name, category: 'PSYCHOMOTOR' as const, maxRating: 5, isActive: true })),
];
export const DEFAULT_SETTINGS: Settings = {
  allowQueries: true, notifyOnPublish: true,
  showPosition: true, showClassAverage: true, showAttendance: true, showTraits: true, showGradeKey: true,
  layout: 'classic', footerNote: '', feeNotice: '',
  teacherPhrases: [
    { min: 70, text: 'An outstanding performance. Keep up the excellent work.' },
    { min: 60, text: 'A very good result. With a little more effort, excellence is within reach.' },
    { min: 50, text: 'A good effort. Greater consistency will improve the result.' },
    { min: 40, text: 'A fair result. More attention to studies is needed.' },
    { min: 0, text: 'Performance is below expectation. Close supervision and extra work are advised.' },
  ],
  principalPhrases: [
    { min: 70, text: 'Excellent result. The school is proud of you.' },
    { min: 55, text: 'A commendable performance. Keep striving.' },
    { min: 40, text: 'Fair. You can do better with more commitment.' },
    { min: 0, text: 'Weak result. You must sit up and work harder next term.' },
  ],
};
export const STAGES = ['NURSERY', 'PRIMARY', 'JUNIOR_SECONDARY', 'SENIOR_SECONDARY', 'OTHER'];
