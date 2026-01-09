// Teljesítmény modul konstansok

import { MuszakColors } from './types';

// Műszak színek
export const MUSZAK_COLORS: MuszakColors = {
  A: { bar: '#3B82F6', gradient: 'from-blue-500 to-blue-700' },
  B: { bar: '#10B981', gradient: 'from-emerald-500 to-emerald-700' },
  C: { bar: '#F97316', gradient: 'from-orange-500 to-orange-700' },
  SUM: { bar: '#64748B', gradient: 'from-slate-500 to-slate-700' },
};

// Lapozás beállítások
export const PAGINATION = {
  napi: { pageSize: 20, displaySize: 20 },
  heti: { pageSize: 1, displaySize: 12 },
  havi: { pageSize: 0, displaySize: 12 }, // Nincs lapozás
} as const;

// Magyar napnevek
export const HUNGARIAN_DAYS: Record<string, string> = {
  'Monday': 'Hétfő',
  'Tuesday': 'Kedd',
  'Wednesday': 'Szerda',
  'Thursday': 'Csütörtök',
  'Friday': 'Péntek',
  'Saturday': 'Szombat',
  'Sunday': 'Vasárnap',
};

// Helper to get Hungarian day name
export const getHungarianDayName = (englishDay: string): string => {
  return HUNGARIAN_DAYS[englishDay] || englishDay;
};

// Helper to format date range for title
export const formatDateRange = (start: string, end: string): string => {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const format = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `${format(startDate)} - ${format(endDate)}`;
};

// Teljesítmény szín osztályok
export const getPerformanceColorClass = (szazalek: number): string => {
  if (szazalek >= 100) return 'bg-green-500/20 text-green-400';
  if (szazalek >= 80) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
};

// Teljesítmény szín (text only)
export const getPerformanceTextColor = (szazalek: number): string => {
  if (szazalek >= 100) return 'text-green-400';
  if (szazalek >= 80) return 'text-yellow-400';
  return 'text-red-400';
};
