'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Operator, OperatorOrvosi } from './types';

// =====================================================
// Props
// =====================================================
interface OperatorTableProps {
  operators: Operator[];
  onEdit: (id: number) => void;
  onToggleActive: (id: number, active: boolean) => void;
}

// =====================================================
// Segéd komponensek
// =====================================================
function Badge({ 
  children, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'green' | 'orange' | 'cyan';
}) {
  const variants = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
    blue: 'bg-blue-900/50 text-blue-400',
    green: 'bg-green-900/50 text-green-400',
    orange: 'bg-orange-900/50 text-orange-400',
    cyan: 'bg-cyan-900/50 text-cyan-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

function getMuszakVariant(muszak: string): 'blue' | 'green' | 'orange' {
  const map: Record<string, 'blue' | 'green' | 'orange'> = {
    'A': 'blue',
    'B': 'green',
    'C': 'orange',
  };
  return map[muszak] || 'blue';
}

// Jogosítványok tooltip komponens (ugyanaz mint Users-nél)
function JogsiTooltip({ operator }: { operator: Operator }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const jogsiList = [
    { key: 'jogsi_gyalog_targonca', label: 'Gyalog kíséretű targonca', icon: '🚜', has: operator.jogsi_gyalog_targonca },
    { key: 'jogsi_forgo_daru', label: 'Forgó daru', icon: '🏗️', has: operator.jogsi_forgo_daru },
    { key: 'jogsi_futo_daru', label: 'Futó daru', icon: '🔩', has: operator.jogsi_futo_daru },
    { key: 'jogsi_newton_emelo', label: 'Newton emelő', icon: '⬆️', has: operator.jogsi_newton_emelo },
  ];
  
  const activeJogsi = jogsiList.filter(j => j.has);
  
  if (activeJogsi.length === 0) {
    return <span className="text-gray-500">-</span>;
  }
  
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        <Badge variant="cyan">
          {activeJogsi.length} db
        </Badge>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 top-full left-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[200px]">
            <p className="text-xs text-gray-400 mb-2 font-medium">Gépkezelői jogosítványok:</p>
            <div className="space-y-1">
              {activeJogsi.map(j => (
                <div key={j.key} className="flex items-center gap-2 text-sm text-white">
                  <span>{j.icon}</span>
                  <span>{j.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Orvosi tooltip komponens (ugyanaz mint Users-nél)
function OrvosTooltip({ operator }: { operator: Operator }) {
  const [isOpen, setIsOpen] = useState(false);
  const [orvosik, setOrvosik] = useState<OperatorOrvosi[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Ha nincs orvosi, nincs mit mutatni
  if (!operator.legkozelebb_lejaro && (operator.orvosi_count ?? 0) === 0) {
    return <Badge variant="default">Nincs</Badge>;
  }

  const handleOpen = async () => {
    setIsOpen(true);
    
    // Csak egyszer kérjük le
    if (!fetched) {
      setLoading(true);
      try {
        const res = await fetch(`/api/operatorok/${operator.id}/orvosi`);
        const data = await res.json();
        if (data.success && data.data) {
          setOrvosik(data.data);
        }
      } catch (err) {
        console.error('Orvosi adatok lekérése sikertelen:', err);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    }
  };

  // Lejárat státusz
  const now = new Date();
  const lejarat = operator.legkozelebb_lejaro ? new Date(operator.legkozelebb_lejaro) : null;
  const diff = lejarat ? (lejarat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
  const status = diff === null ? 'default' : diff < 0 ? 'danger' : diff < 30 ? 'warning' : 'success';
  const statusText = diff === null ? 'Nincs' : diff < 0 ? 'Lejárt!' : diff < 30 ? `${Math.ceil(diff)} nap` : lejarat!.toLocaleDateString('hu-HU');
  
  return (
    <div className="relative inline-block">
      <button
        onClick={handleOpen}
        className="cursor-pointer"
      >
        <Badge variant={status}>
          {statusText}
        </Badge>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 top-full left-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[280px]">
            <p className="text-xs text-gray-400 mb-2 font-medium">🏥 Orvosi alkalmassági vizsgálatok:</p>
            
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : orvosik.length > 0 ? (
              <div className="space-y-2">
                {orvosik.map(o => {
                  const oLejarat = new Date(o.lejarat);
                  const oDiff = (oLejarat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                  const oStatus = oDiff < 0 ? 'lejárt' : oDiff < 30 ? 'hamarosan' : 'érvényes';
                  const statusColor = oDiff < 0 ? 'text-red-400' : oDiff < 30 ? 'text-yellow-400' : 'text-green-400';
                  const statusBg = oDiff < 0 ? 'border-red-500/30' : oDiff < 30 ? 'border-yellow-500/30' : 'border-green-500/30';
                  
                  return (
                    <div key={o.id} className={`p-2 rounded border ${statusBg} bg-slate-900/50`}>
                      <div className="flex justify-between items-start">
                        <span className="text-white font-medium text-sm">{o.pozicio_nev}</span>
                        <span className={`text-xs ${statusColor}`}>{oStatus}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(o.kezdete).toLocaleDateString('hu-HU')} → {new Date(o.lejarat).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-2">Nincs részletes adat</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// Fő komponens
// =====================================================
export function OperatorTable({ operators, onEdit, onToggleActive }: OperatorTableProps) {
  if (operators.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p>Nincs találat</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
            <th className="pb-3 pl-4">Törzsszám</th>
            <th className="pb-3">Név</th>
            <th className="pb-3">Műszak</th>
            <th className="pb-3">Pozíció</th>
            <th className="pb-3">Telefon</th>
            <th className="pb-3 text-center">Jogosítványok</th>
            <th className="pb-3">Orvosi lejárat</th>
            <th className="pb-3">Státusz</th>
            <th className="pb-3 pr-4 text-right">Műveletek</th>
          </tr>
        </thead>
        <tbody>
          {operators.map((op, index) => {
            return (
              <motion.tr
                key={op.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`border-b border-gray-700/50 hover:bg-white/5 transition-colors ${!op.aktiv ? 'opacity-50' : ''}`}
              >
                <td className="py-3 pl-4 font-mono text-cyan-400">{op.torzsszam}</td>
                <td className="py-3 font-medium">{op.nev}</td>
                <td className="py-3">
                  <Badge variant={getMuszakVariant(op.muszak)}>{op.muszak}</Badge>
                </td>
                <td className="py-3 text-sm text-gray-300">{op.pozicio}</td>
                <td className="py-3 text-sm text-gray-400">{op.telefon || '-'}</td>
                <td className="py-3 text-center">
                  <JogsiTooltip operator={op} />
                </td>
                <td className="py-3">
                  <OrvosTooltip operator={op} />
                </td>
                <td className="py-3">
                  <Badge variant={op.aktiv ? 'success' : 'danger'}>
                    {op.aktiv ? 'Aktív' : 'Inaktív'}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(op.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Szerkesztés"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onToggleActive(op.id, !op.aktiv)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title={op.aktiv ? 'Deaktiválás' : 'Aktiválás'}
                    >
                      {op.aktiv ? (
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
