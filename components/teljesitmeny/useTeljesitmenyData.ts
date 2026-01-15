'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { REFRESH_CONFIG } from '@/hooks';
import {
  NapiData,
  HetiData,
  HaviData,
  ChartDataItem,
  MuszakType,
  KimutatType,
  ImportStatus,
} from './types';

interface UseTeljesitmenyDataReturn {
  // Data
  chartData: ChartDataItem[];
  loading: boolean;
  error: string | null;
  
  // Pagination info
  totalDays: number;
  totalWeeks: number;
  periodStart: string;
  periodEnd: string;
  periodStartWeek: number;
  periodEndWeek: number;
  
  // Import status
  importStatus: ImportStatus | null;
  
  // Pozíciók
  poziciok: string[];
  
  // Refetch
  refetch: () => void;
}

interface UseTeljesitmenyDataParams {
  activeKimutat: KimutatType;
  selectedMuszak: MuszakType;
  offset: number;
}

export function useTeljesitmenyData({
  activeKimutat,
  selectedMuszak,
  offset,
}: UseTeljesitmenyDataParams): UseTeljesitmenyDataReturn {
  const [data, setData] = useState<NapiData[]>([]);
  const [hetiData, setHetiData] = useState<HetiData[]>([]);
  const [haviData, setHaviData] = useState<HaviData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [totalDays, setTotalDays] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(0);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodStartWeek, setPeriodStartWeek] = useState(0);
  const [periodEndWeek, setPeriodEndWeek] = useState(0);
  
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [poziciok, setPoziciok] = useState<string[]>(['Mind']);

  // Fetch main data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      
      if (activeKimutat === 'napi') {
        endpoint = `/api/teljesitmeny?type=napi-kimutatas&muszak=${selectedMuszak}&offset=${offset}`;
      } else if (activeKimutat === 'heti') {
        endpoint = `/api/teljesitmeny?type=heti-kimutatas&muszak=${selectedMuszak}&offset=${offset}`;
      } else if (activeKimutat === 'havi') {
        endpoint = `/api/teljesitmeny?type=havi-kimutatas&muszak=${selectedMuszak}`;
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Hiba az adatok betöltésekor');
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (activeKimutat === 'napi') {
        setData(result.data || []);
        setHetiData([]);
        setHaviData([]);
        if (result.data && result.data.length > 0) {
          setTotalDays(result.data[0].total_days);
          setPeriodStart(result.data[0].period_start);
          setPeriodEnd(result.data[0].period_end);
        }
      } else if (activeKimutat === 'heti') {
        setHetiData(result.data || []);
        setData([]);
        setHaviData([]);
        if (result.data && result.data.length > 0) {
          setTotalWeeks(result.data[0].total_weeks);
          setPeriodStartWeek(result.data[0].period_start_week);
          setPeriodEndWeek(result.data[0].period_end_week);
        }
      } else if (activeKimutat === 'havi') {
        setHaviData(result.data || []);
        setData([]);
        setHetiData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
      setData([]);
      setHetiData([]);
      setHaviData([]);
    } finally {
      setLoading(false);
    }
  }, [activeKimutat, selectedMuszak, offset]);

  // Fetch pozíciók - csak produktív kategória + Megadandó
  useEffect(() => {
    const fetchPoziciok = async () => {
      try {
        // Szűrés: csak Produktív kategória + null (Megadandó)
        const response = await fetch('/api/poziciok?onlyProduktiv=true');
        if (response.ok) {
          const result = await response.json();
          const dbPoziciok = (result.data || []).map((p: { nev: string }) => p.nev);
          if (dbPoziciok.length === 0) {
            setPoziciok(['Mind', 'Előkészítő', 'Végszerelő', 'LaC szerelő', 'Csomagoló']);
          } else {
            setPoziciok(['Mind', ...dbPoziciok]);
          }
        }
      } catch (err) {
        console.error('Hiba a pozíciók betöltésekor:', err);
        setPoziciok(['Mind', 'Szerelő', 'Betanított munkás', 'Gépkezelő', 'Csoportvezető']);
      }
    };
    fetchPoziciok();
  }, []);

  // Fetch import status
  useEffect(() => {
    const fetchImportStatus = async () => {
      try {
        const response = await fetch('/api/teljesitmeny/import');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.stats) {
            setImportStatus({
              last_import_at: result.stats.last_import,
              records_imported: result.stats.total_records,
              unique_operators: result.stats.unique_operators,
            });
          }
        }
      } catch (err) {
        console.error('Hiba az import státusz betöltésekor:', err);
      }
    };
    fetchImportStatus();
  }, []);

  // Main data fetch effect
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automatikus háttér frissítés (silent, nincs loading ugrálás)
  useEffect(() => {
    const silentRefetch = async () => {
      try {
        let endpoint = '';
        
        if (activeKimutat === 'napi') {
          endpoint = `/api/teljesitmeny?type=napi-kimutatas&muszak=${selectedMuszak}&offset=${offset}`;
        } else if (activeKimutat === 'heti') {
          endpoint = `/api/teljesitmeny?type=heti-kimutatas&muszak=${selectedMuszak}&offset=${offset}`;
        } else if (activeKimutat === 'havi') {
          endpoint = `/api/teljesitmeny?type=havi-kimutatas&muszak=${selectedMuszak}`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) return;
        
        const result = await response.json();
        if (result.error) return;

        // Silent update - nincs setLoading!
        if (activeKimutat === 'napi') {
          setData(result.data || []);
          if (result.data && result.data.length > 0) {
            setTotalDays(result.data[0].total_days);
            setPeriodStart(result.data[0].period_start);
            setPeriodEnd(result.data[0].period_end);
          }
        } else if (activeKimutat === 'heti') {
          setHetiData(result.data || []);
          if (result.data && result.data.length > 0) {
            setTotalWeeks(result.data[0].total_weeks);
            setPeriodStartWeek(result.data[0].period_start_week);
            setPeriodEndWeek(result.data[0].period_end_week);
          }
        } else if (activeKimutat === 'havi') {
          setHaviData(result.data || []);
        }
      } catch {
        // Silent - nem mutatunk hibát
      }
    };

    const interval = setInterval(silentRefetch, REFRESH_CONFIG.DEFAULT_INTERVAL);
    
    // Tab fókusz + visibility change esetén is frissítünk
    const handleFocus = () => silentRefetch();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentRefetch();
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeKimutat, selectedMuszak, offset]);

  // Transform data to unified chart format
  const chartData: ChartDataItem[] = 
    activeKimutat === 'napi'
      ? data.map(d => ({
          datum: d.datum,  // Eredeti dátum YYYY-MM-DD
          datum_label: d.datum_label,
          nap_nev: d.nap_nev,
          letszam: d.letszam,
          cel_perc: d.cel_perc,
          leadott_perc: d.leadott_perc,
          szazalek: d.szazalek,
          // War Room adatok
          visszajelentes_letszam: d.visszajelentes_letszam,
          netto_letszam: d.netto_letszam,
          netto_cel_perc: d.netto_cel_perc,
          netto_szazalek: d.netto_szazalek,
          has_warroom_data: d.has_warroom_data,
        }))
      : activeKimutat === 'heti'
        ? hetiData.map(h => ({
            datum_label: h.het_label,
            nap_nev: `${h.munkanapok} munkanap`,
            letszam: h.letszam,
            cel_perc: h.cel_perc,
            leadott_perc: h.leadott_perc,
            szazalek: h.szazalek,
          }))
        : haviData.map(h => ({
            datum_label: h.honap_label,
            nap_nev: `${h.munkanapok} munkanap`,
            letszam: h.letszam,
            cel_perc: h.cel_perc,
            leadott_perc: h.leadott_perc,
            szazalek: h.szazalek,
          }));

  return {
    chartData,
    loading,
    error,
    totalDays,
    totalWeeks,
    periodStart,
    periodEnd,
    periodStartWeek,
    periodEndWeek,
    importStatus,
    poziciok,
    refetch: fetchData,
  };
}
