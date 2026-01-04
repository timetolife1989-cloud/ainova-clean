'use client';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface LoginContainerProps {
  glowState: 'idle' | 'success' | 'error';
  children: React.ReactNode;
  errorMessage?: string;
}

export default function LoginContainer({ glowState, children, errorMessage }: LoginContainerProps) {
  const isError = glowState === 'error';
  const isSuccess = glowState === 'success';

  // Neon border color based on state
  const getBorderColor = () => {
    if (isError) return 'rgba(239, 68, 68, 0.8)';
    if (isSuccess) return 'rgba(16, 185, 129, 0.8)';
    return 'rgba(59, 130, 246, 0.3)';
  };

  const getGlowColor = () => {
    if (isError) return 'rgba(239, 68, 68, 0.5)';
    if (isSuccess) return 'rgba(16, 185, 129, 0.5)';
    return 'rgba(59, 130, 246, 0.3)';
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Animated neon frame around container */}
      <AnimatePresence>
        {(isError || isSuccess) && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="absolute -inset-4 rounded-3xl pointer-events-none"
            style={{
              border: `2px solid ${getBorderColor()}`,
              boxShadow: `
                0 0 20px ${getGlowColor()},
                0 0 40px ${getGlowColor()},
                inset 0 0 20px ${getGlowColor()}
              `,
            }}
          />
        )}
      </AnimatePresence>

      {/* Pulsating LED underglow - changes color on error */}
      <motion.div 
        animate={{
          background: isError 
            ? 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.4) 0%, rgba(127, 29, 29, 0.2) 40%, transparent 70%)'
            : isSuccess
            ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4) 0%, rgba(6, 95, 70, 0.2) 40%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.5) 0%, rgba(37, 99, 235, 0.3) 40%, transparent 70%)',
        }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
        style={{ animation: 'ledPulse 3s ease-in-out infinite' }}
      />
      
      {/* 3D Glass container */}
      <motion.div
        animate={{
          x: isError ? [0, -5, 5, -5, 5, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md min-h-[500px] rounded-2xl p-8 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(15, 15, 20, 0.95) 0%, rgba(10, 10, 15, 0.98) 50%, rgba(5, 5, 10, 0.99) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 0 rgba(0, 0, 0, 0.3),
            0 25px 50px -12px rgba(0, 0, 0, 0.8),
            0 0 0 1px rgba(0, 0, 0, 0.5)
          `,
          backdropFilter: 'blur(20px)',
          transform: 'perspective(1000px) rotateX(2deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Inner shine effect */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>

      {/* Error message below container */}
      <AnimatePresence>
        {isError && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 px-8 py-4 rounded-2xl text-center max-w-md"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.2) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.3), 0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="text-2xl"
              >
                ✕
              </motion.span>
              <p 
                className="text-base font-semibold"
                style={{ 
                  color: '#EF4444',
                  textShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                }}
              >
                {errorMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message below container */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 px-8 py-4 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 95, 70, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.3), 0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="text-2xl"
              >
                ✓
              </motion.span>
              <p 
                className="text-base font-semibold"
                style={{ 
                  color: '#10B981',
                  textShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                }}
              >
                Sikeres belépés!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
