'use client';

import React from 'react';
import { ImportStatus } from './types';

interface ImportStatusBarProps {
  status: ImportStatus;
}

export function ImportStatusBar({ status }: ImportStatusBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Utolsó szinkronizálás:</span>
          <span className="text-xs text-white font-medium">
            {status.last_import_at
              ? new Date(status.last_import_at).toLocaleString('hu-HU')
              : 'Nincs adat'}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Rekordok:</span>
          <span className="text-xs text-emerald-400 font-medium">
            {status.records_imported?.toLocaleString() || 0}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Operátorok:</span>
          <span className="text-xs text-blue-400 font-medium">
            {status.unique_operators || 0} fő
          </span>
        </div>
      </div>
    </div>
  );
}
