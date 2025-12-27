'use client';
import type { LetszamRow } from './types';

interface LetszamSummaryProps {
  data: LetszamRow[];
  isOperativ: boolean;
}

export default function LetszamSummary({ data, isOperativ }: LetszamSummaryProps) {
  // Calculate all summary values
  const brutto = data.reduce(
    (sum, row) => sum + row.megjelent + row.tappenz + row.szabadsag,
    0
  );

  const netto = data.reduce((sum, row) => sum + row.megjelent, 0);

  const nettoTappenz = data.reduce((sum, row) => sum + row.tappenz, 0);

  const nettoSzabadsag = data.reduce((sum, row) => sum + row.szabadsag, 0);

  const osszTavol = nettoTappenz + nettoSzabadsag;

  const tappenzPercent = brutto > 0 ? (nettoTappenz / brutto) * 100 : 0;
  const szabadsagPercent = brutto > 0 ? (nettoSzabadsag / brutto) * 100 : 0;
  const osszHianyzasPercent = brutto > 0 ? (osszTavol / brutto) * 100 : 0;

  const leadasiCel = isOperativ ? netto * 480 : null;

  return (
    <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">
        📊 Összesítés {isOperativ ? '(operatív)' : '(nem operatív)'}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-400">Bruttó létszám:</span>
          <span className="text-xl font-bold text-white">{brutto} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó létszám:</span>
          <span className="text-xl font-bold text-green-400">{netto} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó táppénz:</span>
          <span className="text-xl font-bold text-orange-400">{nettoTappenz} fő</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-slate-400">Nettó szabadság:</span>
          <span className="text-xl font-bold text-purple-400">{nettoSzabadsag} fő</span>
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
          <span className="text-xl font-bold text-red-400">{osszHianyzasPercent.toFixed(1)}%</span>
        </div>
      </div>

      {isOperativ && leadasiCel !== null && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-3 p-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
            <span className="text-2xl">🎯</span>
            <div className="flex flex-col">
              <span className="text-slate-400 text-sm">Létszám szerinti leadási cél:</span>
              <span className="text-2xl font-bold text-blue-400">
                {leadasiCel.toLocaleString('hu-HU')} perc
              </span>
              <span className="text-xs text-slate-500">
                ({netto} fő × 480 perc)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
