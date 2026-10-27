import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

type State<T> = { data: T | null; error: ApiError | null; loading: boolean };

const MAX_POLLS = 200; // ~5 minutes at 1.5 s: then stop and say so, never poll forever

/**
 * GET `path` and keep the result. With `pollWhile`, refetch every `intervalMs` while it
 * returns true (e.g. while something is generating). Stops on unmount or path change.
 */
export function useApi<T>(
  path: string | null,
  opts: { pollWhile?: (d: T) => boolean; intervalMs?: number } = {},
) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const pollWhile = useRef(opts.pollWhile);
  const interval = opts.intervalMs ?? 1500;

  useEffect(() => {
    pollWhile.current = opts.pollWhile;
  });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    const load = () => {
      api<T>(path)
        .then((data) => {
          if (cancelled) return;
          setState({ data, error: null, loading: false });
          if (pollWhile.current?.(data)) {
            if (++polls > MAX_POLLS) {
              setState({
                data,
                loading: false,
                error: new ApiError(
                  0,
                  'INTERNAL_ERROR',
                  'This is taking longer than expected. Reload in a minute.',
                ),
              });
              return;
            }
            timer = setTimeout(load, interval);
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const e =
            error instanceof ApiError
              ? error
              : new ApiError(0, 'INTERNAL_ERROR', 'Network error. Check your connection.');
          setState((s) => ({ ...s, error: e, loading: false }));
        });
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [path, tick, interval]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: null, loading: false }), []);
  return { ...state, reload, setData };
}
