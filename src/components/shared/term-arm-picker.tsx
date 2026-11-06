'use client';
import { useEffect, useState } from 'react';
import { Select } from '@/components/ui';
import { useSchoolData } from '@/lib/school/school-data';

/** Shared state for pages that work on a term (defaults to the current term) and optionally a class arm. */
export function useTermArm(initialArm = '') {
  const { currentTerm, terms, arms } = useSchoolData();
  const [termId, setTermId] = useState('');
  const [armId, setArmId] = useState(initialArm);
  useEffect(() => { if (!termId && (currentTerm || terms.length)) setTermId((currentTerm ?? terms[terms.length - 1]).id); }, [currentTerm, terms, termId]);
  return { termId, setTermId, armId, setArmId, term: terms.find((t) => t.id === termId), arm: arms.find((a) => a.id === armId) };
}

export function TermArmPicker({ termId, armId, onTerm, onArm, armIds, showArm = true, allowAllArms = false }: {
  termId: string; armId?: string; onTerm: (v: string) => void; onArm?: (v: string) => void; armIds?: string[]; showArm?: boolean; allowAllArms?: boolean;
}) {
  const { terms, arms, termLabel, armLabel } = useSchoolData();
  const list = armIds ? arms.filter((a) => armIds.includes(a.id)) : arms;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Term" className="w-auto min-w-[12rem]" value={termId} onChange={(e) => onTerm(e.target.value)}>
        {terms.length === 0 && <option value="">No terms yet</option>}
        {[...terms].reverse().map((t) => <option key={t.id} value={t.id}>{termLabel(t.id)}</option>)}
      </Select>
      {showArm && onArm && (
        <Select aria-label="Class" className="w-auto min-w-[9rem]" value={armId ?? ''} onChange={(e) => onArm(e.target.value)} placeholder={allowAllArms ? 'All classes' : 'Select class'}>
          {list.map((a) => <option key={a.id} value={a.id}>{armLabel(a.id)}</option>)}
        </Select>
      )}
    </div>
  );
}
