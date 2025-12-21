'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Ismeretlen hiba');
      }
      
      // Sikeres login - átirányítás dashboard-ra
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ismeretlen hiba');
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 page-enter">
      <div className="max-w-md w-full">
        <Card>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
              AINOVA
            </p>
            <h1 className="text-3xl font-semibold mb-1">Bejelentkezés</h1>
            <p className="text-sm text-gray-400">Termelésirányító rendszer</p>
          </div>

          {error && (
            <p className="text-red-300 text-sm mb-4">{error}</p>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">
                Felhasználónév
              </label>
              <input
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Add meg a felhasználóneved"
                className="input-field"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">
                Jelszó
              </label>
              <input
                autoComplete="off"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button type="submit" className="button-primary w-full mt-2">
              Bejelentkezés
            </button>
          </form>
        </Card>
      </div>
    </main>
  );
}
