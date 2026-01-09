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
import { EgyeniOperator, EgyeniTrendData, KimutatType } from './types';
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-900/80">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Törzsszám</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Név</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Műszak</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Pozíció</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Munkanapok</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Átlag %</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Részletek</th>
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
              <td className="px-4 py-2.5 text-sm text-slate-500 font-medium">{idx + 1}.</td>
              <td className="px-4 py-2.5 text-sm text-slate-300 font-mono">{op.torzsszam}</td>
              <td className="px-4 py-2.5 text-sm text-white font-medium">{op.nev}</td>
              <td className="px-4 py-2.5 text-center">
                <MuszakBadge muszak={op.muszak} />
              </td>
              <td className="px-4 py-2.5 text-sm text-slate-400">{op.pozicio}</td>
              <td className="px-4 py-2.5 text-center text-sm text-slate-400">{op.munkanapok} nap</td>
              <td className="px-4 py-2.5 text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getPerformanceColorClass(op.atlag_szazalek)}`}>
                  {op.atlag_szazalek.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <TrendIndicator trend={op.trend} />
              </td>
              <td className="px-4 py-2.5 text-center">
                <button className="text-blue-400 hover:text-blue-300 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
// Trend Indikátor
// ============================================================================

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  const className = 
    trend === 'up' ? 'text-green-400' :
    trend === 'down' ? 'text-red-400' :
    'text-slate-400';
  
  const symbol = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';

  return <span className={`text-xl ${className}`}>{symbol}</span>;
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
