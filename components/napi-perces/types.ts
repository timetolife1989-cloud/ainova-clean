// =====================================================
// AINOVA - Napi Perces Típusok
// =====================================================

export interface NapiData {
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

export type KimutatType = 'napi' | 'heti' | 'havi';

export interface ImportStatus {
  last_import: string | null;
  total_records: number;
  unique_days: number;
}

// Page sizes per kimutat type
export const PAGE_SIZES: Record<KimutatType, number> = {
  napi: 20,
  heti: 12,
  havi: 12,
};

// Kimutat labels
export const KIMUTAT_LABELS: Record<KimutatType, string> = {
  napi: 'Napi',
  heti: 'Heti',
  havi: 'Havi',
};
