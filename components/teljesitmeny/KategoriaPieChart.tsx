'use client';

import React, { useMemo, useState } from 'react';
import { useAutoRefresh, REFRESH_CONFIG } from '@/hooks';

interface KategoriaAdat {
  kod: string;
  nev: string;
  szin: string;
  perc: number;
  szazalek: number;
}

interface KategoriaPercData {
  success: boolean;
  type: string;
  osszPerc: number;
  adatok: KategoriaAdat[];
  elerheto?: {
    min_datum: string;
    max_datum: string;
    napok_szama: number;
  };
}

interface KategoriaPieChartProps {
  viewType: 'napi' | 'heti' | 'havi';
  selectedMuszak?: 'A' | 'B' | 'C' | 'SUM';
  /** Elérhető dátumok a fő chartból (YYYY-MM-DD formátum) */
  availableDates?: string[];
}

// Modern színpaletta - harmonikus, elegáns
const MODERN_COLORS: Record<string, string> = {
  'Szerelés':       '#d4a037',  // Arany
  'Végszerelés':    '#10b981',  // Smaragd
  'Tekercselés':    '#3b82f6',  // Kék
  'Előkészítés':    '#8b5cf6',  // Lila
  'Mérés':          '#06b6d4',  // Cyan
  'Csomagolás':     '#22c55e',  // Zöld
  'Marás-Ónozás':   '#ef4444',  // Piros
  'Impregnálás':    '#ec4899',  // Rózsaszín
  'AWI_HEGESZTES':  '#f97316',  // Narancs
};

// Polar koordináta konverzió
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Coxcomb/Polar area szelet - egyenlő szög, változó sugár
function createPolarSlice(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  
  return `
    M ${outerStart.x} ${outerStart.y}
    A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
}

export default function KategoriaPieChart({ viewType, selectedMuszak = 'SUM', availableDates = [] }: KategoriaPieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Kiválasztott dátum index - alapból az utolsó (legfrissebb)
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(-1);
  
  // Aktuális kiválasztott dátum
  const selectedDatum = availableDates.length > 0 
    ? (selectedDateIndex >= 0 ? availableDates[selectedDateIndex] : availableDates[availableDates.length - 1])
    : undefined;

  // Központi hook használata - egységes frissítés
  // viewType, muszak és datum változásnál újra fetch-elünk
  const fetcher = React.useCallback(async () => {
    const muszakParam = selectedMuszak || 'SUM';
    let url = `/api/teljesitmeny/kategoria-perc?type=${viewType}&muszak=${muszakParam}`;
    if (selectedDatum && viewType === 'napi') {
      url += `&datum=${selectedDatum}`;
    }
    const response = await fetch(url);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Hiba történt');
    return result;
  }, [viewType, selectedMuszak, selectedDatum]);

  const { data, loading, error, refetch } = useAutoRefresh<KategoriaPercData>({
    fetcher,
    interval: REFRESH_CONFIG.DEFAULT_INTERVAL,
    refetchOnFocus: true,
    refetchOnVisibilityChange: true,
  });

  // viewType, muszak vagy datum változáskor azonnal újra fetch-elünk
  React.useEffect(() => {
    refetch();
  }, [viewType, selectedMuszak, selectedDatum]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Ha availableDates változik, reset a selectedDateIndex-et
  React.useEffect(() => {
    setSelectedDateIndex(-1); // -1 = utolsó (legfrissebb)
  }, [availableDates.length]);

  // Adatok rendezése és színezése + szelet számítás
  const slices = useMemo(() => {
    if (!data?.adatok?.length) return [];
    
    const items = [...data.adatok].map((item) => ({
      ...item,
      szin: MODERN_COLORS[item.nev] || item.szin,
    }));
    
    // Egyenlő szögű szeletek (Coxcomb stílus)
    const sliceAngle = 360 / items.length;
    const gap = 2; // Kis rés a szeletek között
    
    // Max érték a sugár skálázáshoz
    const maxPerc = Math.max(...items.map(i => i.perc));
    
    return items.map((item, index) => {
      const startAngle = index * sliceAngle + gap / 2;
      const endAngle = (index + 1) * sliceAngle - gap / 2;
      const midAngle = (startAngle + endAngle) / 2;
      
      // Sugár az értéknek megfelelően (min 40%, max 100%)
      const radiusRatio = 0.4 + (item.perc / maxPerc) * 0.6;
      
      return {
        ...item,
        index,
        startAngle,
        endAngle,
        midAngle,
        radiusRatio,
      };
    });
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!slices.length) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 text-4xl mb-3">📊</div>
          <p className="text-slate-400">Nincs kategória adat</p>
          <p className="text-slate-500 text-sm mt-1">Futtasd a sync scriptet</p>
        </div>
      </div>
    );
  }

  // Chart méretek - Coxcomb/Polar Area stílus
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 175;
  const innerRadius = 50;

  return (
    <div className="mt-6 border-t border-slate-700/50 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">📊</span>
            Leadott percek kategóriánként
            <span className="text-slate-400 text-sm font-normal ml-1">
              ({viewType === 'napi' ? 'napi' : viewType === 'heti' ? 'heti' : 'havi'} bontás)
            </span>
            {selectedMuszak !== 'SUM' && (
              <span className="text-xs text-cyan-400 font-normal ml-2">
                {selectedMuszak} műszak
              </span>
            )}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {data?.osszPerc?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 tracking-wide">összes perc</p>
        </div>
      </div>
      
      {/* Dátum választó - csak napi nézetben és ha van több dátum */}
      {viewType === 'napi' && availableDates.length > 1 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">Nap:</span>
          {availableDates.map((dateStr, idx) => {
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString('hu-HU', { weekday: 'short' });
            const dayNum = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const isSelected = selectedDateIndex === idx || (selectedDateIndex === -1 && idx === availableDates.length - 1);
            
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateIndex(idx)}
                className={`px-2 py-1 text-xs rounded-md transition-all ${
                  isSelected
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700 hover:text-slate-300'
                }`}
                title={dateStr}
              >
                {month}.{dayNum} {dayName}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Coxcomb / Polar Area Chart */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Háttér glow */}
            <div 
              className="absolute inset-0 blur-3xl opacity-25 transition-all duration-500"
              style={{
                background: hoveredIndex !== null 
                  ? `radial-gradient(circle, ${slices[hoveredIndex]?.szin} 0%, transparent 60%)`
                  : 'radial-gradient(circle, #334155 0%, transparent 60%)',
              }}
            />
            
            <svg 
              width={size} 
              height={size} 
              viewBox={`0 0 ${size} ${size}`}
              className="relative z-10"
            >
              <defs>
                {/* Árnyék filter */}
                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.4"/>
                </filter>
                
                {/* Glow filter hover-hez */}
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                {/* Központi gradient */}
                <radialGradient id="centerGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </radialGradient>
                
                {/* Szeletek gradientjei */}
                {slices.map((slice, i) => (
                  <linearGradient 
                    key={`grad-${i}`} 
                    id={`sliceGrad-${i}`} 
                    x1="0%" 
                    y1="0%" 
                    x2="100%" 
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={slice.szin} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={slice.szin} stopOpacity="0.7" />
                  </linearGradient>
                ))}
              </defs>

              {/* Háttér körök - referencia vonalak */}
              {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={innerRadius + (maxRadius - innerRadius) * ratio}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  opacity="0.3"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Polar szeletek */}
              {slices.map((slice, idx) => {
                const isHovered = hoveredIndex === idx;
                const outerR = innerRadius + (maxRadius - innerRadius) * slice.radiusRatio;
                const hoverOuterR = isHovered ? outerR + 8 : outerR;
                const hoverInnerR = isHovered ? innerRadius - 3 : innerRadius;
                
                return (
                  <g key={idx}>
                    {/* Fő szelet */}
                    <path
                      d={createPolarSlice(cx, cy, hoverInnerR, hoverOuterR, slice.startAngle, slice.endAngle)}
                      fill={`url(#sliceGrad-${idx})`}
                      stroke={isHovered ? '#fff' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={isHovered ? 2 : 1}
                      filter={isHovered ? 'url(#glow)' : 'none'}
                      opacity={hoveredIndex !== null && !isHovered ? 0.4 : 1}
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                    
                    {/* Százalék felirat a szeleten (csak nagyobbaknál) */}
                    {slice.szazalek >= 8 && (
                      <text
                        x={polarToCartesian(cx, cy, innerRadius + (hoverOuterR - innerRadius) * 0.6, slice.midAngle).x}
                        y={polarToCartesian(cx, cy, innerRadius + (hoverOuterR - innerRadius) * 0.6, slice.midAngle).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white font-semibold pointer-events-none"
                        style={{ 
                          fontSize: isHovered ? '13px' : '11px',
                          opacity: hoveredIndex !== null && !isHovered ? 0.3 : 1,
                          transition: 'all 0.3s ease',
                          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        }}
                      >
                        {slice.szazalek}%
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Központi kör */}
              <circle
                cx={cx}
                cy={cy}
                r={innerRadius - 5}
                fill="url(#centerGrad)"
                filter="url(#dropShadow)"
              />
              
              {/* Központi highlight ring */}
              <circle
                cx={cx}
                cy={cy}
                r={innerRadius - 5}
                fill="none"
                stroke={hoveredIndex !== null ? slices[hoveredIndex]?.szin : '#64748b'}
                strokeWidth="2"
                opacity="0.8"
                style={{ transition: 'stroke 0.3s ease' }}
              />
              
              {/* Központi szöveg */}
              <text 
                x={cx} 
                y={cy - 6} 
                textAnchor="middle" 
                className="fill-white font-bold"
                style={{ fontSize: '18px' }}
              >
                {hoveredIndex !== null 
                  ? slices[hoveredIndex].perc.toLocaleString()
                  : data?.osszPerc?.toLocaleString() || 0
                }
              </text>
              <text 
                x={cx} 
                y={cy + 12} 
                textAnchor="middle" 
                className="fill-slate-400"
                style={{ fontSize: '9px', letterSpacing: '0.5px' }}
              >
                {hoveredIndex !== null ? slices[hoveredIndex].nev.toUpperCase().substring(0, 10) : 'ÖSSZ PERC'}
              </text>
            </svg>
          </div>
        </div>

        {/* Részletes lista */}
        <div className="space-y-2">
          {slices.map((item, index) => {
            const isHovered = hoveredIndex === index;
            
            return (
              <div 
                key={index}
                className={`
                  relative flex items-center justify-between p-3 rounded-xl
                  transition-all duration-300 cursor-pointer overflow-hidden
                  ${isHovered 
                    ? 'bg-slate-700/70 scale-[1.02]' 
                    : 'bg-slate-700/30 hover:bg-slate-700/50'
                  }
                `}
                style={{
                  borderLeft: `4px solid ${isHovered ? item.szin : 'transparent'}`,
                  boxShadow: isHovered ? `0 0 20px ${item.szin}30` : 'none',
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Háttér glow */}
                {isHovered && (
                  <div 
                    className="absolute inset-0 opacity-15 blur-xl"
                    style={{ backgroundColor: item.szin }}
                  />
                )}
                
                <div className="relative flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: item.szin,
                      boxShadow: isHovered ? `0 0 10px ${item.szin}` : 'none',
                      transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                  <span className={`font-medium ${isHovered ? 'text-white' : 'text-slate-200'}`}>
                    {item.nev}
                  </span>
                </div>
                
                <div className="relative flex items-center gap-4">
                  <span className={isHovered ? 'text-white' : 'text-slate-300'}>
                    {item.perc.toLocaleString()} perc
                  </span>
                  <span 
                    className="w-16 text-right font-bold text-lg"
                    style={{ 
                      color: item.szin,
                      textShadow: isHovered ? `0 0 8px ${item.szin}80` : 'none',
                    }}
                  >
                    {item.szazalek}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
