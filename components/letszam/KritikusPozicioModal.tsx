'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface KritikusPozicioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (indoklas: { miert: string; meddig: string; terv: string }) => void;
  kritikusHianyList: { pozicio: string; count: number }[];
}

export default function KritikusPozicioModal({
  isOpen,
  onClose,
  onConfirm,
  kritikusHianyList,
}: KritikusPozicioModalProps) {
  const [showIndoklasForm, setShowIndoklasForm] = useState(false);
  const [indoklas, setIndoklas] = useState({
    miert: '',
    meddig: '',
    terv: '',
  });

  const handleIgenClick = () => {
    setShowIndoklasForm(true);
  };

  const handleKuldesClick = () => {
    if (indoklas.miert.trim() && indoklas.meddig.trim() && indoklas.terv.trim()) {
      onConfirm(indoklas);
      // Reset state
      setShowIndoklasForm(false);
      setIndoklas({ miert: '', meddig: '', terv: '' });
    } else {
      console.warn('Validation failed: All fields are required');
    }
  };

  const handleMegseClick = () => {
    setShowIndoklasForm(false);
    setIndoklas({ miert: '', meddig: '', terv: '' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {!showIndoklasForm ? (
              // Warning Modal
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">⚠️</span>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    KRITIKUS POZÍCIÓ HIÁNYZIK
                  </h2>
                </div>

                <div className="mb-6 text-slate-300">
                  <p className="mb-4">
                    A következő kritikus pozícióban nincs senki:
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {kritikusHianyList.map((item) => (
                      <li
                        key={item.pozicio}
                        className="flex items-center gap-2 text-red-400 font-semibold"
                      >
                        <span>•</span>
                        <span>{item.pozicio} ({item.count} fő)</span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg mb-6">
                    <p className="text-red-300 font-semibold">
                      Így nem lehet leadást produkálni!
                    </p>
                  </div>

                  <p className="text-slate-400">
                    Biztosan elküldöd az adatokat?
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    (Értesítés megy az adminisztrátornak)
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Vissza - Módosítás
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleIgenClick}
                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Igen, Küldés
                  </motion.button>
                </div>
              </div>
            ) : (
              // Indoklás Form
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">📝</span>
                  <h2 className="text-2xl font-bold text-blue-400">
                    INDOKLÁS SZÜKSÉGES
                  </h2>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">
                      Miért nincs a pozícióban ember?
                    </label>
                    <textarea
                      value={indoklas.miert}
                      onChange={(e) => setIndoklas({ ...indoklas, miert: e.target.value })}
                      rows={3}
                      className="
                        w-full px-4 py-3 bg-slate-800 text-white rounded-lg
                        border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-all duration-200
                      "
                      placeholder="Pl: Betegség, családi okok, stb..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">
                      Előreláthatólag meddig nem lesz?
                    </label>
                    <input
                      type="text"
                      value={indoklas.meddig}
                      onChange={(e) => setIndoklas({ ...indoklas, meddig: e.target.value })}
                      className="
                        w-full px-4 py-3 bg-slate-800 text-white rounded-lg
                        border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-all duration-200
                      "
                      placeholder="Pl: 2024. december 30-ig"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2">
                      Mi a terv másnap, hogy legyen?
                    </label>
                    <textarea
                      value={indoklas.terv}
                      onChange={(e) => setIndoklas({ ...indoklas, terv: e.target.value })}
                      rows={3}
                      className="
                        w-full px-4 py-3 bg-slate-800 text-white rounded-lg
                        border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500
                        transition-all duration-200
                      "
                      placeholder="Pl: Helyettesítés másik műszakból, új dolgozó bevonása..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMegseClick}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Mégse
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleKuldesClick}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    Küldés
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
