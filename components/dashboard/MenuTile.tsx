'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface MenuTileProps {
  icon: string; // Emoji (e.g., "👷")
  title: string;
  description: string;
  href: string;
  variant?: 'default' | 'admin'; // Optional, for purple Admin styling
  onClick?: () => void; // Optional custom click handler
}

export default function MenuTile({ 
  icon, 
  title, 
  description, 
  href, 
  variant = 'default',
  onClick
}: MenuTileProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  // Determine colors based on variant
  const isAdmin = variant === 'admin';
  const baseClasses = "group relative overflow-hidden bg-gradient-to-br rounded-2xl shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl";
  const gradientClasses = isAdmin 
    ? "from-blue-950/95 via-purple-950/80 to-blue-950/95 hover:from-blue-900/95 hover:via-purple-900/85 hover:to-blue-900/95" 
    : "from-blue-950/95 via-blue-900/85 to-blue-950/95 hover:from-blue-900/95 hover:via-blue-800/90 hover:to-blue-900/95";
  const glowColor = 'shadow-blue-500/20';
  const arrowColor = 'text-white/70 group-hover:text-white';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`${baseClasses} ${gradientClasses} ${glowColor} border border-white/10`}
    >
      {/* Content wrapper - compact without icon */}
      <div className="relative flex items-center justify-between px-5 py-5 h-[88px]">
        {/* Text content */}
        <div className="flex-1 min-w-0 pr-4 flex flex-col justify-center">
          <h3 className="text-base font-bold text-white mb-1 tracking-wide line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-gray-300/80 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Arrow indicator - static, no animation */}
        <div className="flex-shrink-0 text-white/70 group-hover:text-white transition-colors duration-200">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Bottom shine effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
}
