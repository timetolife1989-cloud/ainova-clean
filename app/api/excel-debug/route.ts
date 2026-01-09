// =====================================================
// AINOVA - Excel Diagnosztika API
// =====================================================
// Cél: Megmutatni mi van az Excel fájlban
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { checkSession, ApiErrors, getErrorMessage } from '@/lib/api-utils';

export const runtime = 'nodejs';

const EXCEL_PATH = '\\\\sveeafs01.tdk-prod.net\\TDK_EEA_MAG_PEMC\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

export async function GET(request: NextRequest) {
  try {
    // ✅ Session validation (debug tool requires authentication)
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    // Excel beolvasása
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(EXCEL_PATH);
    } catch (fsError: any) {
      return NextResponse.json({
        success: false,
        error: 'Excel fájl nem elérhető',
        path: EXCEL_PATH,
        details: fsError.message,
      }, { status: 404 });
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Összes fül neve
    const sheetNames = workbook.SheetNames;

    // Filter létszám fül elemzése
    let filterAnalysis: any = null;
    if (workbook.SheetNames.includes('Filter létszám')) {
      const sheet = workbook.Sheets['Filter létszám'];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Első 10 sor
      const firstRows = data.slice(0, 10).map((row, i) => ({
        row: i,
        cells: row?.slice(0, 15).map((cell, j) => ({
          col: String.fromCharCode(65 + j),
          value: cell,
        })),
      }));

      // LAC operátorok keresése (F1L)
      let lacCount = 0;
      let muszakCounts: Record<string, number> = {};
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        const muszak = String(row[0] || '').trim().toUpperCase();
        const munkaterulet = String(row[11] || '').trim().toUpperCase();
        
        if (munkaterulet === 'F1L' && (muszak === 'A/L' || muszak === 'B/L' || muszak === 'C/L')) {
          lacCount++;
          muszakCounts[muszak] = (muszakCounts[muszak] || 0) + 1;
        }
      }

      filterAnalysis = {
        totalRows: data.length,
        firstRows,
        lacOperators: lacCount,
        muszakCounts,
      };
    }

    // Percek fül elemzése
    let percekAnalysis: any = null;
    if (workbook.SheetNames.includes('Percek')) {
      const sheet = workbook.Sheets['Percek'];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Első 10 sor header keresés
      const firstRows = data.slice(0, 10).map((row, i) => ({
        row: i,
        cells: row?.slice(0, 20).map((cell, j) => ({
          col: j,
          value: cell,
        })),
      }));

      // Header sor keresése
      let headerRow = -1;
      let colMuszak = -1, colNev = -1, colVsz = -1;

      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (!row) continue;

        for (let j = 0; j < Math.min(20, row.length); j++) {
          const cell = String(row[j] || '').toUpperCase().trim();
          if (cell === 'MŰSZAK') colMuszak = j;
          if (cell === 'NÉV') colNev = j;
          if (cell === 'VSZ') colVsz = j;
        }

        if (colMuszak >= 0 && colNev >= 0 && colVsz >= 0) {
          headerRow = i;
          break;
        }
      }

      // Dátum oszlopok
      let dateColumns: any[] = [];
      if (headerRow >= 0 && data[headerRow]) {
        const headerRowData = data[headerRow];
        for (let j = Math.max(colVsz + 1, 4); j < Math.min(headerRowData.length, 50); j++) {
          const cell = headerRowData[j];
          if (cell) {
            dateColumns.push({
              col: j,
              value: cell,
              type: typeof cell,
            });
          }
        }
      }

      percekAnalysis = {
        totalRows: data.length,
        firstRows,
        headerRow,
        columns: { muszak: colMuszak, nev: colNev, vsz: colVsz },
        dateColumnsFound: dateColumns.length,
        dateColumnsSample: dateColumns.slice(0, 10),
      };
    }

    return NextResponse.json({
      success: true,
      excelPath: EXCEL_PATH,
      fileSize: fileBuffer.length,
      sheetNames,
      filterLetszam: filterAnalysis,
      percek: percekAnalysis,
    });

  } catch (error) {
    console.error('[Excel Diagnosztika] Error:', getErrorMessage(error));
    return ApiErrors.internal(error, 'Excel diagnosztika');
  }
}
