/**
 * PERC SAP vs Allokáció Diagnosztika
 * 
 * Összehasonlítja:
 * - PERC SAP összes művelet
 * - Mappelt műveletek
 * - Kimaradt műveletek
 * - Allokáció számítás alapja
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');
const XLSX = require('xlsx');
const path = require('path');

// PEMC Excel elérési út
const PEMC_PATH = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

// Jelenlegi művelet → kategória mapping (amit használunk)
const MUVELET_KATEGORIA_MAP = {
  // MÉRÉS
  'DPG 10 előmérés': 'MERES',
  'DPG 10 végmérés': 'MERES',
  'Drossel előkészítés': 'MERES',
  'DC KACO előmérés': 'MERES',
  'DC KACO végmérés': 'MERES',
  'Végmérés': 'MERES',
  'Előmérés': 'MERES',
  
  // ELŐKÉSZÍTÉS
  'Előkészítés': 'ELOKESZITES',
  'Darabolás': 'ELOKESZITES',
  'Vasmag előkészítés': 'ELOKESZITES',
  
  // SZERELÉS
  'Tekercs szerelés': 'SZERELES',
  'Fedél szerelés': 'SZERELES',
  'DC szerelés': 'SZERELES',
  'Kis DC szerelés': 'SZERELES',
  'Nagy DC szerelés': 'SZERELES',
  
  // VÉGSZERELÉS
  'Végszerelés': 'VEGSZERELES',
  'Végellenőrzés': 'VEGSZERELES',
  
  // IMPREGNÁLÁS
  'Impregnálás': 'IMPREGNALAS',
  'Lakkozás': 'IMPREGNALAS',
  
  // TEKERCSELÉS
  'Huzalos tekercselés': 'TEKERCSELÉS',
  'Fóliás tekercselés': 'TEKERCSELÉS',
  'Tekercselés': 'TEKERCSELÉS',
  
  // CSOMAGOLÁS
  'Csomagolás': 'CSOMAGOLAS',
  
  // MARÁS-ÓNOZÁS
  'Marás': 'MARAS_ONOZAS',
  'Ónozás': 'MARAS_ONOZAS',
  
  // AWI HEGESZTÉS
  'AWI hegesztés': 'AWI_HEGESZTES',
  'Hegesztés': 'AWI_HEGESZTES',
};

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: { encrypt: false, trustServerCertificate: true },
};

async function diagnose() {
  console.log('🔍 PERC SAP vs Allokáció Diagnosztika');
  console.log('=====================================\n');
  
  // 1. PERC SAP Excel olvasása
  console.log('1️⃣ PERC SAP Excel olvasása...\n');
  
  const workbook = XLSX.readFile(PEMC_PATH);
  
  const sheet = workbook.Sheets['PERC SAP'];
  if (!sheet) {
    console.error('❌ PERC SAP sheet nem található!');
    console.log('Elérhető sheetek:', workbook.SheetNames);
    return;
  }
  
  // Sheet-et JSON-ra konvertálás
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`📊 Sheet sorok: ${data.length}\n`);
  
  // Összes művelet gyűjtése
  const muveletStats = {};
  const munkahelyStats = {};
  let totalPerc = 0;
  let rowCount = 0;
  
  // 2026-01-13 (tegnap) adatai
  const targetDate = '2026-01-13';
  let targetDayPerc = 0;
  let targetDayRows = 0;
  
  // Fejléc kihagyása (row 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    const munkahely = row[1]?.toString()?.trim() || ''; // B oszlop (index 1)
    const muvelet = row[5]?.toString()?.trim() || '';   // F oszlop (index 5)
    const perc = parseFloat(row[10]) || 0;              // K oszlop (index 10)
    const datumCell = row[11];                          // L oszlop (index 11)
    
    if (!muvelet || !perc) continue;
    
    rowCount++;
    totalPerc += perc;
    
    // Művelet statisztika
    if (!muveletStats[muvelet]) {
      muveletStats[muvelet] = { count: 0, perc: 0, mapped: false, kategoria: null };
    }
    muveletStats[muvelet].count++;
    muveletStats[muvelet].perc += perc;
    
    // Ellenőrizzük hogy mappelve van-e
    const kategoria = MUVELET_KATEGORIA_MAP[muvelet];
    if (kategoria) {
      muveletStats[muvelet].mapped = true;
      muveletStats[muvelet].kategoria = kategoria;
    }
    
    // Munkahely statisztika
    if (!munkahelyStats[munkahely]) {
      munkahelyStats[munkahely] = { count: 0, perc: 0 };
    }
    munkahelyStats[munkahely].count++;
    munkahelyStats[munkahely].perc += perc;
    
    // Adott nap
    let datumStr = '';
    if (typeof datumCell === 'number') {
      // Excel serial date
      const excelDate = new Date((datumCell - 25569) * 86400 * 1000);
      datumStr = excelDate.toISOString().split('T')[0];
    } else if (datumCell instanceof Date) {
      datumStr = datumCell.toISOString().split('T')[0];
    } else if (typeof datumCell === 'string') {
      datumStr = datumCell.substring(0, 10);
    }
    
    if (datumStr === targetDate) {
      targetDayPerc += perc;
      targetDayRows++;
    }
  }
  
  console.log(`📊 Összes sor: ${rowCount.toLocaleString()}`);
  console.log(`📊 Összes perc: ${Math.round(totalPerc).toLocaleString()}`);
  console.log(`📊 ${targetDate} percek: ${Math.round(targetDayPerc).toLocaleString()} (${targetDayRows} sor)\n`);
  
  // 2. Mappelt vs nem mappelt műveletek
  console.log('2️⃣ MŰVELETEK ELEMZÉSE\n');
  
  const muveletek = Object.entries(muveletStats)
    .sort((a, b) => b[1].perc - a[1].perc);
  
  let mappedPerc = 0;
  let unmappedPerc = 0;
  let mappedCount = 0;
  let unmappedCount = 0;
  
  console.log('📗 MAPPELT műveletek:');
  console.log('─'.repeat(80));
  
  muveletek.filter(([_, s]) => s.mapped).forEach(([muvelet, stats]) => {
    mappedPerc += stats.perc;
    mappedCount++;
    console.log(`  ✓ ${muvelet.padEnd(40)} → ${stats.kategoria.padEnd(15)} ${Math.round(stats.perc).toLocaleString().padStart(10)} perc`);
  });
  
  console.log(`\n  Összesen: ${mappedCount} művelet, ${Math.round(mappedPerc).toLocaleString()} perc\n`);
  
  console.log('📕 NEM MAPPELT műveletek (KIMARADNAK!):');
  console.log('─'.repeat(80));
  
  muveletek.filter(([_, s]) => !s.mapped).forEach(([muvelet, stats]) => {
    unmappedPerc += stats.perc;
    unmappedCount++;
    console.log(`  ✗ ${muvelet.padEnd(50)} ${Math.round(stats.perc).toLocaleString().padStart(10)} perc (${stats.count} sor)`);
  });
  
  console.log(`\n  Összesen: ${unmappedCount} művelet, ${Math.round(unmappedPerc).toLocaleString()} perc\n`);
  
  // 3. Összehasonlítás
  console.log('3️⃣ ÖSSZEHASONLÍTÁS\n');
  console.log('─'.repeat(60));
  console.log(`  PERC SAP összes:        ${Math.round(totalPerc).toLocaleString().padStart(15)} perc`);
  console.log(`  Mappelt (amit számolunk): ${Math.round(mappedPerc).toLocaleString().padStart(15)} perc (${Math.round(mappedPerc/totalPerc*100)}%)`);
  console.log(`  Kimarad:                  ${Math.round(unmappedPerc).toLocaleString().padStart(15)} perc (${Math.round(unmappedPerc/totalPerc*100)}%)`);
  console.log('─'.repeat(60));
  
  // 4. DB adatok összehasonlítás
  console.log('\n4️⃣ ADATBÁZIS ADATOK\n');
  
  const pool = await sql.connect(config);
  
  // ainova_napi_kategoria_perc (kördiagram forrása)
  const kategoriaPerc = await pool.request().query(`
    SELECT datum, SUM(leadott_perc) as ossz_perc
    FROM ainova_napi_kategoria_perc
    WHERE datum = '2026-01-13'
    GROUP BY datum
  `);
  
  // ainova_teljesitmeny (teljesítmény oldal forrása)
  const teljesitmenyPerc = await pool.request().query(`
    SELECT datum, SUM(leadott_perc) as ossz_perc
    FROM ainova_teljesitmeny
    WHERE datum = '2026-01-13'
    GROUP BY datum
  `);
  
  // Allokáció táblázat számítás alapja - ainova_termek_normak
  const normakOsszeg = await pool.request().query(`
    SELECT 
      SUM(meres_perc) as meres,
      SUM(elokeszites_perc) as elokeszites,
      SUM(szereles_perc) as szereles,
      SUM(vegszereles_perc) as vegszereles,
      SUM(impregnalas_perc) as impregnalas,
      SUM(tekercselés_perc) as tekercselés,
      SUM(csomagolas_perc) as csomagolas,
      SUM(maras_onozas_perc) as maras_onozas,
      SUM(awi_hegesztes_perc) as awi_hegesztes,
      SUM(osszeg_normido_perc) as osszeg
    FROM ainova_termek_normak
  `);
  
  console.log('  ainova_napi_kategoria_perc (2026-01-13):');
  if (kategoriaPerc.recordset[0]) {
    console.log(`    → ${Math.round(kategoriaPerc.recordset[0].ossz_perc).toLocaleString()} perc`);
  } else {
    console.log('    → Nincs adat!');
  }
  
  console.log('\n  ainova_teljesitmeny (2026-01-13):');
  if (teljesitmenyPerc.recordset[0]) {
    console.log(`    → ${Math.round(teljesitmenyPerc.recordset[0].ossz_perc).toLocaleString()} perc`);
  } else {
    console.log('    → Nincs adat!');
  }
  
  console.log('\n  ainova_termek_normak összesítés:');
  const normak = normakOsszeg.recordset[0];
  if (normak) {
    console.log(`    Mérés:        ${Math.round(normak.meres || 0).toLocaleString()} perc`);
    console.log(`    Előkészítés:  ${Math.round(normak.elokeszites || 0).toLocaleString()} perc`);
    console.log(`    Szerelés:     ${Math.round(normak.szereles || 0).toLocaleString()} perc`);
    console.log(`    Végszerelés:  ${Math.round(normak.vegszereles || 0).toLocaleString()} perc`);
    console.log(`    Impregnálás:  ${Math.round(normak.impregnalas || 0).toLocaleString()} perc`);
    console.log(`    Tekercselés:  ${Math.round(normak.tekercselés || 0).toLocaleString()} perc`);
    console.log(`    Csomagolás:   ${Math.round(normak.csomagolas || 0).toLocaleString()} perc`);
    console.log(`    Marás-Ónozás: ${Math.round(normak.maras_onozas || 0).toLocaleString()} perc`);
    console.log(`    AWI Hegesztés:${Math.round(normak.awi_hegesztes || 0).toLocaleString()} perc`);
  }
  
  // 5. Top 20 munkahely
  console.log('\n5️⃣ TOP 20 MUNKAHELY KÓD\n');
  
  const topMunkahelyek = Object.entries(munkahelyStats)
    .sort((a, b) => b[1].perc - a[1].perc)
    .slice(0, 20);
  
  topMunkahelyek.forEach(([munkahely, stats], i) => {
    console.log(`  ${(i+1).toString().padStart(2)}. ${munkahely.padEnd(15)} ${Math.round(stats.perc).toLocaleString().padStart(10)} perc (${stats.count} sor)`);
  });
  
  await pool.close();
  
  console.log('\n✅ Diagnosztika kész!');
}

diagnose().catch(console.error);
