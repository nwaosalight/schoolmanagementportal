'use client';
import { useEffect, useRef, useState } from 'react';
import { onSnapshot, queryEqual, refEqual, type DocumentReference, type Query } from 'firebase/firestore';
import type { Doc } from '@/types';

interface ColState<T> { data: Doc<T>[]; loading: boolean; error: Error | null }

export function useCollection<T = any>(q: Query | null | undefined): ColState<T> {
  const [state, setState] = useState<ColState<T>>({ data: [], loading: !!q, error: null });
  const ref = useRef<Query | null>(null);
  if (!q) ref.current = null;
  else if (!ref.current || !queryEqual(ref.current, q)) ref.current = q;
  const stable = ref.current;

  useEffect(() => {
    if (!stable) { setState({ data: [], loading: false, error: null }); return; }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      stable,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doc<T>), loading: false, error: null }),
      (error) => { console.error(error); setState((s) => ({ ...s, loading: false, error })); },
    );
  }, [stable]);
  return state;
}

export function useDoc<T = any>(r: DocumentReference | null | undefined) {
  const [state, setState] = useState<{ data: Doc<T> | null; loading: boolean; exists: boolean }>({ data: null, loading: !!r, exists: false });
  const ref = useRef<DocumentReference | null>(null);
  if (!r) ref.current = null;
  else if (!ref.current || !refEqual(ref.current, r)) ref.current = r;
  const stable = ref.current;

  useEffect(() => {
    if (!stable) { setState({ data: null, loading: false, exists: false }); return; }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      stable,
      (snap) => setState({ data: snap.exists() ? ({ id: snap.id, ...snap.data() } as Doc<T>) : null, loading: false, exists: snap.exists() }),
      (e) => { console.error(e); setState({ data: null, loading: false, exists: false }); },
    );
  }, [stable]);
  return state;
}
