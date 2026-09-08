// React hooks for API data fetching with mock-data fallback
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** Tracks whether the API is reachable. Shared across all hooks. */
let globalDemoMode: boolean | null = null;
const demoModeListeners = new Set<(v: boolean) => void>();

function setDemoMode(v: boolean) {
  if (globalDemoMode === v) return;
  globalDemoMode = v;
  demoModeListeners.forEach((fn) => fn(v));
}

export function useDemoMode(): boolean {
  const [demo, setDemo] = useState(globalDemoMode ?? false);

  useEffect(() => {
    const handler = (v: boolean) => setDemo(v);
    demoModeListeners.add(handler);
    return () => {
      demoModeListeners.delete(handler);
    };
  }, []);

  return demo;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isDemo: boolean;
}

/**
 * Generic hook that tries the API first; on network failure falls back to
 * the provided mock data and sets the global demo-mode flag.
 */
export function useApi<T>(
  apiFn: () => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsDemo(false);

    try {
      const result = await apiFn();
      if (!mountedRef.current) return;
      setData(result);
      setDemoMode(false);
    } catch (err) {
      if (!mountedRef.current) return;

      // Network error (API unreachable) -- fall back to mock data
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          err.message.includes("fetch") &&
          !err.message.includes("API error"));

      if (isNetworkError) {
        setData(fallback);
        setIsDemo(true);
        setDemoMode(true);
      } else {
        // API returned an error response -- show error, use empty/null data
        setError(
          err instanceof Error ? err.message : "Unknown error",
        );
        setData(null);
        setIsDemo(false);
        setDemoMode(false);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, isDemo };
}
