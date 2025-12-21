import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Dummy válasz - később SQL
    if (username === 'dev' && password === 'dev') {
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          username: 'dev',
          name: 'Developer User'
        }
      });
    }

    return NextResponse.json(
      { message: 'Hibás felhasználónév vagy jelszó' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Szerverhiba történt' },
      { status: 500 }
    );
  }
}
