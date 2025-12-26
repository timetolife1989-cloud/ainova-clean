'use client';
import { motion } from 'framer-motion';
import { Header, MenuTile } from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <>
      {/* Header - already exists, DO NOT MODIFY */}
      <Header pageTitle="VEZÉRLŐPULT" showBackButton={false} />
      
      {/* Body - add tiles */}
      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 3 Module Tiles */}
          <MenuTile
            icon="👷"
            title="LÉTSZÁM RÖGZÍTÉS"
            description="Napi létszám adatok felvitele"
            href="/dashboard/letszam"
          />
          
          <MenuTile
            icon="📊"
            title="TELJESÍTMÉNY ADAT RÖGZÍTÉS"
            description="Gépenként teljesítmény nyomon"
            href="/dashboard/teljesitmeny"
          />
          
          <MenuTile
            icon="⚙️"
            title="GÉPADAT RÖGZÍTÉS"
            description="Gépek állapota és paraméterei"
            href="/dashboard/gepadat"
          />
          
          {/* Admin Panel Tile (purple variant) */}
          <MenuTile
            icon="🔐"
            title="ADMIN PANEL"
            description="Felhasználók és rendszer beállítások"
            href="/dashboard/admin"
            variant="admin"
          />
        </div>
      </motion.main>
    </>
  );
}
