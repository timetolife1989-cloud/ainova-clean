'use client';
import type { LetszamRow } from './types';

interface LetszamSummaryProps {
  data: LetszamRow[];
  isOperativ: boolean;
  summary?: {
    osszesen_megjelent: number;
    osszesen_tappenz:  number;
    osszesen_szabadsag: number;
    brutto_osszesen: number;
    hianyzas_percent_atlag: number;
    leadasi_cel_perc: number | null;
  };
}

export default function LetszamSummary({ data, isOperativ, summary }: LetszamSummaryProps) {
  // Ha nincs backend summary → "Nincs adat" üzenet
  if (!summary) {
    return (
      <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
        <p className="text-slate-400 text-center">
          📊 Összesítés mentés után jelenik meg
        </p>
      </div>
    );
  }

  // Van backend summary → Csak backend adatok megjelenítése
  const {
    brutto_osszesen,
    osszesen_megjelent,
    osszesen_tappenz,
    osszesen_szabadsag,
    hianyzas_percent_atlag,
    leadasi_cel_perc
  } = summary;

  const osszTavol = osszesen_tappenz + osszesen_szabadsag;
  const tappenzPercent = brutto_osszesen > 0 ? (osszesen_tappenz / brutto_osszesen) * 100 : 0;
  const szabadsagPercent = brutto_osszesen > 0 ? (osszesen_szabadsag / brutto_osszesen) * 100 : 0;

  return (
    <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">
        📊 Összesítés {isOperativ ? '(operatív)' : '(nem operatív)'}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-400">Bruttó létszám:</span>
          <span className="text-xl font-bold text-white">{brutto_osszesen} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó létszám:</span>
          <span className="text-xl font-bold text-green-400">{osszesen_megjelent} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó táppénz:</span>
          <span className="text-xl font-bold text-orange-400">{osszesen_tappenz} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó szabadság:</span>
          <span className="text-xl font-bold text-purple-400">{osszesen_szabadsag} fő</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4 pt-4 border-t border-slate-700">
        <div className="flex flex-col">
          <span className="text-slate-400">Összes távollét:</span>
          <span className="text-xl font-bold text-red-400">{osszTavol} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Táppénz %:</span>
          <span className="text-xl font-bold text-orange-400">{tappenzPercent.toFixed(1)}%</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Szabadság %:</span>
          <span className="text-xl font-bold text-purple-400">{szabadsagPercent.toFixed(1)}%</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Összes hiányzás %:</span>
          <span className="text-xl font-bold text-red-400">{hianyzas_percent_atlag.toFixed(1)}%</span>
        </div>
      </div>

      {isOperativ && leadasi_cel_perc !== null && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-3 p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <span className="text-2xl">🎯</span>
            <div className="flex flex-col">
              <span className="text-slate-400 text-sm">Létszám szerinti leadási cél:</span>
              <span className="text-2xl font-bold text-blue-400">
                {leadasi_cel_perc.toLocaleString('hu-HU')} perc
              </span>
              <span className="text-xs text-slate-500">
                ({osszesen_megjelent} fő × 480 perc)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}