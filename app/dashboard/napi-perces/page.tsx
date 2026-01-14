'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard';
import {
  NapiData,
  KimutatType,
  ImportStatus,
  PAGE_SIZES,
  KimutatSelector,
  NapiPercesChart,
  NapiPercesTable,
} from '@/components/napi-perces';
import { ImportStatusBar } from '@/components/ui/ImportStatusBar';

export default function NapiPercesPage() {
  // State
  const [activeKimutat, setActiveKimutat] = useState<KimutatType>('napi');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<NapiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);

  // Page size based on kimutat type
  const pageSize = PAGE_SIZES[activeKimutat];

  // Fetch data function
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: activeKimutat,
        offset: offset.toString(),
      });

      const response = await fetch(`/api/napi-perces?${params.toString()}`);
      if (!response.ok) throw new Error('Hiba az adatok betöltésekor');
      
      const result = await response.json();
      setData(result.data || []);
      
      // Set total from first record
      if (result.data?.length > 0) {
        const first = result.data[0];
        if (activeKimutat === 'napi') {
          setTotalItems(first.total_days || 0);
        } else if (activeKimutat === 'heti') {
          setTotalItems(first.total_weeks || 0);
        } else {
          setTotalItems(first.total_months || 0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch only - no auto-refresh for data
  useEffect(() => {
    fetchData();
  }, [activeKimutat, offset]);

  // Fetch import status function - checks if new data arrived
  const checkForUpdates = async () => {
    try {
      const response = await fetch('/api/napi-perces/import');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.stats) {
          const newImportTime = result.stats.last_import;
          
          // Update status display
          setImportStatus({
            last_import: newImportTime,
            total_records: result.stats.total_records,
            unique_days: result.stats.unique_days,
          });
          
          // If import time changed, refresh data
          if (lastImportTime && newImportTime !== lastImportTime) {
            console.log('Új adat érkezett, frissítés...');
            fetchData(false);
          }
          setLastImportTime(newImportTime);
        }
      }
    } catch (err) {
      console.error('Import status fetch error:', err);
    }
  };

  // Check for updates every 30 sec (only status, not full data)
  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [lastImportTime]);

  // Pagination handlers
  const handlePrevious = () => {
    if (activeKimutat !== 'havi' && totalItems > offset + pageSize) {
      setOffset(offset + pageSize);
    }
  };

  const handleNext = () => {
    if (activeKimutat !== 'havi' && offset > 0) {
      setOffset(Math.max(0, offset - pageSize));
    }
  };

  // Kimutat change handler
  const handleKimutatChange = (kimutat: KimutatType) => {
    setActiveKimutat(kimutat);
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header pageTitle="Napi Perces" />
      
      <main className="p-6 pt-[90px]">
        {/* Import Status Bar */}
        <ImportStatusBar 
          lastImportAt={importStatus?.last_import || null}
          recordCount={importStatus?.total_records || 0}
          secondaryLabel="Napok"
          secondaryValue={importStatus?.unique_days || 0}
          secondarySuffix="nap"
        />

        {/* Controls - Title + Buttons + Navigation */}
        <KimutatSelector
          active={activeKimutat}
          onSelect={handleKimutatChange}
          offset={offset}
          totalItems={totalItems}
          pageSize={pageSize}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />

        {/* Chart */}
        <NapiPercesChart
          data={data}
          loading={loading}
          error={error}
          activeKimutat={activeKimutat}
        />

        {/* Data Table */}
        {!loading && data.length > 0 && (
          <NapiPercesTable data={data} />
        )}
      </main>
    </div>
  );
}
