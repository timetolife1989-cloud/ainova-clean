'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function MaintenanceModal({ isOpen, onClose, title }: MaintenanceModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="pointer-events-auto relative bg-gradient-to-br from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/40 border-2 border-blue-500/30 p-8 max-w-md w-full mx-4"
            >
              {/* Top highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              
              {/* Icon */}
              <div className="relative flex justify-center mb-6">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/50"
                >
                  <span className="text-5xl">🚧</span>
                </motion.div>
              </div>
              
              {/* Content */}
              <div className="relative text-center space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-b from-gray-100 via-white to-gray-300 bg-clip-text text-transparent">
                  Karbantartás alatt
                </h2>
                
                <div className="space-y-2">
                  <p className="text-lg text-white font-semibold">
                    {title}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Ez a funkció hamarosan elérhető lesz. Köszönjük a türelmedet!
                  </p>
                </div>
                
                {/* Progress bar animation */}
                <div className="mt-6 h-2 bg-gray-800/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    style={{ width: '50%' }}
                  />
                </div>
                
                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/50 transition-all duration-300"
                >
                  Rendben
                </motion.button>
              </div>
              
              {/* Bottom glow line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
