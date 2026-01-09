/**
 * Shared types and constants for Létszám module
 */

// ============================================================================
// Types
// ============================================================================

export interface LetszamRow {
  pozicio: string;
  megjelent: number;
  tappenz: number;
  szabadsag: number;
  hianyzasPercent: number;
}

export interface Position {
  id: string;
  name: string;
  productive: boolean;
}

export interface Shift {
  id: string;
  name: string;
  time: string;
}

export type StaffData = {
  [positionId: string]: { present: string; vacation: string; sickLeave: string };
};

export interface ExistingRecord {
  savedBy: string;
  savedAt: string;
  fullName: string;
  role: string;
  shift: string;
  email: string;
}

// ============================================================================
// Constants
// ============================================================================

export const POSITIONS: Position[] = [
  { id: 'preparator', name: 'Előkészítő', productive: true },
  { id: 'wireWinder', name: 'Huzalos tekercselő', productive: true },
  { id: 'tapeWinder', name: 'Fóliás tekercselő', productive: true },
  { id: 'milling', name: 'Maró-ónozó', productive: true },
  { id: 'lacAssembler', name: 'LaC szerelő', productive: true },
  { id: 'smallDCAssembler', name: 'Kis DC szerelő', productive: true },
  { id: 'largeDCAssembler', name: 'Nagy DC szerelő', productive: true },
  { id: 'electricTester', name: 'Mérő', productive: true },
  { id: 'impregnation', name: 'Impregnáló', productive: true },
  { id: 'finalAssembler', name: 'Végszerelő', productive: true },
  { id: 'packer', name: 'Csomagoló', productive: true },
  { id: 'planner', name: 'Gyártásszervező', productive: false },
  { id: 'shiftLeader', name: 'Műszakvezető', productive: false },
  { id: 'qualityInspector', name: 'Minőségellenőr', productive: false },
];

export const SHIFTS: Shift[] = [
  { id: 'morning', name: 'Délelőttös műszak', time: '05:45 - 13:45' },
  { id: 'afternoon', name: 'Délutános műszak', time: '13:45 - 21:45' },
  { id: 'night', name: 'Éjszakás műszak', time: '21:45 - 05:45' },
];

// Műszak mapping frontend -> API
export const SHIFT_TO_API: Record<string, string> = {
  morning: 'A',
  afternoon: 'B',
  night: 'C',
};

export const API_TO_SHIFT: Record<string, string> = {
  A: 'Délelőttös',
  B: 'Délutános',
  C: 'Éjszakás',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Műszak automatikus meghatározása az aktuális idő alapján
 */
export function getEffectiveDate(): { date: Date; shiftId: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const morningStart = 5 * 60 + 45;   // 05:45
  const afternoonStart = 13 * 60 + 45; // 13:45
  const nightStart = 21 * 60 + 45;     // 21:45

  const effectiveDate = new Date(now);
  let shiftId = 'morning';

  if (currentTime >= nightStart || currentTime < morningStart) {
    shiftId = 'night';
    if (currentTime < morningStart) {
      effectiveDate.setDate(effectiveDate.getDate() - 1);
    }
  } else if (currentTime >= afternoonStart) {
    shiftId = 'afternoon';
  }

  return { date: effectiveDate, shiftId };
}

/**
 * Inicializálja a staff data objektumot 0 értékekkel
 */
export function initializeStaffData(): StaffData {
  const initial: StaffData = {};
  POSITIONS.forEach((pos) => {
    initial[pos.id] = { present: '0', vacation: '0', sickLeave: '0' };
  });
  return initial;
}

/**
 * String-ből szám konvertálás (0-val tér vissza ha üres/invalid)
 */
export function toNum(val: string): number {
  return parseInt(val, 10) || 0;
}
