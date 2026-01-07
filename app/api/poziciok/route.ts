// =====================================================
// AINOVA - Pozíciók API
// =====================================================
// Purpose: Distinct pozíciók lekérése az operátor táblából
// Method: GET
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { validateSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const pool = await getPool();

    // Distinct pozíciók lekérése (ahol nem 'Admin adja meg' és nem üres)
    const result = await pool.request().query(`
      SELECT DISTINCT pozicio AS nev
      FROM ainova_operatorok
      WHERE pozicio IS NOT NULL 
        AND pozicio <> ''
        AND pozicio <> 'Admin adja meg'
        AND aktiv = 1
      ORDER BY pozicio
    `);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });

  } catch (error: any) {
    console.error('[Pozíciók API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Hiba történt', details: error.message },
      { status: 500 }
    );
  }
}
