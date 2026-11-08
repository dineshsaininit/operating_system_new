import { useCallback, useEffect, useRef, useState } from 'react';
import { bus } from './bus';

/**
 * Minimal data-fetching hook. Refetches automatically whenever any mutation calls bus.emit().
 * `loading` is true only for the first load, so live refreshes don't flash skeletons.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async () => {
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => bus.subscribe(load), [load]);

  return { data, loading, error, reload: load, setData };
}
