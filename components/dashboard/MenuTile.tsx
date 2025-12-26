'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface MenuTileProps {
  icon: string; // Emoji (e.g., "👷")
  title: string;
  description: string;
  href: string;
  variant?: 'default' | 'admin'; // Optional, for purple Admin styling
}

export default function MenuTile({ 
  icon, 
  title, 
  description, 
  href, 
  variant = 'default' 
}: MenuTileProps) {
  const router = useRouter();

  // Determine colors based on variant
  const borderHoverColor = variant === 'admin' ? 'border-purple-600' : 'border-blue-600';
  const shadowHoverColor = variant === 'admin' ? 'shadow-purple-900/50' : 'shadow-blue-900/50';
  const arrowColor = variant === 'admin' ? 'text-purple-400' : 'text-blue-400';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => router.push(href)}
      className={`
        relative
        bg-gray-900/50 backdrop-blur-md
        border border-gray-800
        rounded-xl
        p-6
        shadow-lg
        cursor-pointer
        transition-all duration-300
        hover:${borderHoverColor}
        hover:shadow-2xl
        hover:${shadowHoverColor}
      `}
    >
      {/* Icon - top-left corner */}
      <div className="text-5xl opacity-90 mb-4">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-400">
        {description}
      </p>

      {/* Arrow - bottom-right corner */}
      <motion.div
        className={`absolute bottom-6 right-6 text-2xl ${arrowColor} transition-transform duration-300`}
        whileHover={{ x: 4 }}
      >
        →
      </motion.div>
    </motion.div>
  );
}
