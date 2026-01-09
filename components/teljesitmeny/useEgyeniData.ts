'use client';

import { useState, useEffect } from 'react';
import { EgyeniOperator, EgyeniTrendData, KimutatType, MuszakType } from './types';

interface UseEgyeniDataParams {
  isActive: boolean;
  muszak: MuszakType;
  pozicio: string;
  search: string;
}

interface UseEgyeniDataReturn {
  operatorok: EgyeniOperator[];
  loading: boolean;
}

export function useEgyeniOperatorok({
  isActive,
  muszak,
  pozicio,
  search,
}: UseEgyeniDataParams): UseEgyeniDataReturn {
  const [operatorok, setOperatorok] = useState<EgyeniOperator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const fetchEgyeniOperatorok = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'egyeni-ranglista',
          muszak: muszak,
        });
        if (pozicio !== 'Mind') {
          params.append('pozicio', pozicio);
        }
        if (search) {
          params.append('search', search);
        }

        const response = await fetch(`/api/teljesitmeny?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setOperatorok(result.data || []);
        }
      } catch (err) {
        console.error('Hiba az egyéni operátorok betöltésekor:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchEgyeniOperatorok, 300);
    return () => clearTimeout(debounce);
  }, [isActive, muszak, pozicio, search]);

  return { operatorok, loading };
}

interface UseEgyeniTrendParams {
  operator: EgyeniOperator | null;
  kimutat: KimutatType;
  offset: number;
}

interface UseEgyeniTrendReturn {
  trendData: EgyeniTrendData[];
  totalItems: number;
  loading: boolean;
}

export function useEgyeniTrend({
  operator,
  kimutat,
  offset,
}: UseEgyeniTrendParams): UseEgyeniTrendReturn {
  const [trendData, setTrendData] = useState<EgyeniTrendData[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!operator) {
      setTrendData([]);
      setTotalItems(0);
      return;
    }

    const fetchTrend = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'egyeni-trend',
          torzsszam: operator.torzsszam,
          kimutat: kimutat,
          offset: offset.toString(),
        });

        const response = await fetch(`/api/teljesitmeny?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          const items = result.data || [];
          setTrendData(items);
          
          if (items.length > 0) {
            if (kimutat === 'napi') {
              setTotalItems(items[0].total_days || 0);
            } else if (kimutat === 'heti') {
              setTotalItems(items[0].total_weeks || 0);
            } else {
              setTotalItems(items[0].total_months || 0);
            }
          }
        }
      } catch (err) {
        console.error('Hiba a trend betöltésekor:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [operator, kimutat, offset]);

  return { trendData, totalItems, loading };
}
