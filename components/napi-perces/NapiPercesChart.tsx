// =====================================================
// AINOVA - Napi Perces Chart komponens
// =====================================================

'use client';

import { motion } from 'framer-motion';
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
import AinovaLoader from '@/components/ui/AinovaLoader';
import ChartTooltip from './ChartTooltip';
import { NapiData, KimutatType, KIMUTAT_LABELS } from './types';

interface NapiPercesChartProps {
  data: NapiData[];
  loading: boolean;
  error: string | null;
  activeKimutat: KimutatType;
}

// Custom label az oszlop tetején - összeg megjelenítése
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderBarLabel = (props: any) => {
  const { x, y, width, payload } = props;
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

export default function NapiPercesChart({ data, loading, error, activeKimutat }: NapiPercesChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-600/80 to-blue-600/80 border-b border-slate-600/50">
        <h3 className="text-sm font-semibold text-white">
          {KIMUTAT_LABELS[activeKimutat]} kimutatás
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
                {/* Leadás gradients */}
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
              
              <Tooltip content={<ChartTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-slate-300">{value}</span>}
              />
              
              {/* Leadás - Stacked bars */}
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
              
              {/* Cél vonal */}
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
  );
}
