const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

// Harmadik (utolsó) adag operátorok munkakör beállítása
const updates = [
  { torzsszam: '18240', nev: 'Adorján Bence', munkakör: 'Csomagoló' },
  { torzsszam: '7527', nev: 'Bóka István', munkakör: 'Végszerelő' },
  { torzsszam: '18402', nev: 'Buan Celvin Caguioa', munkakör: 'Fóliás tekercselő' },  // gépitekercselő szalagos
  { torzsszam: '17070', nev: 'Dankovics Veronika', munkakör: 'Előkészítő' },
  { torzsszam: '18404', nev: 'Empil Remark Cabildo', munkakör: 'Nagy DC szerelő' },  // szerelő nagy dc
  { torzsszam: '18473', nev: 'Faundo John Derek Reyes', munkakör: 'Szerelő' },
  { torzsszam: '18037', nev: 'Garcia Allen Joseph Nicdao', munkakör: 'Végszerelő' },
  { torzsszam: '18038', nev: 'Grospe Julius Cezar Supsop', munkakör: 'Impregnáló' },
  { torzsszam: '18447', nev: 'Gudalle Charly Narido', munkakör: 'Kis DC szerelő' },  // szerelő kis dc
  { torzsszam: '18448', nev: 'Jamuat Gabriel Buenaflor', munkakör: 'Kis DC szerelő' },  // szerelő kis dc
  { torzsszam: '18474', nev: 'Javid Paul Henry Lagunoy', munkakör: 'Végszerelő' },
  { torzsszam: '17519', nev: 'Koronics Csaba', munkakör: 'Mérő' },
  { torzsszam: '11314', nev: 'Kürti Oszkár', munkakör: 'Fóliás tekercselő' },  // gépitekercselő szalagos
  { torzsszam: '10983', nev: 'Ledenszki István', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '18475', nev: 'Lequiron Jojo Largo', munkakör: 'Végszerelő' },  // festő → végszerelő
  { torzsszam: '18449', nev: 'Maala Jhovanie Aniel', munkakör: 'LaC szerelő' },  // szerelő Danfoss → LaC szerelő
  { torzsszam: '18045', nev: 'Mag-Isa Carlo Bingcang', munkakör: 'Kis DC szerelő' },  // szerelő kis dc
  { torzsszam: '18406', nev: 'Magpili Jeffreyson Caguingin', munkakör: 'LaC szerelő' },  // szerelő danfoss → LaC szerelő
  { torzsszam: '10989', nev: 'Molnár Róbert', munkakör: 'Mérő' },
  { torzsszam: '18039', nev: 'Morales Chester Chavez', munkakör: 'Végszerelő' },
  { torzsszam: '13261', nev: 'Nagy Zoltán', munkakör: 'Előkészítő' },
  { torzsszam: '18040', nev: 'Obra Elberto Madrid', munkakör: 'Nagy DC szerelő' },  // szerelő nagy dc
  { torzsszam: '17742', nev: 'Orcik Adrián', munkakör: 'Impregnáló' },
  { torzsszam: '18450', nev: 'Perdez Christian Buenavente', munkakör: 'Szerelő' },
  { torzsszam: '18096', nev: 'Pernala Jer Whel Anguay', munkakör: 'Végszerelő' },
  { torzsszam: '18310', nev: 'Raymundo Jeralyn Cruz', munkakör: 'Előkészítő' },  // lézervágó → előkészítő
  { torzsszam: '18098', nev: 'Satera Jian Kier Tercano', munkakör: 'Nagy DC szerelő' },  // szerelő dc → Nagy DC szerelő
  { torzsszam: '14088', nev: 'Szarvák József', munkakör: 'Huzalos tekercselő' },  // gépitekercselő huzalos
  { torzsszam: '17827', nev: 'Trankulov Krisztián', munkakör: 'Szerelő' },
  { torzsszam: '17747', nev: 'Fodor Krisztián', munkakör: 'Csomagoló' },
  { torzsszam: '13266', nev: 'Molnár Márk', munkakör: 'Csomagoló' },
  { torzsszam: '18619', nev: 'Tóth Dániel', munkakör: 'Mérő' },
];

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log(`\n=== ${updates.length} operátor munkakör beállítása (3. adag - UTOLSÓ) ===\n`);
  
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

  // Végső összesítés
  console.log(`\n=== VÉGSŐ munkakör statisztika ===`);
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

  const total = await pool.request().query(`
    SELECT COUNT(*) as osszes FROM ainova_operatorok WHERE pozicio != 'Megadandó'
  `);
  console.log(`Összes beállított munkakör: ${total.recordset[0].osszes} fő`);

  pool.close();
}

main().catch(console.error);
