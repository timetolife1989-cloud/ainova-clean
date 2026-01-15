/**
 * useAutoRefresh - Központi automatikus frissítés hook
 * 
 * Jellemzők:
 * - Háttérben frissít, nincs loading ugrálás (silentRefetch)
 * - Konfiguráható intervallum (default: 1 perc)
 * - Tab fókusz esetén azonnal frissít
 * - Visibility change esetén frissít (pl. tab váltás után visszatérés)
 * - Soft update: csak ha van új adat, akkor renderel (nincs felesleges re-render)
 * - Hash-alapú change detection: gyors összehasonlítás
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Központi konfiguráció - egy helyen módosítható
export const REFRESH_CONFIG = {
  /** Alapértelmezett frissítési intervallum (1 perc) */
  DEFAULT_INTERVAL: 60 * 1000,
  /** Gyors frissítés (30 másodperc) - kritikus adatokhoz */
  FAST_INTERVAL: 30 * 1000,
  /** Lassú frissítés (5 perc) - ritkán változó adatokhoz */
  SLOW_INTERVAL: 5 * 60 * 1000,
} as const;

interface UseAutoRefreshOptions<T> {
  /** Fetch függvény ami az adatot visszaadja */
  fetcher: () => Promise<T>;
  /** Frissítési intervallum milliszekundumban (default: 60000 = 1 perc) */
  interval?: number;
  /** Tab fókusz esetén frissítsen? (default: true) */
  refetchOnFocus?: boolean;
  /** Visibility change esetén frissítsen? (default: true) */
  refetchOnVisibilityChange?: boolean;
  /** Kezdeti adat (opcionális) */
  initialData?: T;
  /** Összehasonlító függvény - ha igaz, frissít (default: JSON stringify) */
  shouldUpdate?: (oldData: T | null, newData: T) => boolean;
  /** Enabled - letiltható a polling (default: true) */
  enabled?: boolean;
  /** Debug mód - logol minden frissítést */
  debug?: boolean;
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
  /** Frissítés folyamatban van-e (silent is) */
  isRefreshing: boolean;
}

export function useAutoRefresh<T>({
  fetcher,
  interval = REFRESH_CONFIG.DEFAULT_INTERVAL,
  refetchOnFocus = true,
  refetchOnVisibilityChange = true,
  initialData,
  shouldUpdate,
  enabled = true,
  debug = false,
}: UseAutoRefreshOptions<T>): UseAutoRefreshReturn<T> {
  const [data, setData] = useState<T | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const dataRef = useRef<T | null>(data);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHashRef = useRef<string>('');
  
  // Fetcher ref - mindig a legfrissebb verziót használja
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Hash számítás gyors összehasonlításhoz
  const computeHash = useCallback((obj: unknown): string => {
    return JSON.stringify(obj);
  }, []);

  // Default shouldUpdate: hash-alapú összehasonlítás
  const defaultShouldUpdate = useCallback((oldData: T | null, newData: T): boolean => {
    if (!oldData) return true;
    const newHash = computeHash(newData);
    if (newHash === lastHashRef.current) return false;
    lastHashRef.current = newHash;
    return true;
  }, [computeHash]);

  const updateChecker = shouldUpdate || defaultShouldUpdate;

  // Silent fetch - háttérben, loading nélkül
  const silentRefetch = useCallback(async () => {
    if (!enabled) return;
    
    setIsRefreshing(true);
    try {
      const newData = await fetcherRef.current();
      
      // Csak akkor update-elünk ha tényleg változott
      if (updateChecker(dataRef.current, newData)) {
        if (debug) console.log('[AutoRefresh] Adat változott, frissítés...');
        dataRef.current = newData;
        setData(newData);
        setLastUpdated(new Date());
      } else if (debug) {
        console.log('[AutoRefresh] Nincs változás');
      }
      setError(null);
    } catch (err) {
      // Háttér hibáknál nem állítjuk be az error state-et
      if (debug) console.warn('[AutoRefresh] Silent fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, updateChecker, debug]);

  // Normal fetch - loading state-tel
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newData = await fetcherRef.current();
      dataRef.current = newData;
      lastHashRef.current = computeHash(newData);
      setData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [computeHash]);

  // Kezdeti betöltés
  useEffect(() => {
    if (enabled && !initialData) {
      refetch();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling interval
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    if (debug) console.log(`[AutoRefresh] Polling indítva: ${interval}ms`);
    intervalRef.current = setInterval(silentRefetch, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, silentRefetch, debug]);

  // Tab fókusz kezelése
  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const handleFocus = () => {
      if (debug) console.log('[AutoRefresh] Tab fókusz - frissítés');
      silentRefetch();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refetchOnFocus, silentRefetch, debug]);

  // Visibility change kezelése (tab váltás után visszatérés)
  useEffect(() => {
    if (!enabled || !refetchOnVisibilityChange) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (debug) console.log('[AutoRefresh] Visibility visible - frissítés');
        silentRefetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refetchOnVisibilityChange, silentRefetch, debug]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
    silentRefetch,
    isRefreshing,
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
