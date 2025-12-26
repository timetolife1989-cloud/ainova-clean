import { NextResponse } from 'next/server';

export async function GET() {
  // Mock weather data
  return NextResponse.json({
    success: true,
    weather: {
      temp: 25,
      location: 'Szombathely',
      condition: 'sunny',
    },
  });
}
