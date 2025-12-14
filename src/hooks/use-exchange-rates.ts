
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Rate {
    usd: number;
    eur: number;
    date: string;
}

interface DolarVzlaResponse {
    current: Rate;
    previous: Rate;
    changePercentage: {
        usd: number;
        eur: number;
    };
}

interface CopRate {
    base: string;
    result: {
        VES: number;
    };
    updated: string;
    ms: number;
}

interface HistoricalRate {
    date: string;
    usd: number;
    eur: number;
}

interface HistoricalResponse {
    rates: HistoricalRate[];
}

interface ProcessedHistoricalRate extends HistoricalRate {
    variation: number;
}

const COP_API_URL = 'https://api.fastforex.io/fetch-one?from=COP&to=VES&api_key=9bbfa8b358-9f8ec4fd83-t79nmh';
const DOLAR_API_URL = 'https://api.dolarvzla.com/public/exchange-rate';
const HISTORICAL_API_URL = 'https://api.dolarvzla.com/public/exchange-rate/list';

export function useExchangeRates() {
  const { toast } = useToast();
  const [rates, setRates] = useState<{ usd: Rate | null, eur: Rate | null, cop: CopRate | null }>({ usd: null, eur: null, cop: null });
  const [historicalRates, setHistoricalRates] = useState<ProcessedHistoricalRate[]>([]);
  const [loading, setLoading] = useState({ usd: true, cop: true, historical: true });
  const [error, setError] = useState<string | null>(null);

  // State for editing COP rate
  const [isEditingCop, setIsEditingCop] = useState(false);
  const [editedCopRate, setEditedCopRate] = useState('');

  const fetchRates = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, usd: true, cop: true }));
      setError(null);
      
      const [dolarRes, copRes] = await Promise.all([
        fetch(DOLAR_API_URL).catch(e => { console.error("DolarVzla fetch failed:", e); return null; }),
        fetch(COP_API_URL).catch(e => { console.error("FastForex fetch failed:", e); return null; })
      ]);

      let finalCopRate: CopRate | null = null;
      // Check for locally saved COP rate
      const savedCopRate = localStorage.getItem('copRate');
      if (savedCopRate) {
          finalCopRate = JSON.parse(savedCopRate);
      } else if (copRes && copRes.ok) {
          const copData: CopRate = await copRes.json();
          finalCopRate = copData;
      }

      if ((!dolarRes || !dolarRes.ok) && !finalCopRate) {
        throw new Error('No se pudo obtener ninguna tasa de cambio. Revisa tu conexión.');
      }

      const dolarData: DolarVzlaResponse | null = dolarRes && dolarRes.ok ? await dolarRes.json() : null;

      setRates({
        usd: dolarData?.current || null,
        eur: dolarData?.current || null,
        cop: finalCopRate,
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, usd: false, cop: false }));
    }
  }, []);

  const fetchHistoricalRates = useCallback(async () => {
     try {
        setLoading(prev => ({ ...prev, historical: true }));
        const historicalRes = await fetch(HISTORICAL_API_URL);

        if (!historicalRes.ok) {
          throw new Error('No se pudo obtener el historial de tasas.');
        }
        
        const historicalData: HistoricalResponse = await historicalRes.json();
        
        const processedData = historicalData.rates
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((rate, index, array) => {
            const previousDayRate = array[index + 1];
            let variation = 0;
            if (previousDayRate) {
              variation = ((rate.usd - previousDayRate.usd) / previousDayRate.usd) * 100;
            }
            return { ...rate, variation };
        });

        setHistoricalRates(processedData.slice(0, 30));
     } catch (err: any) {
        setError(err.message);
     } finally {
        setLoading(prev => ({ ...prev, historical: false }));
     }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleEditCop = () => {
    setEditedCopRate(rates.cop?.result.VES.toString() || '');
    setIsEditingCop(true);
  };

  const handleSaveCop = () => {
    const newRateValue = parseFloat(editedCopRate);
    if (!isNaN(newRateValue)) {
        const newCopRate: CopRate = {
            base: 'COP',
            result: { VES: newRateValue },
            updated: new Date().toISOString(),
            ms: 0,
        };
        localStorage.setItem('copRate', JSON.stringify(newCopRate));
        setRates(prev => ({...prev, cop: newCopRate}));
        toast({
            title: 'Tasa Guardada',
            description: 'La nueva tasa de COP a VES ha sido guardada localmente.',
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
