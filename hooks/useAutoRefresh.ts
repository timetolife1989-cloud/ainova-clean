/**
 * useAutoRefresh - Központi automatikus frissítés hook
 * 
 * Jellemzők:
 * - Háttérben frissít, nincs loading ugrálás
 * - Konfiguráható intervallum
 * - Tab fókusz esetén azonnal frissít
 * - Soft update: csak ha van új adat, akkor renderel
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshOptions<T> {
  /** Fetch függvény ami az adatot visszaadja */
  fetcher: () => Promise<T>;
  /** Frissítési intervallum milliszekundumban (default: 60000 = 1 perc) */
  interval?: number;
  /** Tab fókusz esetén frissítsen? (default: true) */
  refetchOnFocus?: boolean;
  /** Kezdeti adat (opcionális) */
  initialData?: T;
  /** Összehasonlító függvény - ha igaz, frissít (default: JSON stringify) */
  shouldUpdate?: (oldData: T | null, newData: T) => boolean;
  /** Enabled - letiltható a polling (default: true) */
  enabled?: boolean;
}

interface UseAutoRefreshReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Utolsó frissítés időpontja */
  lastUpdated: Date | null;
  /** Manuális frissítés (loading state-tel) */
  refetch: () => Promise<void>;
  /** Háttér frissítés (loading state nélkül) */
  silentRefetch: () => Promise<void>;
}

export function useAutoRefresh<T>({
  fetcher,
  interval = 60000,
  refetchOnFocus = true,
  initialData,
  shouldUpdate,
  enabled = true,
}: UseAutoRefreshOptions<T>): UseAutoRefreshReturn<T> {
  const [data, setData] = useState<T | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const dataRef = useRef<T | null>(data);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Default shouldUpdate: JSON stringify comparison
  const defaultShouldUpdate = useCallback((oldData: T | null, newData: T): boolean => {
    if (!oldData) return true;
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  }, []);

  const updateChecker = shouldUpdate || defaultShouldUpdate;

  // Silent fetch - háttérben, loading nélkül
  const silentRefetch = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const newData = await fetcher();
      
      // Csak akkor update-elünk ha tényleg változott
      if (updateChecker(dataRef.current, newData)) {
        dataRef.current = newData;
        setData(newData);
        setLastUpdated(new Date());
      }
      setError(null);
    } catch (err) {
      // Háttér hibáknál nem állítjuk be az error state-et
      console.warn('[AutoRefresh] Silent fetch error:', err);
    }
  }, [fetcher, enabled, updateChecker]);

  // Normal fetch - loading state-tel
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newData = await fetcher();
      dataRef.current = newData;
      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  // Kezdeti betöltés
  useEffect(() => {
    if (enabled && !initialData) {
      refetch();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling interval
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    intervalRef.current = setInterval(silentRefetch, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, silentRefetch]);

  // Tab fókusz kezelése
  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const handleFocus = () => {
      silentRefetch();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refetchOnFocus, silentRefetch]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
    silentRefetch,
  };
}

/**
 * usePolling - Egyszerűbb verzió ismétlődő API hívásokhoz
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number = 60000,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      console.error('[Polling] Error:', err);
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    const interval = setInterval(() => fetchData(true), intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [intervalMs, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refetch: () => fetchData(false) };
}
