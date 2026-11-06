'use client';
import { useEffect, useState } from 'react';
import { getCountFromServer, type Query } from 'firebase/firestore';

/** Server-side count of a query (cheap aggregation). Re-runs when `key` changes. */
export function useCount(q: Query | null, key: unknown = 0) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    if (!q) { setN(null); return; }
    let live = true;
    getCountFromServer(q).then((s) => live && setN(s.data().count)).catch(() => live && setN(null));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return n;
}
