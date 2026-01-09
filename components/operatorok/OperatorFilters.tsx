'use client';

// =====================================================
// Props
// =====================================================
interface OperatorFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  muszak: string;
  onMuszakChange: (value: string) => void;
  pozicio: string;
  onPozicioChange: (value: string) => void;
  aktiv: string;
  onAktivChange: (value: string) => void;
  poziciok: string[];
}

// =====================================================
// Komponens
// =====================================================
export function OperatorFilters({
  search,
  onSearchChange,
  muszak,
  onMuszakChange,
  pozicio,
  onPozicioChange,
  aktiv,
  onAktivChange,
  poziciok,
}: OperatorFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Keresés */}
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Keresés törzsszám vagy név..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Műszak filter */}
      <select
        value={muszak}
        onChange={(e) => onMuszakChange(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white min-w-[120px]"
      >
        <option value="" className="bg-slate-800">Összes műszak</option>
        <option value="A" className="bg-slate-800">A műszak</option>
        <option value="B" className="bg-slate-800">B műszak</option>
        <option value="C" className="bg-slate-800">C műszak</option>
      </select>

      {/* Pozíció filter */}
      <select
        value={pozicio}
        onChange={(e) => onPozicioChange(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white min-w-[180px]"
      >
        <option value="" className="bg-slate-800">Összes pozíció</option>
        {poziciok.map((p) => (
          <option key={p} value={p} className="bg-slate-800">{p}</option>
        ))}
      </select>

      {/* Státusz filter */}
      <select
        value={aktiv}
        onChange={(e) => onAktivChange(e.target.value)}
        className="px-4 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:border-cyan-500 focus:outline-none text-white min-w-[140px]"
      >
        <option value="" className="bg-slate-800">Mind</option>
        <option value="1" className="bg-slate-800">Aktív</option>
        <option value="0" className="bg-slate-800">Inaktív</option>
      </select>
    </div>
  );
}
