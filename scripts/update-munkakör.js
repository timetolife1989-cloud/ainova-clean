const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

// Képen lévő operátorok munkakör beállítása
const updates = [
  { torzsszam: '15917', nev: 'Almási Zsolt', munkakör: 'Impregnáló' },
  { torzsszam: '17914', nev: 'Brezsnyák Róbert', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '18087', nev: 'Cortez John Louie Bracamonte', munkakör: 'Előkészítő' },
  { torzsszam: '17075', nev: 'Geider Szabolcs', munkakör: 'Csomagoló' },
  { torzsszam: '17825', nev: 'Horváth Balázs', munkakör: 'Szerelő' },
  { torzsszam: '3338', nev: 'Kámán Krisztián', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '18090', nev: 'Lyndon Jim Soberano Abarabar', munkakör: 'Szerelő' },
  { torzsszam: '18309', nev: 'Madridano Chona Mapa', munkakör: 'Előkészítő' },
  { torzsszam: '14681', nev: 'Margit Zoltán', munkakör: 'Maró-ónozó' },
  { torzsszam: '9686', nev: 'Nagy Oresztész', munkakör: 'Mérő' },
  { torzsszam: '18476', nev: 'Ortega Rodylyn Victoria', munkakör: 'Szerelő' },
  { torzsszam: '11259', nev: 'Pap Stefán', munkakör: 'Szerelő' },
  { torzsszam: '18477', nev: 'Planco Danilo Jr. Yntog', munkakör: 'Szerelő' },
  { torzsszam: '18411', nev: 'Postre John Paul', munkakör: 'Végszerelő' },
  { torzsszam: '18478', nev: 'Quiñones Karl Caleil Cordova', munkakör: 'Szerelő' },
  { torzsszam: '18043', nev: 'Rabino Francisco Bagnol', munkakör: 'Végszerelő' },
  { torzsszam: '15518', nev: 'Rauch Zsolt', munkakör: 'Szerelő' },
  { torzsszam: '18099', nev: 'Solano Norman Dela Fuente', munkakör: 'Szerelő' },
  { torzsszam: '17536', nev: 'Szabó Krisztián', munkakör: 'Mérő' },
  { torzsszam: '17912', nev: 'Szajkó Tibor', munkakör: 'Előkészítő' },
  // 11479 - Szecsei Rudolf - NINCS a 90 főben, kihagyva
  { torzsszam: '5903', nev: 'Tóth Attila', munkakör: 'Előkészítő' },
  { torzsszam: '16130', nev: 'Tóth Sándor', munkakör: 'Fóliás tekercselő' },  // gépitekercselő szalagos
  { torzsszam: '17714', nev: 'Tölgyes Gergő Zsolt', munkakör: 'Szerelő' },
  { torzsszam: '14683', nev: 'Virágh Roland', munkakör: 'Impregnáló' },
  { torzsszam: '18451', nev: 'Wigan Mikhail Dipidip', munkakör: 'Maró-ónozó' },
  { torzsszam: '13562', nev: 'Szélinger Gusztáv', munkakör: 'Csomagoló' },
  { torzsszam: '15711', nev: 'Berta Gábor Ferenc', munkakör: 'Mérő' },
];

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log(`\n=== ${updates.length} operátor munkakör beállítása ===\n`);
  
  let success = 0;
  let notFound = 0;

  for (const op of updates) {
    // Keresés törzsszám végződéssel
    const result = await pool.request()
      .input('torzsszam', sql.NVarChar, `%${op.torzsszam}`)
      .query(`
        UPDATE ainova_operatorok 
        SET pozicio = @munkakör, updated_at = GETDATE()
        OUTPUT inserted.torzsszam, inserted.nev, inserted.pozicio
        WHERE torzsszam LIKE @torzsszam
      `.replace('@munkakör', `'${op.munkakör}'`));
    
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

  // Ellenőrzés
  console.log(`\n=== Frissített operátorok ===`);
  const check = await pool.request().query(`
    SELECT torzsszam, nev, pozicio 
    FROM ainova_operatorok 
    WHERE pozicio != 'Megadandó' AND pozicio IS NOT NULL
    ORDER BY nev
  `);
  console.table(check.recordset);

  pool.close();
}

main().catch(console.error);
