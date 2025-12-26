import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Mock admin credentials
    const ADMIN_USERS = [
      { username: 'admin', password: 'admin123' },
      { username: 'dev', password: 'dev' },
    ];
    
    const valid = ADMIN_USERS.some(
      u => u.username === username && u.password === password
    );
    
    if (valid) {
      return NextResponse.json({
        success: true,
        message: 'Admin verified',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Hibás jelszó vagy nincs jogosultság',
      }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid request',
    }, { status: 400 });
  }
}
