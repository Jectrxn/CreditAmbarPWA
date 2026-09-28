import { useEffect, useRef, useState, type DependencyList } from 'react';
import { liveQuery } from 'dexie';

export interface UseLiveDexieQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
}

/**
 * Thin hook over Dexie 4 core `liveQuery`. Subscribes to `querier` inside an
 * effect keyed on `deps`, resubscribing (and resetting to a loading state)
 * whenever `deps` change, and unsubscribing on unmount.
 */
export function useLiveDexieQuery<T>(
  querier: () => Promise<T> | T,
  deps: DependencyList
): UseLiveDexieQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  // Keep the latest querier without making it a dependency of the effect
  // below: resubscription is driven only by `deps`, per the hook contract.
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    let isActive = true;

    // Stale data/errors from a previous `deps` value must never be reported
    // as current while the new subscription is settling.
    setData(undefined);
    setError(undefined);
    setIsLoading(true);

    // Wrapped in an async arrow so a querier that throws synchronously
    // (instead of returning a rejected promise) is still routed to the
    // subscription's `error` callback rather than becoming an uncaught
    // exception.
    const subscription = liveQuery(async () => querierRef.current()).subscribe({
      next: (result) => {
        if (!isActive) return;
        setData(result);
        setError(undefined);
        setIsLoading(false);
      },
      error: (err) => {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      },
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error };
}
