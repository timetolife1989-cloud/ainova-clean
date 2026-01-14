/**
 * AINOVA - Adatbázis tisztítás és optimalizálás
 * 
 * Feladatok:
 * 1. Üres/felesleges táblák törlése
 * 2. Import status táblák összevonása
 * 3. User-Operator összekapcsolás
 */

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function cleanup() {
  let pool;
  
  try {
    console.log('🔧 AINOVA Adatbázis Tisztítás');
    console.log('=============================\n');
    
    pool = await sql.connect(config);
    
    // 1. ÜRES TÁBLÁK TÖRLÉSE
    console.log('1️⃣ ÜRES TÁBLÁK TÖRLÉSE\n');
    
    const tablesToDrop = [
      'ainova_termek_sap_idok',      // Üres, ainova_termek_normak elég
      'ainova_napi_perces_import_status', // Összevonjuk ainova_import_status-ba
    ];
    
    for (const table of tablesToDrop) {
      try {
        // Ellenőrizzük hogy üres-e
        const countResult = await pool.request()
          .query(`SELECT COUNT(*) as cnt FROM ${table}`);
        
        const count = countResult.recordset[0].cnt;
        
        if (count === 0) {
          await pool.request().query(`DROP TABLE ${table}`);
          console.log(`  ✅ ${table} törölve (üres volt)`);
        } else {
          console.log(`  ⚠️ ${table} NEM törölve - ${count} rekord van benne!`);
        }
      } catch (err) {
        if (err.message.includes('Invalid object name')) {
          console.log(`  ℹ️ ${table} már nem létezik`);
        } else {
          console.log(`  ❌ ${table} hiba: ${err.message}`);
        }
      }
    }
    
    // 2. IMPORT STATUS ÖSSZEVONÁS
    console.log('\n2️⃣ IMPORT STATUS ÖSSZEVONÁS\n');
    
    // Ellenőrizzük van-e napi_perces típus az ainova_import_status-ban
    const existingTypes = await pool.request()
      .query(`SELECT import_type FROM ainova_import_status`);
    
    const types = existingTypes.recordset.map(r => r.import_type);
    console.log(`  Meglévő típusok: ${types.join(', ')}`);
    
    if (!types.includes('napi_perces')) {
      // Hozzáadjuk a napi_perces típust ha kell
      try {
        await pool.request().query(`
          INSERT INTO ainova_import_status (import_type, is_importing)
          VALUES ('napi_perces', 0)
        `);
        console.log('  ✅ napi_perces típus hozzáadva ainova_import_status-hoz');
      } catch (err) {
        if (err.message.includes('Violation of UNIQUE KEY')) {
          console.log('  ℹ️ napi_perces típus már létezik');
        } else {
          console.log(`  ⚠️ Nem sikerült: ${err.message}`);
        }
      }
    }
    
    // 3. USER-OPERATOR ÖSSZEKAPCSOLÁS
    console.log('\n3️⃣ USER-OPERATOR ÖSSZEKAPCSOLÁS\n');
    
    // Ellenőrizzük a jelenlegi állapotot
    const usersWithoutTorzsszam = await pool.request().query(`
      SELECT u.UserId, u.Username, u.FullName, u.torzsszam,
             (SELECT TOP 1 o.torzsszam FROM ainova_operatorok o WHERE o.torzsszam = u.Username) as matching_operator
      FROM AinovaUsers u
    `);
    
    console.log('  Felhasználók:');
    let updated = 0;
    
    for (const user of usersWithoutTorzsszam.recordset) {
      const status = user.torzsszam ? '✓' : (user.matching_operator ? '→' : '✗');
      console.log(`    ${status} ${user.Username} (${user.FullName}) - torzsszam: ${user.torzsszam || 'NULL'}, match: ${user.matching_operator || 'nincs'}`);
      
      // Ha nincs torzsszam de van matching operator, frissítsük
      if (!user.torzsszam && user.matching_operator) {
        await pool.request()
          .input('userId', sql.Int, user.UserId)
          .input('torzsszam', sql.NVarChar, user.matching_operator)
          .query(`UPDATE AinovaUsers SET torzsszam = @torzsszam WHERE UserId = @userId`);
        updated++;
      }
    }
    
    if (updated > 0) {
      console.log(`\n  ✅ ${updated} felhasználó torzsszám frissítve`);
    } else {
      console.log('\n  ℹ️ Nincs frissítendő felhasználó');
    }
    
    // 4. ÖSSZEFOGLALÓ LEKÉRDEZÉS
    console.log('\n4️⃣ VÉGÁLLAPOT\n');
    
    const tables = await pool.request().query(`
      SELECT t.name as TABLE_NAME,
             (SELECT SUM(p.rows) FROM sys.partitions p WHERE p.object_id = t.object_id AND p.index_id < 2) as row_count
      FROM sys.tables t
      WHERE t.name LIKE 'ainova%' OR t.name LIKE 'Ainova%'
      ORDER BY t.name
    `);
    
    console.log('  AINOVA táblák:');
    tables.recordset.forEach(t => {
      console.log(`    ${t.TABLE_NAME}: ${t.row_count} sor`);
    });
    
    console.log('\n✅ Tisztítás befejezve!');
    
  } catch (err) {
    console.error('❌ Hiba:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

cleanup();
