'use client';
import { motion } from 'framer-motion';
import React from 'react';

interface HeaderProps {
  pageTitle: string;
  showBackButton?: boolean;
}

export default function Header({ pageTitle, showBackButton }: HeaderProps) {
  // Get user info from sessionStorage
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

  // Get role badge color
  const getRoleBadgeColor = (role: string): string => {
    const roleLower = role?.toLowerCase() || '';
    if (roleLower.includes('admin')) return 'bg-purple-600 text-white';
    if (roleLower.includes('műszakvezető') || roleLower.includes('muszakvezeto')) return 'bg-blue-600 text-white';
    if (roleLower.includes('operátor') || roleLower.includes('operator')) return 'bg-green-600 text-white';
    return 'bg-gray-600 text-white';
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="h-[80px] px-8 flex items-center">
        {/* 1. AINOVA Logo + Text */}
        <div className="flex items-center gap-3 pr-6 border-r border-gray-700">
          {/* Logo - Simplified gradient version (40px) */}
          <div className="relative w-10 h-10">
            <motion.div
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 bg-clip-text text-transparent"
            >
              AI
            </motion.div>
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

        {/* 3. Page Title (dynamic) */}
        <div className="flex-1 px-6">
          <motion.h2
            key={pageTitle}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold text-white"
          >
            {pageTitle}
          </motion.h2>
        </div>
      </div>
    </header>
  );
}
