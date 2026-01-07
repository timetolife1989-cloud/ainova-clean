'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Header from '@/components/dashboard/Header';
import AinovaLoader from '@/components/ui/AinovaLoader';

// Types
interface NapiData {
  datum: string;
  datum_label: string;
  nap_nev: string;
  muszak: string;
  letszam: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  period_start: string;
  period_end: string;
  total_days: number;
}

// Heti adat interface
interface HetiData {
  ev: number;
  het_szam: number;
  het_label: string;
  het_eleje: string;
  het_vege: string;
  muszak: string;
  letszam: number;
  munkanapok: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  period_start_week: number;
  period_end_week: number;
  total_weeks: number;
}

// Havi adat interface
interface HaviData {
  ev: number;
  honap_szam: number;
  honap_label: string;
  honap_eleje: string;
  honap_vege: string;
  muszak: string;
  letszam: number;
  munkanapok: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  total_months: number;
}

type MuszakType = 'A' | 'B' | 'C' | 'SUM';
type KimutatType = 'napi' | 'heti' | 'havi';
type ViewType = 'produktiv' | 'egyeni';

// Egyéni teljesítmény interfaces
interface EgyeniOperator {
  torzsszam: string;
  nev: string;
  pozicio: string;
  muszak: string;
  munkanapok: number;
  ossz_perc: number;
  atlag_szazalek: number;
  trend: 'up' | 'down' | 'stable';
}

interface EgyeniTrendData {
  datum_label: string;
  datum?: string;
  leadott_perc: number;
  cel_perc: number;
  szazalek: number;
  munkanapok?: number;
  total_days?: number;
  total_weeks?: number;
  total_months?: number;
}

// Colors for műszakok
const MUSZAK_COLORS: Record<MuszakType, { bar: string; gradient: string }> = {
  A: { bar: '#3B82F6', gradient: 'from-blue-500 to-blue-700' },
  B: { bar: '#10B981', gradient: 'from-emerald-500 to-emerald-700' },
  C: { bar: '#F97316', gradient: 'from-orange-500 to-orange-700' },
  SUM: { bar: '#64748B', gradient: 'from-slate-500 to-slate-700' },
};

// Helper to format date range for title
const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const format = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `${format(startDate)} - ${format(endDate)}`;
};

// Import status interface
interface ImportStatus {
  last_import_at: string | null;
  records_imported: number;
  unique_operators: number;
}

export default function TeljesitmenyPage() {
  // State - Produktív nézet
  const [activeKimutat, setActiveKimutat] = useState<KimutatType>('napi');
  const [selectedMuszak, setSelectedMuszak] = useState<MuszakType>('SUM');
  const [openDropdown, setOpenDropdown] = useState<KimutatType | null>(null);
  const [offset, setOffset] = useState(0);
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

  // State - Import status
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);

  // State - View selection (produktív / egyéni)
  const [activeView, setActiveView] = useState<ViewType>('produktiv');

  // State - Egyéni nézet
  const [egyeniMuszak, setEgyeniMuszak] = useState<MuszakType>('A');
  const [egyeniPozicio, setEgyeniPozicio] = useState<string>('Mind');
  const [egyeniSearch, setEgyeniSearch] = useState('');
  const [egyeniOperatorok, setEgyeniOperatorok] = useState<EgyeniOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<EgyeniOperator | null>(null);
  const [egyeniTrendData, setEgyeniTrendData] = useState<EgyeniTrendData[]>([]);
  const [egyeniKimutat, setEgyeniKimutat] = useState<KimutatType>('napi');
  const [egyeniOffset, setEgyeniOffset] = useState(0);
  const [egyeniTotalItems, setEgyeniTotalItems] = useState(0);
  const [egyeniLoading, setEgyeniLoading] = useState(false);
  const [poziciok, setPoziciok] = useState<string[]>(['Mind']);
  const [openEgyeniDropdown, setOpenEgyeniDropdown] = useState<'pozicio' | null>(null);

  const dropdownRefs = useRef<Record<KimutatType, HTMLDivElement | null>>({
    napi: null,
    heti: null,
    havi: null,
  });

  const egyeniDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(
        (ref) => !ref || !ref.contains(event.target as Node)
      );
      if (clickedOutside) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeKimutat === 'napi') {
          const response = await fetch(
            `/api/teljesitmeny?type=napi-kimutatas&muszak=${selectedMuszak}&offset=${offset}`
          );
          if (!response.ok) {
            throw new Error('Hiba az adatok betöltésekor');
          }
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          }
          setData(result.data || []);
          setHetiData([]);
          setHaviData([]);
          if (result.data && result.data.length > 0) {
            setTotalDays(result.data[0].total_days);
            setPeriodStart(result.data[0].period_start);
            setPeriodEnd(result.data[0].period_end);
          }
        } else if (activeKimutat === 'heti') {
          const response = await fetch(
            `/api/teljesitmeny?type=heti-kimutatas&muszak=${selectedMuszak}&offset=${offset}`
          );
          if (!response.ok) {
            throw new Error('Hiba az adatok betöltésekor');
          }
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          }
          setHetiData(result.data || []);
          setData([]);
          setHaviData([]);
          if (result.data && result.data.length > 0) {
            setTotalWeeks(result.data[0].total_weeks);
            setPeriodStartWeek(result.data[0].period_start_week);
            setPeriodEndWeek(result.data[0].period_end_week);
          }
        } else if (activeKimutat === 'havi') {
          const response = await fetch(
            `/api/teljesitmeny?type=havi-kimutatas&muszak=${selectedMuszak}`
          );
          if (!response.ok) {
            throw new Error('Hiba az adatok betöltésekor');
          }
          const result = await response.json();
          if (result.error) {
            throw new Error(result.error);
          }
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
    };
    fetchData();
  }, [selectedMuszak, offset, activeKimutat]);

  // Fetch pozíciók (munkakörök)
  useEffect(() => {
    const fetchPoziciok = async () => {
      try {
        const response = await fetch('/api/poziciok');
        if (response.ok) {
          const result = await response.json();
          const dbPoziciok = (result.data || []).map((p: { nev: string }) => p.nev);
          // Ha nincs adat az adatbázisban, alapértelmezett munkakörök
          if (dbPoziciok.length === 0) {
            setPoziciok(['Mind', 'Szerelő', 'Betanított munkás', 'Gépkezelő', 'Csoportvezető']);
          } else {
            setPoziciok(['Mind', ...dbPoziciok]);
          }
        }
      } catch (err) {
        console.error('Hiba a pozíciók betöltésekor:', err);
        // Fallback
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

  // Fetch egyéni operátorok
  useEffect(() => {
    if (activeView !== 'egyeni') return;

    const fetchEgyeniOperatorok = async () => {
      setEgyeniLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'egyeni-ranglista',
          muszak: egyeniMuszak,
        });
        if (egyeniPozicio !== 'Mind') {
          params.append('pozicio', egyeniPozicio);
        }
        if (egyeniSearch) {
          params.append('search', egyeniSearch);
        }

        const response = await fetch(`/api/teljesitmeny?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setEgyeniOperatorok(result.data || []);
        }
      } catch (err) {
        console.error('Hiba az egyéni operátorok betöltésekor:', err);
      } finally {
        setEgyeniLoading(false);
      }
    };

    const debounce = setTimeout(fetchEgyeniOperatorok, 300);
    return () => clearTimeout(debounce);
  }, [activeView, egyeniMuszak, egyeniPozicio, egyeniSearch]);

  // Fetch egyéni operátor trend
  useEffect(() => {
    if (!selectedOperator) {
      setEgyeniTrendData([]);
      setEgyeniTotalItems(0);
      return;
    }

    const fetchTrend = async () => {
      setEgyeniLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'egyeni-trend',
          torzsszam: selectedOperator.torzsszam,
          kimutat: egyeniKimutat,
          offset: egyeniOffset.toString(),
        });

        const response = await fetch(`/api/teljesitmeny?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          const items = result.data || [];
          setEgyeniTrendData(items);
          // Set total based on kimutat type
          if (items.length > 0) {
            if (egyeniKimutat === 'napi') {
              setEgyeniTotalItems(items[0].total_days || 0);
            } else if (egyeniKimutat === 'heti') {
              setEgyeniTotalItems(items[0].total_weeks || 0);
            } else {
              setEgyeniTotalItems(items[0].total_months || 0);
            }
          }
        }
      } catch (err) {
        console.error('Hiba a trend betöltésekor:', err);
      } finally {
        setEgyeniLoading(false);
      }
    };

    fetchTrend();
  }, [selectedOperator, egyeniKimutat, egyeniOffset]);

  // Close egyeni dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (egyeniDropdownRef.current && !egyeniDropdownRef.current.contains(event.target as Node)) {
        setOpenEgyeniDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle műszak selection from dropdown
  const handleMuszakSelect = (kimutat: KimutatType, muszak: MuszakType) => {
    setActiveView('produktiv');
    setActiveKimutat(kimutat);
    setSelectedMuszak(muszak);
    setOffset(0);
    setOpenDropdown(null);
    setOpenEgyeniDropdown(null); // Egyéni dropdown bezárása
  };

  // Handle egyéni műszak selection
  const handleEgyeniMuszakSelect = (muszak: MuszakType) => {
    setEgyeniMuszak(muszak);
    setSelectedOperator(null);
    setOpenDropdown(null); // Produktív dropdown bezárása
  };

  // Toggle dropdown
  const toggleDropdown = (kimutat: KimutatType) => {
    setActiveView('produktiv'); // Váltás produktív nézetre
    setOpenDropdown(openDropdown === kimutat ? null : kimutat);
    setOpenEgyeniDropdown(null); // Egyéni dropdown bezárása
  };

  // Pagination - napi: 20-asával, heti: 1-esével, havi: nincs lapozás
  const pageSize = activeKimutat === 'napi' ? 20 : 1;
  const totalItems = activeKimutat === 'napi' ? totalDays : totalWeeks;
  const displaySize = activeKimutat === 'napi' ? 20 : 12;
  
  // Havinál nincs lapozás
  const canGoBack = activeKimutat !== 'havi' && totalItems > offset + displaySize;
  const canGoForward = activeKimutat !== 'havi' && offset > 0;

  const handlePrevious = () => {
    if (canGoBack) setOffset(offset + pageSize);
  };

  const handleNext = () => {
    if (canGoForward) setOffset(Math.max(0, offset - pageSize));
  };

  // Chart title
  const getMuszakLabel = () => {
    if (selectedMuszak === 'SUM') return 'Összesített';
    return `${selectedMuszak} műszak`;
  };

  const getKimutatLabel = () => {
    switch (activeKimutat) {
      case 'napi': return 'Napi kimutatás';
      case 'heti': return 'Heti kimutatás';
      case 'havi': return 'Havi kimutatás';
    }
  };

  // Chart title - különböző formátum napi vs heti vs havi
  const getChartTitle = () => {
    if (activeKimutat === 'napi') {
      return `${getKimutatLabel()} - ${getMuszakLabel()} (${formatDateRange(periodStart, periodEnd)})`;
    } else if (activeKimutat === 'heti') {
      return `${getKimutatLabel()} - ${getMuszakLabel()} (Hét ${periodStartWeek} - ${periodEndWeek})`;
    } else if (activeKimutat === 'havi' && haviData.length > 0) {
      return `${getKimutatLabel()} - ${getMuszakLabel()} (Utolsó 12 hónap)`;
    }
    return `${getKimutatLabel()} - ${getMuszakLabel()}`;
  };
  const chartTitle = getChartTitle();

  // Unified chart data - napi, heti vagy havi
  const chartData = activeKimutat === 'napi' 
    ? data 
    : activeKimutat === 'heti' 
      ? hetiData.map(h => ({
          ...h,
          datum_label: h.het_label,
          nap_nev: `${h.munkanapok} munkanap`,
        }))
      : haviData.map(h => ({
          ...h,
          datum_label: h.honap_label,
          nap_nev: `${h.munkanapok} munkanap`,
        }));

  // Magyar napnevek
  const getHungarianDayName = (englishDay: string): string => {
    const dayMap: Record<string, string> = {
      'Monday': 'Hétfő',
      'Tuesday': 'Kedd',
      'Wednesday': 'Szerda',
      'Thursday': 'Csütörtök',
      'Friday': 'Péntek',
      'Saturday': 'Szombat',
      'Sunday': 'Vasárnap',
    };
    return dayMap[englishDay] || englishDay;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      const hungarianDay = getHungarianDayName(dataPoint?.nap_nev);
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-bold text-lg mb-3">
            {dataPoint?.datum_label} <span className="text-slate-400 font-normal">({hungarianDay})</span>
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Létszám:</span>
              <span className="text-emerald-400 font-semibold">{dataPoint?.letszam} fő</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Cél perc:</span>
              <span className="text-green-400 font-semibold">{dataPoint?.cel_perc?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-400">Leadott perc:</span>
              <span style={{ color: MUSZAK_COLORS[selectedMuszak].bar }} className="font-semibold">{dataPoint?.leadott_perc?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-6 pt-2 border-t border-slate-700">
              <span className="text-slate-400">Teljesítmény:</span>
              <span className={`font-bold ${dataPoint?.szazalek >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                {dataPoint?.szazalek?.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dropdown button component
  const DropdownButton = ({ kimutat, label }: { kimutat: KimutatType; label: string }) => {
    const isOpen = openDropdown === kimutat;
    const isActive = activeKimutat === kimutat;

    return (
      <div className="relative" ref={(el) => { dropdownRefs.current[kimutat] = el; }}>
        <button
          onClick={() => toggleDropdown(kimutat)}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
            ${isActive
              ? `bg-gradient-to-r ${MUSZAK_COLORS[selectedMuszak].gradient} text-white shadow-lg`
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
          `}
        >
          <span>{label}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-[100]"
            >
              {(['A', 'B', 'C', 'SUM'] as MuszakType[]).map((muszak) => (
                <button
                  key={muszak}
                  onClick={() => handleMuszakSelect(kimutat, muszak)}
                  className={`
                    w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 transition-colors
                    flex items-center gap-3
                    ${activeKimutat === kimutat && selectedMuszak === muszak ? 'bg-slate-700' : ''}
                  `}
                >
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${MUSZAK_COLORS[muszak].gradient}`} />
                  <span className="text-white">
                    {muszak === 'SUM' ? 'Összesített (SUM)' : `${muszak} műszak`}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header pageTitle="Teljesítmény" />

      <main className="p-6 pt-[90px]">
        {/* Import Status Bar */}
        {importStatus && (
          <div className="mb-4 flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">Utolsó szinkronizálás:</span>
                <span className="text-xs text-white font-medium">
                  {importStatus.last_import_at 
                    ? new Date(importStatus.last_import_at).toLocaleString('hu-HU')
                    : 'Nincs adat'}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Rekordok:</span>
                <span className="text-xs text-emerald-400 font-medium">
                  {importStatus.records_imported?.toLocaleString() || 0}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-600" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Operátorok:</span>
                <span className="text-xs text-blue-400 font-medium">
                  {importStatus.unique_operators || 0} fő
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top Controls: Two sections side by side */}
        <div className="flex items-start gap-8 mb-4">
          {/* Left Section: Produktív létszám */}
          <div className={`flex-1 relative z-20 ${activeView === 'produktiv' ? '' : 'opacity-60'}`}>
            <div className="mb-2">
              <h2 className="text-lg font-bold text-white">Produktív létszám vs perc leadások</h2>
              <p className="text-xs text-slate-400">(nem csomagolási perc)</p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownButton kimutat="napi" label="Napi" />
              <DropdownButton kimutat="heti" label="Heti" />
              <DropdownButton kimutat="havi" label="Havi" />
            </div>
          </div>

          {/* Right Section: Egyéni teljesítmény */}
          <div className={`flex-1 relative z-10 ${activeView === 'egyeni' ? '' : 'opacity-60'}`} ref={egyeniDropdownRef}>
            <div className="mb-2">
              <h2 className="text-lg font-bold text-white">Egyéni teljesítmény adatok</h2>
              <p className="text-xs text-slate-400">Operátoronkénti kimutatás</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Műszak gombok */}
              {(['A', 'B', 'C', 'SUM'] as MuszakType[]).map((muszak) => (
                <button
                  key={muszak}
                  onClick={() => {
                    setActiveView('egyeni');
                    handleEgyeniMuszakSelect(muszak);
                  }}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeView === 'egyeni' && egyeniMuszak === muszak
                      ? `bg-gradient-to-r ${MUSZAK_COLORS[muszak].gradient} text-white shadow-lg`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                  `}
                >
                  {muszak === 'SUM' ? 'SUM' : muszak}
                </button>
              ))}
              
              {/* Pozíció dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveView('egyeni');
                    setOpenEgyeniDropdown(openEgyeniDropdown === 'pozicio' ? null : 'pozicio');
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                >
                  <span>{egyeniPozicio}</span>
                  <svg className={`w-4 h-4 transition-transform ${openEgyeniDropdown === 'pozicio' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openEgyeniDropdown === 'pozicio' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-1 left-0 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50 max-h-60 overflow-y-auto min-w-[150px]"
                    >
                      {poziciok.map((poz) => (
                        <button
                          key={poz}
                          onClick={() => {
                            setEgyeniPozicio(poz);
                            setOpenEgyeniDropdown(null);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors text-white ${egyeniPozicio === poz ? 'bg-slate-700' : ''}`}
                        >
                          {poz}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Kereső mező */}
              <input
                type="text"
                placeholder="Törzsszám..."
                value={egyeniSearch}
                onChange={(e) => {
                  setActiveView('egyeni');
                  setEgyeniSearch(e.target.value);
                }}
                onFocus={() => setActiveView('egyeni')}
                className="px-3 py-2 rounded-lg text-sm bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:border-blue-500 focus:outline-none w-32"
              />
            </div>
          </div>

          {/* Pagination arrows (only for produktiv) */}
          {activeView === 'produktiv' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={!canGoBack}
                className={`p-3 rounded-lg transition-colors ${
                  canGoBack
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
                title="Régebbi időszak"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoForward}
                className={`p-3 rounded-lg transition-colors ${
                  canGoForward
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
                title="Újabb időszak"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* PRODUKTÍV NÉZET */}
        {activeView === 'produktiv' && (
          <>
            {/* Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden"
            >
              {/* Chart Header with title */}
              <div className={`px-6 py-3 bg-gradient-to-r ${MUSZAK_COLORS[selectedMuszak].gradient}`}>
            <h2 className="text-lg font-bold text-white">{chartTitle}</h2>
          </div>

          {/* Chart Content */}
          <div className="p-6">
            {loading ? (
              <div className="h-[450px] flex items-center justify-center">
                <AinovaLoader />
              </div>
            ) : error ? (
              <div className="h-[450px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 text-5xl mb-4">⚠️</div>
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[450px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-slate-500 text-5xl mb-4">📊</div>
                  <p className="text-slate-400">Nincs adat a kiválasztott időszakra</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  
                  {/* X Axis - Dates */}
                  <XAxis
                    dataKey="datum_label"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#4B5563' }}
                  />
                  
                  {/* Left Y Axis - Perc */}
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#4B5563' }}
                    tickFormatter={(value) => value.toLocaleString()}
                    label={{
                      value: 'Perc',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#9CA3AF',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  
                  {/* Right Y Axis - Percentage */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#F59E0B"
                    tick={{ fill: '#F59E0B', fontSize: 12 }}
                    tickLine={{ stroke: '#F59E0B' }}
                    domain={[0, 150]}
                    tickFormatter={(value) => `${value}%`}
                    label={{
                      value: 'Teljesítmény %',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#F59E0B',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  
                  {/* Bars - Leadott perc with blue styling */}
                  <defs>
                    <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.85} />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
                    </filter>
                  </defs>
                  <Bar
                    yAxisId="left"
                    dataKey="leadott_perc"
                    name="Leadott perc"
                    fill="url(#barGradientBlue)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    radius={[6, 6, 0, 0]}
                    style={{ filter: 'url(#shadow)' }}
                  />
                  
                  {/* Line - Cél perc (dotted green) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cel_perc"
                    name="Cél perc"
                    stroke="#22C55E"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={false}
                  />
                  
                  {/* Line with dots - Percentage (orange) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="szazalek"
                    name="Teljesítmény %"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 0, r: 5 }}
                    activeDot={{ fill: '#FBBF24', strokeWidth: 0, r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend description */}
          <div className="px-6 pb-6">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-4 rounded"
                  style={{ backgroundColor: MUSZAK_COLORS[selectedMuszak].bar, opacity: 0.8 }}
                />
                <span>Leadott perc (oszlop)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '3px dashed #22C55E' }} />
                <span>Cél perc = létszám × 480 (szaggatott vonal)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Teljesítmény % (pont)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data Table */}
        {!loading && !error && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {activeKimutat === 'napi' ? 'Dátum' : activeKimutat === 'heti' ? 'Hét' : 'Hónap'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {activeKimutat === 'napi' ? 'Nap' : 'Munkanapok'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Létszám</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-green-400 uppercase tracking-wider">Cél perc</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}>Leadott</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-blue-400 uppercase tracking-wider">Teljesítmény</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {chartData.map((row, idx) => (
                    <tr
                      key={row.datum_label + '-' + idx}
                      className={`hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}`}
                    >
                      <td className="px-4 py-2.5 text-sm text-white font-medium">{row.datum_label}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">
                        {activeKimutat === 'napi' ? getHungarianDayName(row.nap_nev) : row.nap_nev}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-300 text-right">{row.letszam}</td>
                      <td className="px-4 py-2.5 text-sm text-green-400 text-right font-medium">{row.cel_perc.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-medium" style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}>{row.leadott_perc.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.szazalek >= 100 ? 'bg-green-500/20 text-green-400' : row.szazalek >= 80 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {row.szazalek.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900/80 border-t-2 border-slate-600">
                    <td className="px-4 py-3 text-sm font-bold text-white" colSpan={2}>Összesen</td>
                    <td className="px-4 py-3 text-sm text-slate-300 text-right font-bold">-</td>
                    <td className="px-4 py-3 text-sm text-green-400 text-right font-bold">{chartData.reduce((s, d) => s + d.cel_perc, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold" style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}>{chartData.reduce((s, d) => s + d.leadott_perc, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                        {(chartData.reduce((s, d) => s + d.szazalek, 0) / chartData.length).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
          </>
        )}

        {/* EGYÉNI NÉZET */}
        {activeView === 'egyeni' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className={`px-6 py-3 bg-gradient-to-r ${MUSZAK_COLORS[egyeniMuszak].gradient}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {selectedOperator ? `${selectedOperator.nev} - Teljesítmény trend` : 'Operátor ranglista'}
                </h2>
                {selectedOperator && (
                  <button
                    onClick={() => setSelectedOperator(null)}
                    className="text-white/80 hover:text-white flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Vissza a listához
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {egyeniLoading ? (
                <div className="h-[450px] flex items-center justify-center">
                  <AinovaLoader />
                </div>
              ) : !selectedOperator ? (
                /* Ranglista táblázat */
                <div className="overflow-x-auto">
                  {egyeniOperatorok.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-slate-500 text-5xl mb-4">👷</div>
                        <p className="text-slate-400">Nincs operátor a szűrési feltételekhez</p>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900/80">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Törzsszám</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Név</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Műszak</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pozíció</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Munkanapok</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Átlag %</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Részletek</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {egyeniOperatorok.map((op, idx) => (
                          <tr
                            key={op.torzsszam}
                            className={`hover:bg-slate-700/30 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}`}
                            onClick={() => {
                              setSelectedOperator(op);
                              setEgyeniOffset(0);
                            }}
                          >
                            <td className="px-4 py-2.5 text-sm text-slate-500 font-medium">{idx + 1}.</td>
                            <td className="px-4 py-2.5 text-sm text-slate-300 font-mono">{op.torzsszam}</td>
                            <td className="px-4 py-2.5 text-sm text-white font-medium">{op.nev}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                op.muszak === 'A' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' :
                                op.muszak === 'B' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' :
                                op.muszak === 'C' ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/50' :
                                'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/50'
                              }`}>
                                {op.muszak}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-400">{op.pozicio}</td>
                            <td className="px-4 py-2.5 text-center text-sm text-slate-400">{op.munkanapok} nap</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                op.atlag_szazalek >= 100 ? 'bg-green-500/20 text-green-400' : 
                                op.atlag_szazalek >= 80 ? 'bg-yellow-500/20 text-yellow-400' : 
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {op.atlag_szazalek.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-xl ${
                                op.trend === 'up' ? 'text-green-400' : 
                                op.trend === 'down' ? 'text-red-400' : 
                                'text-slate-400'
                              }`}>
                                {op.trend === 'up' ? '↗' : op.trend === 'down' ? '↘' : '→'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <button className="text-blue-400 hover:text-blue-300 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                /* Egyéni operátor trend diagram */
                <div>
                  {/* Kimutat buttons + Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {(['napi', 'heti', 'havi'] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => {
                            setEgyeniKimutat(k);
                            setEgyeniOffset(0); // Reset offset on kimutat change
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            egyeniKimutat === k
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {k === 'napi' ? 'Napi' : k === 'heti' ? 'Heti' : 'Havi'}
                        </button>
                      ))}
                    </div>
                    
                    {/* Navigation arrows - only for napi and heti */}
                    {egyeniKimutat !== 'havi' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const pageSize = egyeniKimutat === 'napi' ? 20 : 12;
                            if (egyeniTotalItems > egyeniOffset + pageSize) {
                              setEgyeniOffset(egyeniOffset + pageSize);
                            }
                          }}
                          disabled={egyeniTotalItems <= egyeniOffset + (egyeniKimutat === 'napi' ? 20 : 12)}
                          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Régebbi"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-slate-400 text-sm px-2">
                          {egyeniKimutat === 'napi' 
                            ? `${Math.min(egyeniOffset + 20, egyeniTotalItems)} / ${egyeniTotalItems} nap`
                            : `${Math.min(egyeniOffset + 12, egyeniTotalItems)} / ${egyeniTotalItems} hét`
                          }
                        </span>
                        <button
                          onClick={() => {
                            const pageSize = egyeniKimutat === 'napi' ? 20 : 12;
                            setEgyeniOffset(Math.max(0, egyeniOffset - pageSize));
                          }}
                          disabled={egyeniOffset === 0}
                          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Újabb"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-slate-400 text-xs mb-1">Törzsszám</div>
                      <div className="text-white font-mono text-lg">{selectedOperator.torzsszam}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-slate-400 text-xs mb-1">Pozíció</div>
                      <div className="text-white text-lg">{selectedOperator.pozicio}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-slate-400 text-xs mb-1">Átlag teljesítmény</div>
                      <div className={`text-lg font-bold ${
                        selectedOperator.atlag_szazalek >= 100 ? 'text-green-400' :
                        selectedOperator.atlag_szazalek >= 80 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {selectedOperator.atlag_szazalek.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Trend chart */}
                  {egyeniTrendData.length === 0 ? (
                    <div className="h-[350px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-slate-500 text-5xl mb-4">📈</div>
                        <p className="text-slate-400">Nincs trend adat</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={egyeniTrendData} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                          <defs>
                            <linearGradient id="egyeniBarGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.85} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="datum_label"
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                          />
                          {/* Left Y Axis - Perc */}
                          <YAxis
                            yAxisId="left"
                            stroke="#9CA3AF"
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            tickFormatter={(value) => value.toLocaleString()}
                            label={{
                              value: 'Perc',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#9CA3AF',
                              style: { textAnchor: 'middle' },
                            }}
                          />
                          {/* Right Y Axis - Percentage */}
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#F59E0B"
                            tick={{ fill: '#F59E0B', fontSize: 12 }}
                            domain={[0, 150]}
                            tickFormatter={(value) => `${value}%`}
                            label={{
                              value: 'Teljesítmény %',
                              angle: 90,
                              position: 'insideRight',
                              fill: '#F59E0B',
                              style: { textAnchor: 'middle' },
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1E293B',
                              border: '1px solid #475569',
                              borderRadius: '8px',
                              color: '#F8FAFC',
                            }}
                            formatter={(value, name) => {
                              const val = Number(value) || 0;
                              if (name === 'leadott_perc') return [`${val.toLocaleString()} perc`, 'Leadott perc'];
                              if (name === 'cel_perc') return [`${val.toLocaleString()} perc`, 'Cél perc'];
                              if (name === 'szazalek') return [`${val.toFixed(1)}%`, 'Teljesítmény'];
                              return [val, name];
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => (
                              <span className="text-slate-300">
                                {value === 'leadott_perc' ? 'Leadott perc' : 
                                 value === 'cel_perc' ? 'Cél perc (480/nap)' :
                                 value === 'szazalek' ? 'Teljesítmény %' : value}
                              </span>
                            )}
                          />
                          {/* Bars - Leadott perc */}
                          <Bar
                            yAxisId="left"
                            dataKey="leadott_perc"
                            name="leadott_perc"
                            fill="url(#egyeniBarGradient)"
                            stroke="#2563EB"
                            strokeWidth={2}
                            radius={[6, 6, 0, 0]}
                          />
                          {/* Line - Cél perc (dotted green) */}
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cel_perc"
                            name="cel_perc"
                            stroke="#22C55E"
                            strokeWidth={3}
                            strokeDasharray="8 4"
                            dot={false}
                          />
                          {/* Line with dots - Percentage (orange) */}
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="szazalek"
                            name="szazalek"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            dot={{ fill: '#F59E0B', strokeWidth: 0, r: 5 }}
                            activeDot={{ fill: '#FBBF24', strokeWidth: 0, r: 7 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      
                      {/* Legend description */}
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-4 rounded bg-blue-500/80" />
                          <span>Leadott perc (oszlop)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-0.5 bg-green-500" style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: '#22C55E' }} />
                          <span>Cél perc - 480/nap (szaggatott)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Teljesítmény % (vonal)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
