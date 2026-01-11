'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SyncStatus {
  lastSync: string | null;
  lastSyncFormatted: string | null;
  recordCount: number;
  isStale: boolean;
  hasData: boolean;
}

interface UserInfo {
  torzsszam: string;
  nev: string;
  szerep: string;
}

interface WarRoomSyncAlertProps {
  /** Ha true, mindig mutatja a státuszt (fejlesztéshez) */
  alwaysShow?: boolean;
}

// Admin törzsszámok akik látják a force sync gombot
const ADMIN_TORZSSZAMOK = ['30008047']; // Svasznik Tibor

/**
 * War Room szinkronizálás figyelmeztetés
 * AUTOMATIKUS SYNC: Ha az adat régi (>1 óra), automatikusan elindul a háttérben
 * Admin felhasználóknak (30008047) mindig megjelenik egy rejtett sync gomb
 */
export function WarRoomSyncAlert({ alwaysShow = false }: WarRoomSyncAlertProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, setUser] = useState<UserInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoSyncTriggered, setAutoSyncTriggered] = useState(false);
  const autoSyncRef = useRef(false); // Prevent multiple auto syncs
  
  // Státusz lekérése
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/warroom-letszam/sync');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('War Room státusz hiba:', err);
    }
  }, []);
  
  // User info lekérése (admin check)
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/user');
      if (res.ok) {
        const data = await res.json();
        console.log('[WarRoom] User data:', data);
        const userData = data.user || data;
        setUser({
          torzsszam: userData.userId || userData.username || '',
          nev: userData.name || '',
          szerep: userData.role || ''
        });
        const userTorzsszam = userData.userId || userData.username || '';
        const adminCheck = ADMIN_TORZSSZAMOK.includes(userTorzsszam);
        console.log('[WarRoom] Admin check:', userTorzsszam, 'isAdmin:', adminCheck);
        setIsAdmin(adminCheck);
      }
    } catch (err) {
      console.error('User info hiba:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchStatus();
    fetchUser();
    // Frissítés 1 percenként
    const interval = setInterval(fetchStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchUser]);
  
  // Szinkronizálás (manuális vagy automatikus)
  const handleSync = useCallback(async (isAutoSync = false) => {
    if (syncing) return;
    
    setSyncing(true);
    setError(null);
    setSuccess(null);
    
    if (isAutoSync) {
      console.log('[WarRoom] Auto sync indítása...');
    }
    
    try {
      const res = await fetch('/api/warroom-letszam/sync', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(`${data.imported} sor importálva`);
        // Frissítjük a státuszt
        fetchStatus();
        // Ha auto sync volt, csak csendben frissítjük a chartot
        if (isAutoSync) {
          console.log('[WarRoom] Auto sync kész, oldal frissítése...');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          // Manuális sync esetén hosszabb delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        setError(data.error || 'Szinkronizálás sikertelen');
      }
    } catch {
      setError('Hálózati hiba');
    } finally {
      setSyncing(false);
    }
  }, [syncing, fetchStatus]);
  
  // AUTOMATIKUS SYNC: Ha az adat régi, automatikusan sync-elünk a háttérben
  useEffect(() => {
    if (status && status.isStale && !autoSyncRef.current && !syncing) {
      console.log('[WarRoom] Adat régi (>1 óra), automatikus sync indítása...');
      autoSyncRef.current = true;
      setAutoSyncTriggered(true);
      handleSync(true);
    }
  }, [status, syncing, handleSync]);
  
  // Admin MINDIG látja a sync gombot, még ha nincs status sem
  if (isAdmin) {
    return (
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            syncing 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
          }`}
          title="Admin: War Room Force Sync"
        >
          {syncing ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {autoSyncTriggered ? 'Auto sync...' : 'Sync...'}
            </span>
          ) : (
            '🔄 Force Sync'
          )}
        </button>
        <span className="text-xs text-slate-500">
          {status?.lastSyncFormatted ? `${status.recordCount} sor | ${status.lastSyncFormatted}` : 'Nincs adat'}
        </span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        {success && <span className="text-xs text-green-400">{success}</span>}
      </div>
    );
  }
  
  // Ha auto sync fut, mutassunk egy kis indikátort
  if (autoSyncTriggered && syncing) {
    return (
      <div className="rounded-lg px-4 py-3 flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30">
        <svg className="animate-spin w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-cyan-300">War Room szinkronizálás...</p>
          <p className="text-xs text-slate-400">Automatikus frissítés folyamatban</p>
        </div>
      </div>
    );
  }
  
  // Normál felhasználók: ne mutass semmit ha nincs status vagy minden rendben
  if (!status) return null;
  if (!alwaysShow && status.hasData && !status.isStale) return null;
  
  const isWarning = !status.hasData || status.isStale;
  
  return (
    <div className={`rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${
      isWarning 
        ? 'bg-amber-500/10 border border-amber-500/30' 
        : 'bg-slate-700/30 border border-slate-600/30'
    }`}>
      <div className="flex items-center gap-3">
        {isWarning ? (
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M5 13l4 4L19 7" />
          </svg>
        )}
        
        <div>
          <p className={`text-sm font-medium ${isWarning ? 'text-amber-300' : 'text-slate-300'}`}>
            {!status.hasData 
              ? 'War Room létszám nincs szinkronizálva'
              : status.isStale 
                ? 'War Room létszám régi (>1 óra)'
                : 'War Room szinkronizálva'
            }
          </p>
          <p className="text-xs text-slate-400">
            {status.lastSyncFormatted 
              ? `Utolsó: ${status.lastSyncFormatted} (${status.recordCount} sor)`
              : 'Még nem volt szinkronizálás'
            }
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
        {success && (
          <span className="text-xs text-green-400">{success}</span>
        )}
        
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            syncing 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {syncing ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sync...
            </span>
          ) : (
            'Szinkronizálás'
          )}
        </button>
      </div>
    </div>
  );
}
