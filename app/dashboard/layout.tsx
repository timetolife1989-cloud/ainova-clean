'use client';
import { AnimatePresence } from 'framer-motion';
import InteractiveBackground from '@/components/login/InteractiveBackground';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Background persists (ripple effect from login) */}
      <InteractiveBackground />
      
      {/* Page content with animations */}
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </>
  );
}
