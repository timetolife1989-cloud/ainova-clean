'use client';
import { motion } from 'framer-motion';
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

export default function LetszamPage() {
  const router = useRouter();

  // KÜLÖN state datum/muszak-hoz (useEffect dependency)
  const [selectedDatum, setSelectedDatum] = useState<Date>(new Date());
  const [selectedMuszak, setSelectedMuszak] = useState<'A' | 'B' | 'C'>('A');

  // Form data state (operativ/nemOperativ)
  const [operativData, setOperativData] = useState<LetszamRow[]>(
    OPERATIV_POZICIOK. map((p) => ({
      pozicio: p,
      megjelent: 0,
      tappenz: 0,
      szabadsag: 0,
      hianyzasPercent: 0,
    }))
  );

  const [nemOperativData, setNemOperativData] = useState<LetszamRow[]>(
    NEM_OPERATIV_POZICIOK.map((p) => ({
      pozicio: p,
      megjelent: 0,
      tappenz: 0,
      szabadsag:  0,
      hianyzasPercent: 0,
    }))
  );

  // Modal state
  const [showKritikusModal, setShowKritikusModal] = useState(false);
  const [kritikusHianyList, setKritikusHianyList] = useState<
    { pozicio: string; count:  number }[]
  >([]);

  // Summary state (from backend after save)
  const [savedSummary, setSavedSummary] = useState<any>(null);

  // Load data from backend when datum or muszak changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const datumStr = selectedDatum.toISOString().split('T')[0];
        const response = await fetch(`/api/letszam?datum=${datumStr}&muszak=${selectedMuszak}`);
        const data = await response.json();

        if (data.success) {
          if (data.isEmpty) {
            // Nincs mentett adat → Reset default értékekre
            setOperativData(
              OPERATIV_POZICIOK.map((p) => ({
                pozicio: p,
                megjelent: 0,
                tappenz: 0,
                szabadsag: 0,
                hianyzasPercent: 0,
              }))
            );
            setNemOperativData(
              NEM_OPERATIV_POZICIOK.map((p) => ({
                pozicio: p,
                megjelent: 0,
                tappenz:  0,
                szabadsag: 0,
                hianyzasPercent: 0,
              }))
            );
            setSavedSummary(null);
          } else {
            // Van mentett adat → Betöltés
            const operativFromDB = data.data.filter(
              (d: any) => d.pozicio_tipus === 'operativ'
            );
            const nemOperativFromDB = data.data.filter(
              (d: any) => d.pozicio_tipus === 'nem_operativ'
            );

            setOperativData(
              operativFromDB.map((d: any) => ({
                pozicio: d.pozicio,
                megjelent: d. megjelent,
                tappenz: d.tappenz,
                szabadsag: d. szabadsag,
                hianyzasPercent: d.hianyzas_percent,
              }))
            );

            setNemOperativData(
              nemOperativFromDB. map((d: any) => ({
                pozicio: d.pozicio,
                megjelent:  d.megjelent,
                tappenz: d.tappenz,
                szabadsag:  d.szabadsag,
                hianyzasPercent: d.hianyzas_percent,
              }))
            );
          }
        }
      } catch (error) {
        console.error('[Létszám betöltés] Hiba:', error);
      }
    };

    fetchData();
  }, [selectedDatum, selectedMuszak]); // TISZTA dependency! 

  // Handler for operativ data changes
  const handleOperativChange = (index: number, field: string, value: number) => {
    const updated = [...operativData];
    updated[index] = { ...updated[index], [field]: value };
    setOperativData(updated);
  };

  // Handler for nem operativ data changes
  const handleNemOperativChange = (index: number, field: string, value: number) => {
    const updated = [...nemOperativData];
    updated[index] = { ...updated[index], [field]:  value };
    setNemOperativData(updated);
  };

  // Check critical positions
  const checkKritikusPoziciok = (): { pozicio: string; count: number }[] => {
    const allData = [... operativData, ...nemOperativData];
    const hianyok:  { pozicio: string; count:  number }[] = [];

    KRITIKUS_POZICIOK. forEach((kritikus) => {
      const row = allData.find((r) => r.pozicio === kritikus);
      if (row && row.megjelent === 0) {
        hianyok.push({ pozicio: kritikus, count:  0 });
      }
    });

    return hianyok;
  };

  // Save handler
  const handleSave = () => {
    const kritikusHiany = checkKritikusPoziciok();

    if (kritikusHiany.length > 0) {
      setKritikusHianyList(kritikusHiany);
      setShowKritikusModal(true);
      return;
    }

    saveData();
  };

  // Save with justification
  const handleConfirmWithIndoklas = async (indoklas: {
    miert: string;
    meddig: string;
    terv: string;
  }) => {
    try {
      const indoklasokMap:  any = {};
      kritikusHianyList.forEach((k) => {
        indoklasokMap[k.pozicio] = indoklas;
      });

      const response = await fetch('/api/letszam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datum: selectedDatum.toISOString().split('T')[0],
          muszak: selectedMuszak,
          operativ:  operativData,
          nemOperativ: nemOperativData,
          indoklasok: indoklasokMap,
        }),
      });

      const data = await response.json();

      if (! response.ok) {
        throw new Error(data.error || 'Mentés sikertelen');
      }

      setSavedSummary(data.summary);
      setShowKritikusModal(false);
      alert('Létszám adatok mentve (kritikus pozíció indoklással)!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[Létszám mentés indoklással] Hiba:', error);
      alert('Hiba mentés közben: ' + error.message);
    }
  };

  // Actual save function
  const saveData = async () => {
    try {
      const response = await fetch('/api/letszam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON. stringify({
          datum: selectedDatum.toISOString().split('T')[0],
          muszak: selectedMuszak,
          operativ: operativData,
          nemOperativ: nemOperativData,
          indoklasok: {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data. error || 'Mentés sikertelen');
      }

      setSavedSummary(data.summary);
      alert('Létszám adatok sikeresen mentve!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[Létszám mentés] Hiba:', error);
      alert('Hiba mentés közben: ' + error.message);
    }
  };

  return (
    <>
      <Header pageTitle="Létszám Adatok" showBackButton={true} />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y:  -20 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Header Controls */}
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-700 rounded-lg flex flex-wrap items-center gap-6">
            <MuszakSelector
              selected={selectedMuszak}
              onChange={(muszak) => setSelectedMuszak(muszak)}
            />
            <DateSelector
              selected={selectedDatum}
              onChange={(datum) => setSelectedDatum(datum)}
            />
          </div>

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
            <LetszamSummary
              data={operativData}
              isOperativ={true}
              summary={savedSummary?. find((s: any) => s.pozicio_tipus === 'operativ')}
            />
          </motion.div>

          {/* Nem Operatív Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay:  0.2 }}
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
            <LetszamSummary
              data={nemOperativData}
              isOperativ={false}
              summary={savedSummary?.find((s: any) => s.pozicio_tipus === 'nem_operativ')}
            />
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