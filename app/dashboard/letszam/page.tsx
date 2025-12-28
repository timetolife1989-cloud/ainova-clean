'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard';
import MuszakSelector from '@/components/letszam/MuszakSelector';
import DateSelector from '@/components/letszam/DateSelector';
import LetszamTable from '@/components/letszam/LetszamTable';
import type { LetszamRow } from '@/components/letszam/types';
import LetszamSummary from '@/components/letszam/LetszamSummary';
import KritikusPozicioModal from '@/components/letszam/KritikusPozicioModal';

// Position definitions
const OPERATIV_POZICIOK = [
  'Huzalos tekercselő',
  'Fóliás tekercselő',
  'Előkészítő',
  'LaC szerelő',
  'Lézervágó',
  'Maró-ónozó',
  'DC szerelő',
  'Mérő',
  'Impregnáló',
  'Végszerelő',
  'Csomagoló',
];

const NEM_OPERATIV_POZICIOK = [
  'Műszakvezető',
  'Előmunkás',
  'Gyártásszervező',
  'Minőségellenőr',
];

const KRITIKUS_POZICIOK = ['Mérő', 'Csomagoló', 'Minőségellenőr'];

// API Response Types
interface LetszamApiResponse {
  success: boolean;
  data?: {
    operativ: LetszamRow[];
    nemOperativ: LetszamRow[];
  };
  error?: string;
}

// Helper to format date safely without timezone issues
// Using local date components instead of toISOString() which can shift days
const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Default factory functions for clean initial state
const createDefaultOperativ = (): LetszamRow[] =>
  OPERATIV_POZICIOK.map((p) => ({
    pozicio: p,
    megjelent: 0,
    tappenz: 0,
    szabadsag: 0,
    hianyzasPercent: 0,
  }));

const createDefaultNemOperativ = (): LetszamRow[] =>
  NEM_OPERATIV_POZICIOK.map((p) => ({
    pozicio: p,
    megjelent: 0,
    tappenz: 0,
    szabadsag: 0,
    hianyzasPercent: 0,
  }));

export default function LetszamPage() {
  const router = useRouter();

  // Separate state for datum/muszak and data (no nested object conflict)
  const [selectedDatum, setSelectedDatum] = useState<Date>(new Date());
  const [selectedMuszak, setSelectedMuszak] = useState<'A' | 'B' | 'C'>('A');
  const [operativData, setOperativData] = useState<LetszamRow[]>(createDefaultOperativ());
  const [nemOperativData, setNemOperativData] = useState<LetszamRow[]>(createDefaultNemOperativ());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Track request sequence to prevent out-of-order responses
  const requestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal state
  const [showKritikusModal, setShowKritikusModal] = useState(false);
  const [kritikusHianyList, setKritikusHianyList] = useState<
    { pozicio: string; count: number }[]
  >([]);

  // Typed fetch wrapper for API calls
  const fetchLetszamData = async (
    datum: string,
    muszak: string,
    signal: AbortSignal
  ): Promise<LetszamApiResponse> => {
    try {
      const response = await fetch(`/api/letszam?datum=${datum}&muszak=${muszak}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // API exists but returned error
        if (response.status === 404) {
          // API not implemented yet - return success with default data
          return { success: true };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }
        
        // Check if it's a fetch error (API doesn't exist)
        if (error.message.includes('fetch')) {
          // API not implemented yet - return success with no data (will use defaults)
          return { success: true };
        }
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching létszám data:', error);
      }
      
      return { success: false, error: String(error) };
    }
  };

  // useEffect with AbortController cleanup (prevents race conditions and memory leaks)
  useEffect(() => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Increment request ID to track this request
    const currentRequestId = ++requestIdRef.current;

    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const dateStr = formatDateForApi(selectedDatum);
        const result = await fetchLetszamData(dateStr, selectedMuszak, abortController.signal);

        // Check if this response is still relevant (not superseded by newer request)
        if (currentRequestId !== requestIdRef.current) {
          return; // Discard outdated response
        }

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (result.success && result.data) {
          // Use API data if available
          setOperativData(result.data.operativ);
          setNemOperativData(result.data.nemOperativ);
        } else {
          // Fallback to default data (API not ready or returned no data)
          setOperativData(createDefaultOperativ());
          setNemOperativData(createDefaultNemOperativ());
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was aborted, ignore
          return;
        }

        // Only log non-abort errors
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error loading létszám data:', error);
        }

        // Fallback to default data on error
        if (currentRequestId === requestIdRef.current && !abortController.signal.aborted) {
          setOperativData(createDefaultOperativ());
          setNemOperativData(createDefaultNemOperativ());
        }
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Cleanup function to abort request on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [selectedDatum, selectedMuszak]);

  // Handler for operativ data changes
  const handleOperativChange = (index: number, field: string, value: number) => {
    const updated = [...operativData];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate hiányzás %
    const row = updated[index];
    const total = row.megjelent + row.tappenz + row.szabadsag;
    row.hianyzasPercent =
      total > 0 ? ((row.tappenz + row.szabadsag) / total) * 100 : 0;

    setOperativData(updated);
  };

  // Handler for nem operativ data changes
  const handleNemOperativChange = (index: number, field: string, value: number) => {
    const updated = [...nemOperativData];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate hiányzás %
    const row = updated[index];
    const total = row.megjelent + row.tappenz + row.szabadsag;
    row.hianyzasPercent =
      total > 0 ? ((row.tappenz + row.szabadsag) / total) * 100 : 0;

    setNemOperativData(updated);
  };

  // Check critical positions
  const checkKritikusPoziciok = (): { pozicio: string; count: number }[] => {
    const allData = [...operativData, ...nemOperativData];
    const hianyok: { pozicio: string; count: number }[] = [];

    KRITIKUS_POZICIOK.forEach((kritikus) => {
      const row = allData.find((r) => r.pozicio === kritikus);
      if (row && row.megjelent === 0) {
        hianyok.push({ pozicio: kritikus, count: 0 });
      }
    });

    return hianyok;
  };

  // Helper to build save payload from current state
  const buildSavePayload = () => {
    const payload = {
      muszak: selectedMuszak,
      datum: formatDateForApi(selectedDatum),
      operativ: operativData,
      nemOperativ: nemOperativData,
    };

    // Validate payload
    const hasData = payload.operativ.length > 0 && payload.nemOperativ.length > 0;
    if (!hasData) {
      throw new Error('Invalid save payload: missing data');
    }

    return payload;
  };

  // Save handler
  const handleSave = () => {
    // Check kritikus pozíciók
    const kritikusHiany = checkKritikusPoziciok();

    if (kritikusHiany.length > 0) {
      setKritikusHianyList(kritikusHiany);
      setShowKritikusModal(true);
      return;
    }

    // Normal save
    saveData();
  };

  // Save with justification
  const handleConfirmWithIndoklas = (indoklas: {
    miert: string;
    meddig: string;
    terv: string;
  }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Mentés indoklással:', { payload: buildSavePayload(), indoklas });
    }
    saveData();
    setShowKritikusModal(false);
  };

  // Actual save function
  const saveData = async () => {
    try {
      const payload = buildSavePayload();
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('Létszám adatok mentve:', payload);
      }
      
      // TODO: Implement actual API call when backend is ready
      // const response = await fetch('/api/letszam', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Save failed');
      // }
      // 
      // const result = await response.json();
      // if (!result.success) {
      //   throw new Error(result.error || 'Save failed');
      // }

      // TODO: Show success toast notification

      // Only navigate after successful save
      router.push('/dashboard');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error saving létszám data:', error);
      }
      // TODO: Show error toast notification
      // For now, still navigate (stubbed save always succeeds)
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Header pageTitle="📊 Létszám Adatok" showBackButton={true} />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header Controls */}
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-700 rounded-lg flex flex-wrap items-center gap-6">
            <MuszakSelector
              selected={selectedMuszak}
              onChange={setSelectedMuszak}
            />
            <DateSelector
              selected={selectedDatum}
              onChange={setSelectedDatum}
            />
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Adatok betöltése...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Operatív Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <LetszamTable
                    title="🔧 OPERATÍV LÉTSZÁM"
                    positions={OPERATIV_POZICIOK}
                    data={operativData}
                    onChange={handleOperativChange}
                    isOperativ={true}
                    criticalPositions={KRITIKUS_POZICIOK}
                  />
                  <LetszamSummary data={operativData} isOperativ={true} />
                </motion.div>

                {/* Nem Operatív Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-12"
                >
                  <LetszamTable
                    title="👔 NEM OPERATÍV LÉTSZÁM"
                    positions={NEM_OPERATIV_POZICIOK}
                    data={nemOperativData}
                    onChange={handleNemOperativChange}
                    isOperativ={false}
                    criticalPositions={KRITIKUS_POZICIOK}
                  />
                  <LetszamSummary data={nemOperativData} isOperativ={false} />
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 flex justify-center gap-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/dashboard')}
                    className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Mégse
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/50"
                  >
                    Mentés
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>

      {/* Critical Position Modal */}
      <KritikusPozicioModal
        isOpen={showKritikusModal}
        onClose={() => setShowKritikusModal(false)}
        onConfirm={handleConfirmWithIndoklas}
        kritikusHianyList={kritikusHianyList}
      />
    </>
  );
}
