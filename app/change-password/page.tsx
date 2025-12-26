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

export default function ChangePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  // Client-side validation
  const validatePasswords = (): boolean => {
    const errors: string[] = [];

    // Check empty fields
    if (!currentPassword) {
      errors.push('Current password is required');
    }
    if (!newPassword) {
      errors.push('New password is required');
    }
    if (!confirmPassword) {
      errors.push('Password confirmation is required');
    }

    // Check minimum length
    if (newPassword && newPassword.length < 6) {
      errors.push('New password must be at least 6 characters');
    }

    // Check passwords match
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push('New password and confirmation do not match');
    }

    // Check new password is different
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    // Client-side validation
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Password change failed');
      }

      // Success!
      setSuccess(data.message || 'Password changed successfully');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

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
      <div className="max-w-md w-full space-y-6">
        {/* Header Card */}
        <Card>
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs text-gray-400 hover:text-gray-300 mb-4 transition-colors"
            >
              ← Vissza a dashboard-ra
            </button>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
              AINOVA
            </p>
            <h1 className="text-3xl font-semibold mb-1">Jelszó módosítása</h1>
            {user && (
              <p className="text-sm text-gray-400">Bejelentkezve: @{user.username}</p>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded">
              <p className="text-green-400 text-sm">{success}</p>
              <p className="text-green-500 text-xs mt-1">
                Átirányítás a dashboard-ra...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <p className="text-red-400 text-sm mb-4 bg-red-900/20 p-3 rounded border border-red-800">
              {error}
            </p>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                Kérjük javítsd a következő hibákat:
              </p>
              <ul className="text-yellow-500 text-xs space-y-1 list-disc list-inside">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">
                Jelenlegi jelszó
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                disabled={loading || !!success}
                autoComplete="current-password"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">
                Új jelszó
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                disabled={loading || !!success}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 karakter
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400">
                Új jelszó megerősítése
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                disabled={loading || !!success}
                autoComplete="new-password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="button-primary w-full mt-2"
              disabled={loading || !!success}
            >
              {loading ? 'Módosítás...' : success ? '✓ Sikeres' : 'Jelszó módosítása'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-900/10 border border-blue-800/30 rounded">
            <p className="text-blue-400 text-xs font-medium mb-1">
              Biztonsági tájékoztató
            </p>
            <p className="text-blue-500 text-xs">
              Jelszó módosítás után minden más eszközön újra be kell jelentkezned.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
