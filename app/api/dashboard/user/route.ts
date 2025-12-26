import { NextResponse } from 'next/server';

export async function GET() {
  // Mock user data (in production, fetch from session/database)
  return NextResponse.json({
    success: true,
    user: {
      name: 'Kovács János',
      role: 'Admin',
      avatar: null,
    },
  });
}
