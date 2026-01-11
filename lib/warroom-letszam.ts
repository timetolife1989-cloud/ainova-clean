// =====================================================
// AINOVA - War Room Létszám Modul (SQL + Excel)
// =====================================================
// Nettó produktív létszám kezelése:
// - Adatok SQL-ből jönnek (gyors)
// - Import Excel-ből SQL-be (háttérben)
// =====================================================

import { 
  WAR_ROOM_EXCEL_PATH, 
  SHEET_WAR_ROOM_NAPI_A, 
  SHEET_WAR_ROOM_NAPI_B, 
  SHEET_WAR_ROOM_NAPI_C 
} from '@/lib/constants';
import { getPool } from '@/lib/db';
import * as XLSX from 'xlsx';
import fs from 'fs';

// =====================================================
// TÍPUSOK
// =====================================================

export interface WarRoomLetszamRow {
  datum: string;        // YYYY-MM-DD
  muszak: 'A' | 'B' | 'C';
  netto_letszam: number;
  elmeleti_letszam?: number;
  imported_at: Date;
}

export interface WarRoomSyncStatus {
  lastSync: Date | null;
  recordCount: number;
  isStale: boolean;      // true ha >1 óra régi
  hasData: boolean;
}

// =====================================================
// EXCEL OLVASÁS (Import számára)
// =====================================================

/**
 * Excel soros dátumot JavaScript Date-re konvertál
 * Excel epoch: 1899-12-30 (de serial 1 = 1900-01-01)
 * FONTOS: UTC-t használunk hogy ne legyen időzóna eltolódás!
 */
function excelDateToJSDate(excelDate: number): Date {
  // Excel serial date: 1 = 1900-01-01, tehát epoch = 1899-12-30 UTC
  const epoch = Date.UTC(1899, 11, 30); // 1899-12-30 00:00:00 UTC
  return new Date(epoch + excelDate * 24 * 60 * 60 * 1000);
}

function formatDateSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}

interface ExcelLetszamRow {
  datum: string;
  netto_letszam: number;
  elmeleti_letszam: number;
}

/**
 * Excel-ből beolvassa egy műszak létszám adatait
 */
async function readExcelSheet(muszak: 'A' | 'B' | 'C'): Promise<ExcelLetszamRow[]> {
  const sheetName = muszak === 'A' ? SHEET_WAR_ROOM_NAPI_A 
                  : muszak === 'B' ? SHEET_WAR_ROOM_NAPI_B 
                  : SHEET_WAR_ROOM_NAPI_C;
  
  const result: ExcelLetszamRow[] = [];
  
  if (!fs.existsSync(WAR_ROOM_EXCEL_PATH)) {
    throw new Error(`Excel fájl nem elérhető: ${WAR_ROOM_EXCEL_PATH}`);
  }
  
  // Buffer-rel olvassuk be - megbízhatóbb UNC path-okkal
  const buffer = fs.readFileSync(WAR_ROOM_EXCEL_PATH);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    throw new Error(`Munkalap nem található: ${sheetName}`);
  }
  
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:C1');
  
  // Határ: csak 90 napnál frissebb adatokat importálunk
  const today = new Date();
  const cutoffDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // A=dátum, B=nettó létszám, C=elméleti létszám
  // ALULRÓL FELFELÉ haladunk és megállunk ha túl régi - így nem kell az egész fájlt végigolvasni
  for (let row = range.e.r + 1; row >= 2; row--) {
    const dateCell = sheet['A' + row];
    const nettoCell = sheet['B' + row];
    const elmeletiCell = sheet['C' + row];
    
    if (!dateCell || dateCell.v === undefined) continue;
    
    const excelDate = typeof dateCell.v === 'number' ? dateCell.v : parseFloat(String(dateCell.v));
    if (isNaN(excelDate) || excelDate < 1) continue;
    
    const jsDate = excelDateToJSDate(excelDate);
    
    // Ha túl régi, MEGÁLLUNK - a korábbi sorok még régebbiek lesznek
    if (jsDate < cutoffDate) {
      break;
    }
    
    const datum = formatDateSQL(jsDate);
    const netto = nettoCell?.v !== undefined ? Number(nettoCell.v) : 0;
    const elmeleti = elmeletiCell?.v !== undefined ? Number(elmeletiCell.v) : 0;
    
    // Csak érvényes sorokat
    if (!isNaN(netto) && netto >= 0) {
      result.push({ datum, netto_letszam: netto, elmeleti_letszam: elmeleti });
    }
  }
  
  return result;
}

// =====================================================
// SQL MŰVELETEK
// =====================================================

/**
 * War Room létszám lekérése SQL-ből
 */
export async function getWarRoomLetszamFromDB(
  muszak: 'A' | 'B' | 'C' | 'SUM',
  datumok: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (datumok.length === 0) return result;
  
  try {
    const pool = await getPool();
    
    // Paraméterek előkészítése
    const datumParams = datumok.map((_, i) => `@d${i}`).join(',');
    
    let query: string;
    if (muszak === 'SUM') {
      query = `
        SELECT CONVERT(VARCHAR(10), Datum, 23) as datum, SUM(NettoLetszam) as netto
        FROM WarRoomLetszam
        WHERE Datum IN (${datumParams})
        GROUP BY Datum
      `;
    } else {
      query = `
        SELECT CONVERT(VARCHAR(10), Datum, 23) as datum, NettoLetszam as netto
        FROM WarRoomLetszam
        WHERE Datum IN (${datumParams}) AND Muszak = @muszak
      `;
    }
    
    const request = pool.request();
    datumok.forEach((d, i) => request.input(`d${i}`, d));
    if (muszak !== 'SUM') {
      request.input('muszak', muszak);
    }
    
    const res = await request.query(query);
    
    for (const row of res.recordset) {
      if (row.netto > 0) {
        result.set(row.datum, row.netto);
      }
    }
    
  } catch (error) {
    console.error('[War Room DB] Lekérdezés hiba:', error);
  }
  
  return result;
}

/**
 * Szinkronizálás státusz lekérése
 */
export async function getWarRoomSyncStatus(): Promise<WarRoomSyncStatus> {
  try {
    const pool = await getPool();
    
    const res = await pool.request().query(`
      SELECT 
        (SELECT MAX(COALESCE(UpdatedAt, ImportedAt)) FROM WarRoomLetszam) as lastSync,
        (SELECT COUNT(*) FROM WarRoomLetszam) as recordCount
    `);
    
    const row = res.recordset[0];
    const lastSync = row?.lastSync ? new Date(row.lastSync) : null;
    const recordCount = row?.recordCount || 0;
    
    // Stale ha >1 óra régi vagy nincs adat
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const isStale = !lastSync || lastSync.getTime() < oneHourAgo;
    
    return {
      lastSync,
      recordCount,
      isStale,
      hasData: recordCount > 0
    };
    
  } catch (error) {
    console.error('[War Room DB] Státusz lekérdezés hiba:', error);
    return { lastSync: null, recordCount: 0, isStale: true, hasData: false };
  }
}

/**
 * Excel adatok importálása SQL-be
 * @returns Importált sorok száma
 */
export async function importWarRoomFromExcel(): Promise<{ 
  success: boolean; 
  imported: number; 
  error?: string 
}> {
  console.log('[War Room Import] Indítás...');
  
  try {
    // Mindhárom műszak beolvasása
    const [dataA, dataB, dataC] = await Promise.all([
      readExcelSheet('A'),
      readExcelSheet('B'),
      readExcelSheet('C'),
    ]);
    
    console.log(`[War Room Import] Excel beolvasva: A=${dataA.length}, B=${dataB.length}, C=${dataC.length} sor`);
    
    const pool = await getPool();
    let imported = 0;
    
    // UPSERT minden sorra
    const upsertRow = async (muszak: 'A' | 'B' | 'C', row: ExcelLetszamRow) => {
      await pool.request()
        .input('datum', row.datum)
        .input('muszak', muszak)
        .input('netto', row.netto_letszam)
        .input('elmeleti', row.elmeleti_letszam || null)
        .query(`
          MERGE WarRoomLetszam AS target
          USING (SELECT @datum as Datum, @muszak as Muszak) AS source
          ON target.Datum = source.Datum AND target.Muszak = source.Muszak
          WHEN MATCHED THEN
            UPDATE SET NettoLetszam = @netto, ElmeletiLetszam = @elmeleti, ImportedAt = GETDATE(), UpdatedAt = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (Datum, Muszak, NettoLetszam, ElmeletiLetszam, ImportedAt, UpdatedAt)
            VALUES (@datum, @muszak, @netto, @elmeleti, GETDATE(), GETDATE());
        `);
      imported++;
    };
    
    // Batch import
    const allData = [
      ...dataA.map(r => ({ muszak: 'A' as const, row: r })),
      ...dataB.map(r => ({ muszak: 'B' as const, row: r })),
      ...dataC.map(r => ({ muszak: 'C' as const, row: r })),
    ];
    
    // Szekvenciális, hogy ne terheljük túl a DB-t
    for (const { muszak, row } of allData) {
      // Csak nem-null létszámokat
      if (row.netto_letszam > 0 || row.elmeleti_letszam > 0) {
        await upsertRow(muszak, row);
      }
    }
    
    console.log(`[War Room Import] Kész: ${imported} sor importálva`);
    
    return { success: true, imported };
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Ismeretlen hiba';
    console.error('[War Room Import] Hiba:', msg);
    return { success: false, imported: 0, error: msg };
  }
}

// =====================================================
// FŐVONAL: Létszám lekérése (SQL-ből, auto-import ha kell)
// =====================================================

let lastAutoImportCheck = 0;
const AUTO_IMPORT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 perc

/**
 * War Room létszám lekérése - automata importtal ha szükséges
 */
export async function getWarRoomLetszamBatch(
  muszak: 'A' | 'B' | 'C' | 'SUM',
  datumok: string[]
): Promise<Map<string, number>> {
  
  // Auto-import check (max 5 percenként)
  const now = Date.now();
  if (now - lastAutoImportCheck > AUTO_IMPORT_CHECK_INTERVAL) {
    lastAutoImportCheck = now;
    
    const status = await getWarRoomSyncStatus();
    
    // Ha stale vagy nincs adat, háttérben importálunk
    if (status.isStale || !status.hasData) {
      console.log('[War Room] Auto-import indítása (stale vagy üres)...');
      // Nem várjuk meg - háttérben fut
      importWarRoomFromExcel().catch(err => {
        console.error('[War Room] Auto-import hiba:', err);
      });
    }
  }
  
  // SQL-ből lekérés
  return getWarRoomLetszamFromDB(muszak, datumok);
}

/**
 * Manuális szinkronizálás trigger
 */
export async function forceWarRoomSync(): Promise<{ success: boolean; imported: number; error?: string }> {
  console.log('[War Room] Manuális szinkronizálás...');
  return importWarRoomFromExcel();
}
