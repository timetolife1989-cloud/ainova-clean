// =====================================================
// AINOVA - Smart Import Check API
// =====================================================
// Gyors ellenőrzés: kell-e importálni?
// Login képernyőn fut a háttérben
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import * as fs from 'fs';
import { TELJESITMENY_EXCEL_PATH, IMPORT_LOCK_TIMEOUT_MINUTES } from '@/lib/constants';

export const runtime = 'nodejs';

// GET - Gyors check: kell-e import?
// Nincs auth! - Login előtt hívható
export async function GET(request: NextRequest) {
  try {
    const pool = await getPool();

    // 1. Import státusz lekérése
    const statusResult = await pool.request().query(`
      SELECT 
        last_import_at,
        is_importing,
        import_started_at,
        records_imported
      FROM ainova_import_status 
      WHERE import_type = 'teljesitmeny'
    `);

    const status = statusResult.recordset[0];
    
    // Ha nincs státusz sor, kell import
    if (!status) {
      return NextResponse.json({
        needsImport: true,
        reason: 'no_status_record',
        canStartImport: true,
      });
    }

    // 2. Ha valaki épp importál (és nem régebbi IMPORT_LOCK_TIMEOUT_MINUTES percnél a lock)
    if (status.is_importing) {
      const lockAge = status.import_started_at 
        ? (Date.now() - new Date(status.import_started_at).getTime()) / 1000 / 60
        : 999;
      
      if (lockAge < IMPORT_LOCK_TIMEOUT_MINUTES) {
        return NextResponse.json({
          needsImport: false,
          reason: 'import_in_progress',
          canStartImport: false,
          lockAgeMinutes: Math.round(lockAge * 10) / 10,
        });
      }
      // Lock régebbi IMPORT_LOCK_TIMEOUT_MINUTES percnél = valószínűleg lefagyott, engedjük újra
    }

    // 3. Volt-e ma már import?
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastImport = status.last_import_at ? new Date(status.last_import_at) : null;
    const wasImportedToday = lastImport && lastImport >= today;

    // 4. Ha ma már volt import ÉS 12:00 után vagyunk → nem kell újra
    const isAfterNoon = now.getHours() >= 12;
    
    if (wasImportedToday && isAfterNoon) {
      return NextResponse.json({
        needsImport: false,
        reason: 'already_imported_today_after_noon',
        canStartImport: false,
        lastImportAt: status.last_import_at,
        recordsImported: status.records_imported,
      });
    }

    // 5. Ha ma már volt import DE még nincs 12:00 → lehet hogy frissült az Excel
    if (wasImportedToday && !isAfterNoon) {
      // Gyors Excel check: módosult-e?
      try {
        const stats = fs.statSync(TELJESITMENY_EXCEL_PATH);
        const excelModified = stats.mtime;
        
        // Ha az Excel újabb mint az utolsó import → kell frissítés
        if (excelModified > lastImport!) {
          return NextResponse.json({
            needsImport: true,
            reason: 'excel_modified_since_last_import',
            canStartImport: true,
            lastImportAt: status.last_import_at,
            excelModifiedAt: excelModified.toISOString(),
          });
        } else {
          return NextResponse.json({
            needsImport: false,
            reason: 'excel_not_modified',
            canStartImport: false,
            lastImportAt: status.last_import_at,
          });
        }
      } catch (fsErr) {
        // Ha nem tudjuk olvasni az Excel-t, inkább próbáljuk meg az importot
        return NextResponse.json({
          needsImport: true,
          reason: 'excel_check_failed_try_import',
          canStartImport: true,
        });
      }
    }

    // 6. Nem volt ma import → kell
    return NextResponse.json({
      needsImport: true,
      reason: 'no_import_today',
      canStartImport: true,
      lastImportAt: status.last_import_at,
    });

  } catch (error) {
    console.error('[Import Check] Error:', error);
    // Hiba esetén inkább próbáljuk meg
    return NextResponse.json({
      needsImport: true,
      reason: 'check_error',
      canStartImport: true,
    });
  }
}
