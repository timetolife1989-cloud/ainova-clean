'use client';
import { motion } from 'framer-motion';
import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  pageTitle: string;
  showBackButton?: boolean;
}

export default function Header({ pageTitle, showBackButton = false }: HeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds
    return () => clearInterval(timer);
  }, []);

  // Get user info from sessionStorage
  // Note: User data is stored in sessionStorage by the login flow (app/login/page.tsx)
  // This is consistent with the existing authentication pattern in the codebase
  const [userInfo, setUserInfo] = React.useState<{
    fullName: string;
    username: string;
    role: string;
  } | null>(null);

  React.useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserInfo({
          fullName: user.fullName || user.username,
          username: user.username,
          role: user.role,
        });
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  // Get initials from full name (e.g., "Kovács János" -> "KJ")
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Format date as éééé.hh.nn óó:pp
  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // Get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Get day name in Hungarian
  const getDayName = (date: Date): string => {
    const days = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
    return days[date.getDay()];
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string): string => {
    const roleLower = role?.toLowerCase() || '';
    if (roleLower.includes('admin')) return 'bg-purple-600 text-white';
    if (roleLower.includes('műszakvezető') || roleLower.includes('muszakvezeto')) return 'bg-blue-600 text-white';
    if (roleLower.includes('operátor') || roleLower.includes('operator')) return 'bg-green-600 text-white';
    return 'bg-gray-600 text-white';
  };

  return (
    <header className="fixed top-0 w-full z-50">
      {/* Fancy elevated header with multiple layers */}
      <div className="relative bg-gradient-to-r from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-xl border-b-2 border-blue-500/30 shadow-2xl shadow-blue-900/40">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        
        {/* Subtle animated glow */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/5 to-blue-500/0"
          animate={{ 
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        
        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/5 to-transparent pointer-events-none" />
        
        <div className="relative h-[80px] px-8 flex items-center">
        {/* 1. AINOVA Logo + Text - Clickable to go back to dashboard */}
        <div 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 pr-6 border-r border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
        >
          {/* Logo - 3D Planet with orbiting neurons */}
          <div className="relative w-12 h-12">
            {/* Central planet sphere with 3D gradient */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  rotateY: [0, 360],
                }}
                transition={{ 
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear'
                }}
                className="w-8 h-8 rounded-full relative"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6, #1e40af)',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), inset -5px -5px 10px rgba(0, 0, 0, 0.5), inset 5px 5px 10px rgba(147, 197, 253, 0.3)'
                }}
              >
                {/* Sphere highlights for 3D effect */}
                <div className="absolute top-1 left-1 w-3 h-3 bg-white/40 rounded-full blur-sm" />
              </motion.div>
            </div>
            
            {/* Orbiting neurons - Ring 1 */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 -ml-0.75 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
              <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 -ml-0.75 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
            </motion.div>
            
            {/* Orbiting neurons - Ring 2 (opposite direction) */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute top-1/2 left-0 w-1.5 h-1.5 -mt-0.75 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
              <div className="absolute top-1/2 right-0 w-1.5 h-1.5 -mt-0.75 bg-indigo-400 rounded-full shadow-lg shadow-indigo-400/50" />
            </motion.div>
            
            {/* Orbiting neurons - Ring 3 (diagonal) */}
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              style={{ transform: 'rotateZ(45deg)' }}
            >
              <div className="absolute top-0 left-1/2 w-1 h-1 -ml-0.5 bg-violet-400 rounded-full shadow-lg shadow-violet-400/50" />
              <div className="absolute bottom-0 left-1/2 w-1 h-1 -ml-0.5 bg-blue-300 rounded-full shadow-lg shadow-blue-300/50" />
            </motion.div>
            
            {/* Orbital paths (faint circles) */}
            <div className="absolute inset-0 border border-blue-400/20 rounded-full" />
            <div className="absolute inset-1 border border-purple-400/15 rounded-full" />
          </div>
          
          {/* AINOVA Text */}
          <motion.h1
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl font-bold tracking-wider bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent"
          >
            AINOVA
          </motion.h1>
        </div>

        {/* 2. User Info */}
        {userInfo && (
          <div className="flex items-center gap-4 px-6 border-r border-gray-700">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {getInitials(userInfo.fullName)}
            </div>
            
            {/* Name and Role */}
            <div className="flex flex-col">
              <span className="text-white text-base font-medium">
                {userInfo.fullName}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(userInfo.role)}`}>
                {userInfo.role}
              </span>
            </div>
          </div>
        )}

        {/* 3. Page Title (centered, metallic) */}
        <div className="flex-1 flex justify-center items-center px-6">
          <motion.h2
            key={pageTitle}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold bg-gradient-to-b from-gray-100 via-white to-gray-300 bg-clip-text text-transparent"
            style={{
              textShadow: '0 1px 2px rgba(255,255,255,0.3), 0 -1px 1px rgba(0,0,0,0.5)',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}
          >
            {pageTitle}
          </motion.h2>
        </div>

        {/* 4. Date/Time Info */}
        <div className="flex items-center gap-4 px-6 border-r border-gray-700">
          {/* Date/Time/Day */}
          <div className="flex flex-col items-end text-sm">
            <span className="text-white font-mono font-semibold">
              {formatDateTime(currentTime)}
            </span>
            <span className="text-gray-400 text-xs">
              {getDayName(currentTime)} • {getWeekNumber(currentTime)}. hét
            </span>
          </div>
        </div>

        {/* 5. Logout Button - Fancy with glow */}
        <div className="pl-6 pr-4">
          <motion.button
            onClick={() => {
              sessionStorage.removeItem('user');
              sessionStorage.removeItem('adminVerified');
              router.push('/login');
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative px-6 py-3 bg-gradient-to-br from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-xl transition-all duration-300 font-bold shadow-2xl shadow-red-900/50 hover:shadow-red-700/70 overflow-hidden border border-red-400/30"
          >
            {/* Animated background pulse */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-300/30 to-red-400/0"
              animate={{ 
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
            
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="tracking-wide">KILÉPÉS</span>
            </span>
            
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
            
            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-300 to-transparent opacity-60" />
          </motion.button>
        </div>
        </div>
      </div>
    </header>
  );
}
