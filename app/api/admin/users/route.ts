import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validation
    if (!data.username || !data.name || !data.password || !data.role) {
      return NextResponse.json({
        success: false,
        error: 'Kötelező mezők hiányoznak',
      }, { status: 400 });
    }
    
    // Mock save (in production, save to database)
    const newUser = {
      id: Date.now(),
      username: data.username,
      name: data.name,
      role: data.role,
      email: data.email || null,
      createdAt: new Date().toISOString(),
    };
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      success: true,
      message: 'Felhasználó sikeresen létrehozva!',
      user: newUser,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Server error',
    }, { status: 500 });
  }
}
