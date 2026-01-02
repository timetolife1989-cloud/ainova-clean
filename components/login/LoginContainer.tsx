'use client';
import { motion } from 'framer-motion';
import React from 'react';

interface LoginContainerProps {
  glowState: 'idle' | 'success' | 'error';
  children: React.ReactNode;
}

export default function LoginContainer({ glowState, children }: LoginContainerProps) {
  // IDLE állapot - NINCS glow (csak border)
  const idleAnimation = {
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)', // Átlátszó (nincs fény)
    x: 0,
  };

  const idleTransition = {
    duration: 0.3,
  };

  // SUCCESS állapot - ZÖLD neon glow (1x villan)
  const successAnimation = {
    boxShadow: [
      '0 0 0 rgba(0, 0, 0, 0)',
      '0 0 40px rgba(16, 185, 129, 0.6), 0 20px 70px rgba(16, 185, 129, 0.7), 0 30px 90px rgba(255, 255, 255, 0.3)',
      '0 0 30px rgba(16, 185, 129, 0.4), 0 20px 60px rgba(16, 185, 129, 0.5), 0 30px 80px rgba(255, 255, 255, 0.2)',
    ],
    x: 0,
  };

  const successTransition = {
    duration: 0.8,
    times: [0, 0.5, 1],
  };

  // ERROR állapot - PIROS neon glow + shake
  const errorAnimation = {
    boxShadow: [
      '0 0 0 rgba(0, 0, 0, 0)',
      '0 0 40px rgba(239, 68, 68, 0.7), 0 20px 70px rgba(239, 68, 68, 0.8), 0 30px 90px rgba(255, 255, 255, 0.2)',
      '0 0 30px rgba(239, 68, 68, 0.5), 0 20px 60px rgba(239, 68, 68, 0.6), 0 30px 80px rgba(255, 255, 255, 0.15)',
    ],
    x: [0, -5, 5, -5, 5, -3, 3, 0],
  };

  const errorTransition = {
    duration: 0.6,
    times: [0, 0.3, 1],
  };

  const getAnimation = () => {
    switch (glowState) {
      case 'success':
        return successAnimation;
      case 'error':
        return errorAnimation;
      default: 
        return idleAnimation;
    }
  };

  const getTransition = () => {
    switch (glowState) {
      case 'success': 
        return successTransition;
      case 'error':
        return errorTransition;
      default: 
        return idleTransition;
    }
  };

  return (
    <div className="relative">
      {/* Pulsating blue LED underglow */}
      <div 
        className="absolute -inset-1 rounded-2xl opacity-60 blur-xl animate-pulse"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.5) 0%, rgba(37, 99, 235, 0.3) 40%, transparent 70%)',
          animation: 'ledPulse 3s ease-in-out infinite',
        }}
      />
      
      {/* 3D Glass container */}
      <motion.div
        animate={getAnimation()}
        transition={getTransition()}
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
    </div>
  );
}
