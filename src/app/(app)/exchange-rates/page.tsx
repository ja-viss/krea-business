
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Rate {
  usd: number;
  eur: number;
  date: string;
}

interface ApiResponse {
    current: Rate;
    previous: Rate;
    changePercentage: {
        usd: number;
        eur: number;
    };
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


export default function ExchangeRatesPage() {
  const [currentRate, setCurrentRate] = useState<Rate | null>(null);
  const [historicalRates, setHistoricalRates] = useState<ProcessedHistoricalRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const [currentRes, historicalRes] = await Promise.all([
          fetch('https://api.dolarvzla.com/public/exchange-rate'),
          fetch('https://api.dolarvzla.com/public/exchange-rate/list')
        ]);

        if (!currentRes.ok || !historicalRes.ok) {
          throw new Error('No se pudo obtener la información de las tasas de cambio. Inténtalo de nuevo más tarde.');
        }

        const currentData: ApiResponse = await currentRes.json();
        const historicalData: HistoricalResponse = await historicalRes.json();

        setCurrentRate(currentData.current);
        
        // Procesar datos históricos para calcular la variación
        const processedData = historicalData.rates
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ordenar de más reciente a más antiguo
          .map((rate, index, array) => {
            const previousDayRate = array[index + 1];
            let variation = 0;
            if (previousDayRate) {
              variation = ((rate.usd - previousDayRate.usd) / previousDayRate.usd) * 100;
            }
            return { ...rate, variation };
        });

        setHistoricalRates(processedData.slice(0, 30)); // Limitar a los últimos 30 días

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // La fecha viene en formato YYYY-MM-DD, pero Date prefiere MM-DD-YYYY o con T00:00:00 para evitar problemas de zona horaria
    return format(new Date(`${dateString}T00:00:00`), "eeee, dd 'de' MMMM, yyyy", { locale: es });
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Tasas de Cambio Oficiales"
          description="Consulta la tasa de cambio oficial del Dólar (USD) y Euro (EUR) en Bolívares (VES)."
        />

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Conexión</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Tasa Actual del Dólar (USD)</CardTitle>
                    {loading ? <Skeleton className="h-4 w-1/2 mt-1" /> : (
                         <CardDescription>
                            Actualizado el: {currentRate ? formatDate(currentRate.date) : '...'}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-12 w-3/4" /> : (
                         <p className="text-4xl font-bold tracking-tight">
                            {currentRate ? formatCurrency(currentRate.usd) : 'Cargando...'}
                        </p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Tasa Actual del Euro (EUR)</CardTitle>
                     {loading ? <Skeleton className="h-4 w-1/2 mt-1" /> : (
                         <CardDescription>
                            Actualizado el: {currentRate ? formatDate(currentRate.date) : '...'}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                     {loading ? <Skeleton className="h-12 w-3/4" /> : (
                         <p className="text-4xl font-bold tracking-tight">
                            {currentRate ? formatCurrency(currentRate.eur) : 'Cargando...'}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Historial de Tasas (Últimos 30 días)</CardTitle>
                <CardDescription>Evolución de la tasa de cambio oficial del Dólar (USD).</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Tasa (Bs.)</TableHead>
                            <TableHead className="text-right">Variación Diaria</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 7 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : historicalRates.length > 0 ? (
                            historicalRates.map((rate) => (
                                <TableRow key={rate.date}>
                                    <TableCell>{format(new Date(`${rate.date}T00:00:00`), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(rate.usd)}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={`flex items-center justify-end gap-1 ${rate.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {rate.variation > 0 ? <TrendingUp size={16} /> : rate.variation < 0 ? <TrendingDown size={16} /> : null}
                                            {rate.variation.toFixed(2)}%
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No se encontró historial de tasas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
