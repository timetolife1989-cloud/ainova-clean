/**
 * AINOVA - Excel Allokáció Szinkronizáció
 * ========================================
 * Szinkronizálja az Excel-ből a heti terveket és termék normákat az adatbázisba.
 * 
 * Forrás: O:\!Production\LAC\!War Room adatok\LaC erőforrás kalkulátor,allokáció.2026.xlsm
 * 
 * Sheetek:
 *   - CW01, CW02, ... CW52: Heti tervek (bal oldali táblázat: típus + H-P darabszám)
 *   - K.Z norma: Termékenkénti normaidők (92 oszlop a SAP lépésekhez)
 * 
 * Futtatás: node scripts/sync-allokacio-excel.js [--het=3] [--ev=2026]
 * Automatikus: 2 óránként cron/scheduled task-ból
 */

const XLSX = require('xlsx');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// .env.local betöltése
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// =====================================================
// KONFIGURÁCIÓ
// =====================================================
const EXCEL_PATH = 'O:\\!Production\\LAC\\!War Room adatok\\LaC erőforrás kalkulátor,allokáció.2026.xlsm';

const DB_CONFIG = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// =====================================================
// HELPER FÜGGVÉNYEK
// =====================================================

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  });
  return args;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekDates(year, weekNum) {
  // ISO hét első napja (hétfő)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  return { monday, friday };
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// Normalizálja a típuskódot - eltávolítja az összes szóközt
function normalizeTipusKod(kod) {
  if (!kod) return '';
  // Minden whitespace eltávolítása
  return String(kod).replace(/\s+/g, '');
}

function log(msg, type = 'info') {
  const ts = new Date().toISOString().substring(11, 19);
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${ts}] ${prefix} ${msg}`);
}

function getCurrentAndNextWeek() {
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const dayOfWeek = now.getDay(); // 0=vasárnap, 1=hétfő, 5=péntek
  
  // Pénteken (5) és hétfőn (1) a következő hetet is szinkronizáljuk
  const includeNextWeek = dayOfWeek === 1 || dayOfWeek === 5;
  
  const weeks = [currentWeek];
  if (includeNextWeek) {
    weeks.push(currentWeek + 1);
  }
  
  return weeks;
}

// =====================================================
// EXCEL OLVASÁS
// =====================================================

function readExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel fájl nem található: ${EXCEL_PATH}`);
  }
  
  log(`Excel olvasása: ${EXCEL_PATH}`);
  const buf = fs.readFileSync(EXCEL_PATH);
  return XLSX.read(buf, { type: 'buffer' });
}

function findCwSheets(workbook) {
  // Keressük a CW sheetek (CW01, CW02, stb.)
  const cwSheets = workbook.SheetNames.filter(name => 
    /^CW\d{1,2}$/i.test(name) || 
    /^CW\d{1,2}\s/i.test(name)
  );
  
  log(`CW sheetek találva: ${cwSheets.length} db`);
  return cwSheets;
}

function parseHetiTervSheet(workbook, sheetName, ev) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  
  // Hét szám kinyerése a sheet névből
  const hetMatch = sheetName.match(/CW(\d{1,2})/i);
  if (!hetMatch) return [];
  const hetSzam = parseInt(hetMatch[1]);
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const tervek = [];
  
  // =====================================================
  // "Napi fix ütemterv" táblázat keresése
  // Row 0: "Napi fix ütemterv" cím
  // Row 1: Típus | dátum | dátum | ... | heti össz | ... | Típus | leadott dátumok
  // Row 2+: Termékek adatai
  // =====================================================
  
  // Keressük a "Típus" headert az első oszlopban (Col 0)
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell === 'típus' || firstCell === 'tipus') {
      headerRow = i;
      break;
    }
  }
  
  if (headerRow < 0) {
    log(`  ⚠️ ${sheetName}: "Típus" header nem található`, 'error');
    return [];
  }
  
  // =====================================================
  // Dátumok kinyerése a headerből (Col 1, 3, 5, 7, 9 = Excel serial dates)
  // =====================================================
  const headerRowData = data[headerRow];
  const dates = [];
  const dateIndices = [1, 3, 5, 7, 9]; // db oszlopok indexei
  
  for (const idx of dateIndices) {
    const val = headerRowData[idx];
    if (typeof val === 'number' && val > 40000) {
      // Excel serial date -> JS Date -> YYYY-MM-DD
      const utc_days = Math.floor(val - 25569);
      const date = new Date(utc_days * 86400 * 1000);
      dates.push(date.toISOString().split('T')[0]);
    } else {
      // Ha nincs dátum, számoljuk a hétből
      const { monday } = getWeekDates(ev, hetSzam);
      const d = new Date(monday);
      d.setDate(d.getDate() + dates.length);
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  
  log(`  ${sheetName}: Dátumok: ${dates.join(', ')}`);
  
  // =====================================================
  // Leadott adatok oszlopainak keresése (Col 14+)
  // Header: "2026.01.12 leadott db" formátum
  // =====================================================
  const leadottColumns = {}; // { 'YYYY-MM-DD': colIndex }
  for (let col = 14; col < headerRowData.length; col++) {
    const header = String(headerRowData[col] || '');
    // "2026.01.12 leadott db" formátum keresése
    const match = header.match(/(\d{4})\.(\d{2})\.(\d{2})\s*leadott/i);
    if (match) {
      const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      leadottColumns[dateStr] = col;
    }
  }
  
  log(`  ${sheetName}: Leadott oszlopok: ${Object.keys(leadottColumns).length} db`);
  
  // Dátumok számítása a hét számból (backup)
  const { monday, friday } = getWeekDates(ev, hetSzam);
  
  // =====================================================
  // Adatsorok olvasása (headerRow + 1 től)
  // Struktúra: Típus(0) | H_db(1) | H_perc(2) | K_db(3) | K_perc(4) | ...
  // =====================================================
  
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const tipusKodRaw = String(row[0] || '').trim();
    const tipusKod = normalizeTipusKod(tipusKodRaw);
    
    // Üres sor vagy "SUM" sor -> vége a táblázatnak
    if (!tipusKod || tipusKod.length < 3) break;
    
    // C típusokat (TEKERCS) kihagyjuk - azokat a sync-heti-fix.js kezeli
    if (tipusKod.startsWith('C')) continue;
    if (tipusKod.toLowerCase().includes('sum')) break;
    
    // Típus ellenőrzés - B vagy C kezdetű kód
    if (!/^[BC]\d/.test(tipusKod)) break;
    
    // Napi adatok: Col 1,2,3,4,5,6,7,8,9,10
    // H_db(1), H_perc(2), K_db(3), K_perc(4), Sze_db(5), Sze_perc(6), Cs_db(7), Cs_perc(8), P_db(9), P_perc(10)
    const hetfoDb = parseInt(row[1] || 0) || 0;
    const hetfoPerc = parseFloat(row[2] || 0) || 0;
    const keddDb = parseInt(row[3] || 0) || 0;
    const keddPerc = parseFloat(row[4] || 0) || 0;
    const szerdaDb = parseInt(row[5] || 0) || 0;
    const szerdaPerc = parseFloat(row[6] || 0) || 0;
    const csutortokDb = parseInt(row[7] || 0) || 0;
    const csutortokPerc = parseFloat(row[8] || 0) || 0;
    const pentekDb = parseInt(row[9] || 0) || 0;
    const pentekPerc = parseFloat(row[10] || 0) || 0;
    
    // Heti összesítő (Col 11)
    const hetiOsszDb = parseInt(row[11] || 0) || (hetfoDb + keddDb + szerdaDb + csutortokDb + pentekDb);
    const hetiOsszPerc = hetfoPerc + keddPerc + szerdaPerc + csutortokPerc + pentekPerc;
    
    // Leadott adatok kinyerése
    const leadottPerNap = {};
    for (const [dateStr, colIdx] of Object.entries(leadottColumns)) {
      leadottPerNap[dateStr] = parseInt(row[colIdx] || 0) || 0;
    }
    
    // Termék típus: mindig FIX (C típusok kihagyva fentebb)
    const termekTipus = 'FIX';
    
    tervek.push({
      het_szam: hetSzam,
      ev: ev,
      tipus_kod: tipusKod,
      termek_tipus: termekTipus,
      // Dátumok
      dates: dates,
      // Napi igény (db)
      hetfo_db: hetfoDb,
      kedd_db: keddDb,
      szerda_db: szerdaDb,
      csutortok_db: csutortokDb,
      pentek_db: pentekDb,
      heti_ossz_db: hetiOsszDb,
      // Napi leadott (db)
      leadott: leadottPerNap,
      // Percek is mentve
      hetfo_perc: hetfoPerc,
      kedd_perc: keddPerc,
      szerda_perc: szerdaPerc,
      csutortok_perc: csutortokPerc,
      pentek_perc: pentekPerc,
      heti_ossz_perc: hetiOsszPerc,
      het_kezdet: dates[0] || formatDate(monday),
      het_veg: dates[4] || formatDate(friday),
      forras_sheet: sheetName
    });
  }
  
  log(`  ${sheetName}: ${tervek.length} termék terv`);
  
  // =====================================================
  // "Napi fix ütemterv felkövetés" táblázat keresése (LEADOTT adatok)
  // Ez a második táblázat a sheeten, ~Row 26+ körül
  // Struktúra: Típus(0) | leadott_db(1) | leadott_perc(2) | ... naponta
  // =====================================================
  
  let felkovetesHeaderRow = -1;
  for (let i = 20; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell === 'típus' || firstCell === 'tipus') {
      felkovetesHeaderRow = i;
      break;
    }
  }
  
  if (felkovetesHeaderRow > 0) {
    log(`  ${sheetName}: Felkövetés tábla: Row ${felkovetesHeaderRow}`);
    
    // Leadott adatok beolvasása a felkövetés táblából
    // Map: típuskód -> { datum: leadott_db }
    const leadottMap = {};
    
    // Dátumok kinyerése a felkövetés header-ből
    const felkovetesHeader = data[felkovetesHeaderRow];
    const felkoveetesDates = [];
    const felkovetesDatenIndices = [1, 3, 5, 7, 9]; // db oszlopok
    
    for (const idx of felkovetesDatenIndices) {
      const val = felkovetesHeader[idx];
      if (typeof val === 'number' && val > 40000) {
        const utc_days = Math.floor(val - 25569);
        const d = new Date(utc_days * 86400 * 1000);
        felkoveetesDates.push({ date: d.toISOString().split('T')[0], colIdx: idx });
      }
    }
    
    // Felkövetés sorok beolvasása
    for (let i = felkovetesHeaderRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const tipusKodRaw = String(row[0] || '').trim();
      const tipusKod = normalizeTipusKod(tipusKodRaw);
      
      if (!tipusKod || tipusKod.length < 3) continue;
      if (tipusKod.toLowerCase().includes('sum')) break;
      if (!/^[BC]\d/.test(tipusKod)) continue;
      
      // Leadott db minden napra (Col 1, 3, 5, 7, 9)
      if (!leadottMap[tipusKod]) leadottMap[tipusKod] = {};
      
      for (const { date, colIdx } of felkoveetesDates) {
        const leadottDb = parseInt(row[colIdx] || 0) || 0;
        if (leadottDb > 0) {
          leadottMap[tipusKod][date] = leadottDb;
        }
      }
    }
    
    // Leadott adatok hozzáadása a tervekhez
    let updatedCount = 0;
    for (const terv of tervek) {
      if (leadottMap[terv.tipus_kod]) {
        terv.leadott = { ...terv.leadott, ...leadottMap[terv.tipus_kod] };
        updatedCount++;
      }
    }
    
    log(`  ${sheetName}: ${updatedCount} termékhez leadott adat hozzáadva`);
  }
  
  return tervek;
}

function parseKzNorma(workbook) {
  // K.Z norma sheet - termékenkénti normaidők
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('norma') || 
    name.toLowerCase() === 'k.z norma'
  );
  
  if (!sheetName) {
    log('K.Z norma sheet nem található', 'error');
    return [];
  }
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const normak = [];
  
  log(`K.Z norma sheet: ${sheetName}`);
  
  // Az első sor a header (SAP műveletek nevei)
  // Az első oszlop a típuskód
  // A többi oszlop a normaidők percben
  
  if (data.length < 2) return normak;
  
  const header = data[0];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const tipusKodRaw = String(row[0] || '').trim();
    const tipusKod = normalizeTipusKod(tipusKodRaw);
    if (!tipusKod || tipusKod.length < 3) continue;
    if (!/^[BC]\d/.test(tipusKod)) continue;
    
    // Az 1-es oszlopban már ott van az "Összeg normaidő (perc/db)" - azt használjuk!
    // NEM kell összeadni a folyamat oszlopokat (2-93), mert az Excel már kiszámolta
    const osszeg = parseFloat(row[1]) || 0;
    
    if (osszeg > 0) {
      normak.push({
        tipus_kod: tipusKod,
        osszeg_normido_perc: osszeg
      });
    }
  }
  
  log(`  K.Z norma: ${normak.length} termék normaidő`);
  return normak;
}

// =====================================================
// ADATBÁZIS MŰVELETEK
// =====================================================

async function syncHetiTerv(pool, tervek) {
  if (tervek.length === 0) return { uj: 0, frissitett: 0 };
  
  let ujCount = 0;
  let frissCount = 0;
  
  for (const terv of tervek) {
    try {
      // MERGE (upsert)
      const result = await pool.request()
        .input('het_szam', sql.Int, terv.het_szam)
        .input('ev', sql.Int, terv.ev)
        .input('tipus_kod', sql.NVarChar, terv.tipus_kod)
        .input('termek_tipus', sql.NVarChar, terv.termek_tipus)
        .input('hetfo_db', sql.Int, terv.hetfo_db)
        .input('kedd_db', sql.Int, terv.kedd_db)
        .input('szerda_db', sql.Int, terv.szerda_db)
        .input('csutortok_db', sql.Int, terv.csutortok_db)
        .input('pentek_db', sql.Int, terv.pentek_db)
        .input('heti_ossz_db', sql.Int, terv.heti_ossz_db)
        .input('hetfo_perc', sql.Decimal(10, 2), terv.hetfo_perc || 0)
        .input('kedd_perc', sql.Decimal(10, 2), terv.kedd_perc || 0)
        .input('szerda_perc', sql.Decimal(10, 2), terv.szerda_perc || 0)
        .input('csutortok_perc', sql.Decimal(10, 2), terv.csutortok_perc || 0)
        .input('pentek_perc', sql.Decimal(10, 2), terv.pentek_perc || 0)
        .input('heti_ossz_perc', sql.Decimal(10, 2), terv.heti_ossz_perc || 0)
        .input('het_kezdet', sql.Date, terv.het_kezdet)
        .input('het_veg', sql.Date, terv.het_veg)
        .input('forras_sheet', sql.NVarChar, terv.forras_sheet)
        .query(`
          MERGE dbo.ainova_heti_terv AS target
          USING (SELECT @ev AS ev, @het_szam AS het_szam, @tipus_kod AS tipus_kod) AS source
          ON target.ev = source.ev AND target.het_szam = source.het_szam AND target.tipus_kod = source.tipus_kod
          WHEN MATCHED THEN
            UPDATE SET 
              termek_tipus = @termek_tipus,
              hetfo_db = @hetfo_db,
              kedd_db = @kedd_db,
              szerda_db = @szerda_db,
              csutortok_db = @csutortok_db,
              pentek_db = @pentek_db,
              heti_ossz_db = @heti_ossz_db,
              hetfo_perc = @hetfo_perc,
              kedd_perc = @kedd_perc,
              szerda_perc = @szerda_perc,
              csutortok_perc = @csutortok_perc,
              pentek_perc = @pentek_perc,
              heti_ossz_perc = @heti_ossz_perc,
              het_kezdet = @het_kezdet,
              het_veg = @het_veg,
              forras_sheet = @forras_sheet,
              utolso_szinkron = SYSDATETIME(),
              updated_at = SYSDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (het_szam, ev, tipus_kod, termek_tipus, hetfo_db, kedd_db, szerda_db, csutortok_db, pentek_db, heti_ossz_db, hetfo_perc, kedd_perc, szerda_perc, csutortok_perc, pentek_perc, heti_ossz_perc, het_kezdet, het_veg, forras_sheet, utolso_szinkron)
            VALUES (@het_szam, @ev, @tipus_kod, @termek_tipus, @hetfo_db, @kedd_db, @szerda_db, @csutortok_db, @pentek_db, @heti_ossz_db, @hetfo_perc, @kedd_perc, @szerda_perc, @csutortok_perc, @pentek_perc, @heti_ossz_perc, @het_kezdet, @het_veg, @forras_sheet, SYSDATETIME())
          OUTPUT $action;
        `);
      
      if (result.recordset[0]?.['$action'] === 'INSERT') ujCount++;
      else frissCount++;
      
    } catch (err) {
      log(`  Hiba terv mentésekor (${terv.tipus_kod}): ${err.message}`, 'error');
    }
  }
  
  return { uj: ujCount, frissitett: frissCount };
}

// =====================================================
// NAPI TERV SZINKRONIZÁCIÓ (igény + leadott naponta)
// =====================================================
async function syncNapiTerv(pool, tervek) {
  if (tervek.length === 0) return { uj: 0, frissitett: 0 };
  
  let ujCount = 0;
  let frissCount = 0;
  
  for (const terv of tervek) {
    // Napok adatai
    const napiAdatok = [
      { datum: terv.dates[0], igeny: terv.hetfo_db, perc: terv.hetfo_perc },
      { datum: terv.dates[1], igeny: terv.kedd_db, perc: terv.kedd_perc },
      { datum: terv.dates[2], igeny: terv.szerda_db, perc: terv.szerda_perc },
      { datum: terv.dates[3], igeny: terv.csutortok_db, perc: terv.csutortok_perc },
      { datum: terv.dates[4], igeny: terv.pentek_db, perc: terv.pentek_perc },
    ];
    
    for (const nap of napiAdatok) {
      if (!nap.datum) continue;
      
      // Leadott a konkrét napra
      const leadott = terv.leadott?.[nap.datum] || 0;
      
      try {
        const result = await pool.request()
          .input('ev', sql.Int, terv.ev)
          .input('het_szam', sql.Int, terv.het_szam)
          .input('datum', sql.Date, nap.datum)
          .input('tipus_kod', sql.NVarChar, terv.tipus_kod)
          .input('termek_tipus', sql.NVarChar, terv.termek_tipus)
          .input('igeny_db', sql.Int, nap.igeny)
          .input('igeny_perc', sql.Decimal(10, 2), nap.perc || 0)
          .input('leadott_db', sql.Int, leadott)
          .input('forras_sheet', sql.NVarChar, terv.forras_sheet)
          .query(`
            MERGE dbo.ainova_napi_terv AS target
            USING (SELECT @ev AS ev, @het_szam AS het_szam, @datum AS datum, @tipus_kod AS tipus_kod) AS source
            ON target.ev = source.ev AND target.het_szam = source.het_szam 
               AND target.datum = source.datum AND target.tipus_kod = source.tipus_kod
            WHEN MATCHED THEN
              UPDATE SET 
                termek_tipus = @termek_tipus,
                igeny_db = @igeny_db,
                igeny_perc = @igeny_perc,
                leadott_db = @leadott_db,
                forras_sheet = @forras_sheet,
                utolso_szinkron = SYSDATETIME(),
                updated_at = SYSDATETIME()
            WHEN NOT MATCHED THEN
              INSERT (ev, het_szam, datum, tipus_kod, termek_tipus, igeny_db, igeny_perc, leadott_db, forras_sheet, utolso_szinkron)
              VALUES (@ev, @het_szam, @datum, @tipus_kod, @termek_tipus, @igeny_db, @igeny_perc, @leadott_db, @forras_sheet, SYSDATETIME())
            OUTPUT $action;
          `);
        
        if (result.recordset[0]?.['$action'] === 'INSERT') ujCount++;
        else frissCount++;
        
      } catch (err) {
        log(`  Hiba napi terv mentésekor (${terv.tipus_kod} ${nap.datum}): ${err.message}`, 'error');
      }
    }
  }
  
  log(`  Napi terv: ${ujCount} új, ${frissCount} frissített`);
  return { uj: ujCount, frissitett: frissCount };
}

async function syncTermekNormak(pool, normak) {
  if (normak.length === 0) return { uj: 0, frissitett: 0 };
  
  let ujCount = 0;
  let frissCount = 0;
  
  for (const norma of normak) {
    try {
      const result = await pool.request()
        .input('tipus_kod', sql.NVarChar, norma.tipus_kod)
        .input('osszeg_normido_perc', sql.Decimal(10, 2), norma.osszeg_normido_perc)
        .input('forras_excel', sql.NVarChar, EXCEL_PATH)
        .query(`
          MERGE dbo.ainova_termek_normak AS target
          USING (SELECT @tipus_kod AS tipus_kod) AS source
          ON target.tipus_kod = source.tipus_kod
          WHEN MATCHED THEN
            UPDATE SET 
              osszeg_normido_perc = @osszeg_normido_perc,
              utolso_import = SYSDATETIME(),
              forras_excel = @forras_excel,
              updated_at = SYSDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (tipus_kod, osszeg_normido_perc, utolso_import, forras_excel)
            VALUES (@tipus_kod, @osszeg_normido_perc, SYSDATETIME(), @forras_excel)
          OUTPUT $action;
        `);
      
      if (result.recordset[0]?.['$action'] === 'INSERT') ujCount++;
      else frissCount++;
      
    } catch (err) {
      log(`  Hiba norma mentésekor (${norma.tipus_kod}): ${err.message}`, 'error');
    }
  }
  
  return { uj: ujCount, frissitett: frissCount };
}

async function logSync(pool, tipus, hetSzam, ev, uj, frissitett, hibak, statusz, hibaMsg = null) {
  try {
    await pool.request()
      .input('szinkron_tipus', sql.NVarChar, tipus)
      .input('het_szam', sql.Int, hetSzam)
      .input('ev', sql.Int, ev)
      .input('uj_rekordok', sql.Int, uj)
      .input('frissitett_rekordok', sql.Int, frissitett)
      .input('hibak', sql.Int, hibak)
      .input('statusz', sql.NVarChar, statusz)
      .input('hiba_uzenet', sql.NVarChar, hibaMsg)
      .input('forras_fajl', sql.NVarChar, EXCEL_PATH)
      .query(`
        INSERT INTO dbo.ainova_szinkron_log 
        (szinkron_tipus, het_szam, ev, uj_rekordok, frissitett_rekordok, hibak, statusz, hiba_uzenet, forras_fajl, veg)
        VALUES (@szinkron_tipus, @het_szam, @ev, @uj_rekordok, @frissitett_rekordok, @hibak, @statusz, @hiba_uzenet, @forras_fajl, SYSDATETIME())
      `);
  } catch (err) {
    log(`Napló írás hiba: ${err.message}`, 'error');
  }
}

// =====================================================
// FŐ PROGRAM
// =====================================================

async function main() {
  const args = parseArgs();
  const ev = args.ev ? parseInt(args.ev) : new Date().getFullYear();
  
  // Ha konkrét hét van megadva paraméterként, azt használjuk
  // Egyébként az aktuális hetet (+ pénteken/hétfőn a következőt is)
  let targetWeeks = [];
  if (args.het) {
    targetWeeks = [parseInt(args.het)];
  } else {
    targetWeeks = getCurrentAndNextWeek();
  }
  
  log('========================================');
  log('AINOVA Allokáció Excel Szinkronizáció');
  log('========================================');
  log(`Év: ${ev}, Hetek: CW${targetWeeks.map(w => w.toString().padStart(2, '0')).join(', CW')}`);
  
  let pool;
  
  try {
    // 1. Excel olvasás
    const workbook = readExcel();
    
    // 2. CW sheetek feldolgozása - csak a target hetek
    const cwSheets = findCwSheets(workbook);
    
    // Szűrés a target hetekre
    const sheetsToProcess = cwSheets.filter(sheetName => {
      const match = sheetName.match(/CW(\d{1,2})/i);
      if (!match) return false;
      const sheetWeek = parseInt(match[1]);
      return targetWeeks.includes(sheetWeek);
    });
    
    log(`Feldolgozandó sheetek: ${sheetsToProcess.length} (${sheetsToProcess.join(', ')})`);
    
    // 3. Heti tervek parse
    const osszesiterv = [];
    for (const sheetName of sheetsToProcess) {
      const tervek = parseHetiTervSheet(workbook, sheetName, ev);
      osszesiterv.push(...tervek);
    }
    
    // 4. K.Z norma parse (ez mindig kell, mert a típusokhoz kellenek a normaidők)
    const normak = parseKzNorma(workbook);
    
    // 5. Adatbázis kapcsolat
    log('Adatbázis csatlakozás...');
    pool = await sql.connect(DB_CONFIG);
    log('Csatlakozva!', 'success');
    
    // 6. Szinkronizálás
    log('Heti tervek szinkronizálása...');
    const tervResult = await syncHetiTerv(pool, osszesiterv);
    log(`  Új: ${tervResult.uj}, Frissített: ${tervResult.frissitett}`, 'success');
    
    log('Napi tervek (igény+leadott) szinkronizálása...');
    const napiResult = await syncNapiTerv(pool, osszesiterv);
    
    log('Termék normák szinkronizálása...');
    const normaResult = await syncTermekNormak(pool, normak);
    log(`  Új: ${normaResult.uj}, Frissített: ${normaResult.frissitett}`, 'success');
    
    // 7. Napló
    for (const week of targetWeeks) {
      await logSync(pool, 'HETI_TERV', week, ev, 
        tervResult.uj, tervResult.frissitett, 0, 'SIKERES');
    }
    await logSync(pool, 'TERMEK_NORMA', null, ev, 
      normaResult.uj, normaResult.frissitett, 0, 'SIKERES');
    
    log('========================================');
    log('SZINKRONIZÁCIÓ KÉSZ!', 'success');
    log(`Heti tervek: ${osszesiterv.length} sor`);
    log(`Napi tervek: ${napiResult.uj + napiResult.frissitett} sor`);
    log(`Termék normák: ${normak.length} sor`);
    log('========================================');
    
  } catch (err) {
    log(`HIBA: ${err.message}`, 'error');
    console.error(err);
    
    if (pool) {
      await logSync(pool, 'SYNC_ERROR', null, ev, 0, 0, 1, 'HIBA', err.message);
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

main();
