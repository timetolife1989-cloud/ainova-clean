import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/allokacio/folyamatok
 * Lekérdezi az SAP folyamatokat kategóriánként
 */
export async function GET() {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        id,
        sap_nev,
        kategoria_kod,
        munkahely_kodok,
        kz_norma_oszlop_index,
        aktiv
      FROM dbo.ainova_sap_folyamatok
      WHERE aktiv = 1
      ORDER BY kategoria_kod, kz_norma_oszlop_index
    `);

    // Kategóriánként csoportosítjuk
    const kategoriak: Record<string, Array<{
      id: number;
      sap_nev: string;
      munkahely_kodok: string;
      oszlop_index: number;
    }>> = {};

    for (const row of result.recordset) {
      const kat = row.kategoria_kod;
      if (!kategoriak[kat]) {
        kategoriak[kat] = [];
      }
      kategoriak[kat].push({
        id: row.id,
        sap_nev: row.sap_nev,
        munkahely_kodok: row.munkahely_kodok || '',
        oszlop_index: row.kz_norma_oszlop_index
      });
    }

    return NextResponse.json({
      success: true,
      data: kategoriak
    });

  } catch (error) {
    console.error('Folyamatok API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Szerver hiba' },
      { status: 500 }
    );
  }
}
