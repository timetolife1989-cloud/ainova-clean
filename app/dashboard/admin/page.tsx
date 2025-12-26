'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import AdminAuthModal from '@/components/dashboard/admin/AdminAuthModal';
import AdminMenuCard from '@/components/dashboard/admin/AdminMenuCard';

export default function AdminPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [adminVerified, setAdminVerified] = useState(false);

  useEffect(() => {
    // Check if admin already verified (session)
    const verified = sessionStorage.getItem('adminVerified') === 'true';
    setAdminVerified(verified);
    
    // If not verified, show modal
    if (!verified) {
      setShowModal(true);
    }
  }, []);

  return (
    <>
      {/* Header with back button */}
      <Header pageTitle="ADMIN PANEL" showBackButton={true} />
      
      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6 }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active card */}
            <AdminMenuCard
              icon="👤"
              title="FELHASZNÁLÓK"
              description="Felhasználó felvétele, módosítás, törlés"
              href="/dashboard/admin/users/new"
              locked={false}
            />
            
            {/* Locked cards */}
            <AdminMenuCard
              icon="🔧"
              title="BEÁLLÍTÁSOK"
              description="Rendszer konfiguráció"
              locked={true}
            />
            
            <AdminMenuCard
              icon="📊"
              title="RIPORTOK"
              description="Rendszer használat"
              locked={true}
            />
            
            <AdminMenuCard
              icon="🗄️"
              title="ADATBÁZIS"
              description="Backup, migrációk"
              locked={true}
            />
          </div>
        </div>
      </motion.main>
      
      {/* Re-auth modal */}
      <AdminAuthModal
        isOpen={showModal}
        onClose={() => router.back()}
        onSuccess={() => {
          setAdminVerified(true);
          setShowModal(false);
        }}
      />
    </>
  );
}
