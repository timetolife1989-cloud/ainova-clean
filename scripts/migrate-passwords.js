// =====================================================
// AINOVA - Plain Text Password Migration Script
// =====================================================
// Purpose: Find and hash all plain text passwords
// Usage: node scripts/migrate-passwords.js
// 
// IMPORTANT: Run this ONCE after deploying the security update
// =====================================================

require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Ainova2025!'; // Users will be forced to change on first login

async function migratePasswords() {
  console.log('\n=================================================');
  console.log('AINOVA - Plain Text Password Migration');
  console.log('=================================================\n');

  const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('\n✓ Connected to:', process.env.DB_DATABASE);

    // Find users with plain text passwords
    console.log('\nSearching for plain text passwords...');
    const result = await pool.request().query(`
      SELECT UserId, Username, FullName, Role, PasswordHash
      FROM dbo.AinovaUsers
      WHERE PasswordHash NOT LIKE '$2a$%' 
        AND PasswordHash NOT LIKE '$2b$%'
    `);

    const users = result.recordset;
    
    if (users.length === 0) {
      console.log('\n✓ No plain text passwords found. All passwords are properly hashed!');
      return;
    }

    console.log(`\n⚠ Found ${users.length} user(s) with plain text passwords:\n`);
    users.forEach(u => {
      console.log(`  - ${u.Username} (${u.FullName}) - Role: ${u.Role}`);
    });

    // Hash the default password
    console.log(`\nHashing default password (${DEFAULT_PASSWORD})...`);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    console.log('✓ Hash generated');

    // Update all plain text passwords
    console.log('\nMigrating passwords...');
    
    for (const user of users) {
      await pool.request()
        .input('userId', sql.Int, user.UserId)
        .input('passwordHash', sql.NVarChar(255), hashedPassword)
        .query(`
          UPDATE dbo.AinovaUsers
          SET PasswordHash = @passwordHash,
              FirstLogin = 1,
              UpdatedAt = SYSDATETIME()
          WHERE UserId = @userId
        `);
      
      console.log(`  ✓ Migrated: ${user.Username}`);
    }

    console.log('\n=================================================');
    console.log('MIGRATION COMPLETE');
    console.log('=================================================');
    console.log(`\n✓ ${users.length} password(s) migrated to bcrypt hash`);
    console.log(`\nDefault password: ${DEFAULT_PASSWORD}`);
    console.log('Users will be prompted to change password on first login.\n');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run migration
migratePasswords();
