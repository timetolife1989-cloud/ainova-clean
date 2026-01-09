// =====================================================
// AINOVA - Kimutat Selector komponens
// =====================================================

import { KimutatType, KIMUTAT_LABELS } from './types';

interface KimutatSelectorProps {
  active: KimutatType;
  onSelect: (kimutat: KimutatType) => void;
  offset: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function KimutatSelector({
  active,
  onSelect,
  offset,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
}: KimutatSelectorProps) {
  const canGoBack = active !== 'havi' && totalItems > offset + pageSize;
  const canGoForward = active !== 'havi' && offset > 0;

  return (
    <div className="flex items-start gap-8 mb-4">
      {/* Left Section: Title and buttons */}
      <div className="flex-1">
        <div className="mb-2">
          <h2 className="text-lg font-bold text-white">Lehívás vs Leadás kimutatás</h2>
          <p className="text-xs text-slate-400">Napi cél, lehívott és leadott percek összehasonlítása</p>
        </div>
        <div className="flex items-center gap-2">
          {(['napi', 'heti', 'havi'] as const).map((k) => (
            <button
              key={k}
              onClick={() => onSelect(k)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active === k
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {KIMUTAT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Right Section: Navigation */}
      {active !== 'havi' && (
        <div className="flex items-center gap-2 pt-8">
          <button
            onClick={onPrevious}
            disabled={!canGoBack}
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Régebbi"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-slate-400 text-sm px-3">
            {Math.min(offset + pageSize, totalItems)} / {totalItems} {active === 'napi' ? 'nap' : 'hét'}
          </span>
          <button
            onClick={onNext}
            disabled={!canGoForward}
            className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Újabb"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
