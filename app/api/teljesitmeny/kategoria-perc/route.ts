/**
 * GET /api/teljesitmeny/kategoria-perc
 * 
 * Leadott percek kategóriánként (kördiagram adatok)
 * 
 * LOGIKA:
 * - Kategória arányok: ainova_napi_kategoria_perc (PERC SAP 64L...)
 * - Összesen perc: ainova_teljesitmeny (Percek sheet) - ez a pontos!
 * - Az arányokat átskálázzuk a teljesítmény összegre
 * 
 * Query params:
 *   - type: napi | heti | havi
 *   - datum: YYYY-MM-DD (napi esetén)
 *   - het: 1-53 (heti esetén)
 *   - honap: 1-12 (havi esetén)
 *   - ev: YYYY
 */

import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getPool } from '@/lib/db';
import { checkSession } from '@/lib/api-utils';

export const runtime = 'nodejs';

// Kategória nevek magyarul
const KATEGORIA_NEVEK: Record<string, string> = {
  'MERES': 'Mérés',
  'ELOKESZITES': 'Előkészítés',
  'SZERELES': 'Szerelés',
  'VEGSZERELES': 'Végszerelés',
  'IMPREGNALAS': 'Impregnálás',
  'TEKERCSELÉS': 'Tekercselés',
  'CSOMAGOLAS': 'Csomagolás',
  'MARAS_ONOZAS': 'Marás-Ónozás',
  'AWI_HEGESZTES': 'AWI Hegesztés',
  'FILTER': 'Filter',
  'EL_TEKERCSELÉS': 'El. Tekercselés',
  'EGYEB': 'Egyéb',
};

// Kategória színek (kördiagram)
const KATEGORIA_SZINEK: Record<string, string> = {
  'MERES': '#22d3ee',        // cyan
  'ELOKESZITES': '#a78bfa',  // purple
  'SZERELES': '#f59e0b',     // amber
  'VEGSZERELES': '#10b981',  // emerald
  'IMPREGNALAS': '#ec4899',  // pink
  'TEKERCSELÉS': '#3b82f6',  // blue
  'CSOMAGOLAS': '#84cc16',   // lime
  'MARAS_ONOZAS': '#f97316', // orange
  'AWI_HEGESZTES': '#ef4444', // red
  'FILTER': '#6366f1',       // indigo
  'EL_TEKERCSELÉS': '#14b8a6', // teal
  'EGYEB': '#6b7280',        // gray
};

export async function GET(request: NextRequest) {
  try {
    // Session ellenőrzés
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'napi';
    const datum = searchParams.get('datum');
    const ev = parseInt(searchParams.get('ev') || new Date().getFullYear().toString());
    const het = searchParams.get('het');
    const honap = searchParams.get('honap');

    const pool = await getPool();

    let result;

    switch (type) {
      case 'napi':
        // Adott nap vagy legutolsó nap
        if (datum) {
          result = await pool.request()
            .input('datum', sql.Date, datum)
            .query(`
              SELECT 
                kategoria_kod,
                CAST(leadott_perc AS INT) AS perc
              FROM ainova_napi_kategoria_perc
              WHERE datum = @datum
              ORDER BY leadott_perc DESC
            `);
        } else {
          // Legutolsó nap amire van adat
          result = await pool.request().query(`
            SELECT 
              kategoria_kod,
              CAST(leadott_perc AS INT) AS perc
            FROM ainova_napi_kategoria_perc
            WHERE datum = (SELECT MAX(datum) FROM ainova_napi_kategoria_perc)
            ORDER BY leadott_perc DESC
          `);
        }
        break;

      case 'heti':
        // Adott hét vagy aktuális hét
        const hetNum = het ? parseInt(het) : null;
        if (hetNum) {
          result = await pool.request()
            .input('het', sql.Int, hetNum)
            .input('ev', sql.Int, ev)
            .query(`
              SELECT 
                kategoria_kod,
                CAST(SUM(leadott_perc) AS INT) AS perc
              FROM ainova_napi_kategoria_perc
              WHERE DATEPART(ISO_WEEK, datum) = @het AND YEAR(datum) = @ev
              GROUP BY kategoria_kod
              ORDER BY perc DESC
            `);
        } else {
          // Aktuális hét
          result = await pool.request().query(`
            SELECT 
              kategoria_kod,
              CAST(SUM(leadott_perc) AS INT) AS perc
            FROM ainova_napi_kategoria_perc
            WHERE DATEPART(ISO_WEEK, datum) = DATEPART(ISO_WEEK, GETDATE())
              AND YEAR(datum) = YEAR(GETDATE())
            GROUP BY kategoria_kod
            ORDER BY perc DESC
          `);
        }
        break;

      case 'havi':
        // Adott hónap vagy aktuális hónap
        const honapNum = honap ? parseInt(honap) : null;
        if (honapNum) {
          result = await pool.request()
            .input('honap', sql.Int, honapNum)
            .input('ev', sql.Int, ev)
            .query(`
              SELECT 
                kategoria_kod,
                CAST(SUM(leadott_perc) AS INT) AS perc
              FROM ainova_napi_kategoria_perc
              WHERE MONTH(datum) = @honap AND YEAR(datum) = @ev
              GROUP BY kategoria_kod
              ORDER BY perc DESC
            `);
        } else {
          // Aktuális hónap
          result = await pool.request().query(`
            SELECT 
              kategoria_kod,
              CAST(SUM(leadott_perc) AS INT) AS perc
            FROM ainova_napi_kategoria_perc
            WHERE MONTH(datum) = MONTH(GETDATE()) AND YEAR(datum) = YEAR(GETDATE())
            GROUP BY kategoria_kod
            ORDER BY perc DESC
          `);
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Érvénytelen type paraméter' },
          { status: 400 }
        );
    }

    // Összesített percek a PERC SAP kategória táblából (arányokhoz)
    const kategoriaSzumma = result.recordset.reduce((sum: number, r: { perc: number }) => sum + r.perc, 0);

    // Összesített percek a teljesítmény táblából (pontos szám)
    // Ez a Percek sheet-ből jön, amit a főnöknek mutatsz
    let teljesitmenyPerc = 0;
    
    try {
      let teljesitmenyQuery;
      switch (type) {
        case 'napi':
          if (datum) {
            teljesitmenyQuery = await pool.request()
              .input('datum', sql.Date, datum)
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE datum = @datum`);
          } else {
            teljesitmenyQuery = await pool.request()
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE datum = (SELECT MAX(datum) FROM ainova_teljesitmeny)`);
          }
          break;
        case 'heti':
          const hetNum2 = het ? parseInt(het) : null;
          if (hetNum2) {
            teljesitmenyQuery = await pool.request()
              .input('het', sql.Int, hetNum2)
              .input('ev', sql.Int, ev)
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE DATEPART(ISO_WEEK, datum) = @het AND YEAR(datum) = @ev`);
          } else {
            teljesitmenyQuery = await pool.request()
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE DATEPART(ISO_WEEK, datum) = DATEPART(ISO_WEEK, GETDATE()) AND YEAR(datum) = YEAR(GETDATE())`);
          }
          break;
        case 'havi':
          const honapNum2 = honap ? parseInt(honap) : null;
          if (honapNum2) {
            teljesitmenyQuery = await pool.request()
              .input('honap', sql.Int, honapNum2)
              .input('ev', sql.Int, ev)
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE MONTH(datum) = @honap AND YEAR(datum) = @ev`);
          } else {
            teljesitmenyQuery = await pool.request()
              .query(`SELECT ISNULL(SUM(leadott_perc), 0) AS ossz FROM ainova_teljesitmeny WHERE MONTH(datum) = MONTH(GETDATE()) AND YEAR(datum) = YEAR(GETDATE())`);
          }
          break;
      }
      teljesitmenyPerc = teljesitmenyQuery?.recordset[0]?.ossz || 0;
    } catch (e) {
      console.warn('[kategoria-perc] Teljesítmény tábla lekérés hiba, fallback kategória összegre:', e);
      teljesitmenyPerc = kategoriaSzumma;
    }

    // Ha nincs teljesítmény adat, használjuk a kategória összesítést
    const osszPerc = teljesitmenyPerc > 0 ? Math.round(teljesitmenyPerc) : kategoriaSzumma;
    
    // Arányok átskálázása a teljesítmény összegre
    const skalazasFaktor = kategoriaSzumma > 0 ? osszPerc / kategoriaSzumma : 1;

    const adatok = result.recordset.map((row: { kategoria_kod: string; perc: number }) => ({
      kod: row.kategoria_kod,
      nev: KATEGORIA_NEVEK[row.kategoria_kod] || row.kategoria_kod,
      szin: KATEGORIA_SZINEK[row.kategoria_kod] || '#6b7280',
      perc: Math.round(row.perc * skalazasFaktor), // Átskálázott perc
      szazalek: kategoriaSzumma > 0 ? Math.round((row.perc / kategoriaSzumma) * 1000) / 10 : 0,
    }));

    // Elérhető dátumok/hetek lekérése (dropdown-hoz)
    const elerheto = await pool.request().query(`
      SELECT 
        MIN(datum) AS min_datum,
        MAX(datum) AS max_datum,
        COUNT(DISTINCT datum) AS napok_szama
      FROM ainova_napi_kategoria_perc
    `);

    return NextResponse.json({
      success: true,
      type,
      osszPerc,
      adatok,
      elerheto: elerheto.recordset[0]
    });

  } catch (error) {
    console.error('Kategória perc API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Szerver hiba' },
      { status: 500 }
    );
  }
}
