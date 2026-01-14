import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET: Napi teljesülés lekérdezése (ainova_napi_terv táblából)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const datum = searchParams.get('datum') || null;
    const het_szam = searchParams.get('het') || null;
    const ev = searchParams.get('ev') || new Date().getFullYear().toString();
    
    const pool = await getPool();
    
    let query = '';
    const params: Record<string, number | string> = { ev: parseInt(ev) };
    
    if (datum) {
      // Konkrét nap lekérdezése
      query = `
        SELECT 
          nt.datum,
          nt.het_szam,
          nt.ev,
          DATENAME(WEEKDAY, nt.datum) AS nap_nev,
          nt.tipus_kod,
          nt.termek_tipus,
          
          -- Tervezett (igény)
          nt.igeny_db AS tervezett_db,
          nt.igeny_perc AS tervezett_perc,
          
          -- Teljesült (leadott)
          nt.leadott_db AS teljesult_db,
          ISNULL(nt.leadott_db, 0) * ISNULL(tn.osszeg_normido_perc, 0) AS teljesult_perc,
          
          -- Különbség
          nt.kulonbseg_db,
          (ISNULL(nt.leadott_db, 0) - ISNULL(nt.igeny_db, 0)) * ISNULL(tn.osszeg_normido_perc, 0) AS kulonbseg_perc,
          
          -- Teljesítés %
          CASE 
            WHEN nt.igeny_db = 0 THEN 100
            ELSE CAST(ISNULL(nt.leadott_db, 0) * 100.0 / NULLIF(nt.igeny_db, 0) AS DECIMAL(5,1))
          END AS teljesites_szazalek,
          
          nt.utolso_szinkron
          
        FROM ainova_napi_terv nt
        LEFT JOIN ainova_termek_normak tn ON nt.tipus_kod = tn.tipus_kod
        WHERE nt.datum = @datum
        ORDER BY 
          CASE WHEN nt.kulonbseg_db < 0 THEN 0 ELSE 1 END,
          nt.kulonbseg_db ASC
      `;
      params.datum = datum;
    } else if (het_szam) {
      // Heti összesítő
      query = `
        SELECT 
          nt.ev,
          nt.het_szam,
          nt.tipus_kod,
          nt.termek_tipus,
          
          -- Heti terv összesen
          SUM(nt.igeny_db) AS heti_tervezett_db,
          SUM(nt.igeny_perc) AS heti_tervezett_perc,
          
          -- Heti teljesült
          SUM(ISNULL(nt.leadott_db, 0)) AS heti_teljesult_db,
          SUM(ISNULL(nt.leadott_db, 0) * ISNULL(tn.osszeg_normido_perc, 0)) AS heti_teljesult_perc,
          
          -- Heti különbség
          SUM(nt.kulonbseg_db) AS heti_kulonbseg_db,
          SUM((ISNULL(nt.leadott_db, 0) - ISNULL(nt.igeny_db, 0)) * ISNULL(tn.osszeg_normido_perc, 0)) AS heti_kulonbseg_perc,
          
          -- Teljesítés %
          CASE 
            WHEN SUM(nt.igeny_db) = 0 THEN 100
            ELSE CAST(SUM(ISNULL(nt.leadott_db, 0)) * 100.0 / NULLIF(SUM(nt.igeny_db), 0) AS DECIMAL(5,1))
          END AS teljesites_szazalek
          
        FROM ainova_napi_terv nt
        LEFT JOIN ainova_termek_normak tn ON nt.tipus_kod = tn.tipus_kod
        WHERE nt.ev = @ev AND nt.het_szam = @het_szam
        GROUP BY nt.ev, nt.het_szam, nt.tipus_kod, nt.termek_tipus
        ORDER BY nt.tipus_kod
      `;
      params.het_szam = parseInt(het_szam);
    } else {
      // Mai nap
      query = `
        SELECT 
          nt.datum,
          nt.het_szam,
          nt.ev,
          DATENAME(WEEKDAY, nt.datum) AS nap_nev,
          nt.tipus_kod,
          nt.termek_tipus,
          nt.igeny_db AS tervezett_db,
          ISNULL(nt.leadott_db, 0) AS teljesult_db,
          nt.kulonbseg_db,
          CASE 
            WHEN nt.igeny_db = 0 THEN 100
            ELSE CAST(ISNULL(nt.leadott_db, 0) * 100.0 / NULLIF(nt.igeny_db, 0) AS DECIMAL(5,1))
          END AS teljesites_szazalek
        FROM ainova_napi_terv nt
        WHERE nt.datum = CAST(GETDATE() AS DATE)
        ORDER BY 
          CASE WHEN nt.kulonbseg_db < 0 THEN 0 ELSE 1 END,
          nt.kulonbseg_db ASC
      `;
    }
    
    const request_db = pool.request();
    Object.entries(params).forEach(([key, value]) => {
      request_db.input(key, value);
    });
    
    const result = await request_db.query(query);
    
    // Összesítő számítás
    const osszesitoResult = await pool.request()
      .input('datum', datum || null)
      .input('het_szam', het_szam ? parseInt(het_szam) : null)
      .input('ev', parseInt(ev))
      .query(`
        SELECT 
          COUNT(*) AS tipusok_szama,
          SUM(igeny_db) AS ossz_tervezett,
          SUM(ISNULL(leadott_db, 0)) AS ossz_teljesult,
          SUM(kulonbseg_db) AS ossz_kulonbseg,
          SUM(CASE WHEN kulonbseg_db < 0 THEN 1 ELSE 0 END) AS lemarado_tipusok,
          SUM(CASE WHEN kulonbseg_db >= 0 THEN 1 ELSE 0 END) AS teljesitett_tipusok
        FROM ainova_napi_terv
        WHERE 
          (datum = @datum OR @datum IS NULL)
          AND (het_szam = @het_szam OR @het_szam IS NULL)
          AND ev = @ev
      `);
    
    return NextResponse.json({
      success: true,
      data: {
        teljesulesek: result.recordset,
        osszesito: osszesitoResult.recordset[0] || null
      }
    });
    
  } catch (error) {
    console.error('Napi teljesülés API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Adatbázis hiba' },
      { status: 500 }
    );
  }
}

// POST: Teljesülés (leadott_db) frissítése
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { datum, tipus_kod, teljesult_db } = body;
    
    if (!datum || !tipus_kod || teljesult_db === undefined) {
      return NextResponse.json(
        { success: false, error: 'Hiányzó paraméterek: datum, tipus_kod, teljesult_db' },
        { status: 400 }
      );
    }
    
    const pool = await getPool();
    
    // Frissítés az ainova_napi_terv táblában
    await pool.request()
      .input('datum', datum)
      .input('tipus_kod', tipus_kod)
      .input('leadott_db', teljesult_db)
      .query(`
        UPDATE ainova_napi_terv
        SET 
          leadott_db = @leadott_db,
          utolso_szinkron = SYSDATETIME(),
          updated_at = SYSDATETIME()
        WHERE datum = @datum AND tipus_kod = @tipus_kod
      `);
    
    return NextResponse.json({
      success: true,
      message: 'Teljesülés frissítve'
    });
    
  } catch (error) {
    console.error('Teljesülés frissítés hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Adatbázis hiba' },
      { status: 500 }
    );
  }
}
