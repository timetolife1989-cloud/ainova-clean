'use client';
import { motion } from 'framer-motion';

interface MuszakSelectorProps {
  selected: 'A' | 'B' | 'C';
  onChange: (muszak: 'A' | 'B' | 'C') => void;
}

export default function MuszakSelector({ selected, onChange }: MuszakSelectorProps) {
  const muszakok = [
    { id: 'A' as const, label: 'A Műszak', icon: '🌅', description: 'Reggel' },
    { id: 'B' as const, label: 'B Műszak', icon: '🌆', description: 'Délután' },
    { id: 'C' as const, label: 'C Műszak', icon: '🌙', description: 'Éjszaka' },
  ];

  return (
    <div className="flex gap-3">
      {muszakok.map((muszak) => {
        const isActive = selected === muszak.id;
        return (
          <motion.button
            key={muszak.id}
            onClick={() => onChange(muszak.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-6 py-3 rounded-lg font-semibold transition-all duration-200
              ${isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{muszak.icon}</span>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold">{muszak.id}</span>
                <span className="text-xs opacity-80">{muszak.description}</span>
              </div>
            </div>
            
            {isActive && (
              <motion.div
                layoutId="active-muszak"
                className="absolute inset-0 border-2 border-blue-400 rounded-lg"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
