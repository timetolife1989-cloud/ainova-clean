// =====================================================================
// AINOVA - Weather API Route
// =====================================================================
// Purpose: Fetch real-time weather data from OpenWeatherMap API
// Route: GET /api/weather
// Response: { success: boolean, data?: WeatherData, error?: string }
// Caching: 10 minutes (revalidate: 600)
// SECURITY: API key in environment variables (server-side only)
// =====================================================================

import { NextResponse } from 'next/server';

// Set Node.js runtime (required for environment variables and fetch)
export const runtime = 'nodejs';

// Enable 10-minute caching (reduces API calls to ~144/day)
export const revalidate = 600;

/**
 * Weather data structure returned to client
 */
interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  location: string;
  timestamp: string;
}

/**
 * OpenWeatherMap API response structure (partial)
 */
interface OpenWeatherMapResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  name: string;
  dt: number;
}

/**
 * GET /api/weather
 * Fetch current weather data from OpenWeatherMap API
 */
export async function GET() {
  try {
    // 1. Get configuration from environment variables
    const apiKey = process.env.WEATHER_API_KEY;
    const location = process.env.WEATHER_LOCATION || 'Budapest,HU';
    const units = process.env.WEATHER_UNITS || 'metric';
    const language = process.env.WEATHER_LANGUAGE || 'hu';

    // 2. Validate API key
    if (!apiKey) {
      console.error('[Weather API] Missing WEATHER_API_KEY environment variable');
      return NextResponse.json(
        {
          success: false,
          error: 'Weather API key not configured',
        },
        { status: 503 }
      );
    }

    // 3. Build OpenWeatherMap API URL
    const apiUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    apiUrl.searchParams.set('q', location);
    apiUrl.searchParams.set('appid', apiKey);
    apiUrl.searchParams.set('units', units);
    apiUrl.searchParams.set('lang', language);

    // 4. Fetch weather data from OpenWeatherMap
    const response = await fetch(apiUrl.toString(), {
      // Cache for 10 minutes (same as revalidate)
      next: { revalidate: 600 },
    });

    // 5. Handle API errors
    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle specific error cases
      if (response.status === 401) {
        console.error('[Weather API] Invalid API key');
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid weather API key',
          },
          { status: 503 }
        );
      }
      
      if (response.status === 404) {
        console.error('[Weather API] Location not found:', location);
        return NextResponse.json(
          {
            success: false,
            error: 'Weather location not found',
          },
          { status: 503 }
        );
      }
      
      if (response.status === 429) {
        console.error('[Weather API] Rate limit exceeded');
        return NextResponse.json(
          {
            success: false,
            error: 'Weather API rate limit exceeded',
          },
          { status: 503 }
        );
      }
      
      // Generic error
      console.error('[Weather API] API error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: 'Weather service temporarily unavailable',
        },
        { status: 503 }
      );
    }

    // 6. Parse response
    const data: OpenWeatherMapResponse = await response.json();

    // 7. Transform to clean format
    const weatherData: WeatherData = {
      temperature: Math.round(data.main.temp * 10) / 10, // Round to 1 decimal
      feelsLike: Math.round(data.main.feels_like * 10) / 10,
      condition: data.weather[0]?.main || 'Unknown',
      description: data.weather[0]?.description || 'N/A',
      icon: data.weather[0]?.icon || '01d',
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 10) / 10,
      location: data.name,
      timestamp: new Date(data.dt * 1000).toISOString(),
    };

    // 8. Return success response
    return NextResponse.json({
      success: true,
      data: weatherData,
    });

  } catch (error) {
    // Handle network errors, parsing errors, etc.
    console.error('[Weather API] Unexpected error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weather data',
      },
      { status: 500 }
    );
  }
}
