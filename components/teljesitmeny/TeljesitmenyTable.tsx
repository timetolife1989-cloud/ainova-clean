'use client';

import React from 'react';
import { ChartDataItem, MuszakType, KimutatType } from './types';
import { MUSZAK_COLORS, getHungarianDayName, getPerformanceColorClass } from './constants';

interface TeljesitmenyTableProps {
  data: ChartDataItem[];
  selectedMuszak: MuszakType;
  activeKimutat: KimutatType;
}

export function TeljesitmenyTable({
  data,
  selectedMuszak,
  activeKimutat,
}: TeljesitmenyTableProps) {
  // Calculate totals
  const totalCelPerc = data.reduce((s, d) => s + d.cel_perc, 0);
  const totalLeadottPerc = data.reduce((s, d) => s + d.leadott_perc, 0);
  const avgSzazalek = data.length > 0 ? data.reduce((s, d) => s + d.szazalek, 0) / data.length : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-900/80">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {activeKimutat === 'napi' ? 'Dátum' : activeKimutat === 'heti' ? 'Hét' : 'Hónap'}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {activeKimutat === 'napi' ? 'Nap' : 'Munkanapok'}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Létszám
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-green-400 uppercase tracking-wider">
              Cél perc
            </th>
            <th 
              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
              style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}
            >
              Leadott
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Teljesítmény
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {data.map((row, idx) => (
            <tr
              key={row.datum_label + '-' + idx}
              className={`hover:bg-slate-700/30 transition-colors ${
                idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
              }`}
            >
              <td className="px-4 py-2.5 text-sm text-white font-medium">
                {row.datum_label}
              </td>
              <td className="px-4 py-2.5 text-sm text-slate-400">
                {activeKimutat === 'napi' ? getHungarianDayName(row.nap_nev) : row.nap_nev}
              </td>
              <td className="px-4 py-2.5 text-sm text-slate-300 text-right">
                {row.letszam}
              </td>
              <td className="px-4 py-2.5 text-sm text-green-400 text-right font-medium">
                {row.cel_perc.toLocaleString()}
              </td>
              <td
                className="px-4 py-2.5 text-sm text-right font-medium"
                style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}
              >
                {row.leadott_perc.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getPerformanceColorClass(row.szazalek)}`}>
                  {row.szazalek.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-900/80 border-t-2 border-slate-600">
            <td className="px-4 py-3 text-sm font-bold text-white" colSpan={2}>
              Összesen
            </td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right font-bold">
              -
            </td>
            <td className="px-4 py-3 text-sm text-green-400 text-right font-bold">
              {totalCelPerc.toLocaleString()}
            </td>
            <td
              className="px-4 py-3 text-sm text-right font-bold"
              style={{ color: MUSZAK_COLORS[selectedMuszak].bar }}
            >
              {totalLeadottPerc.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                {avgSzazalek.toFixed(1)}%
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
