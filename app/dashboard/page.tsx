'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';

interface User {
  userId: number;
  username: string;
  fullName: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user from sessionStorage
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Logout failed');
      }

      // Clear session storage
      sessionStorage.removeItem('user');

      // Redirect to login
      router.push('/login');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header Card */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
                AINOVA DASHBOARD
              </p>
              <h1 className="text-3xl font-semibold mb-1">
                Üdvözöllek{user?.fullName ? `, ${user.fullName}` : ''}!
              </h1>
              {user && (
                <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
                  <span>@{user.username}</span>
                  <span className="text-gray-600">•</span>
                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-xs">
                    {user.role}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kilépés...' : 'Kilépés'}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-4 bg-red-900/20 p-3 rounded border border-red-800">
              {error}
            </p>
          )}
        </Card>

        {/* Content Card */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Termelésirányító rendszer</h2>
              <p className="text-gray-400 text-sm">
                A dashboard tartalma hamarosan elérhető lesz.
              </p>
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Gyors műveletek</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => router.push('/change-password')}
                  className="px-4 py-3 bg-gray-800/50 hover:bg-gray-800 text-left rounded transition-colors text-sm"
                >
                  <div className="font-medium">Jelszó módosítása</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Változtasd meg a jelszavadat
                  </div>
                </button>

                <button
                  disabled
                  className="px-4 py-3 bg-gray-800/30 text-left rounded text-sm opacity-50 cursor-not-allowed"
                >
                  <div className="font-medium text-gray-500">Személyzet kezelés</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hamarosan elérhető
                  </div>
                </button>

                <button
                  disabled
                  className="px-4 py-3 bg-gray-800/30 text-left rounded text-sm opacity-50 cursor-not-allowed"
                >
                  <div className="font-medium text-gray-500">Túlóra nyilvántartás</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hamarosan elérhető
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          AINOVA v1.0.0 - Termelésirányító rendszer
        </div>
      </div>
    </main>
  );
}
