import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// POST: Kézi szinkronizálás indítása
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { het, ev } = body as { het?: number; ev?: number };
    
    // Script útvonal
    const scriptPath = path.join(process.cwd(), 'scripts', 'sync-allokacio-excel.js');
    
    // Argumentumok összeállítása
    const args = [scriptPath];
    if (het) args.push(`--het=${het}`);
    if (ev) args.push(`--ev=${ev}`);
    
    // Script futtatása (async, nem várunk rá)
    // Ezt azért csináljuk, hogy gyors legyen a válasz
    const child = spawn('node', args, {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    });
    
    child.unref();
    
    return NextResponse.json({
      success: true,
      message: 'Szinkronizáció elindítva',
      data: {
        script: 'sync-allokacio-excel.js',
        het: het || 'összes',
        ev: ev || 2026
      }
    });
    
  } catch (error) {
    console.error('Sync API hiba:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ismeretlen hiba'
    }, { status: 500 });
  }
}

// GET: Szinkronizáció státusz lekérdezése
export async function GET() {
  try {
    // Itt lekérdezhetnénk az utolsó sync log-ot az adatbázisból
    // Egyszerűsített verzió: csak visszaadjuk az endpointot
    return NextResponse.json({
      success: true,
      message: 'Szinkronizáció API elérhető',
      endpoints: {
        POST: 'Szinkronizáció indítása (body: { het?: number, ev?: number })',
        GET: 'API státusz'
      },
      config: {
        excel_path: 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm',
        auto_sync_interval: '2 óra'
      }
    });
    
  } catch (error) {
    console.error('Sync GET hiba:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ismeretlen hiba'
    }, { status: 500 });
  }
}
