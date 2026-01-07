'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard';
import RiportKotelesModal from '@/components/letszam/RiportKotelesModal';

// Pozíciók definíciója (a régi működő verzióból)
const POSITIONS = [
  { id: 'preparator', name: 'Előkészítő', productive: true },
  { id: 'wireWinder', name: 'Huzalos tekercselő', productive: true },
  { id: 'tapeWinder', name: 'Fóliás tekercselő', productive: true },
  { id: 'milling', name: 'Maró-ónozó', productive: true },
  { id: 'lacAssembler', name: 'LaC szerelő', productive: true },
  { id: 'smallDCAssembler', name: 'Kis DC szerelő', productive: true },
  { id: 'largeDCAssembler', name: 'Nagy DC szerelő', productive: true },
  { id: 'electricTester', name: 'Mérő', productive: true },
  { id: 'impregnation', name: 'Impregnáló', productive: true },
  { id: 'finalAssembler', name: 'Végszerelő', productive: true },
  { id: 'packer', name: 'Csomagoló', productive: true },
  { id: 'planner', name: 'Gyártásszervező', productive: false },
  { id: 'shiftLeader', name: 'Műszakvezető', productive: false },
  { id: 'qualityInspector', name: 'Minőségellenőr', productive: false },
];

const SHIFTS = [
  { id: 'morning', name: 'Délelőttös műszak', time: '05:45 - 13:45' },
  { id: 'afternoon', name: 'Délutános műszak', time: '13:45 - 21:45' },
  { id: 'night', name: 'Éjszakás műszak', time: '21:45 - 05:45' },
];

// Műszak automatikus meghatározása az aktuális idő alapján
function getEffectiveDate(): { date: Date; shiftId: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const morningStart = 5 * 60 + 45;   // 05:45
  const afternoonStart = 13 * 60 + 45; // 13:45
  const nightStart = 21 * 60 + 45;     // 21:45

  const effectiveDate = new Date(now);
  let shiftId = 'morning';

  if (currentTime >= nightStart || currentTime < morningStart) {
    shiftId = 'night';
    if (currentTime < morningStart) {
      effectiveDate.setDate(effectiveDate.getDate() - 1);
    }
  } else if (currentTime >= afternoonStart) {
    shiftId = 'afternoon';
  }

  return { date: effectiveDate, shiftId };
}

type StaffData = {
  [positionId: string]: { present: string; vacation: string; sickLeave: string };
};

export default function LetszamPage() {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  // State - egyszerű, mint a régi működő verzióban
  const [recordDate, setRecordDate] = useState<Date>(() => getEffectiveDate().date);
  const [selectedShift, setSelectedShift] = useState<string>(() => getEffectiveDate().shiftId);
  const [data, setData] = useState<StaffData>(() => {
    const initial: StaffData = {};
    POSITIONS.forEach((pos) => {
      initial[pos.id] = { present: '0', vacation: '0', sickLeave: '0' };
    });
    return initial;
  });

  // Modal states
  const [showFutureError, setShowFutureError] = useState(false);
  const [showZeroHeadcountError, setShowZeroHeadcountError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSaveError, setShowSaveError] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Overwrite confirmation
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [existingRecord, setExistingRecord] = useState<{ 
    savedBy: string; 
    savedAt: string;
    fullName: string;
    role: string;
    shift: string;
    email: string;
  } | null>(null);

  // Riport köteles modal (1 napnál régebbi módosítás)
  const [showRiportKoteles, setShowRiportKoteles] = useState(false);
  const [riportKotelesMode, setRiportKotelesMode] = useState<'new' | 'overwrite'>('new');
  const [pendingIndoklas, setPendingIndoklas] = useState<string>('');

  // Input handlers
  const handleFocus = (positionId: string, field: 'present' | 'vacation' | 'sickLeave') => {
    if (data[positionId][field] === '0') {
      setData((prev) => ({ ...prev, [positionId]: { ...prev[positionId], [field]: '' } }));
    }
  };

  const handleBlur = (positionId: string, field: 'present' | 'vacation' | 'sickLeave') => {
    if (data[positionId][field] === '') {
      setData((prev) => ({ ...prev, [positionId]: { ...prev[positionId], [field]: '0' } }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    positionId: string,
    field: 'present' | 'vacation' | 'sickLeave'
  ) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setData((prev) => ({ ...prev, [positionId]: { ...prev[positionId], [field]: val } }));
  };

  // Számítások
  const productivePositions = POSITIONS.filter((p) => p.productive);
  const nonProductivePositions = POSITIONS.filter((p) => !p.productive);
  const toNum = (val: string) => parseInt(val, 10) || 0;

  const sumProductive = {
    present: productivePositions.reduce((s, p) => s + toNum(data[p.id].present), 0),
    vacation: productivePositions.reduce((s, p) => s + toNum(data[p.id].vacation), 0),
    sickLeave: productivePositions.reduce((s, p) => s + toNum(data[p.id].sickLeave), 0),
  };

  const sumNonProductive = {
    present: nonProductivePositions.reduce((s, p) => s + toNum(data[p.id].present), 0),
    vacation: nonProductivePositions.reduce((s, p) => s + toNum(data[p.id].vacation), 0),
    sickLeave: nonProductivePositions.reduce((s, p) => s + toNum(data[p.id].sickLeave), 0),
  };

  const sumTotal = {
    present: sumProductive.present + sumNonProductive.present,
    vacation: sumProductive.vacation + sumNonProductive.vacation,
    sickLeave: sumProductive.sickLeave + sumNonProductive.sickLeave,
  };

  // Validáció
  const getDaysDifference = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(recordDate);
    selected.setHours(0, 0, 0, 0);
    return Math.round((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Műszak mapping frontend -> API
  const SHIFT_TO_API: Record<string, string> = {
    morning: 'A',
    afternoon: 'B',
    night: 'C',
  };

  // Létezik-e már adat ellenőrzése
  const checkExistingData = async (): Promise<{ 
    exists: boolean; 
    savedBy: string; 
    savedAt: string;
    fullName: string;
    role: string;
    shift: string;
    email: string;
  }> => {
    try {
      const response = await fetch(
        `/api/letszam?datum=${recordDate.toISOString().split('T')[0]}&muszak=${SHIFT_TO_API[selectedShift]}`
      );
      const result = await response.json();
      
      if (result.success && !result.isEmpty && result.data.length > 0) {
        const firstRecord = result.data[0];
        const shiftMap: Record<string, string> = { 'A': 'Délelőttös', 'B': 'Délutános', 'C': 'Éjszakás' };
        return {
          exists: true,
          savedBy: firstRecord.rogzitette_user || 'Ismeretlen',
          savedAt: firstRecord.rogzitette_datum 
            ? new Date(firstRecord.rogzitette_datum).toLocaleString('hu-HU')
            : 'Ismeretlen időpont',
          fullName: firstRecord.rogzitette_fullname || '',
          role: firstRecord.rogzitette_role || '',
          shift: shiftMap[firstRecord.rogzitette_shift] || firstRecord.rogzitette_shift || '',
          email: firstRecord.rogzitette_email || ''
        };
      }
      return { exists: false, savedBy: '', savedAt: '', fullName: '', role: '', shift: '', email: '' };
    } catch {
      return { exists: false, savedBy: '', savedAt: '', fullName: '', role: '', shift: '', email: '' };
    }
  };

  // Tényleges mentés végrehajtása
  const performSave = async (riportIndoklas?: string) => {
    setShowOverwriteConfirm(false);
    setShowRiportKoteles(false);
    setIsSaving(true);
    
    try {
      const operativ = productivePositions.map((pos) => ({
        pozicio: pos.name,
        megjelent: toNum(data[pos.id].present),
        tappenz: toNum(data[pos.id].sickLeave),
        szabadsag: toNum(data[pos.id].vacation),
      }));

      const nemOperativ = nonProductivePositions.map((pos) => ({
        pozicio: pos.name,
        megjelent: toNum(data[pos.id].present),
        tappenz: toNum(data[pos.id].sickLeave),
        szabadsag: toNum(data[pos.id].vacation),
      }));

      const response = await fetch('/api/letszam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datum: recordDate.toISOString().split('T')[0],
          muszak: SHIFT_TO_API[selectedShift],
          operativ,
          nemOperativ,
          indoklasok: {},
          // Riport köteles módosítás adatai
          riportKoteles: riportIndoklas ? {
            indoklas: riportIndoklas,
            isOverwrite: riportKotelesMode === 'overwrite',
          } : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.details || 'Mentés sikertelen');
      }

      setPendingIndoklas('');
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Mentés hiba:', error);
      setSaveError(error instanceof Error ? error.message : 'Hiba történt a mentés során!');
      setShowSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Ellenőrzi hogy riport köteles-e (1 napnál régebbi)
  const isRiportKoteles = (): boolean => {
    const daysDiff = getDaysDifference();
    return daysDiff < -1; // -2 vagy régebbi = riport köteles
  };

  // Mentés gomb handler - ellenőrzi duplikátumot és riport kötelest
  const handleSave = async () => {
    const totalEntered = sumTotal.present + sumTotal.vacation + sumTotal.sickLeave;
    
    if (totalEntered === 0) {
      setShowZeroHeadcountError(true);
      return;
    }

    const daysDiff = getDaysDifference();
    if (daysDiff > 0) {
      setShowFutureError(true);
      return;
    }

    // Duplikátum ellenőrzés
    setIsChecking(true);
    try {
      const existing = await checkExistingData();
      
      // Ha riport köteles (1 napnál régebbi)
      if (isRiportKoteles()) {
        setExistingRecord(existing.exists ? { 
          savedBy: existing.savedBy, 
          savedAt: existing.savedAt,
          fullName: existing.fullName,
          role: existing.role,
          shift: existing.shift,
          email: existing.email
        } : null);
        setRiportKotelesMode(existing.exists ? 'overwrite' : 'new');
        setShowRiportKoteles(true);
        return;
      }
      
      // Nem riport köteles - normál flow
      if (existing.exists) {
        setExistingRecord({ 
          savedBy: existing.savedBy, 
          savedAt: existing.savedAt,
          fullName: existing.fullName,
          role: existing.role,
          shift: existing.shift,
          email: existing.email
        });
        setShowOverwriteConfirm(true);
        return;
      }
      
      // Nincs létező adat, nem riport köteles - egyszerű mentés
      await performSave();
    } finally {
      setIsChecking(false);
    }
  };

  // Riport köteles indoklás beküldése
  const handleRiportKotelesConfirm = (indoklas: string) => {
    setPendingIndoklas(indoklas);
    performSave(indoklas);
  };

  const currentShift = SHIFTS.find((s) => s.id === selectedShift);

  return (
    <>
      <Header pageTitle="Létszám Adatrögzítő" showBackButton={true} />

      <main className="min-h-screen pt-[100px] pb-32 overflow-visible">
        <div ref={contentRef} className="w-full max-w-5xl mx-auto px-4 overflow-visible">
          
          {/* Dátum és Műszakválasztó */}
          <section className="mb-6">
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-500/15 via-slate-900/60 to-indigo-500/15 backdrop-blur-md p-4 shadow-[0_0_40px_rgba(147,51,234,0.2)]">
              
              {/* Dátum sor */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 pb-4 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-purple-300 text-lg">📅</span>
                  <span className="text-sm font-semibold text-purple-200">Rögzítési dátum:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="date"
                    value={recordDate.toISOString().split('T')[0]}
                    onChange={(e) => setRecordDate(new Date(e.target.value))}
                    className="px-4 py-2 rounded-xl bg-slate-800/80 border border-purple-500/40 text-purple-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                  />
                  <span className="text-sm md:text-lg font-bold text-purple-100">
                    {recordDate.toLocaleDateString('hu-HU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Műszak sor */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-purple-300 text-lg">🕐</span>
                  <span className="text-sm font-semibold text-purple-200">Műszak:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShift(shift.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedShift === shift.id
                          ? 'bg-purple-500/80 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] border border-purple-400'
                          : 'bg-slate-800/60 text-purple-200 border border-purple-500/30 hover:bg-purple-500/20'
                      }`}
                    >
                      <span className="block">{shift.name}</span>
                      <span className="block text-[10px] opacity-75">{shift.time}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rögzítés info */}
              {currentShift && (
                <div className="mt-3 text-xs text-purple-300/80">
                  Rögzítés:{' '}
                  <span className="font-semibold text-purple-200">
                    {recordDate.toLocaleDateString('hu-HU')}
                  </span>{' '}
                  — {currentShift.name}
                </div>
              )}
            </div>
          </section>

          {/* Produktív pozíciók */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-cyan-100 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Produktív pozíciók
            </h2>
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 backdrop-blur-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/20 bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-cyan-200/90 w-[40%]">Pozíció</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Megjelent</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Szabadság</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Táppénz</th>
                  </tr>
                </thead>
                <tbody>
                  {productivePositions.map((pos, idx) => (
                    <tr
                      key={pos.id}
                      className={`border-b border-cyan-500/10 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}`}
                    >
                      <td className="py-2 px-4 text-sm text-cyan-50">{pos.name}</td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].present}
                          onFocus={() => handleFocus(pos.id, 'present')}
                          onBlur={() => handleBlur(pos.id, 'present')}
                          onChange={(e) => handleChange(e, pos.id, 'present')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-cyan-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          tabIndex={1 + idx}
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].vacation}
                          onFocus={() => handleFocus(pos.id, 'vacation')}
                          onBlur={() => handleBlur(pos.id, 'vacation')}
                          onChange={(e) => handleChange(e, pos.id, 'vacation')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-cyan-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          tabIndex={100 + idx}
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].sickLeave}
                          onFocus={() => handleFocus(pos.id, 'sickLeave')}
                          onBlur={() => handleBlur(pos.id, 'sickLeave')}
                          onChange={(e) => handleChange(e, pos.id, 'sickLeave')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-cyan-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                          tabIndex={200 + idx}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Produktív összesen */}
                  <tr className="bg-emerald-500/15 border-t-2 border-emerald-400/40">
                    <td className="py-3 px-4 text-sm font-semibold text-emerald-300">Produktív összesen</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-emerald-200">{sumProductive.present}</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-emerald-200">{sumProductive.vacation}</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-emerald-200">{sumProductive.sickLeave}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Nem produktív pozíciók */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-cyan-100 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Nem produktív pozíciók
            </h2>
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/60 backdrop-blur-md overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/20 bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-cyan-200/90 w-[40%]">Pozíció</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Megjelent</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Szabadság</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-cyan-200/90">Táppénz</th>
                  </tr>
                </thead>
                <tbody>
                  {nonProductivePositions.map((pos, idx) => (
                    <tr
                      key={pos.id}
                      className={`border-b border-cyan-500/10 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}`}
                    >
                      <td className="py-2 px-4 text-sm text-cyan-50">{pos.name}</td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].present}
                          onFocus={() => handleFocus(pos.id, 'present')}
                          onBlur={() => handleBlur(pos.id, 'present')}
                          onChange={(e) => handleChange(e, pos.id, 'present')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-amber-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                          tabIndex={50 + idx}
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].vacation}
                          onFocus={() => handleFocus(pos.id, 'vacation')}
                          onBlur={() => handleBlur(pos.id, 'vacation')}
                          onChange={(e) => handleChange(e, pos.id, 'vacation')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-amber-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                          tabIndex={150 + idx}
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={data[pos.id].sickLeave}
                          onFocus={() => handleFocus(pos.id, 'sickLeave')}
                          onBlur={() => handleBlur(pos.id, 'sickLeave')}
                          onChange={(e) => handleChange(e, pos.id, 'sickLeave')}
                          className="w-16 text-center rounded-lg bg-slate-800/80 border border-amber-500/30 text-cyan-50 py-1.5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                          tabIndex={250 + idx}
                        />
                      </td>
                    </tr>
                  ))}
                  {/* Nem produktív összesen */}
                  <tr className="bg-amber-500/15 border-t-2 border-amber-400/40">
                    <td className="py-3 px-4 text-sm font-semibold text-amber-300">Nem produktív összesen</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-amber-200">{sumNonProductive.present}</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-amber-200">{sumNonProductive.vacation}</td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-amber-200">{sumNonProductive.sickLeave}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Teljes összesítő */}
          <section className="mb-8">
            <div className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 via-slate-900/60 to-purple-500/15 backdrop-blur-md overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-4 px-4 text-base font-bold text-cyan-100 w-[40%]">🏭 TELJES LÉTSZÁM</td>
                    <td className="py-4 px-4 text-center text-lg font-black text-cyan-50">{sumTotal.present}</td>
                    <td className="py-4 px-4 text-center text-lg font-black text-cyan-50">{sumTotal.vacation}</td>
                    <td className="py-4 px-4 text-center text-lg font-black text-cyan-50">{sumTotal.sickLeave}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ========== LÉTSZÁMBÓL KALKULÁLT CÉL ========== */}
          <section className="mb-6">
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-900/30 via-slate-900/60 to-cyan-900/30 backdrop-blur-md p-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <p className="text-sm text-slate-400">Létszámból kalkulált cél</p>
                    <p className="text-xs text-slate-500">produktív megjelent × 480 perc</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    {(sumProductive.present * 480).toLocaleString('hu-HU')}
                  </p>
                  <p className="text-sm text-slate-400">perc / műszak</p>
                </div>
              </div>
            </div>
          </section>

          {/* ========== MENTÉS GOMB ========== */}
          <div className="flex justify-center py-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isChecking}
              className="group relative px-12 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white text-xl font-bold shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 hover:shadow-[0_0_80px_rgba(16,185,129,0.7)] hover:scale-105 active:scale-95 active:shadow-[0_0_40px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            >
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              {/* Button content */}
              <span className="relative flex items-center gap-3">
                {isChecking ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Ellenőrzés...</span>
                  </>
                ) : isSaving ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Mentés...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>MENTÉS</span>
                  </>
                )}
              </span>
            </button>
          </div>

        </div>
      </main>

      {/* Modal: 0 létszám hiba */}
      {showZeroHeadcountError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-4">Hiányzó létszám</h3>
            <p className="text-slate-300 mb-2">
              <strong className="text-red-400">Nem menthető 0 fővel.</strong>
            </p>
            <p className="text-sm text-slate-400 mb-4">
              Adj meg legalább 1 főt (Megjelent / Szabadság / Táppénz).
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowZeroHeadcountError(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium"
              >
                Értem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Jövőbeli dátum */}
      {showFutureError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-4">Jövőbeli dátum</h3>
            <p className="text-slate-300 mb-2">
              <strong className="text-red-400">Nem lehet jövőbeli dátumra rögzíteni!</strong>
            </p>
            <p className="text-slate-300 mb-4">
              A kiválasztott dátum ({recordDate.toLocaleDateString('hu-HU')}) a mai napnál későbbi.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowFutureError(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium"
              >
                Értem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast: Sikeres mentés - lebegő üzenet */}
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.5s_ease-out]">
          <div className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.5)] border border-emerald-300/30">
            <span className="text-4xl animate-bounce">✅</span>
            <div>
              <p className="text-xl font-bold">Mentés sikeres!</p>
              <p className="text-sm text-emerald-100 opacity-90">Átirányítás a főoldalra...</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mentési hiba */}
      {showSaveError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-4">❌ Mentési hiba</h3>
            <p className="text-slate-300 mb-4">
              {saveError}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSaveError(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Felülírás megerősítése */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-lg mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Már létező adat
            </h3>
            <p className="text-amber-300 font-medium mb-4">
              Erre a napra és műszakra már van rögzített adat!
            </p>
            {existingRecord && (
              <div className="p-4 rounded-xl bg-slate-800/80 border border-amber-500/30 mb-4 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-base font-semibold text-amber-200">
                      {existingRecord.fullName || existingRecord.savedBy}
                    </p>
                    <p className="text-xs text-slate-400">Törzsszám: {existingRecord.savedBy}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Beosztás:</span>
                    <p className="text-slate-300 font-medium">{existingRecord.role || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Műszak:</span>
                    <p className="text-slate-300 font-medium">{existingRecord.shift || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">Email:</span>
                    <p className="text-cyan-400 font-medium text-xs">{existingRecord.email || '-'}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-700">
                    <span className="text-slate-500">Rögzítés időpontja:</span>
                    <p className="text-amber-200 font-semibold">{existingRecord.savedAt}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-slate-300 mb-6">
              Szeretnéd felülírni a korábbi adatokat?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium transition-colors"
              >
                Mégsem
              </button>
              <button
                type="button"
                onClick={() => performSave()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
              >
                Igen, felülírom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Riport köteles módosítás */}
      <RiportKotelesModal
        isOpen={showRiportKoteles}
        onClose={() => setShowRiportKoteles(false)}
        onConfirm={handleRiportKotelesConfirm}
        isOverwrite={riportKotelesMode === 'overwrite'}
        existingRecord={existingRecord ? {
          fullName: existingRecord.fullName,
          savedAt: existingRecord.savedAt,
          role: existingRecord.role,
          email: existingRecord.email,
        } : undefined}
        targetDate={recordDate.toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      />
    </>
  );
}