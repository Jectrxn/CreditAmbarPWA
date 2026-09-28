import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { liveQuery } from 'dexie';

export interface UseLiveDexieQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  retry: () => void;
}

interface QueryState<T> {
  token: object;
  data: T | undefined;
  error: unknown;
  settled: boolean;
}

function areDepsEqual(a: DependencyList, b: DependencyList): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
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
  // `attempt` is bumped by `retry()` so a manual retry produces a fresh token
  // (and therefore a fresh subscription + loading state) the same way a deps
  // change does, without requiring the caller to change `deps` itself.
  const [attempt, setAttempt] = useState(0);

  // A fresh token identifies the current `deps` (and retry attempt). Results
  // are tagged with the token they were produced for, so the very first
  // render after a deps change (before the effect runs) already reports
  // loading instead of painting the previous deps' data. The token lives in a
  // ref (not `useMemo`, which React may discard) so it only changes when deps
  // or the attempt actually change.
  const identityRef = useRef<{ deps: DependencyList; attempt: number; token: object } | null>(null);
  const identity = identityRef.current;
  if (!identity || identity.attempt !== attempt || !areDepsEqual(identity.deps, deps)) {
    identityRef.current = { deps, attempt, token: {} };
  }
  const token = identityRef.current!.token;

  const [state, setState] = useState<QueryState<T> | null>(null);

  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

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
    return { data: undefined, isLoading: true, error: undefined, retry };
  }

  return { data: state.data, isLoading: !state.settled, error: state.error, retry };
}
