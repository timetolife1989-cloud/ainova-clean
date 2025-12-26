'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AinovaLogo from '@/components/login/AinovaLogo';

interface HeaderProps {
  pageTitle: string;
  showBackButton?: boolean;
}

export default function Header({ pageTitle, showBackButton = false }: HeaderProps) {
  const router = useRouter();

  // Get user info from sessionStorage
  const getUserInfo = () => {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }
    return null;
  };

  const user = getUserInfo();

  // Get initials from full name
  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0][0] || 'U';
  };

  // Get role badge color
  const getRoleBadgeClass = (role: string) => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('admin')) {
      return 'bg-purple-600 text-white';
    }
    if (lowerRole.includes('műszakvezető') || lowerRole.includes('supervisor')) {
      return 'bg-blue-600 text-white';
    }
    if (lowerRole.includes('operátor') || lowerRole.includes('operator')) {
      return 'bg-green-600 text-white';
    }
    return 'bg-gray-600 text-white';
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.removeItem('user');
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 h-20">
      <div className="h-full px-8 flex items-center gap-6">
        {/* Back Button (optional) */}
        {showBackButton && (
          <>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-white rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Vissza
            </button>
            <div className="h-12 w-px bg-gray-700" />
          </>
        )}

        {/* AINOVA Logo + Text */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            AINOVA
          </h1>
        </div>

        <div className="h-12 w-px bg-gray-700" />

        {/* User Info */}
        {user && (
          <>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">
                  {getInitials(user.fullName || user.username)}
                </span>
              </div>
              
              {/* Name and Role */}
              <div className="flex flex-col">
                <span className="text-white text-base font-medium">
                  {user.fullName || user.username}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold w-fit ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <div className="h-12 w-px bg-gray-700" />
          </>
        )}

        {/* Page Title */}
        <motion.div
          key={pageTitle}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <h2 className="text-3xl font-bold text-white">
            {pageTitle}
          </h2>
        </motion.div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-colors font-medium"
        >
          Kilépés
        </button>
      </div>
    </header>
  );
}
