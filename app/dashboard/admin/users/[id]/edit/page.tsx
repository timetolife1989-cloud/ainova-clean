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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<UpdateUserPayload>({
    username: '',
    name: '',
    role: 'Operátor' as UserRole,
    shift: null as Shift,
    email: '',
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

      const res = await fetch(`/api/admin/users/${userId}`);
      const data: ApiResponse<User> = await res.json();

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
        isActive: user.isActive,
      };

      setFormData(userData);
      setOriginalData(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
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

  // Változások ellenőrzése
  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData);

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
      setSuccessMessage(null);

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await res.json();

      if (!data.success) {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }
        throw new Error(data.error || 'Hiba a mentéskor');
      }

      setSuccessMessage(data.message || 'Sikeresen mentve!');
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

                {/* Sikeres mentés */}
                {successMessage && (
                  <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
                    ✅ {successMessage}
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
    </>
  );
}
