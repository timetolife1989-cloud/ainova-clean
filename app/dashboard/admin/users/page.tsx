'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/dashboard';
import type { UserListItem, PaginatedResponse } from '@/lib/types/admin';
import { POSITIONS, SHIFTS } from '@/lib/constants';

// =====================================================
// Típusok
// =====================================================
type SortField = 'username' | 'fullName' | 'role' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// =====================================================
// Segéd komponensek
// =====================================================
function Badge({ 
  children, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'purple' | 'blue' | 'green' | 'orange' | 'cyan' | 'indigo';
}) {
  const variants = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
    purple: 'bg-purple-900/50 text-purple-400',
    blue: 'bg-blue-900/50 text-blue-400',
    green: 'bg-green-900/50 text-green-400',
    orange: 'bg-orange-900/50 text-orange-400',
    cyan: 'bg-cyan-900/50 text-cyan-400',
    indigo: 'bg-indigo-900/50 text-indigo-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

function getRoleBadgeVariant(role: string): 'purple' | 'indigo' | 'blue' | 'cyan' | 'orange' | 'green' {
  const map: Record<string, 'purple' | 'indigo' | 'blue' | 'cyan' | 'orange' | 'green'> = {
    'Admin': 'purple',
    'Manager': 'indigo',
    'Műszakvezető': 'blue',
    'Műszakvezető helyettes': 'cyan',
    'NPI Technikus': 'orange',
    'Operátor': 'green',
  };
  return map[role] || 'default' as 'green';
}

function getShiftBadgeVariant(shift: string | null): 'blue' | 'green' | 'orange' | 'default' {
  const map: Record<string, 'blue' | 'green' | 'orange'> = {
    'A': 'blue',
    'B': 'green',
    'C': 'orange',
  };
  return shift ? (map[shift] || 'default' as 'blue') : 'default' as 'blue';
}

// =====================================================
// Fő komponens
// =====================================================
export default function UsersListPage() {
  const router = useRouter();
  
  // State
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Szűrők
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>(''); // '', 'true', 'false'
  
  // Rendezés
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Pagináció
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // =====================================================
  // Adatok lekérése
  // =====================================================
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (shiftFilter) params.append('shift', shiftFilter);
      if (activeFilter) params.append('isActive', activeFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      
      // Ellenőrizzük a HTTP státuszt
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Users] API error:', res.status, errorText);
        throw new Error(`HTTP ${res.status}: Hiba a felhasználók betöltésekor`);
      }
      
      const data: PaginatedResponse<UserListItem> = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Hiba a felhasználók betöltésekor');
      }

      setUsers(data.data);
      setTotalItems(data.pagination.totalItems);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, shiftFilter, activeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // =====================================================
  // Rendezés kezelés
  // =====================================================
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Kliens oldali rendezés
  const sortedUsers = [...users].sort((a, b) => {
    let aVal: string | number | null = a[sortField] as string | number | null;
    let bVal: string | number | null = b[sortField] as string | number | null;

    if (aVal === null) aVal = '';
    if (bVal === null) bVal = '';

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal, 'hu') 
        : bVal.localeCompare(aVal, 'hu');
    }

    return sortOrder === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  // =====================================================
  // Műveletek
  // =====================================================
  const handleEdit = (userId: number) => {
    router.push(`/dashboard/admin/users/${userId}/edit`);
  };

  const handleDeactivate = async (userId: number, username: string) => {
    if (!confirm(`Biztosan deaktiválod a(z) "${username}" felhasználót?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Hiba történt');
      }
    } catch {
      alert('Hiba a felhasználó deaktiválásakor');
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!confirm(`Visszaállítod a(z) "${username}" jelszavát alapértelmezettre?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToDefault: true }),
      });
      const data = await res.json();

      if (data.success) {
        alert('Jelszó visszaállítva! A felhasználónak be kell jelentkeznie és meg kell változtatnia.');
      } else {
        alert(data.error || 'Hiba történt');
      }
    } catch {
      alert('Hiba a jelszó visszaállításakor');
    }
  };

  // =====================================================
  // Szűrő reset
  // =====================================================
  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setShiftFilter('');
    setActiveFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || roleFilter || shiftFilter || activeFilter;

  // =====================================================
  // Render
  // =====================================================
  return (
    <>
      <Header pageTitle="FELHASZNÁLÓK" showBackButton={true} />

      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6 }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Toolbar */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-6 border border-slate-700/50">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              {/* Keresés és szűrők */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Keresés */}
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Törzsszám vagy név..."
                    className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                </div>

                {/* Pozíció filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Minden pozíció</option>
                  {POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </select>

                {/* Műszak filter */}
                <select
                  value={shiftFilter}
                  onChange={(e) => { setShiftFilter(e.target.value); setPage(1); }}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Minden műszak</option>
                  {SHIFTS.filter(s => s.value !== null).map(shift => (
                    <option key={shift.value} value={shift.value || ''}>{shift.label}</option>
                  ))}
                </select>

                {/* Aktív filter */}
                <select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                  className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Minden státusz</option>
                  <option value="true">Aktív</option>
                  <option value="false">Inaktív</option>
                </select>

                {/* Reset szűrők */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    ✕ Szűrők törlése
                  </button>
                )}
              </div>

              {/* Új felhasználó gomb */}
              <button
                onClick={() => router.push('/dashboard/admin/users/new')}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <span>➕</span>
                Új felhasználó
              </button>
            </div>

            {/* Összesítő */}
            <div className="mt-3 text-sm text-gray-400">
              Összesen: <span className="text-white font-medium">{totalItems}</span> felhasználó
              {hasActiveFilters && ' (szűrt lista)'}
            </div>
          </div>

          {/* Táblázat */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-red-400">
                <p className="text-lg mb-2">❌ {error}</p>
                <button onClick={fetchUsers} className="text-blue-400 hover:underline">
                  Újrapróbálás
                </button>
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg mb-2">📭 Nincs találat</p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-blue-400 hover:underline">
                    Szűrők törlése
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900/50 text-left text-sm text-gray-400">
                      <th 
                        className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('username')}
                      >
                        Törzsszám {sortField === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('fullName')}
                      >
                        Név {sortField === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                        onClick={() => handleSort('role')}
                      >
                        Pozíció {sortField === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3">Műszak</th>
                      <th className="px-4 py-3">Státusz</th>
                      <th className="px-4 py-3 text-right">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    <AnimatePresence>
                      {sortedUsers.map((user) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`hover:bg-slate-700/30 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}
                        >
                          <td className="px-4 py-3 font-mono text-white">
                            {user.username}
                          </td>
                          <td className="px-4 py-3 text-white">
                            {user.fullName}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {user.shift ? (
                              <Badge variant={getShiftBadgeVariant(user.shift)}>
                                {user.shift} műszak
                              </Badge>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={user.isActive ? 'success' : 'danger'}>
                              {user.isActive ? 'Aktív' : 'Inaktív'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(user.id)}
                                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Szerkesztés"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleResetPassword(user.id, user.username)}
                                className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                title="Jelszó visszaállítása"
                              >
                                🔑
                              </button>
                              <button
                                onClick={() => handleDeactivate(user.id, user.username)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Deaktiválás"
                                disabled={!user.isActive}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagináció */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
                <div className="text-sm text-gray-400">
                  Oldal {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    ← Előző
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Következő →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.main>
    </>
  );
}
