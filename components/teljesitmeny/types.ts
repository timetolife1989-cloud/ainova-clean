// Teljesítmény modul típusok

export type MuszakType = 'A' | 'B' | 'C' | 'SUM';
export type KimutatType = 'napi' | 'heti' | 'havi';
export type ViewType = 'produktiv' | 'egyeni';

// Napi adat interface
export interface NapiData {
  datum: string;
  datum_label: string;
  nap_nev: string;
  muszak: string;
  letszam: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  period_start: string;
  period_end: string;
  total_days: number;
}

// Heti adat interface
export interface HetiData {
  ev: number;
  het_szam: number;
  het_label: string;
  het_eleje: string;
  het_vege: string;
  muszak: string;
  letszam: number;
  munkanapok: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  period_start_week: number;
  period_end_week: number;
  total_weeks: number;
}

// Havi adat interface
export interface HaviData {
  ev: number;
  honap_szam: number;
  honap_label: string;
  honap_eleje: string;
  honap_vege: string;
  muszak: string;
  letszam: number;
  munkanapok: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
  total_months: number;
}

// Chart data - unified type for all views
export interface ChartDataItem {
  datum_label: string;
  nap_nev: string;
  letszam: number;
  cel_perc: number;
  leadott_perc: number;
  szazalek: number;
}

// Egyéni teljesítmény interfaces
export interface EgyeniOperator {
  torzsszam: string;
  nev: string;
  pozicio: string;
  muszak: string;
  munkanapok: number;
  ossz_perc: number;
  atlag_szazalek: number;
  trend: 'up' | 'down' | 'stable';
}

export interface EgyeniTrendData {
  datum_label: string;
  datum?: string;
  leadott_perc: number;
  cel_perc: number;
  szazalek: number;
  munkanapok?: number;
  total_days?: number;
  total_weeks?: number;
  total_months?: number;
}

// Import status interface
export interface ImportStatus {
  last_import_at: string | null;
  records_imported: number;
  unique_operators: number;
}

// Műszak colors
export interface MuszakColor {
  bar: string;
  gradient: string;
}

export type MuszakColors = Record<MuszakType, MuszakColor>;
