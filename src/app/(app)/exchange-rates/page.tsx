'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, TrendingDown, TrendingUp, Edit, Check, RotateCcw, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ExchangeRatesPage() {
  const {
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
  } = useExchangeRates();

  useEffect(() => {
    fetchHistoricalRates();
  }, [fetchHistoricalRates]);

  const formatCurrency = (value: number, currency = 'VES') => {
      if (currency === 'COP') {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
      }
      const prefix = currency === 'VES' ? 'Bs. ' : '';
      return `${prefix}${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
        return format(new Date(dateString), "eeee, dd 'de' MMMM, yyyy", { locale: es });
    } catch (e) {
        return 'Fecha no disponible';
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Gestión de Divisas"
          description="Controla las tasas de cambio operativas y consulta las oficiales del BCV."
        />

        <Alert variant="destructive" className="bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <AlertTitle className="font-bold">Advertencia Fiscal y Legal</AlertTitle>
            <AlertDescription className="text-sm">
                Según la normativa vigente del Banco Central de Venezuela (BCV), los comercios están obligados a utilizar la tasa oficial publicada por dicho ente para todas las transacciones comerciales. El uso de tasas personalizadas es responsabilidad exclusiva del usuario y puede acarrear sanciones administrativas.
            </AlertDescription>
        </Alert>

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error de Conexión</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
            {/* USD Card */}
            <Card className={rates.usd?.isManual ? "border-amber-500 shadow-amber-100" : ""}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Dólar (USD)</CardTitle>
                        {rates.usd?.isManual ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">MANUAL</Badge> : <Badge variant="outline" className="text-[10px] bg-green-100 text-green-800 border-green-300">BCV</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading.usd ? <Skeleton className="h-10 w-full" /> : (
                         editingCurrency === 'USD' ? (
                             <div className="flex gap-2">
                                <Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-2xl font-black h-12" />
                                <Button size="icon" onClick={handleSave} className="h-12 w-12"><Check /></Button>
                             </div>
                         ) : (
                             <div className="flex items-baseline justify-between">
                                <p className="text-3xl font-black tracking-tighter">{rates.usd ? formatCurrency(rates.usd.usd) : '0,00'}</p>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit('USD')} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                    {rates.usd?.isManual && <Button variant="ghost" size="icon" onClick={() => handleReset('USD')} className="h-8 w-8 text-amber-600"><RotateCcw className="h-4 w-4" /></Button>}
                                </div>
                             </div>
                         )
                    )}
                    <p className="text-[10px] text-muted-foreground italic truncate">Actualizado: {rates.usd?.date ? formatDate(rates.usd.date) : '...'}</p>
                </CardContent>
            </Card>

            {/* EUR Card */}
            <Card className={rates.eur?.isManual ? "border-amber-500 shadow-amber-100" : ""}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Euro (EUR)</CardTitle>
                         {rates.eur?.isManual ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">MANUAL</Badge> : <Badge variant="outline" className="text-[10px] bg-green-100 text-green-800 border-green-300">BCV</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading.usd ? <Skeleton className="h-10 w-full" /> : (
                         editingCurrency === 'EUR' ? (
                             <div className="flex gap-2">
                                <Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-2xl font-black h-12" />
                                <Button size="icon" onClick={handleSave} className="h-12 w-12"><Check /></Button>
                             </div>
                         ) : (
                             <div className="flex items-baseline justify-between">
                                <p className="text-3xl font-black tracking-tighter">{rates.eur ? formatCurrency(rates.eur.eur) : '0,00'}</p>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit('EUR')} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                    {rates.eur?.isManual && <Button variant="ghost" size="icon" onClick={() => handleReset('EUR')} className="h-8 w-8 text-amber-600"><RotateCcw className="h-4 w-4" /></Button>}
                                </div>
                             </div>
                         )
                    )}
                     <p className="text-[10px] text-muted-foreground italic truncate">Actualizado: {rates.eur?.date ? formatDate(rates.eur.date) : '...'}</p>
                </CardContent>
            </Card>

            {/* COP Card */}
            <Card className={rates.cop?.isManual ? "border-amber-500 shadow-amber-100" : ""}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Dólar a Pesos (COP)</CardTitle>
                        {rates.cop?.isManual ? <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">MANUAL</Badge> : <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">REF</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading.cop ? <Skeleton className="h-10 w-full" /> : (
                         editingCurrency === 'COP' ? (
                             <div className="flex gap-2">
                                <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-2xl font-black h-12" />
                                <Button size="icon" onClick={handleSave} className="h-12 w-12"><Check /></Button>
                             </div>
                         ) : (
                             <div className="flex items-baseline justify-between">
                                <p className="text-3xl font-black tracking-tighter">{rates.cop ? formatCurrency(rates.cop.rate, 'COP') : '0'}</p>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit('COP')} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                                    {rates.cop?.isManual && <Button variant="ghost" size="icon" onClick={() => handleReset('COP')} className="h-8 w-8 text-amber-600"><RotateCcw className="h-4 w-4" /></Button>}
                                </div>
                             </div>
                         )
                    )}
                    <p className="text-[10px] text-muted-foreground italic truncate">Referencia: Mercado Fronterizo</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Historial BCV (Últimos 30 días)</CardTitle>
                <CardDescription>Seguimiento de la volatilidad oficial del mercado cambiario.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="pl-6">Fecha</TableHead>
                                <TableHead className="text-right">Tasa (Bs.)</TableHead>
                                <TableHead className="text-right pr-6">Variación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading.historical ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-4 w-[120px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                        <TableCell className="text-right pr-6"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : historicalRates.length > 0 ? (
                                historicalRates.map((rate) => (
                                    <TableRow key={rate.date}>
                                        <TableCell className="pl-6 font-medium text-xs sm:text-sm">{format(new Date(`${rate.date}T00:00:00`), "dd/MM/yyyy")}</TableCell>
                                        <TableCell className="text-right font-black text-sm">{formatCurrency(rate.usd)}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <span className={`flex items-center justify-end gap-1 font-bold text-xs ${rate.variation > 0 ? 'text-green-600' : rate.variation < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {rate.variation > 0 ? <TrendingUp size={14} /> : rate.variation < 0 ? <TrendingDown size={14} /> : null}
                                                {rate.variation.toFixed(2)}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                                        No se pudo obtener el historial de tasas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
