'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
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

  // Modal state
  const [showKritikusModal, setShowKritikusModal] = useState(false);
  const [kritikusHianyList, setKritikusHianyList] = useState<
    { pozicio: string; count: number }[]
  >([]);

  // useEffect with isMounted cleanup (prevents memory leaks and stale state)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Format date for API call
        const dateStr = selectedDatum.toISOString().split('T')[0];
        
        // TODO: Replace with actual API call when backend is ready
        // const response = await fetch(`/api/letszam?datum=${dateStr}&muszak=${selectedMuszak}`);
        // const data = await response.json();
        
        // Simulate API delay for smooth loading animation in development
        if (process.env.NODE_ENV === 'development') {
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (!isMounted) return;

        // For now, use default data (will be replaced with API data)
        setOperativData(createDefaultOperativ());
        setNemOperativData(createDefaultNemOperativ());
      } catch (error) {
        console.error('Error fetching létszám data:', error);
        // Fallback to default data on error
        if (isMounted) {
          setOperativData(createDefaultOperativ());
          setNemOperativData(createDefaultNemOperativ());
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
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

  // Helper to build form data object from state
  const buildFormData = () => ({
    muszak: selectedMuszak,
    datum: selectedDatum,
    operativ: operativData,
    nemOperativ: nemOperativData,
  });

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
    console.log('Mentés indoklással:', { formData: buildFormData(), indoklas });
    saveData();
    setShowKritikusModal(false);
  };

  // Actual save function
  const saveData = () => {
    console.log('Létszám adatok mentve:', buildFormData());
    // TODO: Add API call here when backend is ready
    // TODO: Show success toast notification
    router.push('/dashboard');
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
