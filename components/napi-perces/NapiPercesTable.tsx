// =====================================================
// AINOVA - Napi Perces Adattábla komponens
// =====================================================

'use client';

import { motion } from 'framer-motion';
import { NapiData } from './types';

interface NapiPercesTableProps {
  data: NapiData[];
}

export default function NapiPercesTable({ data }: NapiPercesTableProps) {
  // Összesítések
  const totals = {
    cel_perc: data.reduce((s, d) => s + (d.cel_perc || 0), 0),
    leadott_siemens_dc: data.reduce((s, d) => s + (d.leadott_siemens_dc || 0), 0),
    leadott_no_siemens: data.reduce((s, d) => s + (d.leadott_no_siemens || 0), 0),
    leadott_kaco: data.reduce((s, d) => s + (d.leadott_kaco || 0), 0),
    leadott_ossz: data.reduce((s, d) => s + (d.leadott_ossz || 0), 0),
  };
  
  const avgPercent = totals.cel_perc > 0 
    ? (totals.leadott_ossz / totals.cel_perc * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden"
    >
      <div className="px-4 py-3 bg-slate-700/50">
        <h3 className="text-sm font-semibold text-white">Részletes adatok</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase">Dátum</th>
              <th className="px-3 py-2 text-right font-semibold text-green-400 uppercase">Cél</th>
              <th className="px-3 py-2 text-right font-semibold text-blue-400 uppercase">Siemens</th>
              <th className="px-3 py-2 text-right font-semibold text-sky-400 uppercase">No Siemens</th>
              <th className="px-3 py-2 text-right font-semibold text-cyan-400 uppercase">Kaco</th>
              <th className="px-3 py-2 text-right font-semibold text-cyan-400 uppercase">Leadás Σ</th>
              <th className="px-3 py-2 text-right font-semibold text-amber-400 uppercase">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {data.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                <td className="px-3 py-2 text-white font-medium">{row.datum_label}</td>
                <td className="px-3 py-2 text-right text-green-400">{row.cel_perc?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-blue-400">{row.leadott_siemens_dc?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-sky-400">{row.leadott_no_siemens?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-cyan-400">{row.leadott_kaco?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-cyan-300 font-semibold">{row.leadott_ossz?.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-semibold ${row.leadas_szazalek >= 100 ? 'text-green-400' : row.leadas_szazalek >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                  {row.leadas_szazalek?.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900/80">
            <tr className="font-bold text-xs">
              <td className="px-3 py-2 text-white">Összesen</td>
              <td className="px-3 py-2 text-right text-green-400">{totals.cel_perc.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-blue-400">{totals.leadott_siemens_dc.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-sky-400">{totals.leadott_no_siemens.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-cyan-400">{totals.leadott_kaco.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-cyan-300">{totals.leadott_ossz.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-amber-400">
                {avgPercent.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
