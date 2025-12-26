'use client';
import { useRouter } from 'next/navigation';
import Header from '@/components/dashboard/Header';
import Card from '@/components/Card';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <>
      <Header pageTitle="VEZÉRLŐPULT" showBackButton={false} />
      
      <main className="min-h-screen pt-24 px-4 py-10">
        <div className="max-w-2xl mx-auto space-y-6">


        {/* Content Card */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Termelésirányító rendszer</h2>
              <p className="text-gray-400 text-sm">
                A dashboard tartalma hamarosan elérhető lesz.
              </p>
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Gyors műveletek</h3>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => router.push('/change-password')}
                  className="px-4 py-3 bg-gray-800/50 hover:bg-gray-800 text-left rounded transition-colors text-sm"
                >
                  <div className="font-medium">Jelszó módosítása</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Változtasd meg a jelszavadat
                  </div>
                </button>

                <button
                  disabled
                  className="px-4 py-3 bg-gray-800/30 text-left rounded text-sm opacity-50 cursor-not-allowed"
                >
                  <div className="font-medium text-gray-500">Személyzet kezelés</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hamarosan elérhető
                  </div>
                </button>

                <button
                  disabled
                  className="px-4 py-3 bg-gray-800/30 text-left rounded text-sm opacity-50 cursor-not-allowed"
                >
                  <div className="font-medium text-gray-500">Túlóra nyilvántartás</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hamarosan elérhető
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          AINOVA v1.0.0 - Termelésirányító rendszer
        </div>
      </div>
    </main>
    </>
  );
}
