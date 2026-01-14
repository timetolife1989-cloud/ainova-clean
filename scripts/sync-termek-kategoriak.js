/**
 * AINOVA - Termék SAP Idők és Kategória Bontás Szinkronizáció
 * ============================================================
 * Az Excel K.Z norma sheet 92 oszlopából (SAP folyamatok) 
 * beolvassa a típusonkénti időket és kategóriánként összesíti.
 * 
 * Cél: ainova_termek_normak tábla kategória oszlopainak feltöltése
 */

const XLSX = require('xlsx');
const sql = require('mssql');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

const DB_CONFIG = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Normalizálja a típuskódot
function normalizeTipusKod(kod) {
  if (!kod) return '';
  return String(kod).replace(/\s+/g, '');
}

// SAP oszlop index -> Kategória mapping
// Az ainova_sap_folyamatok tábla alapján
const OSZLOP_KATEGORIA = {
  // MÉRÉS (27 lépés)
  14: 'MERES', 15: 'MERES', 16: 'MERES', 17: 'MERES',
  22: 'MERES', 23: 'MERES', 31: 'MERES', 40: 'MERES', 41: 'MERES',
  54: 'MERES', 55: 'MERES', 56: 'MERES', 57: 'MERES', 58: 'MERES',
  61: 'MERES', 62: 'MERES', 63: 'MERES', 64: 'MERES',
  66: 'MERES', 67: 'MERES', 68: 'MERES', 69: 'MERES', 70: 'MERES',
  83: 'MERES', 84: 'MERES', 85: 'MERES', 86: 'MERES',
  
  // ELŐKÉSZÍTÉS (14 lépés)
  9: 'ELOKESZITES', 18: 'ELOKESZITES', 19: 'ELOKESZITES', 20: 'ELOKESZITES', 21: 'ELOKESZITES',
  33: 'ELOKESZITES', 35: 'ELOKESZITES', 36: 'ELOKESZITES',
  44: 'ELOKESZITES', 48: 'ELOKESZITES', 71: 'ELOKESZITES',
  80: 'ELOKESZITES', 81: 'ELOKESZITES', 82: 'ELOKESZITES',
  
  // SZERELÉS (13 lépés)
  10: 'SZERELES', 25: 'SZERELES', 43: 'SZERELES', 45: 'SZERELES', 46: 'SZERELES',
  49: 'SZERELES', 50: 'SZERELES', 51: 'SZERELES', 52: 'SZERELES',
  72: 'SZERELES', 73: 'SZERELES', 74: 'SZERELES', 89: 'SZERELES',
  
  // VÉGSZERELÉS (9 lépés)
  3: 'VEGSZERELES', 6: 'VEGSZERELES', 12: 'VEGSZERELES', 26: 'VEGSZERELES',
  75: 'VEGSZERELES', 76: 'VEGSZERELES', 77: 'VEGSZERELES',
  87: 'VEGSZERELES', 88: 'VEGSZERELES',
  
  // IMPREGNÁLÁS (8 lépés)
  32: 'IMPREGNALAS', 34: 'IMPREGNALAS', 38: 'IMPREGNALAS', 39: 'IMPREGNALAS',
  90: 'IMPREGNALAS', 91: 'IMPREGNALAS', 92: 'IMPREGNALAS', 93: 'IMPREGNALAS',
  
  // FILTER (7 lépés)
  4: 'FILTER', 5: 'FILTER', 24: 'FILTER', 42: 'FILTER', 47: 'FILTER', 53: 'FILTER', 65: 'FILTER',
  
  // MARÁS-ÓNOZÁS (5 lépés)
  37: 'MARAS_ONOZAS', 59: 'MARAS_ONOZAS', 60: 'MARAS_ONOZAS', 78: 'MARAS_ONOZAS', 79: 'MARAS_ONOZAS',
  
  // TEKERCSELÉS (4 lépés)
  11: 'TEKERCSELÉS', 27: 'TEKERCSELÉS', 28: 'TEKERCSELÉS', 29: 'TEKERCSELÉS',
  
  // CSOMAGOLÁS (2 lépés)
  7: 'CSOMAGOLAS', 8: 'CSOMAGOLAS',
  
  // AWI HEGESZTÉS (1 lépés)
  2: 'AWI_HEGESZTES',
  
  // ÉL TEKERCSELÉS (1 lépés)
  30: 'EL_TEKERCSELÉS'
};

// Kategória -> DB oszlop név mapping
const KATEGORIA_OSZLOP = {
  'MERES': 'meres_perc',
  'ELOKESZITES': 'elokeszites_perc',
  'SZERELES': 'szereles_perc',
  'VEGSZERELES': 'vegszereles_perc',
  'IMPREGNALAS': 'impregnalas_perc',
  'FILTER': 'filter_perc',
  'MARAS_ONOZAS': 'maras_onozas_perc',
  'TEKERCSELÉS': 'tekercselés_perc',
  'CSOMAGOLAS': 'csomagolas_perc',
  'AWI_HEGESZTES': 'awi_hegesztes_perc',
  'EL_TEKERCSELÉS': 'el_tekercselés_perc'
};

async function main() {
  console.log('========================================');
  console.log('AINOVA - Termék SAP Idők Szinkronizáció');
  console.log('========================================');
  
  // Excel beolvasás
  console.log(`\nExcel olvasása: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('norma') || 
    name.toLowerCase() === 'k.z norma'
  );
  
  if (!sheetName) {
    console.log('K.Z norma sheet nem található!');
    return;
  }
  
  console.log(`Sheet: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Header ellenőrzés
  const header = data[0];
  console.log(`\nOszlopok: ${header.length}`);
  console.log(`Első pár oszlop: ${header.slice(0, 5).join(', ')}`);
  
  // Termékek feldolgozása
  const termekek = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const tipusKodRaw = String(row[0] || '').trim();
    const tipusKod = normalizeTipusKod(tipusKodRaw);
    if (!tipusKod || tipusKod.length < 3) continue;
    if (!/^[BC]\d/.test(tipusKod)) continue;
    
    // Összesített norma (1-es oszlop)
    const osszegNorma = parseFloat(row[1]) || 0;
    
    // Kategóriánkénti összesítés a 2-93 oszlopokból
    const kategoriak = {
      'MERES': 0,
      'ELOKESZITES': 0,
      'SZERELES': 0,
      'VEGSZERELES': 0,
      'IMPREGNALAS': 0,
      'FILTER': 0,
      'MARAS_ONOZAS': 0,
      'TEKERCSELÉS': 0,
      'CSOMAGOLAS': 0,
      'AWI_HEGESZTES': 0,
      'EL_TEKERCSELÉS': 0
    };
    
    // 2-93 oszlop (Excel oszlopok C-tól)
    for (let j = 2; j <= 93 && j < row.length; j++) {
      const ertek = parseFloat(row[j]) || 0;
      if (ertek > 0) {
        const kat = OSZLOP_KATEGORIA[j];
        if (kat) {
          kategoriak[kat] += ertek;
        }
      }
    }
    
    termekek.push({
      tipus_kod: tipusKod,
      osszeg_normido_perc: osszegNorma,
      ...kategoriak
    });
  }
  
  console.log(`\nFeldolgozva: ${termekek.length} termék`);
  
  // Példa kiírás
  const pelda = termekek.find(t => t.tipus_kod.includes('B86101'));
  if (pelda) {
    console.log('\n=== PÉLDA: B86101... ===');
    console.log(`Típus: ${pelda.tipus_kod}`);
    console.log(`Összeg norma: ${pelda.osszeg_normido_perc.toFixed(2)} perc`);
    console.log('Kategóriák:');
    Object.entries(KATEGORIA_OSZLOP).forEach(([kat, oszlop]) => {
      const ertek = pelda[kat];
      if (ertek > 0) {
        console.log(`  ${kat}: ${ertek.toFixed(2)} perc`);
      }
    });
  }
  
  // Adatbázis frissítés
  console.log('\n--- Adatbázis frissítés ---');
  const pool = await sql.connect(DB_CONFIG);
  
  let frissitett = 0;
  
  for (const t of termekek) {
    try {
      await pool.request()
        .input('tipus_kod', sql.NVarChar, t.tipus_kod)
        .input('osszeg_normido_perc', sql.Decimal(10, 2), t.osszeg_normido_perc)
        .input('meres_perc', sql.Decimal(10, 2), t.MERES)
        .input('elokeszites_perc', sql.Decimal(10, 2), t.ELOKESZITES)
        .input('szereles_perc', sql.Decimal(10, 2), t.SZERELES)
        .input('vegszereles_perc', sql.Decimal(10, 2), t.VEGSZERELES)
        .input('impregnalas_perc', sql.Decimal(10, 2), t.IMPREGNALAS)
        .input('filter_perc', sql.Decimal(10, 2), t.FILTER)
        .input('maras_onozas_perc', sql.Decimal(10, 2), t.MARAS_ONOZAS)
        .input('tekercselés_perc', sql.Decimal(10, 2), t['TEKERCSELÉS'])
        .input('csomagolas_perc', sql.Decimal(10, 2), t.CSOMAGOLAS)
        .input('awi_hegesztes_perc', sql.Decimal(10, 2), t.AWI_HEGESZTES)
        .input('el_tekercselés_perc', sql.Decimal(10, 2), t['EL_TEKERCSELÉS'])
        .query(`
          UPDATE dbo.ainova_termek_normak SET
            osszeg_normido_perc = @osszeg_normido_perc,
            meres_perc = @meres_perc,
            elokeszites_perc = @elokeszites_perc,
            szereles_perc = @szereles_perc,
            vegszereles_perc = @vegszereles_perc,
            impregnalas_perc = @impregnalas_perc,
            filter_perc = @filter_perc,
            maras_onozas_perc = @maras_onozas_perc,
            tekercselés_perc = @tekercselés_perc,
            csomagolas_perc = @csomagolas_perc,
            awi_hegesztes_perc = @awi_hegesztes_perc,
            el_tekercselés_perc = @el_tekercselés_perc,
            updated_at = SYSDATETIME()
          WHERE tipus_kod = @tipus_kod
        `);
      frissitett++;
    } catch (err) {
      console.log(`Hiba: ${t.tipus_kod} - ${err.message}`);
    }
  }
  
  console.log(`\nFrissítve: ${frissitett} termék kategória bontással`);
  
  // Ellenőrzés
  const check = await pool.request().query(`
    SELECT TOP 5 
      tipus_kod, 
      osszeg_normido_perc,
      meres_perc,
      szereles_perc,
      vegszereles_perc
    FROM ainova_termek_normak 
    WHERE meres_perc > 0 OR szereles_perc > 0
  `);
  console.log('\n=== Ellenőrzés (TOP 5 ahol van kategória adat) ===');
  console.table(check.recordset);
  
  pool.close();
  console.log('\nKész!');
}

main().catch(console.error);
