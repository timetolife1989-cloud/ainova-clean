// =====================================================
// AINOVA - Központi konstansok
// =====================================================

import type { UserRole, Shift } from './types/admin';

// =====================================================
// TELJESÍTMÉNY SZÁMÍTÁS
// =====================================================
export const DAILY_TARGET_MINUTES = 480; // 8 óra = 480 perc = 100%
export const MIN_VALID_DAILY_MINUTES = 1000; // Minimum napi összperc - ennél kevesebb = érvénytelen nap (vasárnap, hiba)

// =====================================================
// EXCEL IMPORT
// =====================================================
export const TELJESITMENY_EXCEL_PATH = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';
export const NAPI_PERCES_EXCEL_PATH = '\\\\sveeafs01\\TDK_EEA_MAG_PEMC\\!Users\\Personal\\Gömböcz Gábor\\Gömböcz Gábor\\Napi perces\\napi perces 2026.xlsx';

// Excel munkalap nevek
export const SHEET_FILTER_LETSZAM = 'Filter létszám';
export const SHEET_PERCEK = 'Percek';

// War Room Excel
export const WAR_ROOM_EXCEL_PATH = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\!Production\\LAC\\!War Room adatok\\LaC_War Room adatok.xlsm';
export const SHEET_WAR_ROOM_NAPI_A = 'Napi "A"';
export const SHEET_WAR_ROOM_NAPI_B = 'Napi "B"';
export const SHEET_WAR_ROOM_NAPI_C = 'Napi "C"';

// Napi perces Excel oszlop indexek (0-based)
export const NAPI_PERCES_COLS = {
  DATUM: 0,        // A oszlop
  CEL: 12,         // M oszlop (napi cél)
  LEHIVOTT_SIEMENS: 13,   // N oszlop
  LEHIVOTT_NO_SIEMENS: 14, // O oszlop
  LEHIVOTT_OSSZ: 15,       // P oszlop
  LEADOTT_SIEMENS: 20,     // U oszlop
  LEADOTT_NO_SIEMENS: 21,  // V oszlop
  LEADOTT_KACO: 22,        // W oszlop
} as const;

export const IMPORT_LOCK_TIMEOUT_MINUTES = 5;
export const IMPORT_LOOKBACK_DAYS = 7;

// =====================================================
// FELHASZNÁLÓ POZÍCIÓK (MUNKAKÖRÖK)
// Sync: AinovaUsers.Role SQL constraint
// =====================================================
export interface PositionConfig {
  value: UserRole;
  label: string;
  color: string;           // Tailwind class
  bgColor: string;         // Hex color
  sortOrder: number;       // Rendezési sorrend
  canManageUsers: boolean; // Van-e jogosultsága user kezeléshez
}

export const POSITIONS: PositionConfig[] = [
  { value: 'Admin', label: 'Admin', color: 'bg-purple-600', bgColor: '#9333EA', sortOrder: 1, canManageUsers: true },
  { value: 'Manager', label: 'Manager', color: 'bg-indigo-600', bgColor: '#4F46E5', sortOrder: 2, canManageUsers: true },
  { value: 'Műszakvezető', label: 'Műszakvezető', color: 'bg-blue-600', bgColor: '#2563EB', sortOrder: 3, canManageUsers: false },
  { value: 'Műszakvezető helyettes', label: 'Műszakvezető helyettes', color: 'bg-cyan-600', bgColor: '#0891B2', sortOrder: 4, canManageUsers: false },
  { value: 'NPI Technikus', label: 'NPI Technikus', color: 'bg-orange-600', bgColor: '#EA580C', sortOrder: 5, canManageUsers: false },
  { value: 'Operátor', label: 'Operátor', color: 'bg-green-600', bgColor: '#16A34A', sortOrder: 6, canManageUsers: false },
];

// Helper: pozíció keresés
export const getPositionConfig = (role: UserRole): PositionConfig | undefined => 
  POSITIONS.find(p => p.value === role);

// =====================================================
// MŰSZAKOK
// =====================================================
export interface ShiftConfig {
  value: Shift;
  label: string;
  color: string;      // Tailwind class
  bgColor: string;    // Hex color
}

export const SHIFTS: ShiftConfig[] = [
  { value: 'A', label: 'A műszak', color: 'bg-blue-600', bgColor: '#2563EB' },
  { value: 'B', label: 'B műszak', color: 'bg-green-600', bgColor: '#16A34A' },
  { value: 'C', label: 'C műszak', color: 'bg-orange-600', bgColor: '#EA580C' },
  { value: null, label: 'Nincs műszak', color: 'bg-gray-600', bgColor: '#4B5563' },
];

// Helper: műszak keresés
export const getShiftConfig = (shift: Shift): ShiftConfig | undefined => 
  SHIFTS.find(s => s.value === shift);

// =====================================================
// ADMIN BEÁLLÍTÁSOK
// =====================================================
export const ADMIN_SESSION_TIMEOUT_MINUTES = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const USERNAME_MIN_LENGTH = 3;
export const DEFAULT_PAGE_SIZE = 20;
export const BCRYPT_ROUNDS = 12;
export const DEFAULT_PASSWORD = 'TDK@2024';
