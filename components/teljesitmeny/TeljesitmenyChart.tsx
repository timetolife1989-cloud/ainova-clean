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
import { ChartDataItem, MuszakType } from './types';
import { MUSZAK_COLORS, getHungarianDayName } from './constants';

interface TeljesitmenyChartProps {
  data: ChartDataItem[];
  selectedMuszak: MuszakType;
  height?: number;
}

export function TeljesitmenyChart({
  data,
  selectedMuszak,
  height = 450,
}: TeljesitmenyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        
        {/* X Axis - Dates */}
        <XAxis
          dataKey="datum_label"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={{ stroke: '#4B5563' }}
        />
        
        {/* Left Y Axis - Perc */}
        <YAxis
          yAxisId="left"
          stroke="#9CA3AF"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          tickLine={{ stroke: '#4B5563' }}
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
          tickLine={{ stroke: '#F59E0B' }}
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
        
        <Tooltip content={<CustomTooltip selectedMuszak={selectedMuszak} />} />
        
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span className="text-slate-300">{value}</span>}
        />
        
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.85} />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>
        
        {/* Bars - Leadott perc */}
        <Bar
          yAxisId="left"
          dataKey="leadott_perc"
          name="Leadott perc"
          fill="url(#barGradientBlue)"
          stroke="#2563EB"
          strokeWidth={2}
          radius={[6, 6, 0, 0]}
          style={{ filter: 'url(#shadow)' }}
        />
        
        {/* Line - Cél perc: Nettó létszám × 480 (ha van War Room adat) */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey={(item: ChartDataItem) => item.netto_cel_perc ?? item.cel_perc}
          name="Cél perc (nettó)"
          stroke="#22C55E"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={false}
        />
        
        {/* Line with dots - Percentage: Nettó % (ha van War Room adat) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={(item: ChartDataItem) => item.netto_szazalek ?? item.szazalek}
          name="Teljesítmény %"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ fill: '#F59E0B', strokeWidth: 0, r: 5 }}
          activeDot={{ fill: '#FBBF24', strokeWidth: 0, r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
  selectedMuszak: MuszakType;
}

function CustomTooltip({ active, payload, selectedMuszak }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    const hungarianDay = getHungarianDayName(dataPoint?.nap_nev);
    
    // Nettó adatok (War Room-ból) vagy fallback a régi értékekre
    const nettoLetszam = dataPoint?.netto_letszam ?? dataPoint?.letszam;
    const nettoCelPerc = dataPoint?.netto_cel_perc ?? dataPoint?.cel_perc;
    const nettoSzazalek = dataPoint?.netto_szazalek ?? dataPoint?.szazalek;
    // has_warroom_data: API küldi, true ha tényleges War Room adat van (nem fallback)
    const hasWarRoomData = dataPoint?.has_warroom_data === true;
    
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl">
        <p className="text-white font-bold text-lg mb-3">
          {dataPoint?.datum_label} <span className="text-slate-400 font-normal">({hungarianDay})</span>
        </p>
        
        {/* Figyelmeztetés ha nincs War Room adat */}
        {!hasWarRoomData && (
          <div className="mb-3 px-2 py-1.5 bg-amber-900/50 border border-amber-600/50 rounded-lg">
            <p className="text-amber-400 text-xs">
              ⚠️ Nincs War Room létszám adat - műszakvezető nem töltötte!
            </p>
            <p className="text-amber-500/70 text-xs mt-0.5">
              Csak visszajelentés alapján számolva.
            </p>
          </div>
        )}
        
        <div className="space-y-2 text-sm">
          {/* Létszám sor - mindkét értéket mutatjuk ha van War Room adat */}
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Létszám:</span>
            <span className="text-emerald-400 font-semibold">
              {hasWarRoomData ? (
                <>
                  <span className="text-cyan-400">{nettoLetszam} nettó</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-slate-400">{dataPoint?.letszam} jelentett</span>
                </>
              ) : (
                <span className="text-amber-400">{dataPoint?.letszam} fő (csak visszajelentés)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Cél perc:</span>
            <span className={hasWarRoomData ? "text-green-400 font-semibold" : "text-amber-400 font-semibold"}>
              {nettoCelPerc?.toLocaleString()}
              {hasWarRoomData ? (
                <span className="text-slate-500 text-xs ml-1">({nettoLetszam}×480)</span>
              ) : (
                <span className="text-amber-500/70 text-xs ml-1">(becsült)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Leadott perc:</span>
            <span style={{ color: MUSZAK_COLORS[selectedMuszak].bar }} className="font-semibold">
              {dataPoint?.leadott_perc?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-6 pt-2 border-t border-slate-700">
            <span className="text-slate-400">Teljesítmény:</span>
            <span className={`font-bold ${hasWarRoomData ? (nettoSzazalek >= 100 ? 'text-green-400' : 'text-yellow-400') : 'text-amber-400'}`}>
              {nettoSzazalek?.toFixed(1)}%
              {!hasWarRoomData && <span className="text-amber-500/70 text-xs ml-1">(becsült)</span>}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// Chart legend component
interface ChartLegendProps {
  selectedMuszak: MuszakType;
}

export function ChartLegend({ selectedMuszak }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-4 rounded"
          style={{ backgroundColor: MUSZAK_COLORS[selectedMuszak].bar, opacity: 0.8 }}
        />
        <span>Leadott perc (oszlop)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 bg-green-500" style={{ borderTop: '3px dashed #22C55E' }} />
        <span>Cél perc = nettó létszám × 480 (szaggatott vonal)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span>Teljesítmény % (pont)</span>
      </div>
    </div>
  );
}
