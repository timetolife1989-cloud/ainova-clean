'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface RiportKotelesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (indoklas: string) => void;
  isOverwrite: boolean;  // Ha true, már van adat amit felülír
  existingRecord?: {
    fullName: string;
    savedAt: string;
    role: string;
    email: string;
  };
  targetDate: string;  // Formázott dátum megjelenítéshez
}

export default function RiportKotelesModal({
  isOpen,
  onClose,
  onConfirm,
  isOverwrite,
  existingRecord,
  targetDate,
}: RiportKotelesModalProps) {
  const [indoklas, setIndoklas] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (indoklas.trim().length < 10) {
      setError('Az indoklás minimum 10 karakter legyen!');
      return;
    }
    onConfirm(indoklas.trim());
    setIndoklas('');
    setError('');
  };

  const handleClose = () => {
    setIndoklas('');
    setError('');
    onClose();
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
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-slate-900 border border-orange-500/50 rounded-xl shadow-2xl max-w-lg w-full"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">📋</span>
                <div>
                  <h2 className="text-xl font-bold text-orange-400">
                    RIPORT KÖTELES MÓDOSÍTÁS
                  </h2>
                  <p className="text-sm text-orange-300/80">
                    1 napnál régebbi adat {isOverwrite ? 'módosítása' : 'rögzítése'}
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 bg-orange-900/20 border border-orange-700/50 rounded-lg mb-4">
                <p className="text-orange-200 text-sm">
                  <strong>Dátum:</strong> {targetDate}
                </p>
                {isOverwrite && existingRecord && (
                  <div className="mt-2 pt-2 border-t border-orange-700/30">
                    <p className="text-orange-200/80 text-sm">
                      <strong>Eredeti rögzítő:</strong> {existingRecord.fullName}
                    </p>
                    <p className="text-orange-200/80 text-sm">
                      <strong>Rögzítve:</strong> {existingRecord.savedAt}
                    </p>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg mb-4">
                <p className="text-yellow-300 text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  <span>
                    A módosítás naplózásra kerül. Az admin értesítést kap a változásról.
                  </span>
                </p>
              </div>

              {/* Indoklás textarea */}
              <div className="mb-4">
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Indoklás <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={indoklas}
                  onChange={(e) => {
                    setIndoklas(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Miért szükséges a visszamenőleges módosítás? (min. 10 karakter)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none h-28"
                />
                {error && (
                  <p className="text-red-400 text-xs mt-1">{error}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {indoklas.length}/10 karakter minimum
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={indoklas.trim().length < 10}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isOverwrite ? 'Felülírom és jelentem' : 'Rögzítem és jelentem'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
