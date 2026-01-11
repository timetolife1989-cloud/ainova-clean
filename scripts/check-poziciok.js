const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });

  console.log('=== Produktív pozíciók ===');
  const poz = await pool.request().query(`
    SELECT id, nev FROM ainova_poziciok 
    WHERE kategoria = 'Produktív' 
    ORDER BY nev
  `);
  console.table(poz.recordset);

  console.log('\n=== ainova_operatorok oszlopai ===');
  const cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'ainova_operatorok' 
    ORDER BY ORDINAL_POSITION
  `);
  console.table(cols.recordset);

  console.log('\n=== Képen szereplő törzsszámok ellenőrzése ===');
  const torzsszamok = ['15917', '17914', '18087', '17075', '17825', '3338', '18090', '18309', '14681', '9686', 
                       '18476', '11259', '18477', '18411', '18478', '18043', '15518', '18099', '17536', '17912',
                       '11479', '5903', '16130', '17714', '14683', '18451', '13562', '15711'];
  
  // törzsszám lehet 30003338 formában is
  const likeConditions = torzsszamok.map(t => `torzsszam LIKE '%${t}'`).join(' OR ');
  const ops = await pool.request().query(`
    SELECT torzsszam, nev, pozicio 
    FROM ainova_operatorok 
    WHERE ${likeConditions}
    ORDER BY nev
  `);
  console.log(`Megtalált: ${ops.recordset.length} / ${torzsszamok.length}`);
  console.table(ops.recordset);

  pool.close();
}

main().catch(console.error);
