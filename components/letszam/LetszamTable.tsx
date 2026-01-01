'use client';
import { useRef, KeyboardEvent } from 'react';
import type { LetszamRow } from './types';

interface LetszamTableProps {
  title: string;
  positions:  string[];
  data: LetszamRow[];
  onChange:  (index: number, field: string, value: number) => void;
  isOperativ: boolean;
  criticalPositions?: string[];
}

export default function LetszamTable({
  title,
  data,
  onChange,
  criticalPositions = [],
}: LetszamTableProps) {
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleInputChange = (index: number, field: string, inputValue: string) => {
    const cleaned = inputValue.replace(/\D/g, '');
    const numValue = cleaned === '' ?  0 : parseInt(cleaned, 10);
    
    if (numValue >= 0 && numValue <= 999) {
      onChange(index, field, numValue);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0') {
      e.target.value = '';
    }
    e.target.select();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>, index: number, field: string) => {
    if (e. target.value === '') {
      e.target.value = '0';
      onChange(index, field, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e. key === 'Tab' && ! e.shiftKey) {
      const nextIndex = index + 1;
      if (nextIndex < data.length) {
        e.preventDefault();
        const nextInput = inputRefs.current[`megjelent-${nextIndex}`];
        if (nextInput) nextInput.focus();
      }
    } else if (e.key === 'Tab' && e. shiftKey) {
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        e.preventDefault();
        const prevInput = inputRefs.current[`megjelent-${prevIndex}`];
        if (prevInput) prevInput.focus();
      }
    }
  };

  const isCritical = (pozicio:  string) => criticalPositions. includes(pozicio);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full bg-slate-900/95 border border-slate-700 rounded-lg">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Pozíció</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Megjelent</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Táppénz</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Szabadság</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">Hiányzás %</th>
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ?  (
              data.map((row, index) => {
                const critical = isCritical(row.pozicio);
                return (
                  <tr
                    key={row.pozicio}
                    className={`border-b border-slate-800 hover:bg-slate-800 ${
                      critical ? 'border-l-4 border-l-yellow-500' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      <div className="flex items-center gap-2">
                        {row.pozicio}
                        {critical && (
                          <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                            ⚠️ KRITIKUS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        ref={(el) => { inputRefs.current[`megjelent-${index}`] = el; }}
                        type="text"
                        inputMode="numeric"
                        value={row.megjelent}
                        onChange={(e) => handleInputChange(index, 'megjelent', e.target. value)}
                        onFocus={handleInputFocus}
                        onBlur={(e) => handleInputBlur(e, index, 'megjelent')}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-20 px-3 py-2 text-center bg-slate-800 text-white rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row. tappenz}
                        onChange={(e) => handleInputChange(index, 'tappenz', e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={(e) => handleInputBlur(e, index, 'tappenz')}
                        className="w-20 px-3 py-2 text-center bg-slate-800 text-white rounded border border-slate-700 focus:outline-none focus: ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.szabadsag}
                        onChange={(e) => handleInputChange(index, 'szabadsag', e.target. value)}
                        onFocus={handleInputFocus}
                        onBlur={(e) => handleInputBlur(e, index, 'szabadsag')}
                        className="w-20 px-3 py-2 text-center bg-slate-800 text-white rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold">
                      <span className={row.hianyzasPercent > 0 ? 'text-red-400' : 'text-slate-500'}>
                        {row.hianyzasPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  ⏳ Adatok betöltése...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}