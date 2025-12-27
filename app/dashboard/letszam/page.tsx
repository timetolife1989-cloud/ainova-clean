'use client';
import { motion } from 'framer-motion';
import { useState } from 'react';
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

interface LetszamFormData {
  muszak: 'A' | 'B' | 'C';
  datum: Date;
  operativ: LetszamRow[];
  nemOperativ: LetszamRow[];
}

export default function LetszamPage() {
  const router = useRouter();

  // Initialize form state
  const [formData, setFormData] = useState<LetszamFormData>({
    muszak: 'A',
    datum: new Date(),
    operativ: OPERATIV_POZICIOK.map((p) => ({
      pozicio: p,
      megjelent: 0,
      tappenz: 0,
      szabadsag: 0,
      hianyzasPercent: 0,
    })),
    nemOperativ: NEM_OPERATIV_POZICIOK.map((p) => ({
      pozicio: p,
      megjelent: 0,
      tappenz: 0,
      szabadsag: 0,
      hianyzasPercent: 0,
    })),
  });

  // Modal state
  const [showKritikusModal, setShowKritikusModal] = useState(false);
  const [kritikusHianyList, setKritikusHianyList] = useState<
    { pozicio: string; count: number }[]
  >([]);

  // Handler for operativ data changes
  const handleOperativChange = (index: number, field: string, value: number) => {
    const updated = [...formData.operativ];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate hiányzás %
    const row = updated[index];
    const total = row.megjelent + row.tappenz + row.szabadsag;
    row.hianyzasPercent =
      total > 0 ? ((row.tappenz + row.szabadsag) / total) * 100 : 0;

    setFormData({ ...formData, operativ: updated });
  };

  // Handler for nem operativ data changes
  const handleNemOperativChange = (index: number, field: string, value: number) => {
    const updated = [...formData.nemOperativ];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate hiányzás %
    const row = updated[index];
    const total = row.megjelent + row.tappenz + row.szabadsag;
    row.hianyzasPercent =
      total > 0 ? ((row.tappenz + row.szabadsag) / total) * 100 : 0;

    setFormData({ ...formData, nemOperativ: updated });
  };

  // Check critical positions
  const checkKritikusPoziciok = (): { pozicio: string; count: number }[] => {
    const allData = [...formData.operativ, ...formData.nemOperativ];
    const hianyok: { pozicio: string; count: number }[] = [];

    KRITIKUS_POZICIOK.forEach((kritikus) => {
      const row = allData.find((r) => r.pozicio === kritikus);
      if (row && row.megjelent === 0) {
        hianyok.push({ pozicio: kritikus, count: 0 });
      }
    });

    return hianyok;
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
    console.log('Mentés indoklással:', { formData, indoklas });
    saveData();
    setShowKritikusModal(false);
  };

  // Actual save function
  const saveData = () => {
    console.log('Létszám adatok mentve:', formData);
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
              selected={formData.muszak}
              onChange={(muszak) => setFormData({ ...formData, muszak })}
            />
            <DateSelector
              selected={formData.datum}
              onChange={(datum) => setFormData({ ...formData, datum })}
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
              data={formData.operativ}
              onChange={handleOperativChange}
              isOperativ={true}
              criticalPositions={KRITIKUS_POZICIOK}
            />
            <LetszamSummary data={formData.operativ} isOperativ={true} />
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
              data={formData.nemOperativ}
              onChange={handleNemOperativChange}
              isOperativ={false}
              criticalPositions={KRITIKUS_POZICIOK}
            />
            <LetszamSummary data={formData.nemOperativ} isOperativ={false} />
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
