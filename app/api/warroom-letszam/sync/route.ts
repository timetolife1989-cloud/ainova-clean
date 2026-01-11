// =====================================================
// AINOVA - War Room Létszám Import API
// =====================================================
// GET: Szinkronizálás státusz lekérése
// POST: Manuális szinkronizálás indítása
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getWarRoomSyncStatus, 
  forceWarRoomSync 
} from '@/lib/warroom-letszam';

/**
 * GET /api/warroom-letszam/sync
 * Státusz lekérése
 */
export async function GET() {
  try {
    const status = await getWarRoomSyncStatus();
    
    return NextResponse.json({
      success: true,
      ...status,
      lastSyncFormatted: status.lastSync 
        ? status.lastSync.toLocaleString('hu-HU') 
        : null
    });
    
  } catch (error) {
    console.error('[API] War Room sync status hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Státusz lekérdezés sikertelen' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/warroom-letszam/sync
 * Manuális szinkronizálás
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    console.log('[API] War Room manuális szinkronizálás indítása...');
    
    const result = await forceWarRoomSync();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Szinkronizálás sikeres: ${result.imported} sor importálva`,
        imported: result.imported
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Import sikertelen'
      }, { status: 500 });
    }
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Ismeretlen hiba';
    console.error('[API] War Room sync hiba:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
