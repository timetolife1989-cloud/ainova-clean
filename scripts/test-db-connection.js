// =====================================================================
// AINOVA - Database Connection Test Script
// =====================================================================
// Purpose: Test SQL Server connection and verify AinovaUsers table
// Usage: npm run db:test
// =====================================================================

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });
const sql = require('mssql');

// =====================================================================
// SQL Server Configuration
// =====================================================================
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,  // TDK production server requires encryption
    trustServerCertificate: true,  // Trust self-signed certificates
    enableArithAbort: true,
    connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '30000'),
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    idleTimeoutMillis: 30000,
  },
};

// =====================================================================
// Test Connection Function
// =====================================================================
async function testConnection() {
  console.log('=====================================================');
  console.log('AINOVA - Database Connection Test');
  console.log('=====================================================\n');
  
  // Step 1: Verify environment variables
  console.log('Step 1: Checking environment variables...');
  console.log(`  Server:   ${config.server || '❌ MISSING'}`);
  console.log(`  Database: ${config.database || '❌ MISSING'}`);
  console.log(`  User:     ${config.user || '❌ MISSING'}`);
  console.log(`  Password: ${config.password ? '✅ SET' : '❌ MISSING'}`);
  console.log(`  Port:     ${config.port}`);
  console.log(`  Encrypt:  ${config.options.encrypt}`);
  console.log('');
  
  if (!config.server || !config.database || !config.user || !config.password) {
    console.error('❌ ERROR: Missing required environment variables!');
    console.error('Please check your .env.local file.\n');
    process.exit(1);
  }
  
  // Step 2: Test SQL Server connection
  console.log('Step 2: Connecting to SQL Server...');
  try {
    await sql.connect(config);
    console.log('✅ Connection successful!\n');
  } catch (err) {
    console.error('❌ Connection failed!');
    console.error(`Error: ${err.message}\n`);
    console.error('Troubleshooting tips:');
    console.error('  1. Verify server name and port');
    console.error('  2. Check network connectivity');
    console.error('  3. Verify credentials');
    console.error('  4. Check firewall settings\n');
    process.exit(1);
  }
  
  // Step 3: Check if AinovaUsers table exists
  console.log('Step 3: Checking AinovaUsers table...');
  try {
    const tableCheck = await sql.query`
      SELECT COUNT(*) as tableExists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
        AND TABLE_NAME = 'AinovaUsers'
    `;
    
    const tableExists = tableCheck.recordset[0].tableExists > 0;
    
    if (tableExists) {
      console.log('✅ Table dbo.AinovaUsers exists\n');
    } else {
      console.log('⚠️  Table dbo.AinovaUsers does NOT exist');
      console.log('Run: npm run db:setup to see setup instructions\n');
      await sql.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Table check failed!');
    console.error(`Error: ${err.message}\n`);
    await sql.close();
    process.exit(1);
  }
  
  // Step 4: Count users in AinovaUsers table
  console.log('Step 4: Querying AinovaUsers table...');
  try {
    const result = await sql.query`
      SELECT COUNT(*) as userCount FROM dbo.AinovaUsers
    `;
    
    const userCount = result.recordset[0].userCount;
    console.log(`✅ Total users: ${userCount}\n`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found. Run setup script to create default users.');
      console.log('Run: npm run db:setup\n');
    }
  } catch (err) {
    console.error('❌ Query failed!');
    console.error(`Error: ${err.message}\n`);
    await sql.close();
    process.exit(1);
  }
  
  // Step 5: Show user list (if any)
  console.log('Step 5: Listing users...');
  try {
    const users = await sql.query`
      SELECT UserId, Username, FullName, Role, Email, IsActive, FirstLogin, CreatedAt
      FROM dbo.AinovaUsers
      ORDER BY UserId
    `;
    
    if (users.recordset.length > 0) {
      console.log('Users in database:');
      console.log('─────────────────────────────────────────────────────');
      users.recordset.forEach(user => {
        const status = user.IsActive ? '🟢' : '🔴';
        const firstLogin = user.FirstLogin ? '(First Login)' : '';
        console.log(`  ${status} ${user.Username.padEnd(15)} | ${user.Role.padEnd(15)} | ${user.FullName} ${firstLogin}`);
      });
      console.log('─────────────────────────────────────────────────────\n');
    }
  } catch (err) {
    console.error('❌ User list query failed!');
    console.error(`Error: ${err.message}\n`);
    await sql.close();
    process.exit(1);
  }
  
  // Step 6: Check Sessions table
  console.log('Step 6: Checking Sessions table...');
  try {
    const sessionCheck = await sql.query`
      SELECT COUNT(*) as tableExists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
        AND TABLE_NAME = 'Sessions'
    `;
    
    const sessionTableExists = sessionCheck.recordset[0].tableExists > 0;
    
    if (sessionTableExists) {
      const sessionCount = await sql.query`
        SELECT COUNT(*) as count FROM dbo.Sessions
      `;
      console.log(`✅ Table dbo.Sessions exists (${sessionCount.recordset[0].count} active sessions)\n`);
    } else {
      console.log('⚠️  Table dbo.Sessions does NOT exist (required for login)\n');
    }
  } catch (err) {
    console.warn('⚠️  Sessions table check failed (non-critical)');
    console.warn(`Error: ${err.message}\n`);
  }
  
  // Step 7: Close connection
  await sql.close();
  console.log('=====================================================');
  console.log('✅ Database connection test completed successfully!');
  console.log('=====================================================\n');
}

// =====================================================================
// Run test
// =====================================================================
testConnection().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
