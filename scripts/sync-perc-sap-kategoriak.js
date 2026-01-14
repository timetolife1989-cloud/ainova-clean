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
  console.log('=== PERC SAP → Kategória Sync ===\n');
  
  const buf = fs.readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  
  const sapSheet = wb.Sheets['PERC SAP'];
  const data = XLSX.utils.sheet_to_json(sapSheet, { header: 1 });
  
  console.log('Excel sorok:', data.length);
  
  // Napi + kategória összesítés
  const napiKategoria = new Map(); // "2025-12-16|SZERELES" → perc összeg
  const ismeretlenMuveletek = new Set();
  let feldolgozott = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const munkahely = String(row[1] || '');
    const muvelet = String(row[5] || '').trim();
    const perc = Number(row[10] || 0);
    const datumSerial = row[11];
    
    // Csak LAC munkahely (64L... vagy 6404)
    if (!munkahely.startsWith('64L') && munkahely !== '6404') continue;
    
    // Csak pozitív perc
    if (perc <= 0) continue;
    
    // Dátum konverzió
    const datum = excelDateToJS(datumSerial);
    if (!datum) continue;
    
    const datumStr = formatDate(datum);
    
    // Kategória keresése (case-insensitive)
    const muveletLower = muvelet.toLowerCase();
    let kategoria = MUVELET_KATEGORIA[muveletLower];
    
    // Ha nincs mapping, "EGYEB" kategóriába sorolás
    if (!kategoria) {
      kategoria = 'EGYEB';
      ismeretlenMuveletek.add(muvelet);
    }
    
    // Összesítés
    const key = `${datumStr}|${kategoria}`;
    napiKategoria.set(key, (napiKategoria.get(key) || 0) + perc);
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
  for (const [key, perc] of napiKategoria) {
    const [datum] = key.split('|');
    napiOsszesen.set(datum, (napiOsszesen.get(datum) || 0) + perc);
  }
  
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
  
  // Adatok beszúrása (MERGE)
  let inserted = 0, updated = 0;
  
  for (const [key, perc] of napiKategoria) {
    const [datum, kategoria] = key.split('|');
    
    const result = await pool.request()
      .input('datum', sql.Date, datum)
      .input('kategoria', sql.NVarChar, kategoria)
      .input('perc', sql.Decimal(10,2), perc)
      .query(`
        MERGE ainova_napi_kategoria_perc AS target
        USING (SELECT @datum AS datum, @kategoria AS kategoria) AS source
        ON target.datum = source.datum AND target.kategoria_kod = source.kategoria
        WHEN MATCHED THEN
          UPDATE SET leadott_perc = @perc, utolso_frissites = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (datum, kategoria_kod, leadott_perc) VALUES (@datum, @kategoria, @perc)
        OUTPUT $action;
      `);
    
    if (result.recordset[0]['$action'] === 'INSERT') inserted++;
    else updated++;
  }
  
  console.log(`\n✅ Szinkronizálva: ${inserted} új, ${updated} frissítve`);
  
  // Ellenőrzés
  const check = await pool.request().query(`
    SELECT TOP 10 
      FORMAT(datum, 'yyyy-MM-dd') AS datum,
      kategoria_kod,
      CAST(leadott_perc AS INT) AS perc
    FROM ainova_napi_kategoria_perc
    ORDER BY datum DESC, leadott_perc DESC
  `);
  
  console.log('\n=== Ellenőrzés (utolsó 10 rekord) ===');
  console.table(check.recordset);
  
  pool.close();
}

sync().catch(console.error);
