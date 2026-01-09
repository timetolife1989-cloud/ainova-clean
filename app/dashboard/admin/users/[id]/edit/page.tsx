'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import type { User, UpdateUserPayload, ApiResponse, UserRole, Shift } from '@/lib/types/admin';
import { POSITIONS, SHIFTS } from '@/lib/constants';
import { validateUpdateUser } from '@/lib/validators/user';

// =====================================================
// Props és Route context
// =====================================================
interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

// =====================================================
// Fő komponens
// =====================================================
export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  
  // State
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Orvosi bejegyzések state (per-pozíció) - valódi API-ból
  interface OrvosiBejegyzes {
    id?: number;
    pozicio_id?: number;
    pozicio_nev?: string;
    pozicio: string;
    kezdete: string;
    lejarat: string;
    status?: string;
  }
  const [orvosik, setOrvosik] = useState<OrvosiBejegyzes[]>([]);
  const [newOrvosi, setNewOrvosi] = useState<OrvosiBejegyzes>({ pozicio: '', kezdete: '', lejarat: '' });
  const [orvosiLoading, setOrvosiLoading] = useState(false);
  const [poziciok, setPoziciok] = useState<{ id: number; nev: string }[]>([]);

  // Form state
  const [formData, setFormData] = useState<UpdateUserPayload>({
    username: '',
    name: '',
    role: 'Operátor' as UserRole,
    shift: null as Shift,
    email: '',
    telefon: '',
    jogsi_gyalog_targonca: false,
    jogsi_forgo_daru: false,
    jogsi_futo_daru: false,
    jogsi_newton_emelo: false,
    orvosi_kezdete: '',
    orvosi_lejarat: '',
    orvosi_poziciok: '',
    isActive: true,
  });

  const [originalData, setOriginalData] = useState<UpdateUserPayload | null>(null);

  // =====================================================
  // Params unwrap és adatok betöltése
  // =====================================================
  useEffect(() => {
    params.then(({ id }) => {
      const numId = parseInt(id);
      if (isNaN(numId)) {
        setError('Érvénytelen felhasználó azonosító');
        setLoading(false);
        return;
      }
      setUserId(numId);
    });
  }, [params]);

  const fetchUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Párhuzamosan lekérjük a user adatokat és a pozíciókat
      const [userRes, poziciokRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch('/api/poziciok')
      ]);
      
      const data: ApiResponse<User> = await userRes.json();
      const poziciokData = await poziciokRes.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Felhasználó nem található');
      }

      const user = data.data;
      const userData: UpdateUserPayload = {
        username: user.username,
        name: user.fullName,
        role: user.role,
        shift: user.shift,
        email: user.email || '',
        telefon: user.telefon || '',
        jogsi_gyalog_targonca: user.jogsi_gyalog_targonca || false,
        jogsi_forgo_daru: user.jogsi_forgo_daru || false,
        jogsi_futo_daru: user.jogsi_futo_daru || false,
        jogsi_newton_emelo: user.jogsi_newton_emelo || false,
        orvosi_kezdete: user.orvosi_kezdete || '',
        orvosi_lejarat: user.orvosi_lejarat || '',
        orvosi_poziciok: user.orvosi_poziciok || '',
        isActive: user.isActive,
      };

      setFormData(userData);
      setOriginalData(userData);
      
      // Pozíciók beállítása
      if (poziciokData.success && poziciokData.data) {
        setPoziciok(poziciokData.data);
      }
      
      // Orvosi bejegyzések lekérése a dedikált API-ból
      await fetchOrvosik();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Orvosi bejegyzések lekérése az API-ból
  const fetchOrvosik = useCallback(async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/orvosi`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setOrvosik(data.data.map((o: { id: number; pozicio_id: number; pozicio_nev: string; kezdete: string; lejarat: string; status: string }) => ({
          id: o.id,
          pozicio_id: o.pozicio_id,
          pozicio_nev: o.pozicio_nev,
          pozicio: o.pozicio_nev,
          kezdete: o.kezdete?.split('T')[0] || '',
          lejarat: o.lejarat?.split('T')[0] || '',
          status: o.status
        })));
      }
    } catch (err) {
      console.error('Orvosi bejegyzések lekérése sikertelen:', err);
      // Nem kritikus hiba - üres lista marad
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  // =====================================================
  // Form kezelés
  // =====================================================
  const handleChange = (field: keyof UpdateUserPayload, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validációs hiba törlése a mezőhöz
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Orvosi bejegyzés hozzáadása API-n keresztül
  const handleAddOrvosi = async () => {
    if (!newOrvosi.pozicio || !newOrvosi.kezdete || !newOrvosi.lejarat || !userId) return;
    
    // Pozíció ID megkeresése
    const selectedPoz = poziciok.find(p => p.nev === newOrvosi.pozicio);
    if (!selectedPoz) {
      setError('Érvénytelen pozíció');
      return;
    }
    
    try {
      setOrvosiLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/orvosi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pozicio_id: selectedPoz.id,
          kezdete: newOrvosi.kezdete,
          lejarat: newOrvosi.lejarat
        })
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Hiba az orvosi hozzáadásakor');
      }
      
      // Frissítjük a listát és reseteljük az inputot
      await fetchOrvosik();
      setNewOrvosi({ pozicio: '', kezdete: '', lejarat: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba az orvosi mentésekor');
    } finally {
      setOrvosiLoading(false);
    }
  };

  // Orvosi bejegyzés törlése API-n keresztül
  const handleDeleteOrvosi = async (orvosiId: number) => {
    if (!userId || !orvosiId) return;
    
    try {
      setOrvosiLoading(true);
      const res = await fetch(`/api/admin/users/${userId}/orvosi/${orvosiId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Hiba az orvosi törlésekor');
      }
      
      // Frissítjük a listát
      await fetchOrvosik();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba az orvosi törlésekor');
    } finally {
      setOrvosiLoading(false);
    }
  };

  // Változások ellenőrzése (orvosik is bele)
  const hasChanges = originalData && (
    JSON.stringify(formData) !== JSON.stringify(originalData) ||
    orvosik.length > 0
  );

  // =====================================================
  // Mentés
  // =====================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kliens oldali validáció
    const validation = validateUpdateUser(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    if (!userId) return;

    try {
      setSaving(true);
      setError(null);
      
      // Orvosi adatok mostmár a dedikált táblában vannak
      // A legközelebbi lejárat és legkorábbi kezdet szinkronizálása a user rekordba
      const legkozelebbiLejarat = orvosik.length > 0 
        ? orvosik.reduce((min, o) => o.lejarat < min ? o.lejarat : min, orvosik[0].lejarat)
        : '';
      const legkorabbiKezdete = orvosik.length > 0
        ? orvosik.reduce((min, o) => o.kezdete < min ? o.kezdete : min, orvosik[0].kezdete)
        : '';
      const pozicioNevek = orvosik.map(o => o.pozicio || o.pozicio_nev).filter(Boolean).join(', ');
      
      const dataToSend = {
        ...formData,
        orvosi_poziciok: pozicioNevek,
        orvosi_kezdete: legkorabbiKezdete,
        orvosi_lejarat: legkozelebbiLejarat,
      };

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data: ApiResponse = await res.json();

      if (!data.success) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }
        throw new Error(data.error || 'Hiba a mentéskor');
      }

      setShowSuccess(true);
      setOriginalData(formData);

      // 2 másodperc után visszanavigálás
      setTimeout(() => {
        router.push('/dashboard/admin/users');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <>
      <Header pageTitle="FELHASZNÁLÓ SZERKESZTÉSE" showBackButton={true} />

      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6 }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : error && !originalData ? (
              <div className="text-center py-20 text-red-400">
                <p className="text-lg mb-4">❌ {error}</p>
                <button
                  onClick={() => router.push('/dashboard/admin/users')}
                  className="text-blue-400 hover:underline"
                >
                  Vissza a listához
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Hibaüzenet */}
                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Törzsszám */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Törzsszám *
                  </label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      validationErrors.username ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="pl. EE1234"
                  />
                  {validationErrors.username && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.username}</p>
                  )}
                </div>

                {/* Teljes név */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Teljes név *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      validationErrors.name ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="Vezetéknév Keresztnév"
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
                  )}
                </div>

                {/* Pozíció és Műszak sor */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Pozíció */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Pozíció *
                    </label>
                    <select
                      value={formData.role || ''}
                      onChange={(e) => handleChange('role', e.target.value as UserRole)}
                      className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        validationErrors.role ? 'border-red-500' : 'border-slate-700'
                      }`}
                    >
                      {POSITIONS.map(pos => (
                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                      ))}
                    </select>
                    {validationErrors.role && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.role}</p>
                    )}
                  </div>

                  {/* Műszak */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Műszak
                    </label>
                    <select
                      value={formData.shift || ''}
                      onChange={(e) => handleChange('shift', e.target.value || null)}
                      className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        validationErrors.shift ? 'border-red-500' : 'border-slate-700'
                      }`}
                    >
                      {SHIFTS.map(shift => (
                        <option key={shift.value || 'null'} value={shift.value || ''}>{shift.label}</option>
                      ))}
                    </select>
                    {validationErrors.shift && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.shift}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email (opcionális)
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full bg-slate-900/50 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      validationErrors.email ? 'border-red-500' : 'border-slate-700'
                    }`}
                    placeholder="pelda@tdk-electronics.com"
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                  )}
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Telefon (opcionális)
                  </label>
                  <input
                    type="tel"
                    value={formData.telefon || '+36 '}
                    onChange={(e) => {
                      let val = e.target.value;
                      // Biztosítjuk hogy +36-tal kezdődik
                      if (!val.startsWith('+36')) {
                        val = '+36 ' + val.replace(/^\+?36\s*/, '');
                      }
                      // Csak számok és szóközök engedélyezettek a +36 után
                      const prefix = '+36 ';
                      const rest = val.slice(4).replace(/[^0-9\s]/g, '');
                      handleChange('telefon', prefix + rest);
                    }}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="+36 20 123 4567"
                  />
                  <p className="mt-1 text-xs text-gray-500">Formátum: +36 XX XXX XXXX</p>
                </div>

                {/* Jogosítványok szekció */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">🚜 Jogosítványok</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jogsi_gyalog_targonca || false}
                        onChange={(e) => handleChange('jogsi_gyalog_targonca', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Gyalog kíséretű targonca</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jogsi_forgo_daru || false}
                        onChange={(e) => handleChange('jogsi_forgo_daru', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Forgó daru</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jogsi_futo_daru || false}
                        onChange={(e) => handleChange('jogsi_futo_daru', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Futó daru</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.jogsi_newton_emelo || false}
                        onChange={(e) => handleChange('jogsi_newton_emelo', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Newton emelő</span>
                    </label>
                  </div>
                </div>

                {/* Orvosi alkalmasság szekció - per pozíció */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">🏥 Orvosi alkalmasság</h3>
                  
                  {/* Meglévő bejegyzések */}
                  {orvosik.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {orvosik.map((o) => {
                        const lejarat = new Date(o.lejarat);
                        const now = new Date();
                        const diff = (lejarat.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                        const status = diff < 0 ? 'lejart' : diff < 30 ? 'hamarosan' : 'aktiv';
                        
                        return (
                          <div
                            key={o.id || `${o.pozicio}-${o.lejarat}`}
                            className={`p-3 rounded-lg border flex justify-between items-center ${
                              status === 'lejart' 
                                ? 'bg-red-900/20 border-red-500/50' 
                                : status === 'hamarosan'
                                ? 'bg-yellow-900/20 border-yellow-500/50'
                                : 'bg-green-900/20 border-green-500/50'
                            }`}
                          >
                            <div>
                              <p className="font-medium text-white">{o.pozicio || o.pozicio_nev}</p>
                              <p className="text-sm text-gray-400">
                                {new Date(o.kezdete).toLocaleDateString('hu-HU')} - {new Date(o.lejarat).toLocaleDateString('hu-HU')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => o.id && handleDeleteOrvosi(o.id)}
                              disabled={orvosiLoading || !o.id}
                              className="p-1 hover:bg-white/10 rounded text-red-400 disabled:opacity-50"
                              title="Törlés"
                            >
                              🗑️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Új bejegyzés hozzáadása */}
                  <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-700">
                    <p className="text-sm text-gray-400 mb-3">Új orvosi bejegyzés hozzáadása:</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Pozíció *</label>
                        <select
                          value={newOrvosi.pozicio}
                          onChange={(e) => setNewOrvosi({ ...newOrvosi, pozicio: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          <option value="" className="bg-slate-800">Válassz...</option>
                          {poziciok.map(p => (
                            <option key={p.id} value={p.nev} className="bg-slate-800">{p.nev}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Kezdete *</label>
                        <input
                          type="date"
                          value={newOrvosi.kezdete}
                          onChange={(e) => setNewOrvosi({ ...newOrvosi, kezdete: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Lejárat *</label>
                        <input
                          type="date"
                          value={newOrvosi.lejarat}
                          onChange={(e) => setNewOrvosi({ ...newOrvosi, lejarat: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOrvosi}
                      disabled={!newOrvosi.pozicio || !newOrvosi.kezdete || !newOrvosi.lejarat || orvosiLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors flex items-center gap-2"
                    >
                      {orvosiLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Mentés...
                        </>
                      ) : (
                        '+ Hozzáadás'
                      )}
                    </button>
                  </div>
                </div>

                {/* Aktív státusz */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <span className="text-gray-300">Aktív felhasználó</span>
                </div>

                {/* Gombok */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/admin/users')}
                    className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg font-medium transition-colors"
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !hasChanges}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                        Mentés...
                      </>
                    ) : (
                      'Mentés'
                    )}
                  </button>
                </div>

                {!hasChanges && originalData && (
                  <p className="text-center text-sm text-gray-500">
                    Nincs módosítás a mentéshez
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </motion.main>

      {/* Toast: Sikeres mentés - lebegő üzenet */}
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.5s_ease-out]">
          <div className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.5)] border border-emerald-300/30">
            <span className="text-4xl animate-bounce">✅</span>
            <div>
              <p className="text-xl font-bold">Mentés sikeres!</p>
              <p className="text-sm text-emerald-100 opacity-90">Átirányítás a listához...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
