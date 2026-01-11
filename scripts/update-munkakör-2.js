const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

// Második adag operátorok munkakör beállítása
const updates = [
  { torzsszam: '18397', nev: 'Algusar Fulgencio Agang', munkakör: 'Előkészítő' },
  { torzsszam: '18399', nev: 'Añonuevo Jarm Michael Alzona', munkakör: 'Nagy DC szerelő' },  // szerelő nagy dc
  { torzsszam: '18400', nev: 'Bandoja Jeric Mangubat', munkakör: 'Nagy DC szerelő' },  // szerelő nagy dc
  { torzsszam: '18236', nev: 'Biczó Zsolt', munkakör: 'Szerelő' },
  { torzsszam: '17713', nev: 'Bogdán Ernő', munkakör: 'Előkészítő' },
  { torzsszam: '16757', nev: 'Bogyó Mihály', munkakör: 'Maró-ónozó' },
  { torzsszam: '5894', nev: 'Böröndi Zoltán', munkakör: 'Kis DC szerelő' },  // szerelő kis dc
  { torzsszam: '16123', nev: 'Csík Antal', munkakör: 'Előkészítő' },
  { torzsszam: '16276', nev: 'Földvári Ferenc', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '18093', nev: 'Funte Jason Chavez', munkakör: 'Impregnáló' },
  { torzsszam: '7387', nev: 'Greffer Szilvia', munkakör: 'Mérő' },
  { torzsszam: '17922', nev: 'Harasztovics Sándor', munkakör: 'Csomagoló' },
  { torzsszam: '15259', nev: 'Holczapfel Tamás', munkakör: 'Szerelő' },
  { torzsszam: '17745', nev: 'Kocsis Ferenc', munkakör: 'Szerelő' },
  { torzsszam: '16369', nev: 'Kohanec Róbert', munkakör: 'Végszerelő' },
  { torzsszam: '7813', nev: 'Kviring József', munkakör: 'Szerelő' },
  { torzsszam: '18308', nev: 'Llarena Maricel Malabanan', munkakör: 'Végszerelő' },
  { torzsszam: '18095', nev: 'Manalo Bryan Balatero', munkakör: 'Végszerelő' },
  { torzsszam: '11073', nev: 'Mészáros József', munkakör: 'Mérő' },
  { torzsszam: '14710', nev: 'Molnár Gábor', munkakör: 'Impregnáló' },
  { torzsszam: '4245', nev: 'Molnár Zoltán', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '17923', nev: 'Németh Ferenc', munkakör: 'Előkészítő' },
  { torzsszam: '10897', nev: 'Németh Tibor', munkakör: 'Szerelő' },
  { torzsszam: '14138', nev: 'Pintér Valentin Előd', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '15523', nev: 'Sörös Adrián', munkakör: 'Fóliás tekercselő' },  // gépitekercselő szalagos
  { torzsszam: '18466', nev: 'Várkonyi Zoltán', munkakör: 'Szerelő' },
  { torzsszam: '18621', nev: 'Szabó Barnabás Rudolf', munkakör: 'Csomagoló' },
];

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log(`\n=== ${updates.length} operátor munkakör beállítása (2. adag) ===\n`);
  
  let success = 0;
  let notFound = 0;

  for (const op of updates) {
    const result = await pool.request()
      .input('munkakör', sql.NVarChar, op.munkakör)
      .input('torzsszam', sql.NVarChar, `%${op.torzsszam}`)
      .query(`
        UPDATE ainova_operatorok 
        SET pozicio = @munkakör, updated_at = GETDATE()
        OUTPUT inserted.torzsszam, inserted.nev, inserted.pozicio
        WHERE torzsszam LIKE @torzsszam
      `);
    
    if (result.recordset.length > 0) {
      console.log(`✅ ${op.nev} → ${op.munkakör}`);
      success++;
    } else {
      console.log(`❌ NEM TALÁLTAM: ${op.nev} (${op.torzsszam})`);
      notFound++;
    }
  }

  console.log(`\n=== Összesítés ===`);
  console.log(`Sikeres: ${success}`);
  console.log(`Nem található: ${notFound}`);

  // Összesítés
  console.log(`\n=== Összes beállított munkakör ===`);
  const check = await pool.request().query(`
    SELECT pozicio, COUNT(*) as db
    FROM ainova_operatorok 
    WHERE pozicio != 'Megadandó' AND pozicio IS NOT NULL
    GROUP BY pozicio
    ORDER BY db DESC
  `);
  console.table(check.recordset);

  const remaining = await pool.request().query(`
    SELECT COUNT(*) as megadando FROM ainova_operatorok WHERE pozicio = 'Megadandó'
  `);
  console.log(`\nMég "Megadandó" státuszban: ${remaining.recordset[0].megadando} fő`);

  pool.close();
}

main().catch(console.error);
