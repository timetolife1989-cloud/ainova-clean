'use client';

import React from 'react';

// =====================================================
// Közös ImportStatusBar komponens
// Használható: Teljesítmény, Napi Perces modulokban
// =====================================================

interface ImportStatusBarProps {
  lastImportAt: string | null;
  recordCount: number;
  secondaryLabel?: string;
  secondaryValue?: number | string;
  secondarySuffix?: string;
}

export function ImportStatusBar({
  lastImportAt,
  recordCount,
  secondaryLabel = 'Operátorok',
  secondaryValue = 0,
  secondarySuffix = 'fő',
}: ImportStatusBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Utolsó szinkronizálás:</span>
          <span className="text-xs text-white font-medium">
            {lastImportAt
              ? new Date(lastImportAt).toLocaleString('hu-HU')
              : 'Nincs adat'}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Rekordok:</span>
          <span className="text-xs text-emerald-400 font-medium">
            {recordCount?.toLocaleString() || 0}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{secondaryLabel}:</span>
          <span className="text-xs text-blue-400 font-medium">
            {secondaryValue} {secondarySuffix}
          </span>
        </div>
      </div>
    </div>
  );
}
