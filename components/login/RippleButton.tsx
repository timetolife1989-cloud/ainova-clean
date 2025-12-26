'use client';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function RippleButton({ children, onClick, disabled, loading }: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    // Ripple pozíció (kattintási pont)
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    // Cleanup 1000ms után
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1000);

    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="
        relative w-full py-3 
        bg-blue-600 hover:bg-blue-700 
        text-white font-medium rounded-lg 
        disabled:opacity-50 disabled:cursor-not-allowed 
        transition-all duration-200 
        overflow-hidden
        shadow-lg hover:shadow-xl
      "
    >
      {/* Ripple animációk */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{
              scale: 0,
              opacity: 0.7,
            }}
            animate={{
              scale: 5,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1,
              ease: [0, 0.2, 0.4, 1],
            }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Gomb szöveg */}
      <span className="relative z-10">
        {loading ? 'Bejelentkezés...' : children}
      </span>
    </button>
  );
}
