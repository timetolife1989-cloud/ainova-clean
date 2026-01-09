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
        
        {/* Line - Cél perc (dotted green) */}
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
        
        {/* Line with dots - Percentage (orange) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="szazalek"
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
    
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl p-4 shadow-2xl">
        <p className="text-white font-bold text-lg mb-3">
          {dataPoint?.datum_label} <span className="text-slate-400 font-normal">({hungarianDay})</span>
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Létszám:</span>
            <span className="text-emerald-400 font-semibold">{dataPoint?.letszam} fő</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Cél perc:</span>
            <span className="text-green-400 font-semibold">{dataPoint?.cel_perc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-slate-400">Leadott perc:</span>
            <span style={{ color: MUSZAK_COLORS[selectedMuszak].bar }} className="font-semibold">
              {dataPoint?.leadott_perc?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-6 pt-2 border-t border-slate-700">
            <span className="text-slate-400">Teljesítmény:</span>
            <span className={`font-bold ${dataPoint?.szazalek >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
              {dataPoint?.szazalek?.toFixed(1)}%
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
        <span>Cél perc = létszám × 480 (szaggatott vonal)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span>Teljesítmény % (pont)</span>
      </div>
    </div>
  );
}
