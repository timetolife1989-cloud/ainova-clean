'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import AinovaLoader from '@/components/ui/AinovaLoader';

interface DailySummary {
  datum: string;
  muszak: string;
  prodMegjelent: number;
  prodTappenz: number;
  prodSzabadsag: number;
  prodBrutto: number;
  nemProdMegjelent: number;
  meoMegjelent: number;
  becsultLeadasPerc: number;
}

interface WeeklySummary {
  hetSzam: number;
  hetKezdes: string;
  hetVege: string;
  atlagProdLetszam: number;
  atlagMeoLetszam: number;
  meoNelkuliMuszakok: number;
  osszesMuszak: number;
}

export default function KimutatosPage() {
  const [period, setPeriod] = useState<'napi' | 'heti' | 'havi'>('napi');
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/kimutatas?period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setDailyData(result.data || []);
      } else {
        setError(result.error || 'Hiba történt az adatok lekérésekor');
      }
    } catch (err) {
      setError('Hálózati hiba');
    } finally {
      setLoading(false);
    }
  };

  // Összesített statisztikák
  const stats = {
    osszProdLetszam: dailyData.reduce((sum, d) => sum + d.prodMegjelent, 0),
    osszMeoLetszam: dailyData.reduce((sum, d) => sum + d.meoMegjelent, 0),
    atlagProdLetszam: dailyData.length > 0 
      ? Math.round(dailyData.reduce((sum, d) => sum + d.prodMegjelent, 0) / dailyData.length)
      : 0,
    meoNelkuliNapok: dailyData.filter(d => d.meoMegjelent === 0).length,
    osszBecsultLeadas: dailyData.reduce((sum, d) => sum + d.becsultLeadasPerc, 0),
  };

  const muszakNev = (m: string) => {
    switch(m) {
      case 'A': return 'Délelőtt';
      case 'B': return 'Délután';
      case 'C': return 'Éjszaka';
      default: return m;
    }
  };

  return (
    <>
      <Header pageTitle="KIMUTATÁS ADATOK" showBackButton={true} />

      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6 }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-6xl mx-auto">
          
          {/* Időszak választó */}
          <div className="mb-6 flex gap-2">
            {(['napi', 'heti', 'havi'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {p === 'napi' ? 'Napi' : p === 'heti' ? 'Heti' : 'Havi'}
              </button>
            ))}
          </div>

          {/* Összesítő kártyák */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Produktív létszám */}
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-500/30 rounded-xl p-4">
              <div className="text-blue-400 text-sm font-medium mb-1">Átlag produktív létszám</div>
              <div className="text-3xl font-bold text-white">{stats.atlagProdLetszam}</div>
              <div className="text-blue-300/60 text-xs mt-1">fő / műszak</div>
            </div>

            {/* Becsült leadás */}
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-500/30 rounded-xl p-4">
              <div className="text-green-400 text-sm font-medium mb-1">Becsült leadás</div>
              <div className="text-3xl font-bold text-white">
                {Math.round(stats.osszBecsultLeadas / 60).toLocaleString()}
              </div>
              <div className="text-green-300/60 text-xs mt-1">óra (össz. {period})</div>
            </div>

            {/* MEÓ nélküli műszakok */}
            <div className={`bg-gradient-to-br ${
              stats.meoNelkuliNapok > 0 
                ? 'from-red-900/50 to-red-800/30 border-red-500/30' 
                : 'from-emerald-900/50 to-emerald-800/30 border-emerald-500/30'
            } border rounded-xl p-4`}>
              <div className={`${stats.meoNelkuliNapok > 0 ? 'text-red-400' : 'text-emerald-400'} text-sm font-medium mb-1`}>
                MEÓ nélküli műszakok
              </div>
              <div className="text-3xl font-bold text-white">{stats.meoNelkuliNapok}</div>
              <div className={`${stats.meoNelkuliNapok > 0 ? 'text-red-300/60' : 'text-emerald-300/60'} text-xs mt-1`}>
                / {dailyData.length} műszak
              </div>
            </div>

            {/* MEÓ lefedettség */}
            <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-500/30 rounded-xl p-4">
              <div className="text-purple-400 text-sm font-medium mb-1">MEÓ lefedettség</div>
              <div className="text-3xl font-bold text-white">
                {dailyData.length > 0 
                  ? Math.round((1 - stats.meoNelkuliNapok / dailyData.length) * 100)
                  : 0}%
              </div>
              <div className="text-purple-300/60 text-xs mt-1">műszakok aránya</div>
            </div>
          </div>

          {/* Adatok táblázat */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Részletes adatok</h2>
            </div>
            
            {loading ? (
              <div className="p-8 flex justify-center">
                <AinovaLoader size="md" text="Adatok betöltése..." />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">
                <div className="text-4xl mb-2">❌</div>
                {error}
              </div>
            ) : dailyData.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                Nincs adat a kiválasztott időszakban
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Dátum</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Műszak</th>
                      <th className="px-4 py-3 text-right text-blue-400 font-medium">Prod. létszám</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">TP</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">Szab.</th>
                      <th className="px-4 py-3 text-right text-orange-400 font-medium">MEÓ</th>
                      <th className="px-4 py-3 text-right text-green-400 font-medium">Becsült leadás</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((row, idx) => (
                      <tr 
                        key={`${row.datum}-${row.muszak}`}
                        className={`border-t border-gray-800 ${
                          row.meoMegjelent === 0 ? 'bg-red-900/10' : ''
                        } hover:bg-gray-800/30`}
                      >
                        <td className="px-4 py-3 text-white">
                          {new Date(row.datum).toLocaleDateString('hu-HU')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.muszak === 'A' ? 'bg-blue-900/50 text-blue-300' :
                            row.muszak === 'B' ? 'bg-green-900/50 text-green-300' :
                            'bg-orange-900/50 text-orange-300'
                          }`}>
                            {muszakNev(row.muszak)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {row.prodMegjelent}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {row.prodTappenz}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {row.prodSzabadsag}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          row.meoMegjelent === 0 ? 'text-red-400' : 'text-orange-400'
                        }`}>
                          {row.meoMegjelent === 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <span>⚠️</span> 0
                            </span>
                          ) : row.meoMegjelent}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400">
                          {Math.round(row.becsultLeadasPerc / 60)} óra
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MEÓ hatás elemzés */}
          {!loading && dailyData.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MEÓ-val */}
              <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border border-emerald-500/30 rounded-xl p-6">
                <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                  <span>✅</span> Műszakok MEÓ-val
                </h3>
                {(() => {
                  const meoVal = dailyData.filter(d => d.meoMegjelent > 0);
                  const atlagLeadas = meoVal.length > 0
                    ? Math.round(meoVal.reduce((s, d) => s + d.becsultLeadasPerc, 0) / meoVal.length / 60)
                    : 0;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Műszakok száma:</span>
                        <span className="text-white font-medium">{meoVal.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Átlag becsült leadás:</span>
                        <span className="text-emerald-400 font-medium">{atlagLeadas} óra/műszak</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* MEÓ nélkül */}
              <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-500/30 rounded-xl p-6">
                <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                  <span>❌</span> Műszakok MEÓ nélkül
                </h3>
                {(() => {
                  const meoNelkul = dailyData.filter(d => d.meoMegjelent === 0);
                  const atlagLeadas = meoNelkul.length > 0
                    ? Math.round(meoNelkul.reduce((s, d) => s + d.becsultLeadasPerc, 0) / meoNelkul.length / 60)
                    : 0;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Műszakok száma:</span>
                        <span className="text-white font-medium">{meoNelkul.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Elveszett potenciál:</span>
                        <span className="text-red-400 font-medium">{atlagLeadas} óra/műszak</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-red-800/50 text-sm text-red-300/80">
                        ⚠️ MEÓ nélkül nincs leadás!
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </motion.main>
    </>
  );
}
