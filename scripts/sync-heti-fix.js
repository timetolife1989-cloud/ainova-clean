/**
 * AINOVA - Heti Fix (C típusok) Szinkronizáció
 * =============================================
 * A CW sheet "Heti fix ütemterv és felkövetés" részét olvassa be
 * Ez a C típusú (tekercs) termékek heti terve, amit napokra osztunk
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
  options: { encrypt: true, trustServerCertificate: true }
};

function normalizeTipusKod(kod) {
  if (!kod) return '';
  return String(kod).replace(/\s+/g, '');
}

function getWeekDates(year, weekNum) {
  // ISO 8601 hét: első hét az, amelyben január 4. van
  // UTC használata az időzóna problémák elkerülésére
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // Vasárnap = 7, nem 0
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  
  const dates = [];
  for (let i = 0; i < 5; i++) { // H, K, Sze, Cs, P
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) args[match[1]] = match[2];
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const hetSzam = args.het ? parseInt(args.het) : 3;
  const ev = args.ev ? parseInt(args.ev) : 2026;
  
  console.log('========================================');
  console.log('AINOVA - Heti Fix (C típusok) Szinkronizáció');
  console.log(`Hét: CW${hetSzam.toString().padStart(2, '0')}, Év: ${ev}`);
  console.log('========================================\n');
  
  // Excel beolvasás
  console.log(`Excel: ${EXCEL_PATH}`);
  const workbook = XLSX.readFile(EXCEL_PATH);
  
  const sheetName = `CW${hetSzam.toString().padStart(2, '0')} ütemterv`;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet nem található: ${sheetName}`);
    return;
  }
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const weekDates = getWeekDates(ev, hetSzam);
  console.log(`Hét napjai: ${weekDates.join(', ')}`);
  
  // Heti fix rész keresése (N oszlop = index 13)
  // Row 1: Típus | leadott dátumok | Heti Igény (db) | Heti Igény (perc) | ...
  // Row 2+: C típusú termékek
  
  const headerRow = data[1];
  console.log('\nHeader (13-21 index):', headerRow?.slice(13, 22));
  
  // Leadott oszlopok pozíciója (14-18 index = 5 nap)
  // Heti Igény db: 19, Heti Igény perc: 20
  
  const hetiTervek = [];
  let cTipustalalt = false; // Flag: volt-e már C típus
  
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row) {
      if (cTipustalalt) break; // Ha már volt C típus és üres sor jön, megállunk
      continue;
    }
    
    const tipusKodRaw = String(row[13] || '').trim();
    const tipusKod = normalizeTipusKod(tipusKodRaw);
    
    // Üres cella vagy SUM sor = tábla vége
    if (!tipusKod || tipusKod.length < 3) {
      if (cTipustalalt) break; // Ha már volt C típus, megállunk
      continue;
    }
    if (tipusKod.toLowerCase().includes('sum')) break;
    
    // Csak C típusok
    if (!tipusKod.startsWith('C')) {
      if (cTipustalalt) break; // Ha C típus után B típus jön, megállunk
      continue;
    }
    
    cTipustalalt = true;
    
    // Heti igény (db és perc)
    const hetiIgenyDb = parseInt(row[19] || 0) || 0;
    const hetiIgenyPerc = parseFloat(row[20] || 0) || 0;
    
    // Leadott naponta (14-18 index)
    const leadott = [
      parseInt(row[14] || 0) || 0, // H
      parseInt(row[15] || 0) || 0, // K
      parseInt(row[16] || 0) || 0, // Sze
      parseInt(row[17] || 0) || 0, // Cs
      parseInt(row[18] || 0) || 0  // P
    ];
    const hetiLeadottDb = leadott.reduce((a, b) => a + b, 0);
    
    // Aktuális és raktár
    const aktualisDb = parseInt(row[21] || 0) || 0;
    const kulonbsegDb = parseInt(row[22] || 0) || 0;
    const raktarDb = parseInt(row[23] || 0) || 0;
    
    // Heti igényt napokra osztjuk (egyenletesen 5 napra)
    const napiIgenyDb = Math.round(hetiIgenyDb / 5);
    const napiIgenyPerc = hetiIgenyPerc / 5;
    
    hetiTervek.push({
      tipus_kod: tipusKod,
      heti_igeny_db: hetiIgenyDb,
      heti_igeny_perc: hetiIgenyPerc,
      heti_leadott_db: hetiLeadottDb,
      leadott_per_nap: leadott,
      napi_igeny_db: napiIgenyDb,
      napi_igeny_perc: napiIgenyPerc,
      aktualis_db: aktualisDb,
      raktár_db: raktarDb
    });
  }
  
  console.log(`\nFeldolgozva: ${hetiTervek.length} C típusú termék`);
  
  // Példa
  if (hetiTervek.length > 0) {
    console.log('\n=== PÉLDA (első 3) ===');
    hetiTervek.slice(0, 3).forEach(t => {
      console.log(`${t.tipus_kod}: Heti ${t.heti_igeny_db} db (${t.heti_igeny_perc.toFixed(0)} perc) -> Napi ${t.napi_igeny_db} db`);
    });
  }
  
  // Adatbázis mentés
  console.log('\n--- Adatbázis mentés ---');
  const pool = await sql.connect(DB_CONFIG);
  
  // ELŐSZÖR töröljük a régi TEKERCS adatokat erre a hétre!
  const deleteResult = await pool.request()
    .input('het_szam', sql.Int, hetSzam)
    .input('ev', sql.Int, ev)
    .query(`
      DELETE FROM dbo.ainova_napi_terv 
      WHERE het_szam = @het_szam AND ev = @ev AND termek_tipus = 'TEKERCS'
    `);
  console.log(`Régi TEKERCS adatok törölve: ${deleteResult.rowsAffected[0]} sor`);
  
  let saved = 0;
  
  for (const terv of hetiTervek) {
    // Minden napra mentünk egy rekordot (heti igény / 5)
    for (let napIdx = 0; napIdx < 5; napIdx++) {
      const datum = weekDates[napIdx];
      const leadottDb = terv.leadott_per_nap[napIdx];
      
      try {
        await pool.request()
          .input('het_szam', sql.Int, hetSzam)
          .input('ev', sql.Int, ev)
          .input('tipus_kod', sql.NVarChar, terv.tipus_kod)
          .input('termek_tipus', sql.NVarChar, 'TEKERCS')
          .input('datum', sql.Date, datum)
          .input('igeny_db', sql.Int, terv.napi_igeny_db)
          .input('igeny_perc', sql.Decimal(10,2), terv.napi_igeny_perc)
          .input('leadott_db', sql.Int, leadottDb)
          .query(`
            INSERT INTO dbo.ainova_napi_terv 
              (het_szam, ev, tipus_kod, termek_tipus, datum, igeny_db, igeny_perc, leadott_db)
            VALUES 
              (@het_szam, @ev, @tipus_kod, @termek_tipus, @datum, @igeny_db, @igeny_perc, @leadott_db)
          `);
        saved++;
      } catch (err) {
        console.log(`Hiba: ${terv.tipus_kod} ${datum} - ${err.message}`);
      }
    }
  }
  
  console.log(`Mentve: ${saved} rekord (${hetiTervek.length} típus × 5 nap)`);
  
  // Ellenőrzés
  const check = await pool.request()
    .input('het', sql.Int, hetSzam)
    .input('ev', sql.Int, ev)
    .query(`
      SELECT termek_tipus, COUNT(DISTINCT tipus_kod) as tipusok, SUM(igeny_db) as ossz_igeny
      FROM ainova_napi_terv 
      WHERE het_szam = @het AND ev = @ev
      GROUP BY termek_tipus
    `);
  console.log('\n=== Ellenőrzés ===');
  console.table(check.recordset);
  
  pool.close();
  console.log('\nKész!');
}

main().catch(console.error);
