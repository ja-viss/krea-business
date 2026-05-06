
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

interface Rate {
    usd: number;
    eur: number;
    date: string;
}

interface CopRate {
    rate: number;
    updated: string;
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
const DEFAULT_COP_RATE = 4200; // Tasa USD/COP por defecto

export function useExchangeRates() {
  const { toast } = useToast();
  const [rates, setRates] = useState<{ usd: Rate | null, eur: Rate | null, cop: CopRate | null }>({ usd: null, eur: null, cop: null });
  const [historicalRates, setHistoricalRates] = useState<ProcessedHistoricalRate[]>([]);
  const [loading, setLoading] = useState({ usd: true, cop: true, historical: true });
  const [error, setError] = useState<string | null>(null);

  const [isEditingCop, setIsEditingCop] = useState(false);
  const [editedCopRate, setEditedCopRate] = useState('');

  const fetchRates = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, usd: true, cop: true }));
      setError(null);
      
      const [usdRes, eurRes] = await Promise.all([
          fetch(USD_API_URL),
          fetch(EUR_API_URL).catch(() => null)
      ]);

      let finalCopRate: CopRate | null = null;
      const savedCopRate = localStorage.getItem('copRate');
      if (savedCopRate) {
          finalCopRate = JSON.parse(savedCopRate);
      } else {
        finalCopRate = {
            rate: DEFAULT_COP_RATE,
            updated: new Date().toISOString()
        };
      }

      if (!usdRes.ok) {
        throw new Error('Error al conectar con la API de tasas oficiales.');
      }

      const usdData = await usdRes.json();
      const eurData = (eurRes && eurRes.ok) ? await eurRes.json() : null;

      const usdValue = usdData.promedio;
      const eurValue = eurData ? eurData.promedio : (usdValue * 1.08); 
      const dateString = usdData.fechaActualizacion;

      setRates({
        usd: { usd: usdValue, eur: eurValue, date: dateString },
        eur: { usd: usdValue, eur: eurValue, date: dateString },
        cop: finalCopRate,
      });

    } catch (err: any) {
      console.error('Error fetching rates:', err);
      setError('No se pudieron cargar las tasas de cambio oficiales del BCV.');
    } finally {
      setLoading(prev => ({ ...prev, usd: false, cop: false }));
    }
  }, []);

  const fetchHistoricalRates = useCallback(async () => {
     try {
        setLoading(prev => ({ ...prev, historical: true }));
        const historicalRes = await fetch(HISTORICAL_API_URL).catch(() => null);

        if (!historicalRes || !historicalRes.ok) {
          setHistoricalRates([]);
          return;
        }
        
        const historicalData = await historicalRes.json();
        
        if (!historicalData || !historicalData.rates) {
            setHistoricalRates([]);
            return;
        }

        const processedData = historicalData.rates
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((rate: any, index: number, array: any[]) => {
            const previousDayRate = array[index + 1];
            let variation = 0;
            if (previousDayRate) {
              variation = ((rate.usd - previousDayRate.usd) / previousDayRate.usd) * 100;
            }
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

  const handleEditCop = () => {
    setEditedCopRate(rates.cop?.rate.toString() || '');
    setIsEditingCop(true);
  };

  const handleSaveCop = () => {
    const newRateValue = parseFloat(editedCopRate);
    if (!isNaN(newRateValue)) {
        const newCopRate: CopRate = {
            rate: newRateValue,
            updated: new Date().toISOString(),
        };
        localStorage.setItem('copRate', JSON.stringify(newCopRate));
        setRates(prev => ({...prev, cop: newCopRate}));
        toast({
            title: 'Tasa Guardada',
            description: 'La nueva tasa de USD a COP ha sido guardada localmente.',
        });
    }
    setIsEditingCop(false);
  };

  return {
    rates,
    historicalRates,
    loading,
    error,
    isEditingCop,
    editedCopRate,
    setEditedCopRate,
    handleEditCop,
    handleSaveCop,
    fetchHistoricalRates,
  };
}
