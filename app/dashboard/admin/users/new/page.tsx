'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/dashboard';
import UserForm, { UserFormData } from '@/components/dashboard/admin/UserForm';
import { useState } from 'react';

export default function UserCreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: UserFormData) => {
    setError(null);
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      // Success - navigate back
      router.push('/dashboard/admin');
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <>
      <Header pageTitle="FELHASZNÁLÓ FELVÉTEL" showBackButton={true} />
      
      <motion.main
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ duration: 0.6 }}
        className="min-h-screen pt-[100px] p-8"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900/50 backdrop-blur-md border border-purple-800 rounded-xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-2">
                ℹ️ ÚJ FELHASZNÁLÓ ADATAI
              </h2>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <UserForm
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
            />
          </div>
        </div>
      </motion.main>
    </>
  );
}
