import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

/**
 * GET /api/allokacio/napi-terv
 * Lekérdezi a napi terv adatokat - igény és leadott naponta
 * Query params: het (hét szám), ev (év)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const het = parseInt(searchParams.get('het') || '3');
    const ev = parseInt(searchParams.get('ev') || '2026');

    const pool = await getPool();

    // Napi terv adatok lekérdezése normával és KATEGÓRIA BONTÁSSAL együtt
    const result = await pool.request()
      .input('het_szam', het)
      .input('ev', ev)
      .query(`
        SELECT 
          nt.tipus_kod,
          nt.termek_tipus,
          nt.datum,
          nt.igeny_db,
          nt.leadott_db,
          nt.kulonbseg_db,
          ISNULL(n.osszeg_normido_perc, 0) AS norma_perc,
          ISNULL(n.meres_perc, 0) AS meres_perc,
          ISNULL(n.elokeszites_perc, 0) AS elokeszites_perc,
          ISNULL(n.szereles_perc, 0) AS szereles_perc,
          ISNULL(n.vegszereles_perc, 0) AS vegszereles_perc,
          ISNULL(n.impregnalas_perc, 0) AS impregnalas_perc,
          ISNULL(n.tekercselés_perc, 0) AS tekercselés_perc,
          ISNULL(n.csomagolas_perc, 0) AS csomagolas_perc,
          ISNULL(n.filter_perc, 0) AS filter_perc,
          ISNULL(n.maras_onozas_perc, 0) AS maras_onozas_perc,
          ISNULL(n.awi_hegesztes_perc, 0) AS awi_hegesztes_perc,
          ISNULL(n.el_tekercselés_perc, 0) AS el_tekercselés_perc
        FROM dbo.ainova_napi_terv nt
        LEFT JOIN dbo.ainova_termek_normak n 
          ON nt.tipus_kod = n.tipus_kod
        WHERE nt.het_szam = @het_szam AND nt.ev = @ev
        ORDER BY nt.termek_tipus, nt.tipus_kod, nt.datum
      `);

    const rows = result.recordset;

    // Egyedi dátumok kiszedése (rendezve)
    const datumokSet = new Set<string>();
    rows.forEach(r => {
      const d = new Date(r.datum).toISOString().split('T')[0];
      datumokSet.add(d);
    });
    const datumok = Array.from(datumokSet).sort();

    // Adatok csoportosítása típusonként
    type NapiAdat = { igeny: number; leadott: number; diff: number };
    type TipusAdat = {
      tipus_kod: string;
      termek_tipus: string;
      norma_perc: number;
      meres_perc: number;
      elokeszites_perc: number;
      szereles_perc: number;
      vegszereles_perc: number;
      impregnalas_perc: number;
      tekercselés_perc: number;
      csomagolas_perc: number;
      filter_perc: number;
      maras_onozas_perc: number;
      awi_hegesztes_perc: number;
      el_tekercselés_perc: number;
      napok: Record<string, NapiAdat>;
      heti_igeny: number;
      heti_leadott: number;
      heti_diff: number;
    };
    
    const tipusMap = new Map<string, TipusAdat>();

    for (const row of rows) {
      const tipus = row.tipus_kod;
      const datum = new Date(row.datum).toISOString().split('T')[0];

      if (!tipusMap.has(tipus)) {
        tipusMap.set(tipus, {
          tipus_kod: tipus,
          termek_tipus: row.termek_tipus || 'FIX',
          norma_perc: row.norma_perc || 0,
          meres_perc: row.meres_perc || 0,
          elokeszites_perc: row.elokeszites_perc || 0,
          szereles_perc: row.szereles_perc || 0,
          vegszereles_perc: row.vegszereles_perc || 0,
          impregnalas_perc: row.impregnalas_perc || 0,
          tekercselés_perc: row.tekercselés_perc || 0,
          csomagolas_perc: row.csomagolas_perc || 0,
          filter_perc: row.filter_perc || 0,
          maras_onozas_perc: row.maras_onozas_perc || 0,
          awi_hegesztes_perc: row.awi_hegesztes_perc || 0,
          el_tekercselés_perc: row.el_tekercselés_perc || 0,
          napok: {},
          heti_igeny: 0,
          heti_leadott: 0,
          heti_diff: 0
        });
      }

      const tipusData = tipusMap.get(tipus)!;
      tipusData.napok[datum] = {
        igeny: row.igeny_db || 0,
        leadott: row.leadott_db || 0,
        diff: row.kulonbseg_db || 0
      };
      tipusData.heti_igeny += row.igeny_db || 0;
      tipusData.heti_leadott += row.leadott_db || 0;
      tipusData.heti_diff += row.kulonbseg_db || 0;
    }

    // Összesítők - heti és napi szinten (PERCEKBEN: db × norma)
    let osszIgenyPerc = 0;
    let osszLeadottPerc = 0;
    const napiOsszesitok: Record<string, { igeny_perc: number; leadott_perc: number }> = {};
    
    // Kategóriánkénti kapacitás igény naponta
    const KATEGORIAK = ['meres', 'elokeszites', 'szereles', 'vegszereles', 'impregnalas', 'tekercselés', 'csomagolas', 'filter', 'maras_onozas', 'awi_hegesztes', 'el_tekercselés'];
    type KapacitasNap = Record<string, number>; // kategoria -> perc
    const kapacitasIgeny: Record<string, KapacitasNap> = {}; // datum -> { meres: X, szereles: Y, ... }
    const hetiKapacitas: Record<string, number> = {}; // kategoria -> heti perc
    
    // Inicializálás
    for (const d of datumok) {
      napiOsszesitok[d] = { igeny_perc: 0, leadott_perc: 0 };
      kapacitasIgeny[d] = {};
      for (const kat of KATEGORIAK) {
        kapacitasIgeny[d][kat] = 0;
      }
    }
    for (const kat of KATEGORIAK) {
      hetiKapacitas[kat] = 0;
    }
    
    tipusMap.forEach(t => {
      const norma = t.norma_perc || 0;
      osszIgenyPerc += t.heti_igeny * norma;
      osszLeadottPerc += t.heti_leadott * norma;
      
      // Napi összesítés percekben + kategória bontás
      for (const [datum, nap] of Object.entries(t.napok)) {
        if (napiOsszesitok[datum]) {
          napiOsszesitok[datum].igeny_perc += nap.igeny * norma;
          napiOsszesitok[datum].leadott_perc += nap.leadott * norma;
          
          // Kategóriánkénti kapacitás (igény × kategória norma)
          // @ts-ignore - dinamikus property access
          if (t.meres_perc) kapacitasIgeny[datum]['meres'] += nap.igeny * t.meres_perc;
          // @ts-ignore
          if (t.elokeszites_perc) kapacitasIgeny[datum]['elokeszites'] += nap.igeny * t.elokeszites_perc;
          // @ts-ignore
          if (t.szereles_perc) kapacitasIgeny[datum]['szereles'] += nap.igeny * t.szereles_perc;
          // @ts-ignore
          if (t.vegszereles_perc) kapacitasIgeny[datum]['vegszereles'] += nap.igeny * t.vegszereles_perc;
          // @ts-ignore
          if (t.impregnalas_perc) kapacitasIgeny[datum]['impregnalas'] += nap.igeny * t.impregnalas_perc;
          // @ts-ignore
          if (t.tekercselés_perc) kapacitasIgeny[datum]['tekercselés'] += nap.igeny * t.tekercselés_perc;
          // @ts-ignore
          if (t.csomagolas_perc) kapacitasIgeny[datum]['csomagolas'] += nap.igeny * t.csomagolas_perc;
          // @ts-ignore
          if (t.filter_perc) kapacitasIgeny[datum]['filter'] += nap.igeny * t.filter_perc;
          // @ts-ignore
          if (t.maras_onozas_perc) kapacitasIgeny[datum]['maras_onozas'] += nap.igeny * t.maras_onozas_perc;
          // @ts-ignore
          if (t.awi_hegesztes_perc) kapacitasIgeny[datum]['awi_hegesztes'] += nap.igeny * t.awi_hegesztes_perc;
          // @ts-ignore
          if (t.el_tekercselés_perc) kapacitasIgeny[datum]['el_tekercselés'] += nap.igeny * t.el_tekercselés_perc;
        }
      }
    });
    
    // Heti kapacitás összesítés
    for (const d of datumok) {
      for (const kat of KATEGORIAK) {
        hetiKapacitas[kat] += kapacitasIgeny[d][kat];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        datumok,
        tipusok: Array.from(tipusMap.values()),
        napiOsszesitok,
        kapacitasIgeny,    // Napi kategóriánkénti perc igény
        hetiKapacitas,     // Heti kategóriánkénti perc igény
        osszesito: {
          heti_igeny_perc: osszIgenyPerc,
          heti_leadott_perc: osszLeadottPerc,
          heti_diff_perc: osszIgenyPerc - osszLeadottPerc
        }
      }
    });

  } catch (error) {
    console.error('Napi terv API hiba:', error);
    return NextResponse.json(
      { success: false, error: 'Szerver hiba' },
      { status: 500 }
    );
  }
}
