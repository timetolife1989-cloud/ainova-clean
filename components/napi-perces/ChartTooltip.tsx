// =====================================================
// AINOVA - Chart Tooltip komponens
// =====================================================

import { NapiData } from './types';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NapiData }>;
  label?: string;
}

export default function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="text-white font-bold mb-2 text-sm">{label}</p>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between border-b border-slate-600 pb-2">
          <span className="text-green-400">Cél:</span>
          <span className="text-white font-semibold">{data.cel_perc?.toLocaleString()} perc</span>
        </div>
        
        <div className="space-y-1">
          <p className="text-blue-400 font-medium">Leadás részletesen:</p>
          <div className="flex justify-between">
            <span className="text-blue-300">Siemens DC:</span>
            <span className="text-white">{data.leadott_siemens_dc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-300">No Siemens:</span>
            <span className="text-white">{data.leadott_no_siemens?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-teal-300">Kaco:</span>
            <span className="text-white">{data.leadott_kaco?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
            <span className="text-cyan-400 font-semibold">Összesen:</span>
            <span className="text-cyan-400 font-bold">{data.leadott_ossz?.toLocaleString()} perc</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Teljesítmény:</span>
            <span className={`font-bold ${data.leadas_szazalek >= 100 ? 'text-green-400' : data.leadas_szazalek >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {data.leadas_szazalek?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
