'use client';
import { useMemo } from 'react';
import { useActor } from '@/lib/auth/auth-provider';
import { useCollection, useDoc } from '@/lib/firebase/hooks';
import { sc, sd } from '@/lib/firebase/paths';
import { DEFAULT_SETTINGS } from '@/lib/seed';
import type { Settings, Trait } from '@/types';

export function useSettings() {
  const a = useActor();
  const { data, loading } = useDoc<Settings>(useMemo(() => sd(a.schoolId, 'settings', 'general'), [a.schoolId]));
  const settings: Settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(data ?? {}) }), [data]);
  return { settings, loading };
}
export function useTraits() {
  const a = useActor();
  return useCollection<Trait>(useMemo(() => sc(a.schoolId, 'traits'), [a.schoolId]));
}
