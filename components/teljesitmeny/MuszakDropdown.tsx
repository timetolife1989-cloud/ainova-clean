'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MuszakType, KimutatType } from './types';
import { MUSZAK_COLORS } from './constants';

interface MuszakDropdownProps {
  kimutat: KimutatType;
  label: string;
  isOpen: boolean;
  isActive: boolean;
  selectedMuszak: MuszakType;
  onToggle: () => void;
  onSelect: (kimutat: KimutatType, muszak: MuszakType) => void;
}

export function MuszakDropdown({
  kimutat,
  label,
  isOpen,
  isActive,
  selectedMuszak,
  onToggle,
  onSelect,
}: MuszakDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
          ${isActive
            ? `bg-gradient-to-r ${MUSZAK_COLORS[selectedMuszak].gradient} text-white shadow-lg`
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
        `}
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-[100]"
          >
            {(['A', 'B', 'C', 'SUM'] as MuszakType[]).map((muszak) => (
              <button
                key={muszak}
                onClick={() => onSelect(kimutat, muszak)}
                className={`
                  w-full px-4 py-2.5 text-left text-sm hover:bg-slate-700 transition-colors
                  flex items-center gap-3
                  ${isActive && selectedMuszak === muszak ? 'bg-slate-700' : ''}
                `}
              >
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${MUSZAK_COLORS[muszak].gradient}`} />
                <span className="text-white">
                  {muszak === 'SUM' ? 'Összesített (SUM)' : `${muszak} műszak`}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MuszakButtonProps {
  muszak: MuszakType;
  isSelected: boolean;
  onClick: () => void;
}

export function MuszakButton({ muszak, isSelected, onClick }: MuszakButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${isSelected
          ? `bg-gradient-to-r ${MUSZAK_COLORS[muszak].gradient} text-white shadow-lg`
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
      `}
    >
      {muszak === 'SUM' ? 'SUM' : muszak}
    </button>
  );
}

interface MuszakBadgeProps {
  muszak: string;
}

export function MuszakBadge({ muszak }: MuszakBadgeProps) {
  const colorClass = 
    muszak === 'A' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' :
    muszak === 'B' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' :
    muszak === 'C' ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/50' :
    'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/50';

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${colorClass}`}>
      {muszak}
    </span>
  );
}
