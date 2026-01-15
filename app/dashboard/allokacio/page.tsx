'use client';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { REFRESH_CONFIG } from '@/hooks';

interface NapiAdat {
  igeny: number;
  leadott: number;
  diff: number;
}

interface TipusAdat {
  tipus_kod: string;
  termek_tipus: string;
  norma_perc: number;
  napok: Record<string, NapiAdat>;
  heti_igeny: number;
  heti_leadott: number;
  heti_diff: number;
}

interface NapiOsszesito {
  igeny_perc: number;
  leadott_perc: number;
}

interface Osszesito {
  heti_igeny_perc: number;
  heti_leadott_perc: number;
  heti_diff_perc: number;
}

interface SapFolyamat {
  id: number;
  sap_nev: string;
  munkahely_kodok: string;
  oszlop_index: number;
}

export default function AllokacioPagе() {
  const [hetSzam, setHetSzam] = useState<number>(3); // CW03
  const [ev, setEv] = useState<number>(2026);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Adatok
  const [datumok, setDatumok] = useState<string[]>([]);
  const [tipusok, setTipusok] = useState<TipusAdat[]>([]);
  const [osszesito, setOsszesito] = useState<Osszesito | null>(null);
  const [napiOsszesitok, setNapiOsszesitok] = useState<Record<string, NapiOsszesito>>({});
  const [kapacitasIgeny, setKapacitasIgeny] = useState<Record<string, Record<string, number>>>({});
  const [hetiKapacitas, setHetiKapacitas] = useState<Record<string, number>>({});
  
  // SAP folyamatok modal
  const [folyamatokData, setFolyamatokData] = useState<Record<string, SapFolyamat[]>>({});
  const [selectedKategoria, setSelectedKategoria] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Hét választó opciók (CW01-CW52)
  const hetekOptions = Array.from({ length: 52 }, (_, i) => i + 1);
  
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Napi terv adatok
      const res = await fetch(`/api/allokacio/napi-terv?het=${hetSzam}&ev=${ev}`);
      const data = await res.json();
      
      if (data.success) {
        setDatumok(data.data.datumok || []);
        setTipusok(data.data.tipusok || []);
        setOsszesito(data.data.osszesito);
        setNapiOsszesitok(data.data.napiOsszesitok || {});
        setKapacitasIgeny(data.data.kapacitasIgeny || {});
        setHetiKapacitas(data.data.hetiKapacitas || {});
      }
      
      // SAP folyamatok betöltése (csak egyszer)
      if (Object.keys(folyamatokData).length === 0) {
        const folyRes = await fetch('/api/allokacio/folyamatok');
        const folyData = await folyRes.json();
        if (folyData.success) {
          setFolyamatokData(folyData.data);
        }
      }
    } catch (error) {
      console.error('Adatok betöltése hiba:', error);
    }
    setLoading(false);
  };

  // Silent refresh - háttérben, loading nélkül
  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/allokacio/napi-terv?het=${hetSzam}&ev=${ev}`);
      const data = await res.json();
      
      if (data.success) {
        setDatumok(data.data.datumok || []);
        setTipusok(data.data.tipusok || []);
        setOsszesito(data.data.osszesito);
        setNapiOsszesitok(data.data.napiOsszesitok || {});
        setKapacitasIgeny(data.data.kapacitasIgeny || {});
        setHetiKapacitas(data.data.hetiKapacitas || {});
      }
    } catch {
      // Silent - nem mutatunk hibát
    }
  }, [hetSzam, ev]);
  
  // Kezdeti betöltés
  useEffect(() => {
    loadAllData();
  }, [hetSzam, ev]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatikus háttér frissítés + visibility/focus
  useEffect(() => {
    const interval = setInterval(silentRefresh, REFRESH_CONFIG.DEFAULT_INTERVAL);
    
    const handleFocus = () => silentRefresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [silentRefresh]);
  
  // Dátum formázása - 01.12 (H)
  const formatDatum = (dateStr: string) => {
    const d = new Date(dateStr);
    const napok = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const napNev = napok[d.getDay()];
    return `${month}.${day} (${napNev})`;
  };

  // Szétválasztás FIX és TEKERCS típusokra
  const fixTipusok = tipusok.filter(t => t.termek_tipus === 'FIX');
  const tekercsTipusok = tipusok.filter(t => t.termek_tipus === 'TEKERCS');
  
  // Kategória nevek magyarul (10 kategória)
  const KATEGORIA_NEVEK: Record<string, string> = {
    'meres': 'Mérés',
    'elokeszites': 'Előkészítés',
    'szereles': 'Szerelés',
    'vegszereles': 'Végszerelés',
    'impregnalas': 'Impregnálás',
    'tekercselés': 'Tekercselés',
    'csomagolas': 'Csomagolás',
    'filter': 'Filter',
    'maras_onozas': 'Marás-Ónozás',
    'awi_hegesztes': 'AWI Hegesztés',
    'el_tekercselés': 'Él Tekercselés'
  };
  
  // Személyi norma: 480 perc/fő/nap
  const SZEMELYI_NORMA = 480;
  
  // FIX táblázat (napi igény/leadott)
  const renderTable = (title: string, rows: TipusAdat[], bgColor: string) => {
    // Összesítő számítás PERCBEN (db × norma)
    const osszHetiIgenyPerc = rows.reduce((sum, r) => sum + (r.heti_igeny * (r.norma_perc || 0)), 0);
    const osszHetiLeadottPerc = rows.reduce((sum, r) => sum + (r.heti_leadott * (r.norma_perc || 0)), 0);
    const napiOsszPerc: Record<string, { igeny: number; leadott: number }> = {};
    datumok.forEach(d => {
      napiOsszPerc[d] = { igeny: 0, leadott: 0 };
      rows.forEach(r => {
        const nap = r.napok[d] || { igeny: 0, leadott: 0 };
        const norma = r.norma_perc || 0;
        napiOsszPerc[d].igeny += nap.igeny * norma;
        napiOsszPerc[d].leadott += nap.leadott * norma;
      });
    });
    
    return (
    <div className="mb-6">
      <div className={`px-4 py-2 ${bgColor} border-b border-gray-700`}>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-2 py-2 text-left text-gray-300 border-r border-gray-700">Típus</th>
              <th className="px-2 py-2 text-center text-gray-300 border-r border-gray-700">Norma</th>
              {datumok.map((d) => (
                <th key={d} className="px-1 py-1 text-center text-tdk-accent border-r border-gray-700" colSpan={2}>
                  {formatDatum(d)}
                </th>
              ))}
              <th className="px-2 py-1 text-center text-tdk-accent font-bold" colSpan={2}>Σ HETI</th>
            </tr>
            <tr className="bg-gray-900">
              <th colSpan={2}></th>
              {datumok.map((d) => (
                <React.Fragment key={d + '-sub'}>
                  <th className="px-1 py-1 text-center text-blue-400 text-xs border-r border-gray-600">Igény</th>
                  <th className="px-1 py-1 text-center text-green-400 text-xs border-r border-gray-700">Lead</th>
                </React.Fragment>
              ))}
              <th className="px-1 py-1 text-center text-blue-400 text-xs border-r border-gray-600">Igény</th>
              <th className="px-1 py-1 text-center text-green-400 text-xs">Lead</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rows.map((sor, idx) => (
              <tr key={idx} className="hover:bg-gray-800/50">
                <td className="px-2 py-1 border-r border-gray-700">
                  <span className="font-mono text-white text-xs">{sor.tipus_kod}</span>
                </td>
                <td className="px-2 py-1 text-center text-gray-400 border-r border-gray-700 text-xs">
                  {sor.norma_perc?.toFixed(1) || '-'}
                </td>
                {datumok.map((d) => {
                  const nap = sor.napok[d] || { igeny: 0, leadott: 0 };
                  return (
                    <React.Fragment key={d}>
                      <td className="px-1 py-1 text-center text-white border-r border-gray-600 text-xs">
                        {nap.igeny || '-'}
                      </td>
                      <td className={`px-1 py-1 text-center border-r border-gray-700 text-xs ${nap.leadott > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {nap.leadott || '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="px-2 py-1 text-center text-blue-400 font-bold border-r border-gray-600 text-xs">
                  {sor.heti_igeny}
                </td>
                <td className={`px-2 py-1 text-center font-bold text-xs ${sor.heti_leadott > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {sor.heti_leadott || '-'}
                </td>
              </tr>
            ))}
            {/* ÖSSZESÍTŐ SOR - PERCBEN */}
            <tr className="bg-gray-900 border-t-2 border-tdk-accent">
              <td className="px-2 py-2 border-r border-gray-700 font-bold text-tdk-accent">Σ PERC</td>
              <td className="px-2 py-2 text-center text-gray-400 border-r border-gray-700">-</td>
              {datumok.map((d) => (
                <React.Fragment key={d + '-sum'}>
                  <td className="px-1 py-2 text-center text-blue-400 font-bold border-r border-gray-600 text-xs">{Math.round(napiOsszPerc[d].igeny)}</td>
                  <td className="px-1 py-2 text-center text-green-400 font-bold border-r border-gray-700 text-xs">{Math.round(napiOsszPerc[d].leadott) || '-'}</td>
                </React.Fragment>
              ))}
              <td className="px-2 py-2 text-center text-blue-400 font-bold border-r border-gray-600">{Math.round(osszHetiIgenyPerc)}</td>
              <td className="px-2 py-2 text-center text-green-400 font-bold">{Math.round(osszHetiLeadottPerc) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )};
  
  
  // TEKERCS táblázat (heti igény egyben, napi leadott külön)
  const renderTekercsTable = (title: string, rows: TipusAdat[], bgColor: string) => {
    const napNevek = ['H', 'K', 'Sze', 'Cs', 'P'];
    
    // Összesítők
    const osszHetiIgeny = rows.reduce((sum, r) => sum + r.heti_igeny, 0);
    const osszHetiLeadott = rows.reduce((sum, r) => sum + r.heti_leadott, 0);
    const osszHatra = osszHetiIgeny - osszHetiLeadott;
    const napiLeadottOssz: Record<string, number> = {};
    datumok.forEach(d => {
      napiLeadottOssz[d] = rows.reduce((sum, r) => sum + (r.napok[d]?.leadott || 0), 0);
    });
    
    return (
      <div className="mb-6">
        <div className={`px-4 py-2 ${bgColor} border-b border-gray-700`}>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-2 py-2 text-left text-gray-300 border-r border-gray-700">Típus</th>
                {datumok.map((d, i) => (
                  <th key={d} className="px-2 py-2 text-center text-green-400 border-r border-gray-700">
                    {napNevek[i]} leadott
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-blue-400 border-r border-gray-700 font-bold">Heti Igény</th>
                <th className="px-2 py-2 text-center text-green-400 border-r border-gray-700">Σ Leadott</th>
                <th className="px-2 py-2 text-center text-orange-400">Hátra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {rows.map((sor, idx) => {
                const hatra = sor.heti_igeny - sor.heti_leadott;
                return (
                  <tr key={idx} className="hover:bg-gray-800/50">
                    <td className="px-2 py-1 border-r border-gray-700">
                      <span className="font-mono text-white text-xs">{sor.tipus_kod}</span>
                    </td>
                    {datumok.map((d) => {
                      const nap = sor.napok[d] || { leadott: 0 };
                      return (
                        <td key={d} className={`px-2 py-1 text-center border-r border-gray-700 text-xs ${nap.leadott > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          {nap.leadott || '-'}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center text-blue-400 font-bold border-r border-gray-700">
                      {sor.heti_igeny}
                    </td>
                    <td className={`px-2 py-1 text-center border-r border-gray-700 font-bold ${sor.heti_leadott > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                      {sor.heti_leadott || '-'}
                    </td>
                    <td className={`px-2 py-1 text-center font-bold ${hatra > 0 ? 'text-orange-400' : hatra < 0 ? 'text-purple-400' : 'text-green-400'}`}>
                      {hatra > 0 ? hatra : hatra === 0 ? '✓' : `+${Math.abs(hatra)}`}
                    </td>
                  </tr>
                );
              })}
              {/* ÖSSZESÍTŐ SOR */}
              <tr className="bg-gray-900 border-t-2 border-purple-500">
                <td className="px-2 py-2 border-r border-gray-700 font-bold text-purple-400">ÖSSZESEN</td>
                {datumok.map((d) => (
                  <td key={d + '-sum'} className="px-2 py-2 text-center text-green-400 font-bold border-r border-gray-700">
                    {napiLeadottOssz[d] || '-'}
                  </td>
                ))}
                <td className="px-2 py-2 text-center text-blue-400 font-bold border-r border-gray-700">{osszHetiIgeny}</td>
                <td className="px-2 py-2 text-center text-green-400 font-bold border-r border-gray-700">{osszHetiLeadott || '-'}</td>
                <td className={`px-2 py-2 text-center font-bold ${osszHatra > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {osszHatra > 0 ? osszHatra : '✓'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header pageTitle="ALLOKÁCIÓS TÁBLÁZAT" showBackButton={true} />
      
      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pt-[100px] px-8 py-6"
      >
        {/* Vezérlő sáv */}
        <div className="flex flex-wrap gap-4 mb-6 items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700">
          {/* Hét választó */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Hét:</span>
            <select 
              value={hetSzam}
              onChange={(e) => setHetSzam(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            >
              {hetekOptions.map(h => (
                <option key={h} value={h}>CW{h.toString().padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          
          {/* Év választó */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Év:</span>
            <select 
              value={ev}
              onChange={(e) => setEv(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          
          {/* Frissítés gomb */}
          <button 
            onClick={async () => {
              setSyncing(true);
              setSyncMessage(null);
              try {
                const res = await fetch('/api/allokacio/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ het: hetSzam, ev })
                });
                const data = await res.json();
                if (data.success) {
                  setSyncMessage('✅ Frissítés sikeres!');
                  setTimeout(() => {
                    loadAllData();
                    setSyncMessage(null);
                  }, 1500);
                } else {
                  setSyncMessage(`❌ Hiba: ${data.error}`);
                }
              } catch (error) {
                setSyncMessage(`❌ Hiba: ${error instanceof Error ? error.message : 'Ismeretlen'}`);
              }
              setSyncing(false);
            }}
            disabled={syncing || loading}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
          >
            {syncing ? '⏳ Szinkron...' : loading ? '⏳ Töltés...' : '🔄 Frissítés'}
          </button>
          
          {loading && (
            <div className="ml-auto flex items-center gap-2 text-tdk-accent">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-tdk-accent"></div>
              <span>Adatok betöltése...</span>
            </div>
          )}
          
          {syncMessage && (
            <div className="ml-auto text-sm">{syncMessage}</div>
          )}
        </div>
        
        {/* =============================================== */}
        {/* KOMBINÁLT TÁBLÁZAT - IGÉNY ÉS LEADOTT EGYBEN */}
        {/* =============================================== */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-blue-500/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📅 Heti Terv & Teljesülés - CW{hetSzam.toString().padStart(2, '0')}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Napi igény és leadott darabszámok típusonként
            </p>
          </div>
          
          {tipusok.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="text-4xl mb-4">📭</p>
              <p>Nincs adat ehhez a héthez</p>
              <p className="text-sm mt-2">Kattints a Frissítés gombra az Excel importhoz</p>
            </div>
          ) : (
            <div className="p-4">
              {/* FIX táblázat (B típusok) */}
              {fixTipusok.length > 0 && renderTable('🔧 NAPI FIX (B típusok)', fixTipusok, 'bg-blue-900/30')}
              
              {/* TEKERCS táblázat (C típusok) */}
              {tekercsTipusok.length > 0 && renderTekercsTable('🔄 HETI FIX TEKERCS (C típusok)', tekercsTipusok, 'bg-purple-900/30')}
              
              {/* =============================================== */}
              {/* ÖSSZESÍTŐ SOR - PERC */}
              {/* =============================================== */}
              {osszesito && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-tdk-accent">
                  <h3 className="text-lg font-bold text-tdk-accent mb-3">📊 ÖSSZESÍTŐ (perc)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left px-2 py-1">Mutató</th>
                          {datumok.map(d => (
                            <th key={d} className="text-center px-2 py-1">{formatDatum(d)}</th>
                          ))}
                          <th className="text-center px-2 py-1 text-tdk-accent">Σ HETI</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-blue-400">
                          <td className="px-2 py-1 font-medium">Igény (perc)</td>
                          {datumok.map(d => (
                            <td key={d} className="text-center px-2 py-1">
                              {(napiOsszesitok[d]?.igeny_perc || 0).toFixed(0)}
                            </td>
                          ))}
                          <td className="text-center px-2 py-1 font-bold text-lg">
                            {osszesito.heti_igeny_perc.toFixed(0)}
                          </td>
                        </tr>
                        <tr className="text-green-400">
                          <td className="px-2 py-1 font-medium">Leadott (perc)</td>
                          {datumok.map(d => (
                            <td key={d} className="text-center px-2 py-1">
                              {(napiOsszesitok[d]?.leadott_perc || 0).toFixed(0)}
                            </td>
                          ))}
                          <td className="text-center px-2 py-1 font-bold text-lg">
                            {osszesito.heti_leadott_perc.toFixed(0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* =============================================== */}
              {/* KAPACITÁS IGÉNY - KATEGÓRIÁNKÉNT (perc / 480 = fő) */}
              {/* =============================================== */}
              {Object.keys(kapacitasIgeny).length > 0 && (
                <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-4 border border-orange-500">
                  <h3 className="text-lg font-bold text-orange-400 mb-3">
                    👷 KAPACITÁS IGÉNY (fő) - 480 perc/fő/nap
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-600">
                          <th className="text-left px-2 py-2">Kategória</th>
                          {datumok.map(d => (
                            <th key={d} className="text-center px-2 py-2">{formatDatum(d)}</th>
                          ))}
                          <th className="text-center px-2 py-2 text-orange-400">Σ HETI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {Object.entries(KATEGORIA_NEVEK).map(([kod, nev]) => {
                          const hetiPerc = hetiKapacitas[kod] || 0;
                          if (hetiPerc === 0) return null; // Ne mutassuk ha nincs igény
                          // API kategória kód mapping (nagybetűs, ékezet megtartva)
                          const apiKatKod = kod.toUpperCase();
                          const hasFolyamatok = folyamatokData[apiKatKod]?.length > 0;
                          return (
                            <tr key={kod} className="hover:bg-gray-800/50">
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => {
                                    if (hasFolyamatok) {
                                      setSelectedKategoria(apiKatKod);
                                      setShowModal(true);
                                    }
                                  }}
                                  className={`font-medium text-left ${hasFolyamatok ? 'text-cyan-400 hover:text-cyan-300 underline cursor-pointer' : 'text-white cursor-default'}`}
                                  title={hasFolyamatok ? 'Kattints az alfolyamatok megtekintéséhez' : ''}
                                >
                                  {nev} {hasFolyamatok && '▼'}
                                </button>
                              </td>
                              {datumok.map(d => {
                                const perc = kapacitasIgeny[d]?.[kod] || 0;
                                const fo = perc / SZEMELYI_NORMA;
                                return (
                                  <td key={d} className="text-center px-2 py-2">
                                    <span className="text-yellow-400 font-bold">{fo.toFixed(1)}</span>
                                    <span className="text-gray-500 text-xs ml-1">({perc.toFixed(0)}p)</span>
                                  </td>
                                );
                              })}
                              <td className="text-center px-2 py-2">
                                <span className="text-orange-400 font-bold text-lg">
                                  {(hetiPerc / SZEMELYI_NORMA).toFixed(1)}
                                </span>
                                <span className="text-gray-500 text-xs ml-1">fő</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-800 border-t-2 border-orange-500">
                        <tr>
                          <td className="px-2 py-2 font-bold text-orange-400">ÖSSZES</td>
                          {datumok.map(d => {
                            const osszPerc = Object.values(kapacitasIgeny[d] || {}).reduce((a, b) => a + b, 0);
                            const osszFo = osszPerc / SZEMELYI_NORMA;
                            return (
                              <td key={d} className="text-center px-2 py-2">
                                <span className="text-orange-400 font-bold">{osszFo.toFixed(1)}</span>
                                <span className="text-gray-500 text-xs ml-1">fő</span>
                              </td>
                            );
                          })}
                          <td className="text-center px-2 py-2">
                            <span className="text-red-400 font-bold text-xl">
                              {(Object.values(hetiKapacitas).reduce((a, b) => a + b, 0) / SZEMELYI_NORMA).toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-sm ml-1">fő/hét</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.main>
      
      {/* SAP FOLYAMATOK MODAL */}
      {showModal && selectedKategoria && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-cyan-400">
                📋 {KATEGORIA_NEVEK[selectedKategoria.toLowerCase()] || selectedKategoria} - Alfolyamatok
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {folyamatokData[selectedKategoria]?.map((f, idx) => (
                <div 
                  key={f.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-cyan-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-cyan-400 font-mono text-sm">#{f.oszlop_index}</span>
                      <span className="text-white ml-3 font-medium">{f.sap_nev}</span>
                    </div>
                    <span className="text-gray-500 text-xs bg-gray-700 px-2 py-1 rounded">
                      {f.munkahely_kodok || '-'}
                    </span>
                  </div>
                </div>
              ))}
              
              {(!folyamatokData[selectedKategoria] || folyamatokData[selectedKategoria].length === 0) && (
                <p className="text-gray-400 text-center py-4">Nincsenek alfolyamatok definiálva</p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
              <span className="text-gray-400">
                Összesen: <span className="text-cyan-400 font-bold">{folyamatokData[selectedKategoria]?.length || 0}</span> alfolyamat
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
