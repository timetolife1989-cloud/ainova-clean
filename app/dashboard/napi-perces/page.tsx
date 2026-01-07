'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Header from '@/components/dashboard/Header';
import AinovaLoader from '@/components/ui/AinovaLoader';

// Types
interface NapiData {
  datum_label: string;
  datum: string;
  nap_nev: string;
  cel_perc: number;
  lehivott_siemens_dc: number;
  lehivott_no_siemens: number;
  lehivott_ossz: number;
  leadott_siemens_dc: number;
  leadott_no_siemens: number;
  leadott_kaco: number;
  leadott_ossz: number;
  lehivas_szazalek: number;
  leadas_szazalek: number;
  leadas_per_lehivas_szazalek: number;
  total_days?: number;
  total_weeks?: number;
  total_months?: number;
}

type KimutatType = 'napi' | 'heti' | 'havi';

// Import status interface
interface ImportStatus {
  last_import: string | null;
  total_records: number;
  unique_days: number;
}

// Custom tooltip component - csak leadás
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="text-white font-bold mb-2 text-sm">{label}</p>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between border-b border-slate-600 pb-2">
          <span className="text-green-400">Cél:</span>
          <span className="text-white font-semibold">{data.cel_perc?.toLocaleString()} perc</span>
        </div>
        
        <div className="space-y-1">
          <p className="text-blue-400 font-medium">Leadás részletesen:</p>
          <div className="flex justify-between">
            <span className="text-blue-300">Siemens DC:</span>
            <span className="text-white">{data.leadott_siemens_dc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-300">No Siemens:</span>
            <span className="text-white">{data.leadott_no_siemens?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-teal-300">Kaco:</span>
            <span className="text-white">{data.leadott_kaco?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
            <span className="text-cyan-400 font-semibold">Összesen:</span>
            <span className="text-cyan-400 font-bold">{data.leadott_ossz?.toLocaleString()} perc</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Teljesítmény:</span>
            <span className={`font-bold ${data.leadas_szazalek >= 100 ? 'text-green-400' : data.leadas_szazalek >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {data.leadas_szazalek?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom label az oszlop tetején - összeg megjelenítése
const renderBarLabel = (props: any) => {
  const { x, y, width, value, payload } = props;
  if (!payload || !payload.leadott_ossz) return null;
  
  const total = payload.leadott_ossz;
  if (total === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#94A3B8"
      textAnchor="middle"
      fontSize={9}
      fontWeight="bold"
    >
      {(total / 1000).toFixed(1)}k
    </text>
  );
};

export default function NapiPercesPage() {
  // State
  const [activeKimutat, setActiveKimutat] = useState<KimutatType>('napi');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<NapiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);

  // Page sizes
  const pageSize = activeKimutat === 'napi' ? 20 : 12;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type: activeKimutat,
          offset: offset.toString(),
        });

        const response = await fetch(`/api/napi-perces?${params.toString()}`);
        if (!response.ok) throw new Error('Hiba az adatok betöltésekor');
        
        const result = await response.json();
        setData(result.data || []);
        
        // Set total from first record
        if (result.data?.length > 0) {
          const first = result.data[0];
          if (activeKimutat === 'napi') {
            setTotalItems(first.total_days || 0);
          } else if (activeKimutat === 'heti') {
            setTotalItems(first.total_weeks || 0);
          } else {
            setTotalItems(first.total_months || 0);
          }
        }
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeKimutat, offset]);

  // Fetch import status
  useEffect(() => {
    const fetchImportStatus = async () => {
      try {
        const response = await fetch('/api/napi-perces/import');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.stats) {
            setImportStatus({
              last_import: result.stats.last_import,
              total_records: result.stats.total_records,
              unique_days: result.stats.unique_days,
            });
          }
        }
      } catch (err) {
        console.error('Import status fetch error:', err);
      }
    };
    fetchImportStatus();
  }, []);

  // Pagination
  const canGoBack = activeKimutat !== 'havi' && totalItems > offset + pageSize;
  const canGoForward = activeKimutat !== 'havi' && offset > 0;

  const handlePrevious = () => {
    if (canGoBack) setOffset(offset + pageSize);
  };

  const handleNext = () => {
    if (canGoForward) setOffset(Math.max(0, offset - pageSize));
  };

  // Kimutat change handler
  const handleKimutatChange = (kimutat: KimutatType) => {
    setActiveKimutat(kimutat);
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header pageTitle="Napi Perces" />
      
      <main className="p-6 pt-[90px]">
        {/* Import Status Bar - like Teljesítmény module */}
        <div className="mb-4 flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${importStatus?.total_records ? 'bg-emerald-400' : 'bg-yellow-400'} animate-pulse`} />
              <span className="text-xs text-slate-400">Utolsó szinkronizálás:</span>
              <span className="text-xs text-white font-medium">
                {importStatus?.last_import 
                  ? new Date(importStatus.last_import).toLocaleString('hu-HU')
                  : 'Nincs adat'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Rekordok:</span>
              <span className="text-xs text-emerald-400 font-medium">
                {importStatus?.total_records?.toLocaleString() || 0}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Napok:</span>
              <span className="text-xs text-blue-400 font-medium">
                {importStatus?.unique_days || 0} nap
              </span>
            </div>
          </div>
        </div>

        {/* Controls - Title + Buttons + Navigation */}
        <div className="flex items-start gap-8 mb-4">
          {/* Left Section: Title and buttons */}
          <div className="flex-1">
            <div className="mb-2">
              <h2 className="text-lg font-bold text-white">Lehívás vs Leadás kimutatás</h2>
              <p className="text-xs text-slate-400">Napi cél, lehívott és leadott percek összehasonlítása</p>
            </div>
            <div className="flex items-center gap-2">
              {(['napi', 'heti', 'havi'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => handleKimutatChange(k)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeKimutat === k
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {k === 'napi' ? 'Napi' : k === 'heti' ? 'Heti' : 'Havi'}
                </button>
              ))}
            </div>
          </div>

          {/* Right Section: Navigation */}
          {activeKimutat !== 'havi' && (
            <div className="flex items-center gap-2 pt-8">
              <button
                onClick={handlePrevious}
                disabled={!canGoBack}
                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Régebbi"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-slate-400 text-sm px-3">
                {Math.min(offset + pageSize, totalItems)} / {totalItems} {activeKimutat === 'napi' ? 'nap' : 'hét'}
              </span>
              <button
                onClick={handleNext}
                disabled={!canGoForward}
                className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Újabb"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Chart Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-cyan-600/80 to-blue-600/80 border-b border-slate-600/50">
            <h3 className="text-sm font-semibold text-white">
              {activeKimutat === 'napi' ? 'Napi' : activeKimutat === 'heti' ? 'Heti' : 'Havi'} kimutatás
              {data.length > 0 && ` - ${data[0]?.datum_label || ''} - ${data[data.length - 1]?.datum_label || ''}`}
            </h3>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <AinovaLoader />
              </div>
            ) : error ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-500 text-4xl mb-3">⚠️</div>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            ) : data.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-slate-500 text-4xl mb-3">📊</div>
                  <p className="text-slate-400 text-sm">Nincs adat a kiválasztott időszakra</p>
                  <p className="text-slate-500 text-xs mt-2">Az adatok automatikusan betöltődnek az Excel fájlból</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data} margin={{ top: 30, right: 60, left: 20, bottom: 20 }}>
                  <defs>
                    {/* Leadás gradients - Siemens=sötétkék, NoSiemens=világoskék, Kaco=narancs */}
                    <linearGradient id="leadottSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1E3A8A" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="leadottNoSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="leadottKacoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB923C" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  
                  <XAxis
                    dataKey="datum_label"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  
                  {/* Left Y Axis - Perc */}
                  <YAxis
                    yAxisId="left"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => value.toLocaleString()}
                    label={{
                      value: 'Perc',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#9CA3AF',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  
                  {/* Right Y Axis - Percentage */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#F59E0B"
                    tick={{ fill: '#F59E0B', fontSize: 12 }}
                    domain={[0, 150]}
                    tickFormatter={(value) => `${value}%`}
                    label={{
                      value: '%',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#F59E0B',
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  
                  {/* Leadás - Stacked (Blue tones) - összes leadott perc */}
                  <Bar
                    yAxisId="left"
                    dataKey="leadott_siemens_dc"
                    name="Siemens DC"
                    stackId="leadas"
                    fill="url(#leadottSiemensGradient)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="leadott_no_siemens"
                    name="No Siemens"
                    stackId="leadas"
                    fill="url(#leadottNoSiemensGradient)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="leadott_kaco"
                    name="Kaco"
                    stackId="leadas"
                    fill="url(#leadottKacoGradient)"
                    radius={[4, 4, 0, 0]}
                    label={renderBarLabel}
                  />
                  
                  {/* Cél vonal (green dashed) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cel_perc"
                    name="Cél perc"
                    stroke="#22C55E"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={false}
                  />
                  
                  {/* Leadás % vonal */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="leadas_szazalek"
                    name="Teljesítmény %"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend description */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#1E3A8A' }} />
                <span>Siemens DC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#38BDF8' }} />
                <span>No Siemens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#FB923C' }} />
                <span>Kaco</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#22C55E' }} />
                <span>Cél perc</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
                <span>Teljesítmény %</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data table */}
        {!loading && data.length > 0 && (
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
                    <td className="px-3 py-2 text-right text-green-400">{data.reduce((s, d) => s + (d.cel_perc || 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-blue-400">{data.reduce((s, d) => s + (d.leadott_siemens_dc || 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-sky-400">{data.reduce((s, d) => s + (d.leadott_no_siemens || 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-cyan-400">{data.reduce((s, d) => s + (d.leadott_kaco || 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-cyan-300">{data.reduce((s, d) => s + (d.leadott_ossz || 0), 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-amber-400">
                      {(data.reduce((s, d) => s + (d.leadott_ossz || 0), 0) / data.reduce((s, d) => s + (d.cel_perc || 0), 0) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
