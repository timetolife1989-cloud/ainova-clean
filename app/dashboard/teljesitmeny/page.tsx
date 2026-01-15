'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/dashboard/Header';
import AinovaLoader from '@/components/ui/AinovaLoader';
import { ImportStatusBar } from '@/components/ui/ImportStatusBar';
import { WarRoomSyncAlert } from '@/components/teljesitmeny/WarRoomSyncAlert';
import {
  // Types
  MuszakType,
  KimutatType,
  ViewType,
  EgyeniOperator,
  // Hooks
  useTeljesitmenyData,
  useEgyeniOperatorok,
  useEgyeniTrend,
  usePozicioTrend,
  // Constants
  MUSZAK_COLORS,
  PAGINATION,
  formatDateRange,
  // Components
  MuszakDropdown,
  MuszakButton,
  TeljesitmenyChart,
  ChartLegend,
  TeljesitmenyTable,
  OperatorRanglista,
  EgyeniTrendView,
  PozicioTrendView,
  KategoriaPieChart,
} from '@/components/teljesitmeny';

export default function TeljesitmenyPage() {
  // ============================================================================
  // State - Produktív nézet
  // ============================================================================
  const [activeKimutat, setActiveKimutat] = useState<KimutatType>('napi');
  const [selectedMuszak, setSelectedMuszak] = useState<MuszakType>('SUM');
  const [openDropdown, setOpenDropdown] = useState<KimutatType | null>(null);
  const [offset, setOffset] = useState(0);

  // ============================================================================
  // State - View selection
  // ============================================================================
  const [activeView, setActiveView] = useState<ViewType>('produktiv');

  // ============================================================================
  // State - Egyéni nézet
  // ============================================================================
  const [egyeniMuszak, setEgyeniMuszak] = useState<MuszakType>('A');
  const [egyeniPozicio, setEgyeniPozicio] = useState<string>('Mind');
  const [egyeniSearch, setEgyeniSearch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<EgyeniOperator | null>(null);
  const [egyeniKimutat, setEgyeniKimutat] = useState<KimutatType>('napi');
  const [egyeniOffset, setEgyeniOffset] = useState(0);
  const [openEgyeniDropdown, setOpenEgyeniDropdown] = useState<'pozicio' | null>(null);

  // Pozíció trend state
  const [pozicioKimutat, setPozicioKimutat] = useState<'napi' | 'heti' | 'havi'>('napi');
  const [pozicioOffset, setPozicioOffset] = useState(0);

  // ============================================================================
  // Refs
  // ============================================================================
  const dropdownRefs = useRef<Record<KimutatType, HTMLDivElement | null>>({
    napi: null,
    heti: null,
    havi: null,
  });
  const egyeniDropdownRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Custom Hooks - Data fetching
  // ============================================================================
  const {
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
  } = useTeljesitmenyData({ activeKimutat, selectedMuszak, offset });

  const { operatorok: egyeniOperatorok, loading: egyeniOperatorokLoading } = useEgyeniOperatorok({
    isActive: activeView === 'egyeni',
    muszak: egyeniMuszak,
    pozicio: egyeniPozicio,
    search: egyeniSearch,
  });

  const { trendData: egyeniTrendData, totalItems: egyeniTotalItems, loading: egyeniTrendLoading } = useEgyeniTrend({
    operator: selectedOperator,
    kimutat: egyeniKimutat,
    offset: egyeniOffset,
  });

  // Pozíció trend hook - csak ha van kiválasztott pozíció és nincs operátor kiválasztva
  const { trendData: pozicioTrendData, totalItems: pozicioTotalItems, loading: pozicioTrendLoading } = usePozicioTrend({
    pozicio: egyeniPozicio,
    muszak: egyeniMuszak,
    kimutat: pozicioKimutat,
    offset: pozicioOffset,
    isActive: activeView === 'egyeni' && egyeniPozicio !== 'Mind' && !selectedOperator,
  });

  // ============================================================================
  // Effects - Close dropdowns on outside click
  // ============================================================================
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (egyeniDropdownRef.current && !egyeniDropdownRef.current.contains(event.target as Node)) {
        setOpenEgyeniDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  const handleMuszakSelect = (kimutat: KimutatType, muszak: MuszakType) => {
    setActiveView('produktiv');
    setActiveKimutat(kimutat);
    setSelectedMuszak(muszak);
    setOffset(0);
    setOpenDropdown(null);
    setOpenEgyeniDropdown(null);
  };

  const handleEgyeniMuszakSelect = (muszak: MuszakType) => {
    setEgyeniMuszak(muszak);
    setSelectedOperator(null);
    setOpenDropdown(null);
  };

  const toggleDropdown = (kimutat: KimutatType) => {
    setActiveView('produktiv');
    setOpenDropdown(openDropdown === kimutat ? null : kimutat);
    setOpenEgyeniDropdown(null);
  };

  // ============================================================================
  // Pagination
  // ============================================================================
  const pageSize = PAGINATION[activeKimutat].pageSize;
  const displaySize = PAGINATION[activeKimutat].displaySize;
  const totalItems = activeKimutat === 'napi' ? totalDays : totalWeeks;

  const canGoBack = activeKimutat !== 'havi' && totalItems > offset + displaySize;
  const canGoForward = activeKimutat !== 'havi' && offset > 0;

  const handlePrevious = () => {
    if (canGoBack) setOffset(offset + pageSize);
  };

  const handleNext = () => {
    if (canGoForward) setOffset(Math.max(0, offset - pageSize));
  };

  // ============================================================================
  // Chart Title
  // ============================================================================
  const getMuszakLabel = () => (selectedMuszak === 'SUM' ? 'Összesített' : `${selectedMuszak} műszak`);

  const getKimutatLabel = () => {
    switch (activeKimutat) {
      case 'napi': return 'Napi kimutatás';
      case 'heti': return 'Heti kimutatás';
      case 'havi': return 'Havi kimutatás';
    }
  };

  const getChartTitle = () => {
    if (activeKimutat === 'napi') {
      return `${getKimutatLabel()} - ${getMuszakLabel()} (${formatDateRange(periodStart, periodEnd)})`;
    } else if (activeKimutat === 'heti') {
      return `${getKimutatLabel()} - ${getMuszakLabel()} (Hét ${periodStartWeek} - ${periodEndWeek})`;
    }
    return `${getKimutatLabel()} - ${getMuszakLabel()} (Utolsó 12 hónap)`;
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header pageTitle="Teljesítmény" />

      <main className="p-6 pt-[90px]">
        {/* Import Status Bar */}
        {importStatus && (
          <ImportStatusBar 
            lastImportAt={importStatus.last_import_at}
            recordCount={importStatus.records_imported || 0}
            secondaryLabel="Operátorok"
            secondaryValue={importStatus.unique_operators || 0}
            secondarySuffix="fő"
          />
        )}

        {/* War Room Sync Alert */}
        <div className="mb-4">
          <WarRoomSyncAlert />
        </div>

        {/* Top Controls - 4 szekció: 3 egyforma + 1 kisebb a nyilaknak */}
        <div className="flex items-stretch mb-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
          {/* Left Section: Produktív létszám */}
          <div className={`flex-1 p-4 border-r border-slate-700/50 ${activeView === 'produktiv' ? 'bg-slate-700/20' : 'opacity-60'} first:rounded-l-xl`}>
            <div className="mb-3">
              <h2 className="text-lg font-bold text-white">Produktív létszám vs perc leadások</h2>
              <p className="text-xs text-slate-400">(nem csomagolási perc)</p>
            </div>
            <div className="flex items-center gap-2 relative z-20">
              {(['napi', 'heti', 'havi'] as KimutatType[]).map((kimutat) => (
                <div key={kimutat} ref={(el) => { dropdownRefs.current[kimutat] = el; }}>
                  <MuszakDropdown
                    kimutat={kimutat}
                    label={kimutat === 'napi' ? 'Napi' : kimutat === 'heti' ? 'Heti' : 'Havi'}
                    isOpen={openDropdown === kimutat}
                    isActive={activeKimutat === kimutat}
                    selectedMuszak={selectedMuszak}
                    onToggle={() => toggleDropdown(kimutat)}
                    onSelect={handleMuszakSelect}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Section: Egyéni teljesítmény */}
          <div
            className={`flex-1 p-4 border-r border-slate-700/50 ${activeView === 'egyeni' ? 'bg-slate-700/20' : 'opacity-60'}`}
            ref={egyeniDropdownRef}
          >
            <div className="mb-3">
              <h2 className="text-lg font-bold text-white">Egyéni teljesítmény adatok</h2>
              <p className="text-xs text-slate-400">Operátoronkénti kimutatás</p>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              {/* Műszak gombok */}
              {(['A', 'B', 'C', 'SUM'] as MuszakType[]).map((muszak) => (
                <MuszakButton
                  key={muszak}
                  muszak={muszak}
                  isSelected={activeView === 'egyeni' && egyeniMuszak === muszak}
                  onClick={() => {
                    setActiveView('egyeni');
                    handleEgyeniMuszakSelect(muszak);
                  }}
                />
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
                  <svg
                    className={`w-4 h-4 transition-transform ${openEgyeniDropdown === 'pozicio' ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                            setPozicioOffset(0);  // Reset pozíció trend offset
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors text-white ${
                            egyeniPozicio === poz ? 'bg-slate-700' : ''
                          }`}
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

          {/* Pagination arrows - 4. szekció (kisebb) */}
          <div className="flex items-center justify-center px-4 min-w-[100px]">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={!canGoBack}
                className={`p-2 rounded-lg transition-colors ${
                  canGoBack
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
                title="Régebbi időszak"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoForward}
                className={`p-2 rounded-lg transition-colors ${
                  canGoForward
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                }`}
                title="Újabb időszak"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================== */}
        {/* PRODUKTÍV NÉZET */}
        {/* ======================================================================== */}
        {activeView === 'produktiv' && (
          <>
            {/* Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden"
            >
              {/* Chart Header */}
              <div className={`px-6 py-3 bg-gradient-to-r ${MUSZAK_COLORS[selectedMuszak].gradient}`}>
                <h2 className="text-lg font-bold text-white">{getChartTitle()}</h2>
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
                  <TeljesitmenyChart data={chartData} selectedMuszak={selectedMuszak} />
                )}

                {/* Kategória Pie Chart - leadott percek bontása */}
                {!loading && !error && chartData.length > 0 && (
                  <KategoriaPieChart 
                    viewType={activeKimutat} 
                    selectedMuszak={selectedMuszak}
                    availableDates={chartData.filter(d => d.datum).map(d => d.datum!)}
                  />
                )}
              </div>

              {/* Jelmagyarázat eltávolítva - a kördiagram jobb oldali listája helyettesíti */}
            </motion.div>

            {/* Data Table */}
            {!loading && !error && chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden"
              >
                <TeljesitmenyTable
                  data={chartData}
                  selectedMuszak={selectedMuszak}
                  activeKimutat={activeKimutat}
                />
              </motion.div>
            )}
          </>
        )}

        {/* ======================================================================== */}
        {/* EGYÉNI NÉZET */}
        {/* ======================================================================== */}
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
              {egyeniOperatorokLoading && !selectedOperator ? (
                <div className="h-[450px] flex items-center justify-center">
                  <AinovaLoader />
                </div>
              ) : !selectedOperator ? (
                <>
                  <OperatorRanglista
                    operatorok={egyeniOperatorok}
                    onSelectOperator={(op) => {
                      setSelectedOperator(op);
                      setEgyeniOffset(0);
                    }}
                  />
                  {/* Pozíció trend diagram - csak ha van pozíció kiválasztva */}
                  {egyeniPozicio !== 'Mind' && (
                    <PozicioTrendView
                      pozicio={egyeniPozicio}
                      trendData={pozicioTrendData}
                      kimutat={pozicioKimutat}
                      offset={pozicioOffset}
                      totalItems={pozicioTotalItems}
                      loading={pozicioTrendLoading}
                      onKimutatChange={(k) => {
                        setPozicioKimutat(k);
                        setPozicioOffset(0);
                      }}
                      onOffsetChange={setPozicioOffset}
                    />
                  )}
                </>
              ) : (
                <EgyeniTrendView
                  operator={selectedOperator}
                  trendData={egyeniTrendData}
                  kimutat={egyeniKimutat}
                  offset={egyeniOffset}
                  totalItems={egyeniTotalItems}
                  loading={egyeniTrendLoading}
                  onKimutatChange={(k) => {
                    setEgyeniKimutat(k);
                    setEgyeniOffset(0);
                  }}
                  onOffsetChange={setEgyeniOffset}
                />
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
