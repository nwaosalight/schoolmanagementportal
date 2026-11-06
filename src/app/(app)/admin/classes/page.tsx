'use client';
import { useState } from 'react';
import { useSchoolData } from '@/lib/school/school-data';
import { CrudManager } from '@/components/shared/crud-manager';
import { PageHeader, Tabs } from '@/components/ui';
import { STAGES } from '@/lib/seed';

export default function ClassesPage() {
  const { levels, armLabel } = useSchoolData();
  const [tab, setTab] = useState<'levels' | 'arms'>('levels');
  return (
    <>
      <PageHeader title="Classes" description="Levels (e.g. JSS1) group arms (e.g. A, B, Gold). The promotion path of each level is used when moving students up." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'levels', label: 'Levels' }, { value: 'arms', label: 'Arms' }]} />
      {tab === 'levels' ? (
        <CrudManager path="levels" singular="Level" sort={(a, b) => a.rank - b.rank} emptyHint="Add levels such as JSS1, JSS2, SS1…"
          fields={[
            { name: 'name', label: 'Level name', type: 'text', required: true, placeholder: 'JSS1' },
            { name: 'rank', label: 'Order', type: 'number', required: true, hint: '1 = lowest level' },
            { name: 'stage', label: 'Stage', type: 'select', default: 'OTHER', options: STAGES.map((s) => ({ value: s, label: s.replace('_', ' ').toLowerCase() })) },
            { name: 'nextLevelId', label: 'Promotes to', type: 'select', options: levels.map((l) => ({ value: l.id, label: l.name })), hint: 'Leave empty for the final level' },
          ]} />
      ) : (
        <CrudManager path="arms" singular="Arm" sort={(a, b) => armLabel(a.id).localeCompare(armLabel(b.id), undefined, { numeric: true })} emptyHint="Create levels first, then add arms to each."
          fields={[
            { name: 'levelId', label: 'Level', type: 'select', required: true, options: levels.map((l) => ({ value: l.id, label: l.name })) },
            { name: 'name', label: 'Arm name', type: 'text', required: true, placeholder: 'A' },
            { name: 'capacity', label: 'Capacity', type: 'number' },
            { name: 'isActive', label: 'Active', type: 'checkbox', default: true },
          ]}
          columns={[]} />
      )}
    </>
  );
}
