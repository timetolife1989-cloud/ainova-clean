/**
 * PERC SAP adatok szinkronizálása DB-be
 * 
 * LAC (64L...) munkahely kódok szűrése + Művelet → Kategória mapping
 * 
 * FONTOS: Csak 64L... munkahely kódokat vesszük figyelembe!
 */

const XLSX = require('xlsx');
const fs = require('fs');
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const excelPath = 'O:\\Administration\\HR\\Telj% - Bónuszhoz\\FI_LAC_PERCEK\\PEMC.ver5_2025.07.21.xlsm';

// LAC Munkahely kódok (64L...)
// 64L10, 64L21, 64L35, 64L45, 64L65, 64L70, 64L80, 64L81, 64L85 stb.
const isLacMunkahely = (munkahely) => {
  const mh = String(munkahely).trim();
  return mh.startsWith('64L');
};

// Művelet → Kategória mapping (bővített, case-insensitive)
const MUVELET_KATEGORIA = {
  // MÉRÉS
  'előmérés': 'MERES',
  'végmérés': 'MERES',
  'dpg 10 előmérés': 'MERES',
  'dpg 10 végmérés': 'MERES',
  'rd-l mérés': 'MERES',
  'rd-l mérés 2': 'MERES',
  'rd mérés': 'MERES',
  'rd mérés 1db/los': 'MERES',
  'induktivitás mérés': 'MERES',
  'védőföldelési ellenállás mérés': 'MERES',
  'nagyfeszültség vizsgálat': 'MERES',
  'nagyfeszültség vizsgálat - elabo': 'MERES',
  'nagyfeszültség vizsgálat 2 - elabo': 'MERES',
  'csillapítás mérés': 'MERES',
  'ellenállás mérés': 'MERES',
  'kapacitás mérés': 'MERES',
  'lc mérés (sc paraméter)': 'MERES',
  'lc mérés 2 (sc paraméter)': 'MERES',
  'rlc mérés (sc paraméter)': 'MERES',
  'rlc mérés 2 (sc paraméter)': 'MERES',
  'méret ellenőrzés sablonnal': 'MERES',
  'méret ellenőrzés sablonnal(sc paraméter)': 'MERES',
  'átmenet vizsgálat': 'MERES',
  'szigetelés ellenállás mérés': 'MERES',
  'szigetelés vizsgálat': 'MERES',
  'kapacitás és veszt. tény. mérés': 'MERES',
  'kapacitás és veszt. tény.elő mérés': 'MERES',
  'elektromos vizsgálat': 'MERES',
  'önellenőrzés': 'MERES',
  'dufik előmérése': 'MERES',
  
  // ELŐKÉSZÍTÉS
  'anyagbeérkeztetés': 'ELOKESZITES',
  'vasmag előkészítés': 'ELOKESZITES',
  'vasmag előkészítés 2': 'ELOKESZITES',
  'vasmag előkészítés 3': 'ELOKESZITES',
  'darabolás': 'ELOKESZITES',
  'darabolás - tekercselés': 'ELOKESZITES',
  'darabolás és komissiózás': 'ELOKESZITES',
  'lézervágás': 'ELOKESZITES',
  'vágás - lézervágás': 'ELOKESZITES',
  'vágás - lyukasztás': 'ELOKESZITES',
  'lyukasztás - rézsín': 'ELOKESZITES',
  'lyukasztás - rézsín (d11,0)': 'ELOKESZITES',
  'lyukasztás - rézsín (d11)': 'ELOKESZITES',
  'előkészítés': 'ELOKESZITES',
  'előkészítés 2': 'ELOKESZITES',
  'előkészítés 3': 'ELOKESZITES',
  'előkészítés 4': 'ELOKESZITES',
  'tekercs előkészítés': 'ELOKESZITES',
  'vezeték előkészítés': 'ELOKESZITES',
  'ház előkészítés': 'ELOKESZITES',
  'drossel előkészítés': 'ELOKESZITES',
  'minőségellenőrzés': 'ELOKESZITES',
  'csapsajtolás': 'ELOKESZITES',
  'süllyesztés sajtolás': 'ELOKESZITES',
  'fúrás + süllyesztés': 'ELOKESZITES',
  'sajtolás': 'ELOKESZITES',
  'sajtolás: átvezető': 'ELOKESZITES',
  'menetfúrás': 'ELOKESZITES',
  
  // SZERELÉS
  'tekercs szerelés': 'SZERELES',
  'tekercs szerelés 2': 'SZERELES',
  'szerelés': 'SZERELES',
  'szerelés 2': 'SZERELES',
  'szerelés 3': 'SZERELES',
  'szerelés 4': 'SZERELES',
  'szerelés 5': 'SZERELES',
  'szerelés 6': 'SZERELES',
  'sori szerelés': 'SZERELES',
  'fedél szerelés': 'SZERELES',
  'kondenzátorcsoport szerelés': 'SZERELES',
  'darabolás - szerelés': 'SZERELES',
  'házba szerelés': 'SZERELES',
  'belső rész házba szerelése': 'SZERELES',
  'belső rész készre szerelése': 'SZERELES',
  'belső rész előszerelése': 'SZERELES',
  'maszkolás': 'SZERELES',
  'maszkolás eltávolítás': 'SZERELES',
  'maszkolás etávolítás': 'SZERELES',
  'kivezető pozícionáló felszerelés': 'SZERELES',
  'kivezető pozícionáló eltávolítás': 'SZERELES',
  'kivezető lyukasztás': 'SZERELES',
  'kivezető lapítás': 'SZERELES',
  'kivezető benyomás': 'SZERELES',
  'szegecselés': 'SZERELES',
  'fésűs kontakt szegecselése': 'SZERELES',
  'földelőfül szegecselése': 'SZERELES',
  'műanyag fül szegecselése': 'SZERELES',
  'felcsavarozás': 'SZERELES',
  'csavarozás': 'SZERELES',
  'beültetés, hullámforrasztás': 'SZERELES',
  'toxolás': 'SZERELES',
  
  // VÉGSZERELÉS
  'végszerelés': 'VEGSZERELES',
  'végszerelés 2': 'VEGSZERELES',
  'végszerelés 3': 'VEGSZERELES',
  'darabolás - végszerelés': 'VEGSZERELES',
  'festés': 'VEGSZERELES',
  'hőkezelés': 'VEGSZERELES',
  'hőkezelés 80°c': 'VEGSZERELES',
  'hőkezelés 2 80°c': 'VEGSZERELES',
  'zsír eltávolítás': 'VEGSZERELES',
  'zsírzás': 'VEGSZERELES',
  'cseppentés': 'VEGSZERELES',
  'cseppentés 2': 'VEGSZERELES',
  'cseppentés - fedő': 'VEGSZERELES',
  'cseppentés - panel': 'VEGSZERELES',
  'cseppentő furat készítés': 'VEGSZERELES',
  'tömítés': 'VEGSZERELES',
  'tömítés pcm-el': 'VEGSZERELES',
  'tömítés teroson-nal': 'VEGSZERELES',
  'lézeres lakkeltávolítás': 'VEGSZERELES',
  'hőkapcsoló folytonosság vizsgálat': 'VEGSZERELES',
  'fedelezés': 'VEGSZERELES',
  'fedélhegesztés': 'VEGSZERELES',
  'fedél forrasztás': 'VEGSZERELES',
  'kavicsozás': 'VEGSZERELES',
  'kis oldal ragasztása': 'VEGSZERELES',
  'nagy oldal ragasztása': 'VEGSZERELES',
  'nagy oldal cseppentése': 'VEGSZERELES',
  
  // IMPREGNÁLÁS
  'impregnálás': 'IMPREGNALAS',
  
  // TEKERCSELÉS
  'gépi tekercselés': 'TEKERCSELÉS',
  'gépi tekercselés 2': 'TEKERCSELÉS',
  'gépi tekercselés 3': 'TEKERCSELÉS',
  
  // CSOMAGOLÁS
  'csomagolás': 'CSOMAGOLAS',
  'csomagolás, címkézés': 'CSOMAGOLAS',
  'tulajdonságok vizsgálata és csomagolás': 'CSOMAGOLAS',
  'félkész csomagolás': 'CSOMAGOLAS',
  'félkész kicsomagolás': 'CSOMAGOLAS',
  'vevői anyagok csomagolása': 'CSOMAGOLAS',
  'szállítás': 'CSOMAGOLAS',
  'kapu visszajelentés': 'CSOMAGOLAS',
  'lézer feliratozás': 'CSOMAGOLAS',
  
  // MARÁS/ÓNOZÁS
  'marás': 'MARAS_ONOZAS',
  'huzalmarás': 'MARAS_ONOZAS',
  'marás - hossz méret beállítása': 'MARAS_ONOZAS',
  'ónozás': 'MARAS_ONOZAS',
  'ónozás 2': 'MARAS_ONOZAS',
  'ultrahangos ónozás': 'MARAS_ONOZAS',
  
  // AWI HEGESZTÉS
  'awi hegesztés': 'AWI_HEGESZTES',
  'uh hegesztés': 'AWI_HEGESZTES',
  'ház hegesztés': 'AWI_HEGESZTES',
  'földelöfül hegesztés': 'AWI_HEGESZTES',
  'ponthegesztés': 'AWI_HEGESZTES',
  'vonalhegesztés': 'AWI_HEGESZTES',
  
  // HAJLÍTÁS → ELOKESZITES (lemezalkatrész előkészítés)
  'adira hajlítás': 'ELOKESZITES',
  'truma hajlítás': 'ELOKESZITES',
  'prima hajlítás': 'ELOKESZITES',
  'hajlítás - rézsín': 'ELOKESZITES',
  'hajlítás - rézsín (truma)': 'ELOKESZITES',
};

// Excel serial date → JS Date
function excelDateToJS(serial) {
  if (!serial || serial < 1) return null;
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

// Idő string → percek (pl. "21:45:00" → 1305)
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Műszakváltás korrekció - PONTOSAN mint az Excel makróban:
// 21:45-05:45 közötti visszajelentések az ELŐZŐ naphoz tartoznak
// VBA: If tm >= TimeValue("21:45:00") Or tm < TimeValue("05:45:00") Then dt = DateAdd("d", -1, dt)
function applyShiftCorrection(datum, idoStr) {
  const minutes = timeToMinutes(idoStr);
  if (minutes === null) return datum;
  
  // 21:45 = 1305 perc, 05:45 = 345 perc
  if (minutes >= 1305 || minutes < 345) {
    // Éjszakás műszak → előző naphoz soroljuk
    const corrected = new Date(datum);
    corrected.setDate(corrected.getDate() - 1);
    return corrected;
  }
  return datum;
}

// Műszak meghatározása időpontból
// A műszak: 05:45 - 13:45
// B műszak: 13:45 - 21:45
// C műszak: 21:45 - 05:45 (éjszaka)
function getMuszak(idoStr) {
  const minutes = timeToMinutes(idoStr);
  if (minutes === null) return 'A'; // Default
  
  // C műszak: 21:45 (1305) - 05:45 (345)
  if (minutes >= 1305 || minutes < 345) {
    return 'C';
  }
  // A műszak: 05:45 (345) - 13:45 (825)
  if (minutes >= 345 && minutes < 825) {
    return 'A';
  }
  // B műszak: 13:45 (825) - 21:45 (1305)
  return 'B';
}

function formatDate(date) {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true }
};

async function sync() {
  console.log('=== PERC SAP → Kategória Sync (műszak bontással) ===\n');
  
  const buf = fs.readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  
  const sapSheet = wb.Sheets['PERC SAP'];
  const data = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });
  
  console.log('Excel sorok:', data.length);
  
  // Napi + kategória + műszak összesítés
  // "2025-12-16|SZERELES|A" → perc összeg (műszakonként)
  // "2025-12-16|SZERELES|SUM" → perc összeg (napi összesen)
  const napiKategoria = new Map();
  const ismeretlenMuveletek = new Set();
  let feldolgozott = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const munkahely = String(row[1] || '');
    const muvelet = String(row[5] || '').trim();
    const idoStr = String(row[8] || '');  // I oszlop = index 8 (idő, pl. "14:16:29")
    const perc = Number(row[10] || 0);
    const datumSerial = row[11];
    
    // Csak LAC munkahely (64L... vagy 6404)
    if (!munkahely.startsWith('64L') && munkahely !== '6404') continue;
    
    // Csak pozitív perc
    if (perc <= 0) continue;
    
    // Dátum konverzió
    let datum = excelDateToJS(datumSerial);
    if (!datum) continue;
    
    // Műszak meghatározása (időpont alapján)
    const muszak = getMuszak(idoStr);
    
    // MŰSZAKVÁLTÁS KORREKCIÓ - 21:45-05:45 → előző nap (mint Excel makróban)
    datum = applyShiftCorrection(datum, idoStr);
    
    const datumStr = formatDate(datum);
    
    // Kategória keresése (case-insensitive)
    const muveletLower = muvelet.toLowerCase();
    let kategoria = MUVELET_KATEGORIA[muveletLower];
    
    // Ha nincs mapping, "EGYEB" kategóriába sorolás
    if (!kategoria) {
      kategoria = 'EGYEB';
      ismeretlenMuveletek.add(muvelet);
    }
    
    // Összesítés - műszakonként ÉS napi összesen is
    const keyMuszak = `${datumStr}|${kategoria}|${muszak}`;
    const keySUM = `${datumStr}|${kategoria}|SUM`;
    
    napiKategoria.set(keyMuszak, (napiKategoria.get(keyMuszak) || 0) + perc);
    napiKategoria.set(keySUM, (napiKategoria.get(keySUM) || 0) + perc);
    
    feldolgozott++;
  }
  
  console.log('Feldolgozott sorok:', feldolgozott);
  console.log('Egyedi nap+kategória kombinációk:', napiKategoria.size);
  
  if (ismeretlenMuveletek.size > 0) {
    console.log(`\n⚠️  EGYEB kategóriába sorolva (${ismeretlenMuveletek.size} művelet):`);
    const sorted = [...ismeretlenMuveletek].slice(0, 30);
    sorted.forEach(m => console.log('  - ' + m));
    if (ismeretlenMuveletek.size > 30) {
      console.log(`  ... és még ${ismeretlenMuveletek.size - 30} egyéb művelet`);
    }
  }
  
  // Napi összesen ellenőrzés
  const napiOsszesen = new Map();
  const muszakStat = { A: 0, B: 0, C: 0, SUM: 0 };
  
  for (const [key, perc] of napiKategoria) {
    const [datum, , muszak] = key.split('|');
    if (muszak === 'SUM') {
      napiOsszesen.set(datum, (napiOsszesen.get(datum) || 0) + perc);
    }
    muszakStat[muszak] = (muszakStat[muszak] || 0) + perc;
  }
  
  console.log('\n=== Műszak statisztika ===');
  console.log(`  A műszak: ${Math.round(muszakStat.A).toLocaleString()} perc`);
  console.log(`  B műszak: ${Math.round(muszakStat.B).toLocaleString()} perc`);
  console.log(`  C műszak: ${Math.round(muszakStat.C).toLocaleString()} perc`);
  console.log(`  Összesen: ${Math.round(muszakStat.SUM).toLocaleString()} perc`);
  
  console.log('\n=== Napi összesítés (utolsó 5 nap) ===');
  const sortedDays = [...napiOsszesen.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
  for (const [datum, perc] of sortedDays) {
    console.log(`  ${datum}: ${Math.round(perc).toLocaleString()} perc`);
  }
  
  // DB kapcsolat
  const pool = await sql.connect(config);
  
  // Tábla létrehozása ha nem létezik
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ainova_napi_kategoria_perc')
    BEGIN
      CREATE TABLE ainova_napi_kategoria_perc (
        id INT IDENTITY(1,1) PRIMARY KEY,
        datum DATE NOT NULL,
        kategoria_kod NVARCHAR(30) NOT NULL,
        leadott_perc DECIMAL(10,2) NOT NULL DEFAULT 0,
        utolso_frissites DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_napi_kat UNIQUE (datum, kategoria_kod)
      );
      CREATE INDEX IX_nkp_datum ON ainova_napi_kategoria_perc(datum);
      CREATE INDEX IX_nkp_kategoria ON ainova_napi_kategoria_perc(kategoria_kod);
    END
  `);
  
  console.log('\n✅ Tábla kész');
  
  // Érintett napok listája
  const erintettNapok = [...new Set([...napiKategoria.keys()].map(k => k.split('|')[0]))];
  console.log(`\n📅 Érintett napok: ${erintettNapok.length} db`);
  
  // FONTOS: Először töröljük az érintett napok összes kategóriáját
  // Ez azért kell, mert a 21:45 korrekció miatt egy kategória átcsúszhat másik napra
  // és a MERGE nem törli az elavult rekordokat
  for (const datum of erintettNapok) {
    await pool.request()
      .input('datum', sql.Date, datum)
      .query(`DELETE FROM ainova_napi_kategoria_perc WHERE datum = @datum`);
  }
  console.log(`✅ Régi adatok törölve az érintett napokról`);
  
  // Adatok beszúrása (INSERT - a törlés után nem kell MERGE)
  // Minden nap + kategória + műszak kombináció külön rekord
  let inserted = 0;
  
  for (const [key, perc] of napiKategoria) {
    const [datum, kategoria, muszak] = key.split('|');
    
    await pool.request()
      .input('datum', sql.Date, datum)
      .input('kategoria', sql.NVarChar, kategoria)
      .input('muszak', sql.NVarChar, muszak)
      .input('perc', sql.Decimal(10,2), perc)
      .query(`
        INSERT INTO ainova_napi_kategoria_perc (datum, kategoria_kod, muszak, leadott_perc)
        VALUES (@datum, @kategoria, @muszak, @perc)
      `);
    inserted++;
  }
  
  console.log(`\n✅ Szinkronizálva: ${inserted} rekord beszúrva`);
  
  // Ellenőrzés
  const check = await pool.request().query(`
    SELECT TOP 15 
      FORMAT(datum, 'yyyy-MM-dd') AS datum,
      kategoria_kod,
      muszak,
      CAST(leadott_perc AS INT) AS perc
    FROM ainova_napi_kategoria_perc
    ORDER BY datum DESC, muszak, leadott_perc DESC
  `);
  
  console.log('\n=== Ellenőrzés (utolsó 15 rekord) ===');
  console.table(check.recordset);
  
  pool.close();
}

sync().catch(console.error);
