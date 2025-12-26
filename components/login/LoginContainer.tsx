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
    <motion.div
      animate={getAnimation()}
      transition={getTransition()}
      className="w-full max-w-md h-[500px] bg-gray-900/50 border border-gray-800 rounded-lg p-8 backdrop-blur-sm overflow-hidden"
    >
      {children}
    </motion.div>
  );
}
