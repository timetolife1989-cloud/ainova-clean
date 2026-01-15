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
  // War Room adatok
  visszajelentes_letszam?: number;      // Eredeti visszajelentés létszám
  netto_letszam?: number;               // War Room nettó létszám
  netto_cel_perc?: number;              // Nettó létszám × 480
  netto_szazalek?: number;              // Leadott / nettó cél × 100
  has_warroom_data?: boolean;           // Van-e tényleges War Room adat
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
  datum?: string;                     // Eredeti dátum (YYYY-MM-DD) - API-ból
  datum_label: string;
  nap_nev: string;
  letszam: number;                    // Visszajelentéssel rendelkező operátorok
  netto_letszam?: number;             // War Room nettó létszám
  cel_perc: number;
  netto_cel_perc?: number;            // Nettó létszám × 480
  leadott_perc: number;
  szazalek: number;                   // Visszajelentés alapú %
  netto_szazalek?: number;            // War Room nettó létszám alapú %
  has_warroom_data?: boolean;         // Van-e tényleges War Room adat (nem fallback)
}

// Egyéni teljesítmény interfaces
export interface EgyeniOperator {
  torzsszam: string;
  nev: string;
  pozicio: string;
  muszak: string;
  // Összes (30 nap)
  munkanapok: number;
  ossz_perc: number;
  atlag_szazalek: number;
  // Havi (aktuális vagy előző hónap)
  havi_munkanapok: number;
  havi_szazalek: number;
  havi_label: string;  // pl. "Dec"
  // Heti (aktuális hét)
  heti_munkanapok: number;
  heti_szazalek: number;
  heti_label: string;  // pl. "2. hét"
  // Utolsó nap (legfrissebb adat dátuma)
  utolso_nap_szazalek: number | null;
  utolso_nap_label: string;  // pl. "Jan 9"
  // Trend
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

// Pozíció trend interface - pozíció-szintű aggregált napi/heti teljesítmény
export interface PozicioTrendData {
  datum_label: string;
  datum?: string;
  letszam: number;              // Hány operátor dolgozott aznap
  leadott_perc: number;         // Összes leadott perc
  cel_perc: number;             // letszam × 480
  szazalek: number;             // Leadott / cél × 100
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
