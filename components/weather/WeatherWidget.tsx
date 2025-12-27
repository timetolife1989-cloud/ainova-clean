'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Weather data structure from API
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
 * Weather icon mapping (emoji-based)
 */
const weatherIcons: Record<string, string> = {
  'Clear': '☀️',
  'Clouds': '☁️',
  'Rain': '🌧️',
  'Drizzle': '🌦️',
  'Thunderstorm': '⛈️',
  'Snow': '❄️',
  'Mist': '🌫️',
  'Fog': '🌫️',
  'Haze': '🌫️',
  'Smoke': '🌫️',
  'Dust': '🌫️',
  'Sand': '🌫️',
  'Ash': '🌫️',
  'Squall': '💨',
  'Tornado': '🌪️',
};

/**
 * WeatherWidget Component
 * Displays real-time weather information in the Header
 */
export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  /**
   * Fetch weather data from API
   */
  const fetchWeather = async () => {
    try {
      const response = await fetch('/api/weather');
      const data = await response.json();

      if (data.success && data.data) {
        setWeather(data.data);
        setError(false);
      } else {
        console.error('Weather API error:', data.error);
        setError(true);
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup: Initial fetch and auto-refresh every 10 minutes
   */
  useEffect(() => {
    // Initial fetch
    fetchWeather();

    // Auto-refresh every 10 minutes (600,000 ms)
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  /**
   * Get weather icon emoji based on condition
   */
  const getWeatherIcon = (condition: string): string => {
    return weatherIcons[condition] || '🌡️';
  };

  /**
   * Format timestamp to readable time
   */
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Loading state: Skeleton with pulse animation
   */
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-lg">
        <div className="w-8 h-8 bg-slate-700 rounded-full animate-pulse" />
        <div className="flex flex-col gap-1">
          <div className="w-16 h-4 bg-slate-700 rounded animate-pulse" />
          <div className="w-20 h-3 bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  /**
   * Error state: Show fallback "N/A"
   */
  if (error || !weather) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-lg">
        <span className="text-2xl">🌡️</span>
        <div className="flex flex-col">
          <span className="text-white text-sm font-medium">N/A</span>
          <span className="text-gray-400 text-xs">Időjárás</span>
        </div>
      </div>
    );
  }

  /**
   * Success state: Display weather data with hover tooltip
   */
  return (
    <div className="relative">
      {/* Main weather display */}
      <motion.div
        className="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-lg cursor-pointer transition-colors hover:bg-slate-700/80"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {/* Weather icon */}
        <span className="text-2xl">{getWeatherIcon(weather.condition)}</span>

        {/* Temperature and location */}
        <div className="flex flex-col">
          <span className="text-white text-sm font-medium">
            {weather.temperature}°C
          </span>
          <span className="text-gray-400 text-xs">{weather.location}</span>
        </div>
      </motion.div>

      {/* Hover tooltip with detailed info */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 right-0 z-50 min-w-[200px] bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-4"
          >
            {/* Description */}
            <div className="mb-3 pb-3 border-b border-slate-700">
              <p className="text-white text-sm font-medium capitalize">
                {weather.description}
              </p>
            </div>

            {/* Detailed info */}
            <div className="space-y-2 text-xs">
              {/* Feels like */}
              <div className="flex justify-between">
                <span className="text-gray-400">Úgy érződik:</span>
                <span className="text-white font-medium">
                  {weather.feelsLike}°C
                </span>
              </div>

              {/* Humidity */}
              <div className="flex justify-between">
                <span className="text-gray-400">Páratartalom:</span>
                <span className="text-white font-medium">
                  {weather.humidity}%
                </span>
              </div>

              {/* Wind speed */}
              <div className="flex justify-between">
                <span className="text-gray-400">Szélsebesség:</span>
                <span className="text-white font-medium">
                  {weather.windSpeed} m/s
                </span>
              </div>

              {/* Last updated */}
              <div className="flex justify-between pt-2 mt-2 border-t border-slate-700">
                <span className="text-gray-400">Frissítve:</span>
                <span className="text-white font-medium">
                  {formatTime(weather.timestamp)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
