// =====================================================
// Operátor modul típusok
// =====================================================

// Jogosítvány típusok
export const JOGOSITVANYOK = [
  { key: 'jogsi_gyalog_targonca', label: 'Gyalog kíséretű targonca', icon: '🚜' },
  { key: 'jogsi_forgo_daru', label: 'Forgó daru', icon: '🏗️' },
  { key: 'jogsi_futo_daru', label: 'Futó daru', icon: '🔩' },
  { key: 'jogsi_newton_emelo', label: 'Newton emelő', icon: '⬆️' },
] as const;

export type JogositvanyKey = typeof JOGOSITVANYOK[number]['key'];

// Munkakörök (pozíciók)
export const MUNKAKOROK = [
  { value: 'Műszakvezető', label: 'Műszakvezető', kategoria: 'Vezetői' },
  { value: 'Előmunkás', label: 'Előmunkás', kategoria: 'Vezetői' },
  { value: 'Gyártásszervező', label: 'Gyártásszervező', kategoria: 'Vezetői' },
  { value: 'Előkészítő', label: 'Előkészítő', kategoria: 'Produktív' },
  { value: 'Gépítekercselő', label: 'Gépítekercselő', kategoria: 'Produktív' },
  { value: 'Szerelő', label: 'Szerelő', kategoria: 'Produktív' },
  { value: 'Maró-ónozó', label: 'Maró-ónozó', kategoria: 'Produktív' },
  { value: 'Mérő', label: 'Mérő', kategoria: 'Produktív' },
  { value: 'Impregnáló', label: 'Impregnáló', kategoria: 'Produktív' },
  { value: 'Univerzális', label: 'Univerzális', kategoria: 'Produktív' },
  { value: 'Csomagoló', label: 'Csomagoló', kategoria: 'Produktív' },
  { value: 'NPI technikus', label: 'NPI technikus', kategoria: 'Támogató' },
  { value: 'Javító műszerész', label: 'Javító műszerész', kategoria: 'Támogató' },
] as const;

export type Munkakor = typeof MUNKAKOROK[number]['value'];

export interface OperatorOrvosi {
  id: number;
  pozicio_id: number;
  pozicio_nev: string;
  kezdete: string;
  lejarat: string;
  megjegyzes: string | null;
  statusz?: 'aktiv' | 'hamarosan' | 'lejart';
  napok_hatra?: number;
}

export interface Operator {
  id: number;
  torzsszam: string;
  nev: string;
  muszak: string;
  pozicio: string;
  telefon: string | null;
  // Jogosítványok
  jogsi_gyalog_targonca: boolean;
  jogsi_forgo_daru: boolean;
  jogsi_futo_daru: boolean;
  jogsi_newton_emelo: boolean;
  // Egyéb
  megjegyzes: string | null;
  aktiv: boolean;
  created_at?: string;
  updated_at?: string;
  orvosi_count?: number;
  legkozelebb_lejaro?: string | null;
  orvosik?: OperatorOrvosi[];
}

export interface OperatorListResponse {
  data: Operator[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Pozicio {
  id: number;
  nev: string;
  kategoria: string | null;
  sorrend: number;
}
