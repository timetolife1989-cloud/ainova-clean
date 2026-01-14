import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET: Heti terv lekérdezése
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const het_szam = searchParams.get('het') || null;
    const ev = searchParams.get('ev') || new Date().getFullYear().toString();
    
    const pool = await getPool();
    
    // Ha nincs megadva hét, aktuális hetet számoljuk
    let hetSzam = het_szam;
    if (!hetSzam) {
      const weekResult = await pool.request().query(`
        SELECT DATEPART(WEEK, GETDATE()) AS het_szam
      `);
      hetSzam = weekResult.recordset[0].het_szam.toString();
    }
    
    // Heti terv összesítő lekérdezése
    const result = await pool.request()
      .input('ev', parseInt(ev))
      .input('het_szam', parseInt(hetSzam))
      .query(`
        SELECT 
          ht.ev,
          ht.het_szam,
          ht.het_kezdet,
          ht.het_veg,
          ht.tipus_kod,
          ht.termek_tipus,
          
          -- Normaidő per darab
          ISNULL(tn.osszeg_normido_perc, 0) AS norma_per_db,
          
          -- Napi darabszámok
          ht.hetfo_db,
          ht.kedd_db,
          ht.szerda_db,
          ht.csutortok_db,
          ht.pentek_db,
          
          -- Napi percek (számított)
          ht.hetfo_db * ISNULL(tn.osszeg_normido_perc, 0) AS hetfo_perc,
          ht.kedd_db * ISNULL(tn.osszeg_normido_perc, 0) AS kedd_perc,
          ht.szerda_db * ISNULL(tn.osszeg_normido_perc, 0) AS szerda_perc,
          ht.csutortok_db * ISNULL(tn.osszeg_normido_perc, 0) AS csutortok_perc,
          ht.pentek_db * ISNULL(tn.osszeg_normido_perc, 0) AS pentek_perc,
          
          -- Heti összesítő
          (ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) AS heti_ossz_db,
          (ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) 
              * ISNULL(tn.osszeg_normido_perc, 0) AS heti_ossz_perc,
          
          ht.utolso_szinkron
        FROM ainova_heti_terv ht
        LEFT JOIN ainova_termek_normak tn ON REPLACE(ht.tipus_kod, ' ', '') = REPLACE(tn.tipus_kod, ' ', '')
        WHERE ht.ev = @ev AND ht.het_szam = @het_szam
        ORDER BY ht.termek_tipus, ht.tipus_kod
      `);
    
    // Összesítő sor
    const osszesitoResult = await pool.request()
      .input('ev', parseInt(ev))
      .input('het_szam', parseInt(hetSzam))
      .query(`
        SELECT 
          SUM(ht.hetfo_db) AS hetfo_ossz_db,
          SUM(ht.kedd_db) AS kedd_ossz_db,
          SUM(ht.szerda_db) AS szerda_ossz_db,
          SUM(ht.csutortok_db) AS csutortok_ossz_db,
          SUM(ht.pentek_db) AS pentek_ossz_db,
          SUM(ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) AS heti_grand_total_db,
          SUM((ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) 
              * ISNULL(tn.osszeg_normido_perc, 0)) AS heti_grand_total_perc
        FROM ainova_heti_terv ht
        LEFT JOIN ainova_termek_normak tn ON REPLACE(ht.tipus_kod, ' ', '') = REPLACE(tn.tipus_kod, ' ', '')
        WHERE ht.ev = @ev AND ht.het_szam = @het_szam
      `);
    
    return NextResponse.json({
      success: true,
      data: {
        ev: parseInt(ev),
        het_szam: parseInt(hetSzam),
        tervek: result.recordset,
        osszesito: osszesitoResult.recordset[0] || null
      }
    });
    
  } catch (error) {
    console.error('Heti terv API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Adatbázis hiba' },
      { status: 500 }
    );
  }
}
