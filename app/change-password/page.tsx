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
  const [isFirstLogin, setIsFirstLogin] = useState(false);
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
        const userData = JSON.parse(userStr);
        setUser(userData);
        // Check if this is a first login (password change required)
        if (userData.firstLogin) {
          setIsFirstLogin(true);
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Also check URL params for firstLogin flag
    const params = new URLSearchParams(window.location.search);
    if (params.get('firstLogin') === 'true') {
      setIsFirstLogin(true);
    }
  }, []);

  // Client-side validation
  const validatePasswords = (): boolean => {
    const errors: string[] = [];

    // Check empty fields
    if (!currentPassword) {
      errors.push('A jelenlegi jelszó megadása kötelező');
    }
    if (!newPassword) {
      errors.push('Az új jelszó megadása kötelező');
    }
    if (!confirmPassword) {
      errors.push('Az új jelszó megerősítése kötelező');
    }

    // Check minimum length (8 characters)
    if (newPassword && newPassword.length < 8) {
      errors.push('Az új jelszónak legalább 8 karakter hosszúnak kell lennie');
    }

    // Check complexity: uppercase
    if (newPassword && !/[A-Z]/.test(newPassword)) {
      errors.push('Az új jelszónak tartalmaznia kell legalább egy nagybetűt');
    }

    // Check complexity: lowercase
    if (newPassword && !/[a-z]/.test(newPassword)) {
      errors.push('Az új jelszónak tartalmaznia kell legalább egy kisbetűt');
    }

    // Check complexity: special character
    if (newPassword && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      errors.push('Az új jelszónak tartalmaznia kell legalább egy speciális karaktert (!@#$%...)');
    }

    // Check passwords match
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push('Az új jelszó és a megerősítés nem egyezik');
    }

    // Check new password is different
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('Az új jelszó nem egyezhet a jelenlegivel');
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
        throw new Error(data.error || 'Jelszó módosítás sikertelen');
      }

      // Success!
      setSuccess(data.message || 'Jelszó sikeresen módosítva!');
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear firstLogin flag from session
      if (user) {
        const updatedUser = { ...user, firstLogin: false };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Váratlan hiba történt');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle back button - only allow if NOT first login
  const handleBack = () => {
    if (isFirstLogin) {
      // Don't allow going back - show message instead
      setError('Első belépéskor kötelező a jelszó módosítása!');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-4">
        
        {/* Error Message - OUTSIDE container, at top */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Validation Errors - OUTSIDE container, at top */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded">
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

        {/* Success Message - OUTSIDE container, at top */}
        {success && (
          <div className="p-3 bg-green-900/20 border border-green-800 rounded">
            <p className="text-green-400 text-sm">{success}</p>
            <p className="text-green-500 text-xs mt-1">
              Átirányítás a dashboard-ra...
            </p>
          </div>
        )}

        {/* Main Card */}
        <Card>
          <div className="mb-6">
            {/* Back button - disabled during first login */}
            {!isFirstLogin && (
              <button
                onClick={handleBack}
                className="text-xs text-gray-400 hover:text-gray-300 mb-4 transition-colors"
              >
                ← Vissza a dashboard-ra
              </button>
            )}
            
            {/* First login warning */}
            {isFirstLogin && (
              <div className="mb-4 p-2 bg-orange-900/20 border border-orange-800 rounded">
                <p className="text-orange-400 text-xs">
                  ⚠️ Első belépés - jelszó módosítás kötelező!
                </p>
              </div>
            )}
            
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">
              AINOVA
            </p>
            <h1 className="text-3xl font-semibold mb-1">Jelszó módosítása</h1>
            {user && (
              <p className="text-sm text-gray-400">Bejelentkezve: @{user.username}</p>
            )}
          </div>

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
                Min. 8 karakter, nagybetű, kisbetű, speciális karakter
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
