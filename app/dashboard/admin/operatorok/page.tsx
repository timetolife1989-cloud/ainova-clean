'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import { 
  OperatorTable, 
  OperatorFilters, 
  OperatorModal,
  type Operator,
  type Pozicio 
} from '@/components/operatorok';

// =====================================================
// Fő komponens
// =====================================================
export default function OperatorokPage() {
  
  // State
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [muszak, setMuszak] = useState('');
  const [pozicio, setPozicio] = useState('');
  const [aktiv, setAktiv] = useState('1'); // Alapból csak aktívak
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  
  // Pozíciók lista
  const [poziciok, setPoziciok] = useState<Pozicio[]>([]);
  const [pozicioNames, setPozicioNames] = useState<string[]>([]);

  // =====================================================
  // Adatok betöltése
  // =====================================================
  const fetchOperators = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (search) params.set('search', search);
      if (muszak) params.set('muszak', muszak);
      if (pozicio) params.set('pozicio', pozicio);
      if (aktiv !== '') params.set('aktiv', aktiv);
      
      const res = await fetch(`/api/operatorok?${params}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Hiba az operátorok betöltésekor');
      }
      
      // Biztonsági ellenőrzés
      if (!data.data || !Array.isArray(data.data)) {
        console.error('API response:', data);
        throw new Error('Hibás API válasz formátum');
      }
      
      setOperators(data.data);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, muszak, pozicio, aktiv]);

  const fetchPoziciok = useCallback(async () => {
    try {
      // Operátoroknál kihagyjuk a Vezetői kategóriát (azok Users-ben vannak)
      const res = await fetch('/api/poziciok?kihagyKategoria=Vezetői');
      if (!res.ok) return;
      
      const data = await res.json();
      setPoziciok(data.data || []);
      setPozicioNames((data.data || []).map((p: Pozicio) => p.nev));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  useEffect(() => {
    fetchPoziciok();
  }, [fetchPoziciok]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // =====================================================
  // Handlers
  // =====================================================
  const handleEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/operatorok/${id}`);
      if (!res.ok) throw new Error('Hiba az operátor betöltésekor');
      
      const data = await res.json();
      setSelectedOperator(data.data);
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    }
  };

  const handleToggleActive = async (id: number, active: boolean) => {
    try {
      // First get the operator data
      const getRes = await fetch(`/api/operatorok/${id}`);
      if (!getRes.ok) throw new Error('Hiba');
      const getData = await getRes.json();
      
      // Update with new active state
      const res = await fetch(`/api/operatorok/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getData.data, aktiv: active }),
      });
      
      if (!res.ok) throw new Error('Hiba a státusz módosításakor');
      
      fetchOperators();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    }
  };

  const handleSave = async (data: Partial<Operator>) => {
    const method = selectedOperator ? 'PUT' : 'POST';
    const url = selectedOperator 
      ? `/api/operatorok/${selectedOperator.id}` 
      : '/api/operatorok';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Hiba a mentéskor');
    }
    
    // Sikeres mentés popup
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    
    fetchOperators();
  };

  const handleNewOperator = () => {
    setSelectedOperator(null);
    setModalOpen(true);
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      <Header pageTitle="OPERÁTOROK" showBackButton />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6"
        >
          {/* Fejléc */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Operátorok</h2>
              <p className="text-gray-400 text-sm mt-1">
                Összesen: {total} operátor
              </p>
            </div>
            <button
              onClick={handleNewOperator}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Új operátor
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Filters */}
          <OperatorFilters
            search={search}
            onSearchChange={setSearch}
            muszak={muszak}
            onMuszakChange={(v) => { setMuszak(v); setPage(1); }}
            pozicio={pozicio}
            onPozicioChange={(v) => { setPozicio(v); setPage(1); }}
            aktiv={aktiv}
            onAktivChange={(v) => { setAktiv(v); setPage(1); }}
            poziciok={pozicioNames}
          />

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <OperatorTable
              operators={operators}
              onEdit={handleEdit}
              onToggleActive={handleToggleActive}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="px-4 py-2 text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* Modal */}
      <OperatorModal
        operator={selectedOperator}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        poziciok={poziciok}
      />

      {/* Toast: Sikeres mentés */}
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.5s_ease-out]">
          <div className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.5)] border border-emerald-300/30">
            <span className="text-4xl animate-bounce">✅</span>
            <div>
              <p className="text-xl font-bold">Mentés sikeres!</p>
              <p className="text-sm text-emerald-100 opacity-90">Operátor adatai frissítve</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
