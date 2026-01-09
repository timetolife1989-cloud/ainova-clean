'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Operator, OperatorOrvosi, Pozicio } from './types';
import { JOGOSITVANYOK } from './types';

// =====================================================
// Props
// =====================================================
interface OperatorModalProps {
  operator: Operator | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Operator>) => Promise<void>;
  poziciok: Pozicio[];
}

// =====================================================
// Komponens
// =====================================================
export function OperatorModal({ operator, isOpen, onClose, onSave, poziciok }: OperatorModalProps) {
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alap' | 'orvosi'>('alap');
  
  // Form state
  const [formData, setFormData] = useState({
    torzsszam: '',
    nev: '',
    muszak: 'A',
    pozicio: '',
    telefon: '',
    jogsi_gyalog_targonca: false,
    jogsi_forgo_daru: false,
    jogsi_futo_daru: false,
    jogsi_newton_emelo: false,
    megjegyzes: '',
    aktiv: true,
  });

  // Orvosi state
  const [orvosik, setOrvosik] = useState<OperatorOrvosi[]>([]);
  const [newOrvosi, setNewOrvosi] = useState({
    pozicio_id: 0,
    kezdete: '',
    lejarat: '',
    megjegyzes: '',
  });

  // Load operator data
  useEffect(() => {
    if (operator) {
      setFormData({
        torzsszam: operator.torzsszam,
        nev: operator.nev,
        muszak: operator.muszak,
        pozicio: operator.pozicio,
        telefon: operator.telefon || '',
        jogsi_gyalog_targonca: operator.jogsi_gyalog_targonca,
        jogsi_forgo_daru: operator.jogsi_forgo_daru,
        jogsi_futo_daru: operator.jogsi_futo_daru,
        jogsi_newton_emelo: operator.jogsi_newton_emelo,
        megjegyzes: operator.megjegyzes || '',
        aktiv: operator.aktiv,
      });
      setOrvosik(operator.orvosik || []);
    } else {
      // Reset for new operator
      setFormData({
        torzsszam: '',
        nev: '',
        muszak: 'A',
        pozicio: '',
        telefon: '',
        jogsi_gyalog_targonca: false,
        jogsi_forgo_daru: false,
        jogsi_futo_daru: false,
        jogsi_newton_emelo: false,
        megjegyzes: '',
        aktiv: true,
      });
      setOrvosik([]);
    }
    setActiveTab('alap');
    setError(null);
  }, [operator, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOrvosi = async () => {
    if (!operator || !newOrvosi.pozicio_id || !newOrvosi.kezdete || !newOrvosi.lejarat) {
      setError('Pozíció, kezdete és lejárat kötelező');
      return;
    }

    try {
      const res = await fetch(`/api/operatorok/${operator.id}/orvosi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrvosi),
      });
      
      if (!res.ok) throw new Error('Hiba az orvosi mentésekor');
      
      // Refresh orvosi list
      const orvosiRes = await fetch(`/api/operatorok/${operator.id}/orvosi`);
      const orvosiData = await orvosiRes.json();
      setOrvosik(orvosiData.data || []);
      
      // Reset form
      setNewOrvosi({ pozicio_id: 0, kezdete: '', lejarat: '', megjegyzes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    }
  };

  const handleDeleteOrvosi = async (orvosiId: number) => {
    if (!operator) return;
    
    try {
      await fetch(`/api/operatorok/${operator.id}/orvosi/${orvosiId}`, {
        method: 'DELETE',
      });
      setOrvosik(orvosik.filter(o => o.id !== orvosiId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {operator ? 'Operátor szerkesztése' : 'Új operátor'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setActiveTab('alap')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'alap' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Alapadatok
              </button>
              {operator && (
                <button
                  onClick={() => setActiveTab('orvosi')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'orvosi' 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Orvosi ({orvosik.length})
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {activeTab === 'alap' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Törzsszám + Név */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Törzsszám *</label>
                    <input
                      type="text"
                      value={formData.torzsszam}
                      onChange={(e) => setFormData({ ...formData, torzsszam: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Név *</label>
                    <input
                      type="text"
                      value={formData.nev}
                      onChange={(e) => setFormData({ ...formData, nev: e.target.value })}
                      className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                      required
                    />
                  </div>
                </div>

                {/* Műszak + Pozíció */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Műszak *</label>
                    <select
                      value={formData.muszak}
                      onChange={(e) => setFormData({ ...formData, muszak: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                    >
                      <option value="A" className="bg-slate-800">A műszak</option>
                      <option value="B" className="bg-slate-800">B műszak</option>
                      <option value="C" className="bg-slate-800">C műszak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Munkakör (pozíció)</label>
                    <select
                      value={formData.pozicio}
                      onChange={(e) => setFormData({ ...formData, pozicio: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                    >
                      <option value="" className="bg-slate-800">Válassz...</option>
                      {/* Pozíciók a prop-ból jönnek (már szűrve, Vezetői kategória nélkül) */}
                      {poziciok.map((p) => (
                        <option key={p.id} value={p.nev} className="bg-slate-800">{p.nev}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.telefon || '+36 '}
                    onChange={(e) => {
                      let val = e.target.value;
                      // Biztosítjuk hogy +36-tal kezdődik
                      if (!val.startsWith('+36')) {
                        val = '+36 ' + val.replace(/^\+?36\s*/, '');
                      }
                      // Csak számok és szóközök engedélyezettek a +36 után
                      const prefix = '+36 ';
                      const rest = val.slice(4).replace(/[^0-9\s]/g, '');
                      setFormData({ ...formData, telefon: prefix + rest });
                    }}
                    placeholder="+36 20 123 4567"
                    className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Formátum: +36 XX XXX XXXX</p>
                </div>

                {/* Jogosítványok */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gépkezelői jogosítványok</label>
                  <div className="grid grid-cols-2 gap-3">
                    {JOGOSITVANYOK.map((j) => (
                      <label key={j.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={formData[j.key as keyof typeof formData] as boolean}
                          onChange={(e) => setFormData({ ...formData, [j.key]: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-600 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span>{j.icon} {j.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Megjegyzés */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Megjegyzés</label>
                  <textarea
                    value={formData.megjegyzes}
                    onChange={(e) => setFormData({ ...formData, megjegyzes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white resize-none"
                  />
                </div>

                {/* Aktív */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.aktiv}
                    onChange={(e) => setFormData({ ...formData, aktiv: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Aktív operátor</span>
                </label>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Mentés...' : 'Mentés'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'orvosi' && operator && (
              <div className="space-y-6">
                {/* Meglévő orvosik */}
                <div className="space-y-3">
                  {orvosik.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Nincs orvosi bejegyzés</p>
                  ) : (
                    orvosik.map((o) => (
                      <div
                        key={o.id}
                        className={`p-4 rounded-lg border ${
                          o.statusz === 'lejart' 
                            ? 'bg-red-900/20 border-red-500/50' 
                            : o.statusz === 'hamarosan'
                            ? 'bg-yellow-900/20 border-yellow-500/50'
                            : 'bg-green-900/20 border-green-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{o.pozicio_nev}</p>
                            <p className="text-sm text-gray-400">
                              {new Date(o.kezdete).toLocaleDateString('hu-HU')} - {new Date(o.lejarat).toLocaleDateString('hu-HU')}
                            </p>
                            {o.megjegyzes && (
                              <p className="text-sm text-gray-500 mt-1">{o.megjegyzes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteOrvosi(o.id)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Törlés"
                          >
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Új orvosi form */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="font-medium mb-4">Új orvosi alkalmasság</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Pozíció *</label>
                      <select
                        value={newOrvosi.pozicio_id}
                        onChange={(e) => setNewOrvosi({ ...newOrvosi, pozicio_id: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                      >
                        <option value={0} className="bg-slate-800">Válassz pozíciót...</option>
                        {poziciok.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-800">{p.nev}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Kezdete *</label>
                      <input
                        type="date"
                        value={newOrvosi.kezdete}
                        onChange={(e) => setNewOrvosi({ ...newOrvosi, kezdete: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Lejárat *</label>
                      <input
                        type="date"
                        value={newOrvosi.lejarat}
                        onChange={(e) => setNewOrvosi({ ...newOrvosi, lejarat: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white [color-scheme:dark]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Megjegyzés</label>
                      <input
                        type="text"
                        value={newOrvosi.megjegyzes}
                        onChange={(e) => setNewOrvosi({ ...newOrvosi, megjegyzes: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOrvosi}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    + Hozzáadás
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
