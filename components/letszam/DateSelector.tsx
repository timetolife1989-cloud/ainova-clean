'use client';
import { motion } from 'framer-motion';

interface DateSelectorProps {
  selected: Date;
  onChange: (date: Date) => void;
}

export default function DateSelector({ selected, onChange }: DateSelectorProps) {
  // Format date to YYYY-MM-DD for input
  const formatForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Format date to Hungarian format for display
  const formatHungarian = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.toLocaleString('hu-HU', { month: 'long' });
    const day = date.getDate();
    return `${year}. ${month} ${day}.`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + 'T00:00:00');
    onChange(newDate);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm font-medium">📅 Dátum:</span>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative"
      >
        <input
          type="date"
          value={formatForInput(selected)}
          onChange={handleChange}
          className="
            px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-all duration-200 cursor-pointer
            hover:bg-slate-700
          "
        />
        <div className="absolute -bottom-6 left-0 text-xs text-slate-400">
          {formatHungarian(selected)}
        </div>
      </motion.div>
    </div>
  );
}
