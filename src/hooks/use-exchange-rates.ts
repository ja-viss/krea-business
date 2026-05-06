
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

// Nuevos endpoints actualizados según solicitud
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

  // Estado para edición local de la tasa COP (ya que no hay API oficial directa para USD/COP en este contexto)
  const [isEditingCop, setIsEditingCop] = useState(false);
  const [editedCopRate, setEditedCopRate] = useState('');

  const fetchRates = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, usd: true, cop: true }));
      setError(null);
      
      // Intentamos obtener USD y EUR en paralelo de la nueva API
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

      // La nueva API devuelve "promedio" para el valor de la tasa
      const usdValue = usdData.promedio;
      const eurValue = eurData ? eurData.promedio : (usdValue * 1.08); // Estimación si falla EUR
      const dateString = usdData.fechaActualizacion;

      const consolidatedRate: Rate = {
          usd: usdValue,
          eur: eurValue,
          date: dateString
      };

      setRates({
        usd: consolidatedRate,
        eur: consolidatedRate,
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
        // DolarApi no tiene un endpoint de listado histórico simple de 30 días aún,
        // así que mantenemos el anterior con manejo de error silencioso.
        const historicalRes = await fetch(HISTORICAL_API_URL).catch(() => null);

        if (!historicalRes || !historicalRes.ok) {
          console.warn('Historial de tasas no disponible actualmente.');
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
        console.error('Error fetching historical rates:', err);
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
