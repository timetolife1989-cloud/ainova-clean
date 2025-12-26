'use client';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onHide: () => void;
}

const toastIcons = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

const toastColors = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export default function ToastNotification({ message, type, visible, onHide }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onHide(), 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  const color = toastColors[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{
            opacity: 0,
            y: 30,
            scale: 0.9,
            filter: 'blur(10px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
          }}
          exit={{
            opacity: 0,
            y: 30,
            scale: 0.9,
            filter: 'blur(10px)',
          }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div
            className="flex items-center gap-3 px-8 py-5"
            style={{
              color: color,
              fontSize: '18px',
              fontWeight: 600,
              textShadow: `
                0 0 20px ${color}80,
                0 0 40px ${color}40,
                0 2px 4px rgba(0, 0, 0, 0.8)
              `,
              filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5)) drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3))',
            }}
          >
            <span style={{ fontSize: '28px', textShadow: `0 0 30px ${color}` }}>
              {toastIcons[type]}
            </span>
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
