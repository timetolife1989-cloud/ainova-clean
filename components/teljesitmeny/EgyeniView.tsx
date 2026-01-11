'use client';

import React from 'react';
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
import { EgyeniOperator, EgyeniTrendData, KimutatType, PozicioTrendData } from './types';
import { getPerformanceColorClass, getPerformanceTextColor } from './constants';
import { MuszakBadge } from './MuszakDropdown';
import AinovaLoader from '@/components/ui/AinovaLoader';

// ============================================================================
// Operátor Ranglista Tábla
// ============================================================================

interface OperatorRanglistaProps {
  operatorok: EgyeniOperator[];
  onSelectOperator: (operator: EgyeniOperator) => void;
}

export function OperatorRanglista({ operatorok, onSelectOperator }: OperatorRanglistaProps) {
  if (operatorok.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 text-5xl mb-4">👷</div>
          <p className="text-slate-400">Nincs operátor a szűrési feltételekhez</p>
        </div>
      </div>
    );
  }

  // Hónap, hét és utolsó nap labelek az első operátorból (mind ugyanaz lesz)
  const haviLabel = operatorok[0]?.havi_label || 'Havi';
  const hetiLabel = operatorok[0]?.heti_label || 'Hét';
  const utolsoNapLabel = operatorok[0]?.utolso_nap_label || 'Utolsó';

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-900/80">
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Törzsszám / Név</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">Műsz</th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pozíció</th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div>Összes</div>
              <div className="text-[10px] text-slate-500 normal-case">30 nap</div>
            </th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div>{haviLabel}</div>
              <div className="text-[10px] text-slate-500 normal-case">hónap</div>
            </th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div>{hetiLabel}</div>
            </th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div>{utolsoNapLabel}</div>
            </th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {operatorok.map((op, idx) => (
            <tr
              key={op.torzsszam}
              className={`hover:bg-slate-700/30 transition-colors cursor-pointer ${
                idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
              }`}
              onClick={() => onSelectOperator(op)}
            >
              {/* # */}
              <td className="px-2 py-1.5 text-sm text-slate-500 font-medium">{idx + 1}.</td>
              
              {/* Törzsszám / Név */}
              <td className="px-2 py-1.5">
                <div className="text-sm text-white font-medium">{op.nev}</div>
                <div className="text-xs text-slate-500 font-mono">{op.torzsszam}</div>
              </td>
              
              {/* Műszak */}
              <td className="px-2 py-1.5 text-center">
                <MuszakBadge muszak={op.muszak} />
              </td>
              
              {/* Pozíció */}
              <td className="px-2 py-1.5 text-xs text-slate-400 truncate max-w-[100px]" title={op.pozicio}>
                {op.pozicio}
              </td>
              
              {/* Összes (30 nap) */}
              <td className="px-2 py-1.5 text-center">
                <div className="text-xs text-slate-400">{op.munkanapok} nap</div>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${getPerformanceColorClass(op.atlag_szazalek)}`}>
                  {op.atlag_szazalek.toFixed(1)}%
                </span>
              </td>
              
              {/* Havi */}
              <td className="px-2 py-1.5 text-center">
                {op.havi_munkanapok > 0 ? (
                  <>
                    <div className="text-xs text-slate-400">{op.havi_munkanapok} nap</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${getPerformanceColorClass(op.havi_szazalek)}`}>
                      {op.havi_szazalek.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </td>
              
              {/* Heti */}
              <td className="px-2 py-1.5 text-center">
                {op.heti_munkanapok > 0 ? (
                  <>
                    <div className="text-xs text-slate-400">{op.heti_munkanapok} nap</div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${getPerformanceColorClass(op.heti_szazalek)}`}>
                      {op.heti_szazalek.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </td>
              
              {/* Utolsó nap */}
              <td className="px-2 py-1.5 text-center">
                {op.utolso_nap_szazalek !== null ? (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${getPerformanceColorClass(op.utolso_nap_szazalek)}`}>
                    {op.utolso_nap_szazalek.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">-</span>
                )}
              </td>
              
              {/* Részletek */}
              <td className="px-2 py-1.5 text-center">
                <button className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Egyéni Trend Nézet
// ============================================================================

interface EgyeniTrendViewProps {
  operator: EgyeniOperator;
  trendData: EgyeniTrendData[];
  kimutat: KimutatType;
  offset: number;
  totalItems: number;
  loading: boolean;
  onKimutatChange: (kimutat: KimutatType) => void;
  onOffsetChange: (offset: number) => void;
}

export function EgyeniTrendView({
  operator,
  trendData,
  kimutat,
  offset,
  totalItems,
  loading,
  onKimutatChange,
  onOffsetChange,
}: EgyeniTrendViewProps) {
  const pageSize = kimutat === 'napi' ? 20 : 12;
  const canGoBack = totalItems > offset + pageSize;
  const canGoForward = offset > 0;

  return (
    <div>
      {/* Kimutat buttons + Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {(['napi', 'heti', 'havi'] as KimutatType[]).map((k) => (
            <button
              key={k}
              onClick={() => onKimutatChange(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                kimutat === k
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {k === 'napi' ? 'Napi' : k === 'heti' ? 'Heti' : 'Havi'}
            </button>
          ))}
        </div>

        {/* Navigation arrows - only for napi and heti */}
        {kimutat !== 'havi' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => canGoBack && onOffsetChange(offset + pageSize)}
              disabled={!canGoBack}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Régebbi"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-slate-400 text-sm px-2">
              {kimutat === 'napi'
                ? `${Math.min(offset + 20, totalItems)} / ${totalItems} nap`
                : `${Math.min(offset + 12, totalItems)} / ${totalItems} hét`}
            </span>
            <button
              onClick={() => canGoForward && onOffsetChange(Math.max(0, offset - pageSize))}
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

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <InfoCard label="Törzsszám" value={operator.torzsszam} mono />
        <InfoCard label="Pozíció" value={operator.pozicio} />
        <InfoCard
          label="Átlag teljesítmény"
          value={`${operator.atlag_szazalek.toFixed(1)}%`}
          colorClass={getPerformanceTextColor(operator.atlag_szazalek)}
        />
      </div>

      {/* Trend chart */}
      {loading ? (
        <div className="h-[350px] flex items-center justify-center">
          <AinovaLoader />
        </div>
      ) : trendData.length === 0 ? (
        <div className="h-[350px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 text-5xl mb-4">📈</div>
            <p className="text-slate-400">Nincs trend adat</p>
          </div>
        </div>
      ) : (
        <>
          <EgyeniTrendChart data={trendData} />
          <EgyeniTrendLegend />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Info Card
// ============================================================================

interface InfoCardProps {
  label: string;
  value: string;
  mono?: boolean;
  colorClass?: string;
}

function InfoCard({ label, value, mono, colorClass }: InfoCardProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-lg ${mono ? 'font-mono' : ''} ${colorClass || 'text-white'} font-bold`}>
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Egyéni Trend Chart
// ============================================================================

interface EgyeniTrendChartProps {
  data: EgyeniTrendData[];
}

function EgyeniTrendChart({ data }: EgyeniTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
        <defs>
          <linearGradient id="egyeniBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.85} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="datum_label"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
        />
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
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#F59E0B"
          tick={{ fill: '#F59E0B', fontSize: 12 }}
          domain={[0, 150]}
          tickFormatter={(value) => `${value}%`}
          label={{
            value: 'Teljesítmény %',
            angle: 90,
            position: 'insideRight',
            fill: '#F59E0B',
            style: { textAnchor: 'middle' },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E293B',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#F8FAFC',
          }}
          formatter={(value, name) => {
            const val = Number(value) || 0;
            if (name === 'leadott_perc') return [`${val.toLocaleString()} perc`, 'Leadott perc'];
            if (name === 'cel_perc') return [`${val.toLocaleString()} perc`, 'Cél perc'];
            if (name === 'szazalek') return [`${val.toFixed(1)}%`, 'Teljesítmény'];
            return [val, name];
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => (
            <span className="text-slate-300">
              {value === 'leadott_perc' ? 'Leadott perc' :
               value === 'cel_perc' ? 'Cél perc (480/nap)' :
               value === 'szazalek' ? 'Teljesítmény %' : value}
            </span>
          )}
        />
        <Bar
          yAxisId="left"
          dataKey="leadott_perc"
          name="leadott_perc"
          fill="url(#egyeniBarGradient)"
          stroke="#2563EB"
          strokeWidth={2}
          radius={[6, 6, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="cel_perc"
          name="cel_perc"
          stroke="#22C55E"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="szazalek"
          name="szazalek"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ fill: '#F59E0B', strokeWidth: 0, r: 5 }}
          activeDot={{ fill: '#FBBF24', strokeWidth: 0, r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function EgyeniTrendLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
      <div className="flex items-center gap-2">
        <div className="w-6 h-4 rounded bg-blue-500/80" />
        <span>Leadott perc (oszlop)</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-0.5 bg-green-500"
          style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: '#22C55E' }}
        />
        <span>Cél perc - 480/nap (szaggatott)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-blue-500" />
        <span>Teljesítmény % (vonal)</span>
      </div>
    </div>
  );
}

// ============================================================================
// Pozíció Trend View - Pozíció-szintű aggregált napi/heti/havi teljesítmény
// ============================================================================

interface PozicioTrendViewProps {
  pozicio: string;
  trendData: PozicioTrendData[];
  kimutat: 'napi' | 'heti' | 'havi';
  offset: number;
  totalItems: number;
  loading: boolean;
  onKimutatChange: (kimutat: 'napi' | 'heti' | 'havi') => void;
  onOffsetChange: (offset: number) => void;
}

export function PozicioTrendView({
  pozicio,
  trendData,
  kimutat,
  offset,
  totalItems,
  loading,
  onKimutatChange,
  onOffsetChange,
}: PozicioTrendViewProps) {
  const pageSize = kimutat === 'napi' ? 14 : 12;
  const canGoBack = kimutat !== 'havi' && totalItems > offset + pageSize;
  const canGoForward = kimutat !== 'havi' && offset > 0;

  // Átlagos teljesítmény a megjelenített adatokból
  const avgSzazalek = trendData.length > 0
    ? trendData.reduce((sum, d) => sum + (d.szazalek || 0), 0) / trendData.length
    : 0;
  
  // Átlag létszám
  const avgLetszam = trendData.length > 0
    ? Math.round(trendData.reduce((sum, d) => sum + (d.letszam || 0), 0) / trendData.length)
    : 0;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">📊 {pozicio} teljesítmény</h3>
          <span className="text-slate-400 text-sm">
            (Átlag: {avgLetszam} fő, {avgSzazalek.toFixed(1)}%)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Napi/Heti/Havi váltó */}
          {(['napi', 'heti', 'havi'] as const).map((k) => (
            <button
              key={k}
              onClick={() => onKimutatChange(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                kimutat === k
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {k === 'napi' ? 'Napi' : k === 'heti' ? 'Heti' : 'Havi'}
            </button>
          ))}

          {/* Navigation arrows - only for napi/heti */}
          {kimutat !== 'havi' && (
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => canGoBack && onOffsetChange(offset + pageSize)}
                disabled={!canGoBack}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Régebbi"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-slate-400 text-xs px-2">
                {kimutat === 'napi'
                  ? `${Math.min(offset + 14, totalItems)} / ${totalItems} nap`
                  : `${Math.min(offset + 12, totalItems)} / ${totalItems} hét`}
              </span>
              <button
                onClick={() => canGoForward && onOffsetChange(Math.max(0, offset - pageSize))}
                disabled={!canGoForward}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Újabb"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[280px] flex items-center justify-center">
          <AinovaLoader />
        </div>
      ) : trendData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 text-4xl mb-3">📈</div>
            <p className="text-slate-400 text-sm">Nincs trend adat ehhez a pozícióhoz</p>
          </div>
        </div>
      ) : (
        <>
          <PozicioTrendChart data={trendData} />
          <PozicioTrendLegend />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Pozíció Trend Chart
// ============================================================================

interface PozicioTrendChartProps {
  data: PozicioTrendData[];
}

function PozicioTrendChart({ data }: PozicioTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 15, right: 60, left: 20, bottom: 15 }}>
        <defs>
          <linearGradient id="pozicioBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.85} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="datum_label"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 10 }}
        />
        <YAxis
          yAxisId="left"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          tickFormatter={(value) => value.toLocaleString()}
          label={{
            value: 'Perc',
            angle: -90,
            position: 'insideLeft',
            fill: '#9CA3AF',
            style: { textAnchor: 'middle', fontSize: 11 },
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#10B981"
          tick={{ fill: '#10B981', fontSize: 11 }}
          domain={[0, 150]}
          tickFormatter={(value) => `${value}%`}
          label={{
            value: '%',
            angle: 90,
            position: 'insideRight',
            fill: '#10B981',
            style: { textAnchor: 'middle', fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E293B',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#F8FAFC',
          }}
          formatter={(value, name) => {
            const val = Number(value) || 0;
            if (name === 'leadott_perc') return [`${val.toLocaleString()} perc`, 'Leadott perc'];
            if (name === 'cel_perc') return [`${val.toLocaleString()} perc`, 'Cél perc'];
            if (name === 'szazalek') return [`${val.toFixed(1)}%`, 'Teljesítmény'];
            if (name === 'letszam') return [`${val} fő`, 'Létszám'];
            return [val, name];
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          formatter={(value) => (
            <span className="text-slate-300 text-xs">
              {value === 'leadott_perc' ? 'Leadott perc' :
               value === 'cel_perc' ? 'Cél perc' :
               value === 'szazalek' ? 'Teljesítmény %' : value}
            </span>
          )}
        />
        <Bar
          yAxisId="left"
          dataKey="leadott_perc"
          name="leadott_perc"
          fill="url(#pozicioBarGradient)"
          stroke="#7C3AED"
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="cel_perc"
          name="cel_perc"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="szazalek"
          name="szazalek"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ fill: '#10B981', strokeWidth: 0, r: 4 }}
          activeDot={{ fill: '#34D399', strokeWidth: 0, r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PozicioTrendLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <div className="w-5 h-3 rounded bg-purple-500/80" />
        <span>Leadott perc</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-0.5"
          style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: '#F59E0B' }}
        />
        <span>Cél perc</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span>Teljesítmény %</span>
      </div>
    </div>
  );
}
