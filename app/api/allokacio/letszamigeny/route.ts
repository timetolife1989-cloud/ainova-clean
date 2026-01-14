import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET: Létszámigény számítása a heti tervből
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const het_szam = searchParams.get('het') || null;
    const ev = searchParams.get('ev') || new Date().getFullYear().toString();
    const config = searchParams.get('config') || 'ALAP';
    
    const pool = await getPool();
    
    // Ha nincs megadva hét, aktuális hetet számoljuk
    let hetSzam = het_szam;
    if (!hetSzam) {
      const weekResult = await pool.request().query(`
        SELECT DATEPART(WEEK, GETDATE()) AS het_szam
      `);
      hetSzam = weekResult.recordset[0].het_szam.toString();
    }
    
    // Konfiguráció lekérdezése
    const configResult = await pool.request()
      .input('config_nev', config)
      .query(`
        SELECT 
          napi_munkaido_perc,
          muszak_szam,
          hatekonyság_szazalek
        FROM ainova_munkanap_config
        WHERE config_nev = @config_nev
      `);
    
    if (configResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Konfiguráció nem található: ' + config },
        { status: 404 }
      );
    }
    
    const cfg = configResult.recordset[0];
    const kapacitasPerFoPerNap = cfg.napi_munkaido_perc * cfg.muszak_szam * (cfg.hatekonyság_szazalek / 100);
    
    // Létszámigény kategóriánként
    const result = await pool.request()
      .input('ev', parseInt(ev))
      .input('het_szam', parseInt(hetSzam))
      .input('kapacitas', kapacitasPerFoPerNap)
      .query(`
        SELECT 
          fk.kod AS kategoria_kod,
          fk.nev AS kategoria_nev,
          fk.sorrend,
          
          -- Hétfő
          CEILING(SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS hetfo_letszam,
          SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS hetfo_perc,
          
          -- Kedd
          CEILING(SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS kedd_letszam,
          SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS kedd_perc,
          
          -- Szerda
          CEILING(SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS szerda_letszam,
          SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS szerda_perc,
          
          -- Csütörtök
          CEILING(SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS csutortok_letszam,
          SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS csutortok_perc,
          
          -- Péntek
          CEILING(SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS pentek_letszam,
          SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) AS pentek_perc,
          
          -- Heti átlag
          CEILING(
            SUM((ht.hetfo_db + ht.kedd_db + ht.szerda_db + ht.csutortok_db + ht.pentek_db) 
                * ISNULL(tkn.kategoria_ossz_perc, 0)) / (@kapacitas * 5)
          ) AS heti_atlag_letszam

        FROM ainova_heti_terv ht
        LEFT JOIN vw_termek_kategoria_normak tkn ON ht.tipus_kod = tkn.tipus_kod
        INNER JOIN ainova_folyamat_kategoriak fk ON tkn.kategoria_kod = fk.kod
        WHERE ht.ev = @ev AND ht.het_szam = @het_szam
        GROUP BY fk.kod, fk.nev, fk.sorrend
        ORDER BY fk.sorrend
      `);
    
    // Grand total
    const totalResult = await pool.request()
      .input('ev', parseInt(ev))
      .input('het_szam', parseInt(hetSzam))
      .input('kapacitas', kapacitasPerFoPerNap)
      .query(`
        SELECT 
          CEILING(SUM(ht.hetfo_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS hetfo_ossz,
          CEILING(SUM(ht.kedd_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS kedd_ossz,
          CEILING(SUM(ht.szerda_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS szerda_ossz,
          CEILING(SUM(ht.csutortok_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS csutortok_ossz,
          CEILING(SUM(ht.pentek_db * ISNULL(tkn.kategoria_ossz_perc, 0)) / @kapacitas) AS pentek_ossz
        FROM ainova_heti_terv ht
        LEFT JOIN vw_termek_kategoria_normak tkn ON ht.tipus_kod = tkn.tipus_kod
        WHERE ht.ev = @ev AND ht.het_szam = @het_szam
      `);
    
    return NextResponse.json({
      success: true,
      data: {
        ev: parseInt(ev),
        het_szam: parseInt(hetSzam),
        config: config,
        kapacitas_per_fo_per_nap: kapacitasPerFoPerNap,
        kategoriak: result.recordset,
        osszesito: totalResult.recordset[0] || null
      }
    });
    
  } catch (error) {
    console.error('Létszámigény API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Adatbázis hiba' },
      { status: 500 }
    );
  }
}
