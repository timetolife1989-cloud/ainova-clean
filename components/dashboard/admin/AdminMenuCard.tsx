'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AdminMenuCardProps {
  icon: string; // Emoji
  title: string;
  description: string;
  href?: string; // If null → locked
  locked?: boolean;
}

export default function AdminMenuCard({ 
  icon, 
  title, 
  description, 
  href, 
  locked = false 
}: AdminMenuCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!locked && href) {
      router.push(href);
    }
  };

  return (
    <motion.div
      whileHover={!locked ? { scale: 1.02 } : {}}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={handleClick}
      className={`
        relative
        bg-gray-900/50 backdrop-blur-md
        border border-purple-800
        rounded-xl
        p-6
        shadow-lg
        transition-all duration-300
        ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-purple-600 hover:shadow-2xl hover:shadow-purple-900/50'}
      `}
      title={locked ? 'Hamarosan elérhető' : ''}
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

      {/* Lock icon or Arrow - bottom-right corner */}
      {locked ? (
        <div className="absolute bottom-6 right-6 text-2xl opacity-50">
          🔒
        </div>
      ) : (
        <motion.div
          className="absolute bottom-6 right-6 text-2xl text-purple-400 transition-transform duration-300"
          whileHover={{ x: 4 }}
        >
          →
        </motion.div>
      )}
    </motion.div>
  );
}
