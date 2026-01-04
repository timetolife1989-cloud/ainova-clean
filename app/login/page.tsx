'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginContainer from '@/components/login/LoginContainer';
import AinovaLogo from '@/components/login/AinovaLogo';
import InputField from '@/components/login/InputField';
import RippleButton from '@/components/login/RippleButton';
import InteractiveBackground from '@/components/login/InteractiveBackground';

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [glowState, setGlowState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const showError = (message: string) => {
    setErrorMessage(message);
    setGlowState('error');
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setGlowState('idle');
      setErrorMessage('');
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!username || !password) {
      showError('Hiányzó felhasználónév vagy jelszó');
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
        
        // ✅ Improved error message mapping with specific network errors
        const getErrorMessage = (error: string): string => {
          const lowerError = error.toLowerCase();
          
          // Specific network/VPN errors (most important for user)
          if (error.includes('NETWORK_NOT_REACHABLE') || lowerError.includes('enotfound') || lowerError.includes('getaddrinfo')) {
            return 'Szerver nem elérhető. Ellenőrizd, hogy a céges hálózaton vagy (IvanTIM VPN).';
          }
          if (error.includes('CONNECTION_TIMEOUT') || lowerError.includes('etimedout') || lowerError.includes('timeout')) {
            return 'Kapcsolati időtúllépés. Ellenőrizd a hálózati kapcsolatot.';
          }
          if (error.includes('CONNECTION_REFUSED') || lowerError.includes('econnrefused')) {
            return 'A szerver elutasította a kapcsolatot. Lehet, hogy karbantartás alatt van.';
          }
          if (error.includes('SOCKET_ERROR') || lowerError.includes('esocket')) {
            return 'Hálózati hiba. Ellenőrizd az internetkapcsolatot és a VPN-t.';
          }
          if (error.includes('DATABASE_ERROR')) {
            return 'Adatbázis hiba. Kérjük, értesítsd az IT supportot.';
          }
          
          // General database/SQL errors
          if (lowerError.includes('sql') || lowerError.includes('database') || lowerError.includes('connection')) {
            return 'Adatbázis kapcsolati hiba. Próbáld újra később.';
          }
          
          // Invalid credentials
          if (lowerError.includes('invalid') || lowerError.includes('credentials') || lowerError.includes('hibás')) {
            return 'Hibás felhasználónév vagy jelszó';
          }
          
          // User not found (same message as invalid for security)
          if (lowerError.includes('user not found') || lowerError.includes('nincs ilyen')) {
            return 'Hibás felhasználónév vagy jelszó';
          }
          
          // Network fetch errors (browser side)
          if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('failed to fetch')) {
            return 'Nincs internetkapcsolat, vagy nem vagy a céges hálózaton.';
          }
          
          // Account disabled
          if (lowerError.includes('disabled') || lowerError.includes('banned') || lowerError.includes('tiltva')) {
            return 'A fiók le van tiltva. Lépj kapcsolatba az adminisztrátorral.';
          }
          
          // Session expired
          if (lowerError.includes('expired') || lowerError.includes('lejárt')) {
            return 'A munkamenet lejárt. Jelentkezz be újra.';
          }
          
          // Rate limiting
          if (lowerError.includes('too many') || lowerError.includes('túl sok')) {
            return 'Túl sok sikertelen kísérlet. Várj 15 percet.';
          }
          
          return errorMessages[error] || error || 'Ismeretlen hiba történt';
        };
        
        const displayError = getErrorMessage(backendError);
        
        showError(displayError);
        return;
      }

      // Success állapot
      setGlowState('success');
      setErrorMessage(''); // Clear any error

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
      // Client-side network errors (fetch failed)
      let errorMsg = 'Nincs internetkapcsolat, vagy nem vagy a céges hálózaton (IvanTIM VPN).';
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
          errorMsg = 'Nincs internetkapcsolat, vagy nem vagy a céges hálózaton (IvanTIM VPN).';
        } else if (msg.includes('timeout')) {
          errorMsg = 'Kapcsolati időtúllépés. Lassú az internet vagy nincs VPN kapcsolat.';
        } else {
          errorMsg = `Hálózati hiba: ${error.message}`;
        }
      }
      
      showError(errorMsg);
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
        <LoginContainer glowState={glowState} errorMessage={errorMessage}>
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
    </>
  );
}
