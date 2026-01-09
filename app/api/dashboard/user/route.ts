// =====================================================
// AINOVA - Dashboard User Info API
// =====================================================
// Purpose: Return current user data from session
// Route: GET /api/dashboard/user
// Response: { success: boolean, user?: UserData }
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkSession, apiSuccess, ApiErrors } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  // Validate session
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  // Return user data from session
  return apiSuccess({
    user: {
      name: session.fullName || session.username,
      username: session.username,
      role: session.role,
      userId: session.userId,
    },
  });
}
