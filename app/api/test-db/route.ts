// =====================================================================
// AINOVA - Database Connection Test Endpoint
// =====================================================================
// Purpose: Verify SQL Server connection and environment config
// Route: GET /api/test-db
// SECURITY: DEV-ONLY endpoint, sensitive data protection
// PRODUCTION-READY: Blocks access in production, minimal info leak
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  // =====================================================================
  // 🟡 FIX #4: SECURITY - DEV-ONLY ENDPOINT
  // =====================================================================
  // Block access in production environment (security risk)
  // Attackers could use this endpoint to probe database connectivity
  // =====================================================================
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  try {
    // Get connection pool
    const pool = await getPool();
    
    // Execute simple test query
    const result = await pool.request().query('SELECT 1 AS test, SYSDATETIME() AS serverTime');
    
    // =====================================================================
    // 🟡 FIX #5: SENSITIVE DATA PROTECTION
    // =====================================================================
    // Only expose server/database info in development
    // Production builds should NEVER leak infrastructure details
    // =====================================================================
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      // ✅ Conditional sensitive data (ONLY in development)
      ...(isDevelopment && {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        config: {
          connectionTimeout: '10s',
          poolMax: 10,
        }
      }),
      // ✅ Safe data (always included)
      testQuery: result.recordset[0],
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] /test-db error:', error);
    
    // =====================================================================
    // 🟡 FIX #5 CONTINUED: Error message protection (REFACTORED)
    // =====================================================================
    // Single 'message' field with conditional logic (DRY principle)
    // Stack trace remains conditional (DEV-only)
    // =====================================================================
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // ✅ REFACTORED: One message variable (cleaner, more maintainable)
    const errorMessage = isDevelopment
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Please contact support';
    
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      message: errorMessage,  // ✅ Always present, but different value
      // ✅ Stack trace conditional (DEV-only)
      ...(isDevelopment && error instanceof Error && {
        stack: error.stack,
      }),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
