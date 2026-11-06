'use client';
import { useSchoolData } from '@/lib/school/school-data';
import { CrudManager } from '@/components/shared/crud-manager';
import { PageHeader } from '@/components/ui';

export default function SubjectsPage() {
  const { levels } = useSchoolData();
  return (
    <>
      <PageHeader title="Subjects" description="Choose which levels offer each subject. Elective subjects only include students you assign them to." />
      <CrudManager path="subjects" singular="Subject" emptyHint="Add subjects like Mathematics, English Language…"
        fields={[
          { name: 'name', label: 'Subject name', type: 'text', required: true },
          { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'MTH' },
          { name: 'type', label: 'Type', type: 'select', required: true, default: 'CORE', options: [{ value: 'CORE', label: 'Core' }, { value: 'ELECTIVE', label: 'Elective' }] },
          { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
          { name: 'levelIds', label: 'Offered in', type: 'multiselect', required: true, options: levels.map((l) => ({ value: l.id, label: l.name })) },
        ]}
        validate={(v, rows, ed) => (rows.some((r) => r.id !== ed?.id && String(r.code).toLowerCase() === String(v.code).toLowerCase()) ? 'That subject code is already used.' : null)} />
    </>
  );
}
