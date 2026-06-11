'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

interface Rate {
    usd: number;
    eur: number;
    date: string;
    isManual?: boolean;
}

interface CopRate {
    rate: number;
    updated: string;
    isManual?: boolean;
}

interface HistoricalRate {
    date: string;
    usd: number;
    eur: number;
}

interface ProcessedHistoricalRate extends HistoricalRate {
    variation: number;
}

const USD_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
const EUR_API_URL = 'https://ve.dolarapi.com/v1/euro/oficial';
const HISTORICAL_API_URL = 'https://api.dolarvzla.com/public/exchange-rate/list';
const DEFAULT_COP_RATE = 4200;

export function useExchangeRates() {
  const { toast } = useToast();
  const [rates, setRates] = useState<{ usd: Rate | null, eur: Rate | null, cop: CopRate | null }>({ usd: null, eur: null, cop: null });
  const [historicalRates, setHistoricalRates] = useState<ProcessedHistoricalRate[]>([]);
  const [loading, setLoading] = useState({ usd: true, cop: true, historical: true });
  const [error, setError] = useState<string | null>(null);

  const [editingCurrency, setEditingCurrency] = useState<'USD' | 'EUR' | 'COP' | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchRates = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, usd: true, cop: true }));
      setError(null);
      
      const [usdRes, eurRes] = await Promise.all([
          fetch(USD_API_URL).catch(() => null),
          fetch(EUR_API_URL).catch(() => null)
      ]);

      const usdData = usdRes?.ok ? await usdRes.json() : null;
      const eurData = eurRes?.ok ? await eurRes.json() : null;

      // Cargar overrides manuales de localStorage
      const manualUsd = localStorage.getItem('manual_usd');
      const manualEur = localStorage.getItem('manual_eur');
      const manualCop = localStorage.getItem('manual_cop');

      const bcvUsd = usdData?.promedio || 0;
      const bcvEur = eurData?.promedio || (bcvUsd * 1.08);

      const finalUsd: Rate = manualUsd ? { usd: parseFloat(manualUsd), eur: bcvEur, date: new Date().toISOString(), isManual: true } : { usd: bcvUsd, eur: bcvEur, date: usdData?.fechaActualizacion || new Date().toISOString() };
      const finalEur: Rate = manualEur ? { usd: bcvUsd, eur: parseFloat(manualEur), date: new Date().toISOString(), isManual: true } : { usd: bcvUsd, eur: bcvEur, date: eurData?.fechaActualizacion || new Date().toISOString() };
      
      let finalCop: CopRate;
      if (manualCop) {
          finalCop = { rate: parseFloat(manualCop), updated: new Date().toISOString(), isManual: true };
      } else {
          const savedCop = localStorage.getItem('copRate');
          finalCop = savedCop ? JSON.parse(savedCop) : { rate: DEFAULT_COP_RATE, updated: new Date().toISOString() };
      }

      setRates({
        usd: finalUsd,
        eur: finalEur,
        cop: finalCop,
      });

    } catch (err: any) {
      console.error('Error fetching rates:', err);
      setError('Error al cargar tasas oficiales. Verifique su conexión.');
    } finally {
      setLoading(prev => ({ ...prev, usd: false, cop: false }));
    }
  }, []);

  const fetchHistoricalRates = useCallback(async () => {
     try {
        setLoading(prev => ({ ...prev, historical: true }));
        const historicalRes = await fetch(HISTORICAL_API_URL).catch(() => null);
        if (!historicalRes?.ok) {
            setHistoricalRates([]);
            return;
        }
        const historicalData = await historicalRes.json();
        if (!historicalData?.rates) {
            setHistoricalRates([]);
            return;
        }
        const processedData = historicalData.rates
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((rate: any, index: number, array: any[]) => {
            const previousDayRate = array[index + 1];
            let variation = 0;
            if (previousDayRate) variation = ((rate.usd - previousDayRate.usd) / previousDayRate.usd) * 100;
            return { ...rate, variation };
        });
        setHistoricalRates(processedData.slice(0, 30));
     } catch (err: any) {
        setHistoricalRates([]);
     } finally {
        setLoading(prev => ({ ...prev, historical: false }));
     }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleEdit = (currency: 'USD' | 'EUR' | 'COP') => {
    let currentVal = '';
    if (currency === 'USD') currentVal = rates.usd?.usd.toString() || '';
    if (currency === 'EUR') currentVal = rates.eur?.eur.toString() || '';
    if (currency === 'COP') currentVal = rates.cop?.rate.toString() || '';
    setEditValue(currentVal);
    setEditingCurrency(currency);
  };

  const handleSave = () => {
    const val = parseFloat(editValue);
    if (isNaN(val)) return;

    if (editingCurrency === 'USD') localStorage.setItem('manual_usd', val.toString());
    if (editingCurrency === 'EUR') localStorage.setItem('manual_eur', val.toString());
    if (editingCurrency === 'COP') localStorage.setItem('manual_cop', val.toString());

    toast({ title: 'Tasa Actualizada', description: `La tasa de ${editingCurrency} ha sido establecida manualmente.` });
    setEditingCurrency(null);
    fetchRates();
  };

  const handleReset = (currency: 'USD' | 'EUR' | 'COP') => {
      if (currency === 'USD') localStorage.removeItem('manual_usd');
      if (currency === 'EUR') localStorage.removeItem('manual_eur');
      if (currency === 'COP') localStorage.removeItem('manual_cop');
      toast({ title: 'Tasa Restaurada', description: `Se ha vuelto a la tasa oficial para ${currency}.` });
      fetchRates();
  };

  return {
    rates,
    historicalRates,
    loading,
    error,
    editingCurrency,
    editValue,
    setEditValue,
    handleEdit,
    handleSave,
    handleReset,
    fetchHistoricalRates,
  };
}
