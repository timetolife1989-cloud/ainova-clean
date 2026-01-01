'use client';
import { motion } from 'framer-motion';
import { Header, MenuTile } from '@/components/dashboard';
import MaintenanceModal from '@/components/dashboard/MaintenanceModal';
import React from 'react';

export default function DashboardPage() {
  const [maintenanceModal, setMaintenanceModal] = React.useState<{
    isOpen: boolean;
    title: string;
  }>({ isOpen: false, title: '' });

  const showMaintenance = (title: string) => {
    setMaintenanceModal({ isOpen: true, title });
  };

  const closeMaintenance = () => {
    setMaintenanceModal({ isOpen: false, title: '' });
  };
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
        className="min-h-screen pt-[100px] px-8 py-12"
      >
        {/* Left-aligned narrow tiles */}
        <div className="max-w-xs space-y-4">
          {/* 3 Module Tiles - Under Maintenance */}
          <MenuTile
            icon="👷"
            title="LÉTSZÁM RÖGZÍTÉS"
            description="Napi létszám adatok felvitele"
            href="/dashboard/letszam"
          />
          
          <MenuTile
            icon="📊"
            title="TELJESÍTMÉNY ADATOK"
            description="Teljesítmény adatok rögzítése"
            href="/dashboard/teljesitmeny"
            onClick={() => showMaintenance('TELJESÍTMÉNY ADATOK')}
          />
          
          <MenuTile
            icon="⚙️"
            title="GÉPADAT RÖGZÍTÉS"
            description="Gépek állapota és paraméterei"
            href="/dashboard/gepadat"
            onClick={() => showMaintenance('GÉPADAT RÖGZÍTÉS')}
          />
          
          {/* Admin Panel Tile (purple variant) - Active */}
          <MenuTile
            icon="🔐"
            title="ADMIN PANEL"
            description="Felhasználók és rendszer beállítások"
            href="/dashboard/admin"
            variant="admin"
          />
        </div>
      </motion.main>

      {/* Maintenance Modal */}
      <MaintenanceModal
        isOpen={maintenanceModal.isOpen}
        onClose={closeMaintenance}
        title={maintenanceModal.title}
      />
    </>
  );
}
