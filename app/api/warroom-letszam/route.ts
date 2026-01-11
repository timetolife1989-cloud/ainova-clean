// =====================================================
// AINOVA - War Room Létszám API
// =====================================================
// Purpose: Nettó produktív létszám lekérdezése a War Room Excel-ből
// Method: GET
// Query: datum=YYYY-MM-DD, muszak=A|B|C|SUM
// Response: { datum, muszak, netto_letszam }
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import { 
  WAR_ROOM_EXCEL_PATH, 
  SHEET_WAR_ROOM_NAPI_A, 
  SHEET_WAR_ROOM_NAPI_B, 
  SHEET_WAR_ROOM_NAPI_C 
} from '@/lib/constants';
import XLSX from 'xlsx';
import fs from 'fs';

export const runtime = 'nodejs';

// Cache a létszám adatokhoz (5 perc TTL)
interface LetszamCache {
  data: Map<string, number>; // "YYYY-MM-DD_A" -> netto létszám
  loadedAt: number;
  muszak: string;
}

const letszamCache: Map<string, LetszamCache> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 perc

/**
 * Excel soros dátumot JavaScript Date-re konvertál
 */
function excelDateToJSDate(excelDate: number): Date {
  // Excel epoch: 1899-12-30
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
}

/**
 * Date-et YYYY-MM-DD formátumra alakít
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * War Room Excel-ből beolvassa a nettó létszámot adott műszakra
 */
async function loadLetszamFromExcel(muszak: 'A' | 'B' | 'C'): Promise<Map<string, number>> {
  const sheetName = muszak === 'A' ? SHEET_WAR_ROOM_NAPI_A 
                  : muszak === 'B' ? SHEET_WAR_ROOM_NAPI_B 
                  : SHEET_WAR_ROOM_NAPI_C;
  
  const result = new Map<string, number>();
  
  try {
    // Ellenőrizzük, hogy elérhető-e a fájl
    if (!fs.existsSync(WAR_ROOM_EXCEL_PATH)) {
      console.warn(`[War Room] Excel fájl nem elérhető: ${WAR_ROOM_EXCEL_PATH}`);
      return result;
    }
    
    const workbook = XLSX.readFile(WAR_ROOM_EXCEL_PATH, { cellDates: false });
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      console.warn(`[War Room] Munkalap nem található: ${sheetName}`);
      return result;
    }
    
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:B1');
    
    // A oszlop = dátum (Excel serial), B oszlop = nettó létszám
    // 1. sortól kezdjük (0. sor a fejléc)
    for (let r = 1; r <= range.e.r; r++) {
      const dateCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })]; // A oszlop
      const letszamCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })]; // B oszlop
      
      if (!dateCell || dateCell.v === undefined) continue;
      
      // Excel serial szám -> dátum
      const excelDate = typeof dateCell.v === 'number' ? dateCell.v : parseFloat(String(dateCell.v));
      if (isNaN(excelDate)) continue;
      
      const jsDate = excelDateToJSDate(excelDate);
      const dateKey = formatDate(jsDate);
      
      // Létszám értéke
      const letszam = letszamCell?.v !== undefined ? Number(letszamCell.v) : 0;
      
      if (!isNaN(letszam) && letszam > 0) {
        result.set(dateKey, letszam);
      }
    }
    
    console.log(`[War Room] Betöltve ${result.size} nap létszám adata műszak ${muszak}-ból`);
    
  } catch (error) {
    console.error(`[War Room] Excel olvasási hiba:`, error);
  }
  
  return result;
}

/**
 * Létszám lekérése cache-ből vagy frissen betöltve
 */
async function getLetszam(muszak: 'A' | 'B' | 'C', datum: string): Promise<number | null> {
  const cacheKey = muszak;
  const cached = letszamCache.get(cacheKey);
  
  // Ha van érvényes cache, használjuk
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
    return cached.data.get(datum) ?? null;
  }
  
  // Újratöltés
  const data = await loadLetszamFromExcel(muszak);
  letszamCache.set(cacheKey, {
    data,
    loadedAt: Date.now(),
    muszak,
  });
  
  return data.get(datum) ?? null;
}

/**
 * Összes műszak létszámának összegzése
 */
async function getLetszamSum(datum: string): Promise<number> {
  const [a, b, c] = await Promise.all([
    getLetszam('A', datum),
    getLetszam('B', datum),
    getLetszam('C', datum),
  ]);
  
  return (a ?? 0) + (b ?? 0) + (c ?? 0);
}

/**
 * Több dátum létszámának lekérése egyszerre
 */
async function getLetszamBatch(muszak: 'A' | 'B' | 'C' | 'SUM', datumok: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  
  if (muszak === 'SUM') {
    // Mindhárom műszak betöltése
    const [dataA, dataB, dataC] = await Promise.all([
      loadLetszamFromExcel('A'),
      loadLetszamFromExcel('B'),
      loadLetszamFromExcel('C'),
    ]);
    
    for (const datum of datumok) {
      const sum = (dataA.get(datum) ?? 0) + (dataB.get(datum) ?? 0) + (dataC.get(datum) ?? 0);
      if (sum > 0) {
        result.set(datum, sum);
      }
    }
  } else {
    const data = await loadLetszamFromExcel(muszak);
    for (const datum of datumok) {
      const letszam = data.get(datum);
      if (letszam !== undefined) {
        result.set(datum, letszam);
      }
    }
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum');
    const muszak = (searchParams.get('muszak') || 'SUM') as 'A' | 'B' | 'C' | 'SUM';
    const datumokParam = searchParams.get('datumok'); // Vesszővel elválasztott dátumok

    // Batch mód - több dátum egyszerre
    if (datumokParam) {
      const datumok = datumokParam.split(',');
      const letszamMap = await getLetszamBatch(muszak, datumok);
      
      return NextResponse.json({
        success: true,
        muszak,
        data: Object.fromEntries(letszamMap),
      });
    }

    // Egyedi dátum mód
    if (!datum) {
      return ApiErrors.badRequest('Dátum megadása kötelező (datum=YYYY-MM-DD vagy datumok=YYYY-MM-DD,YYYY-MM-DD,...)');
    }

    let nettoLetszam: number | null;
    
    if (muszak === 'SUM') {
      nettoLetszam = await getLetszamSum(datum);
    } else {
      nettoLetszam = await getLetszam(muszak, datum);
    }

    return NextResponse.json({
      success: true,
      datum,
      muszak,
      netto_letszam: nettoLetszam,
    });

  } catch (error) {
    console.error('[War Room Létszám] API hiba:', error);
    return ApiErrors.internal(error, 'War Room Létszám');
  }
}
