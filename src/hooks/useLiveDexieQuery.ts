import { useEffect, useMemo, useRef, useState, type DependencyList } from 'react';
import { liveQuery } from 'dexie';

export interface UseLiveDexieQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
}

interface QueryState<T> {
  token: object;
  data: T | undefined;
  error: unknown;
  settled: boolean;
}

/**
 * Thin hook over Dexie 4 core `liveQuery`. Subscribes to `querier` inside an
 * effect keyed on `deps`, resubscribing (and reporting a loading state)
 * whenever `deps` change, and unsubscribing on unmount.
 */
export function useLiveDexieQuery<T>(
  querier: () => Promise<T> | T,
  deps: DependencyList
): UseLiveDexieQueryResult<T> {
  // A fresh token identifies the current `deps`. Results are tagged with the
  // token they were produced for, so the very first render after a deps change
  // (before the effect runs) already reports loading instead of painting the
  // previous deps' data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const token = useMemo(() => ({}), deps);

  const [state, setState] = useState<QueryState<T> | null>(null);

  // Keep the latest querier without making it a dependency of the effect
  // below: resubscription is driven only by `deps`, per the hook contract.
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    let isActive = true;

    // Wrapped in an async arrow so a querier that throws synchronously
    // (instead of returning a rejected promise) is still routed to the
    // subscription's `error` callback rather than becoming an uncaught
    // exception.
    const subscription = liveQuery(async () => querierRef.current()).subscribe({
      next: (result) => {
        if (!isActive) return;
        setState({ token, data: result, error: undefined, settled: true });
      },
      error: (err) => {
        if (!isActive) return;
        setState({ token, data: undefined, error: err, settled: true });
      },
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [token]);

  if (!state || state.token !== token) {
    return { data: undefined, isLoading: true, error: undefined };
  }

  return { data: state.data, isLoading: !state.settled, error: state.error };
}
