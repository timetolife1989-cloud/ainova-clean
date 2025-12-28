'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginContainer from '@/components/login/LoginContainer';
import AinovaLogo from '@/components/login/AinovaLogo';
import InputField from '@/components/login/InputField';
import RippleButton from '@/components/login/RippleButton';
import ToastNotification from '@/components/login/ToastNotification';
import InteractiveBackground from '@/components/login/InteractiveBackground';

// Prevent static generation due to useSearchParams
export const dynamic = 'force-dynamic';

// Error message mapping (magyar)
const errorMessages: Record<string, string> = {
  'Invalid credentials': 'Hibás felhasználónév vagy jelszó',
  'Database connection failed': 'Adatbázis kapcsolati hiba. Próbáld újra később.',
  'SQL Server connection failed': 'Adatbázis szerver nem elérhető. Várható újraindítás: 2 perc',
  'Service unavailable': 'A szolgáltatás jelenleg nem elérhető.',
  'Missing username or password': 'Hiányzó felhasználónév vagy jelszó',
  'Account is disabled': 'A fiók le van tiltva. Lépj kapcsolatba az adminisztrátorral.',
  'Session expired': 'A munkamenet lejárt. Jelentkezz be újra.',
  'Login failed': 'Bejelentkezés sikertelen. Ellenőrizd az adatokat.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [glowState, setGlowState] = useState<'idle' | 'success' | 'error'>('idle');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showToast = (message: string, type: typeof toastType) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!username || !password) {
      setGlowState('error');
      showToast('Hiányzó felhasználónév vagy jelszó', 'error');
      setTimeout(() => setGlowState('idle'), 500);
      return;
    }

    setLoading(true);
    setGlowState('idle');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!data.success) {
        // Error állapot
        setGlowState('error');
        
        const backendError = data.error || data.message || 'Login failed';
        
        // ✅ Substring matching function
        const getErrorMessage = (error: string): string => {
          const lowerError = error.toLowerCase();
          
          if (lowerError.includes('sql') || lowerError.includes('database') || lowerError.includes('connection')) {
            return 'Adatbázis kapcsolati hiba. Próbáld újra később.';
          }
          if (lowerError.includes('invalid') || lowerError.includes('credentials')) {
            return 'Hibás felhasználónév vagy jelszó';
          }
          if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('enotfound')) {
            return 'Hálózati hiba. Ellenőrizd az internetkapcsolatot.';
          }
          if (lowerError.includes('disabled') || lowerError.includes('banned')) {
            return 'A fiók le van tiltva. Lépj kapcsolatba az adminisztrátorral.';
          }
          if (lowerError.includes('expired')) {
            return 'A munkamenet lejárt. Jelentkezz be újra.';
          }
          
          return errorMessages[error] || error || 'Ismeretlen hiba történt';
        };
        
        const displayError = getErrorMessage(backendError);
        
        console.log('Backend error:', backendError); // DEBUG
        console.log('Display error:', displayError); // DEBUG
        
        showToast(displayError, 'error');
        setTimeout(() => setGlowState('idle'), 500);
        return;
      }

      // Success állapot
      setGlowState('success');
      showToast('Sikeres belépés!', 'success');

      // User info mentése sessionStorage-ba
      if (data.user) {
        sessionStorage.setItem('user', JSON.stringify(data.user));
      }

      // Redirect
      setTimeout(() => {
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';
        const redirectUrl = data.redirect || returnUrl;
        router.push(redirectUrl);
      }, 800);

    } catch (error) {
      setGlowState('error');
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Hálózati hiba. Ellenőrizd az internetkapcsolatot.';
      showToast(errorMsg, 'error');
      setTimeout(() => setGlowState('idle'), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Interaktív háttér */}
      <InteractiveBackground />

      {/* Login form */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <LoginContainer glowState={glowState}>
          <AinovaLogo />

          <form onSubmit={handleSubmit}>
            <InputField
              label="Felhasználónév:"
              type="text"
              value={username}
              onChange={setUsername}
              placeholder="Írd be a felhasználóneved"
            />

            <InputField
              label="Jelszó:"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Írd be a jelszavad"
            />

            <RippleButton loading={loading} disabled={loading}>
              Bejelentkezés
            </RippleButton>
          </form>
        </LoginContainer>
      </main>

      {/* Toast notification */}
      <ToastNotification
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
