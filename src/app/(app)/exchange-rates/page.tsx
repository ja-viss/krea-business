'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingDown, TrendingUp, Edit, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
  const {
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
  } = useExchangeRates();

  useEffect(() => {
    fetchHistoricalRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCurrency = (value: number, currency = 'VES') => {
      const prefix = currency === 'VES' ? 'Bs. ' : '';
      return `${prefix}${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) return 'Fecha inválida';
    // Añadir T00:00:00 para evitar problemas de zona horaria
    return format(new Date(`${dateString.split('T')[0]}T00:00:00`), "eeee, dd 'de' MMMM, yyyy", { locale: es });
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Tasas de Cambio Oficiales"
          description="Consulta las tasas de cambio oficiales y configura tasas personalizadas."
        />

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Conexión</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Tasa Actual del Dólar (USD)</CardTitle>
                    {loading.usd ? <Skeleton className="h-4 w-1/2 mt-1" /> : (
                         <CardDescription>
                            Actualizado el: {rates.usd?.date ? formatDate(rates.usd.date) : '...'}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {loading.usd ? <Skeleton className="h-12 w-3/4" /> : (
                         <p className="text-4xl font-bold tracking-tight">
                            {rates.usd ? formatCurrency(rates.usd.usd) : 'Cargando...'}
                        </p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Tasa Actual del Euro (EUR)</CardTitle>
                     {loading.usd ? <Skeleton className="h-4 w-1/2 mt-1" /> : (
                         <CardDescription>
                             Actualizado el: {rates.eur?.date ? formatDate(rates.eur.date) : '...'}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                     {loading.usd ? <Skeleton className="h-12 w-3/4" /> : (
                         <p className="text-4xl font-bold tracking-tight">
                            {rates.eur ? formatCurrency(rates.eur.eur) : 'Cargando...'}
                        </p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Tasa Peso (COP) a Bs.
                        {!isEditingCop ? (
                            <Button variant="ghost" size="icon" onClick={handleEditCop}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        ) : (
                             <Button variant="ghost" size="icon" onClick={handleSaveCop}>
                                <Check className="h-4 w-4" />
                            </Button>
                        )}
                    </CardTitle>
                     {loading.cop ? <Skeleton className="h-4 w-1/2 mt-1" /> : (
                         <CardDescription>
                             Última actualización: {rates.cop?.updated ? formatDate(rates.cop.updated) : 'N/A'}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                     {loading.cop ? <Skeleton className="h-12 w-3/4" /> : isEditingCop ? (
                        <Input
                            type="number"
                            value={editedCopRate}
                            onChange={(e) => setEditedCopRate(e.target.value)}
                            className="text-4xl font-bold tracking-tight h-auto p-0 border-0 shadow-none focus-visible:ring-0"
                        />
                     ) : (
                         <p className="text-4xl font-bold tracking-tight">
                            {rates.cop ? formatCurrency(rates.cop.result.VES, 'VES') : 'Cargando...'}
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
                        {loading.historical ? (
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
