'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, AlertTriangle, Calendar as CalendarIcon, Loader2, FileSpreadsheet, BarChart3, TrendingUp, Package, Search } from 'lucide-react';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { IProduct } from '@/models/Product';
import { ISale } from '@/models/Sale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface ReportData {
  monthlyProfit: { month: string; profit: number }[];
  expenseDistribution: { name: string; value: number; fill: string }[];
  inventoryProducts: IProduct[];
}

interface KardexEntry {
    date: string;
    document: string;
    concept: string;
    entry: number;
    exit: number;
    balance: number;
}

type Period = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for unified date filtering
  const [salesPeriod, setSalesPeriod] = useState<Period>('thisMonth');
  const [salesRange, setSalesPeriodRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  
  const [kardexPeriod, setKardexPeriod] = useState<Period>('thisMonth');
  const [kardexRange, setKardexRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [salesReportData, setSalesReportData] = useState<ISale[]>([]);
  const [loadingSalesReport, setLoadingSalesReport] = useState(false);
  
  const [kardexData, setKardexData] = useState<KardexEntry[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        if (!storeId) throw new Error('Sesión no encontrada.');
        
        const [dashboardRes, productsRes] = await Promise.all([
             fetch(`/api/dashboard?storeId=${storeId}`),
             fetch(`/api/products?storeId=${storeId}`)
        ]);

        if (!dashboardRes.ok || !productsRes.ok) throw new Error('Error al cargar datos base.');

        const dashboardData = await dashboardRes.json();
        const productsData = await productsRes.json();

        setData({
          monthlyProfit: dashboardData.monthlyProfit,
          expenseDistribution: dashboardData.expenseDistribution,
          inventoryProducts: productsData,
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getRangeFromPeriod = (period: Period): DateRange => {
      const now = new Date();
      switch(period) {
          case 'today': return { from: startOfDay(now), to: endOfDay(now) };
          case 'yesterday': {
              const yesterday = subDays(now, 1);
              return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
          }
          case 'last7': return { from: subDays(now, 7), to: now };
          case 'last30': return { from: subDays(now, 30), to: now };
          case 'thisMonth': return { from: startOfMonth(now), to: endOfMonth(now) };
          case 'lastMonth': {
              const lastMonth = subMonths(now, 1);
              return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
          }
          default: return { from: startOfMonth(now), to: now };
      }
  };

  const handlePeriodChange = (period: Period, type: 'sales' | 'kardex') => {
      const range = getRangeFromPeriod(period);
      if (type === 'sales') {
          setSalesPeriod(period);
          setSalesPeriodRange(range);
      } else {
          setKardexPeriod(period);
          setKardexRange(range);
      }
  };

  const handleGenerateSalesReport = async () => {
    setLoadingSalesReport(true);
    try {
      const storeId = localStorage.getItem('storeId');
      if (!salesRange?.from) throw new Error("Selecciona un rango válido.");

      const from = format(salesRange.from, 'yyyy-MM-dd');
      const to = salesRange.to ? format(salesRange.to, 'yyyy-MM-dd') : from;

      const response = await fetch(`/api/sales?storeId=${storeId}&from=${from}&to=${to}`);
      if (!response.ok) throw new Error('Error al obtener ventas.');
      
      const sales: ISale[] = await response.json();
      setSalesReportData(sales);
      toast({ title: 'Libro de Ventas Generado' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoadingSalesReport(false);
    }
  };

  const handleGenerateKardex = async () => {
    if (!selectedProductId || !kardexRange?.from) {
        toast({ variant: 'destructive', title: 'Faltan datos', description: "Selecciona producto y fechas." });
        return;
    }
    setLoadingKardex(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const from = format(kardexRange.from, 'yyyy-MM-dd');
        const to = kardexRange.to ? format(kardexRange.to, 'yyyy-MM-dd') : from;
        
        const response = await fetch(`/api/sales?storeId=${storeId}&productId=${selectedProductId}&from=${from}&to=${to}`);
        if (!response.ok) throw new Error('Error al obtener movimientos.');

        const sales: ISale[] = await response.json();
        const product = data?.inventoryProducts.find(p => p._id === selectedProductId);
        if (!product) throw new Error('Producto no encontrado.');

        let currentBalance = product.stock;
        const movements = sales.flatMap(sale => 
            sale.items
                .filter((item: any) => String(item.product?._id || item.product) === selectedProductId)
                .map((item: any) => ({
                    date: String(sale.createdAt),
                    document: `FV-${String(sale.invoiceNumber).padStart(8, '0')}`,
                    concept: `Venta: ${sale.customerName}`,
                    entry: 0,
                    exit: item.quantity,
                    balance: 0 
                }))
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const final = movements.map(mov => {
            const m = { ...mov, balance: currentBalance };
            currentBalance += mov.exit; 
            return m;
        }).reverse(); 

        setKardexData(final);
        toast({ title: 'Kardex Actualizado' });
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setLoadingKardex(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + headers + "\n" + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.click();
  };

  const salesTotals = salesReportData.reduce((acc, s) => {
    acc.total += s.totalAmount;
    acc.base += (s.subtotals?.general || 0) + (s.subtotals?.reduced || 0);
    acc.tax += (s.taxDetails?.general || 0) + (s.taxDetails?.reduced || 0);
    acc.exempt += (s.subtotals?.exempt || 0);
    return acc;
  }, { total: 0, base: 0, tax: 0, exempt: 0 });

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader title="Central de Reportes" description="Filtros por periodos y exportación profesional." />

        <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="inventory">Inventario</TabsTrigger>
                <TabsTrigger value="financial">Finanzas</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-6">
                 <div className="grid gap-4 md:grid-cols-4">
                    <Card><CardHeader className='pb-2'><CardDescription>Ventas</CardDescription></CardHeader>
                    <CardContent><div className='text-xl font-bold'>{new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(salesTotals.total)}</div></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardDescription>IVA (16%)</CardDescription></CardHeader>
                    <CardContent><div className='text-xl font-bold text-primary'>{new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(salesTotals.tax)}</div></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardDescription>Exento</CardDescription></CardHeader>
                    <CardContent><div className='text-xl font-bold text-muted-foreground'>{new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(salesTotals.exempt)}</div></CardContent></Card>
                    <Card><CardHeader className='pb-2'><CardDescription>Nº Facturas</CardDescription></CardHeader>
                    <CardContent><div className='text-xl font-bold'>{salesReportData.length}</div></CardContent></Card>
                </div>

                <Card>
                    <CardHeader className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                        <div><CardTitle>Libro de Ventas</CardTitle><CardDescription>Formato fiscal para declaraciones del SENIAT.</CardDescription></div>
                        {salesReportData.length > 0 && <Button variant="outline" size="sm" onClick={() => exportToCSV(salesReportData.map(s => ({
                            Fecha: format(parseISO(String(s.createdAt)), 'dd/MM/yyyy'),
                            Factura: s.invoiceNumber,
                            Cliente: s.customerName,
                            Total: s.totalAmount,
                            IVA: (s.taxDetails?.general || 0),
                            Exento: s.subtotals?.exempt || 0
                        })), 'Libro_Ventas')}><FileSpreadsheet className='mr-2 h-4 w-4' /> Exportar CSV</Button>}
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20 items-end'>
                             <div className='space-y-2'><label className='text-xs font-bold uppercase'>Periodo</label>
                                <Select value={salesPeriod} onValueChange={(v: Period) => handlePeriodChange(v, 'sales')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Hoy</SelectItem>
                                        <SelectItem value="yesterday">Ayer</SelectItem>
                                        <SelectItem value="last7">Últimos 7 días</SelectItem>
                                        <SelectItem value="last30">Últimos 30 días</SelectItem>
                                        <SelectItem value="thisMonth">Este Mes</SelectItem>
                                        <SelectItem value="lastMonth">Mes Pasado</SelectItem>
                                        <SelectItem value="custom">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {salesPeriod === 'custom' && (
                                <div className='space-y-2'><label className='text-xs font-bold uppercase'>Rango de Fechas</label>
                                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{salesRange?.from ? (salesRange.to ? `${format(salesRange.from, "dd/MM/yy")} - ${format(salesRange.to, "dd/MM/yy")}` : format(salesRange.from, "dd/MM/yy")) : "Seleccionar"}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={salesRange} onSelect={setSalesPeriodRange} locale={es} /></PopoverContent></Popover>
                                </div>
                            )}
                            <Button onClick={handleGenerateSalesReport} disabled={loadingSalesReport} className='sm:ml-auto'>
                                {loadingSalesReport ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Reporte"}
                            </Button>
                        </div>

                        <div className='rounded-md border overflow-x-auto'>
                           <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Nº Factura</TableHead><TableHead>Cliente</TableHead><TableHead className='text-right'>Base</TableHead><TableHead className='text-right'>IVA</TableHead><TableHead className='text-right'>Total</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {loadingSalesReport ? <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                : salesReportData.length > 0 ? salesReportData.map((s) => (
                                    <TableRow key={s._id}><TableCell>{format(parseISO(String(s.createdAt)), 'dd/MM/yyyy')}</TableCell><TableCell className='font-mono'>{String(s.invoiceNumber).padStart(8, '0')}</TableCell><TableCell className='uppercase font-medium truncate max-w-[200px]'>{s.customerName}</TableCell>
                                        <TableCell className='text-right'>{new Intl.NumberFormat('es-VE').format((s.subtotals?.general || 0))}</TableCell>
                                        <TableCell className='text-right text-primary'>{new Intl.NumberFormat('es-VE').format((s.taxDetails?.general || 0))}</TableCell>
                                        <TableCell className='text-right font-bold'>{new Intl.NumberFormat('es-VE').format(s.totalAmount)}</TableCell></TableRow>
                                )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Elige un periodo y presiona generar.</TableCell></TableRow>}
                            </TableBody>
                            {salesReportData.length > 0 && <TableFooter><TableRow className='bg-muted/50 font-bold'><TableCell colSpan={3} className='text-right'>TOTALES</TableCell><TableCell className='text-right'>{new Intl.NumberFormat('es-VE').format(salesTotals.base)}</TableCell><TableCell className='text-right'>{new Intl.NumberFormat('es-VE').format(salesTotals.tax)}</TableCell><TableCell className='text-right'>{new Intl.NumberFormat('es-VE').format(salesTotals.total)}</TableCell></TableRow></TableFooter>}
                           </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-6">
                <Card>
                    <CardHeader className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                        <div><CardTitle>Kardex de Movimientos</CardTitle><CardDescription>Entradas y salidas de stock para auditoría.</CardDescription></div>
                        {kardexData.length > 0 && <Button variant="outline" size="sm" onClick={() => exportToCSV(kardexData, `Kardex_${selectedProductId}`)}><FileSpreadsheet className='mr-2 h-4 w-4' /> Exportar CSV</Button>}
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20 items-end'>
                            <div className='space-y-2'><label className='text-xs font-bold uppercase'>Producto</label>
                                <Select onValueChange={setSelectedProductId} value={selectedProductId || ""}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                    <SelectContent>{data?.inventoryProducts.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className='space-y-2'><label className='text-xs font-bold uppercase'>Periodo</label>
                                <Select value={kardexPeriod} onValueChange={(v: Period) => handlePeriodChange(v, 'kardex')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Hoy</SelectItem><SelectItem value="yesterday">Ayer</SelectItem><SelectItem value="last7">Últimos 7 días</SelectItem><SelectItem value="thisMonth">Este Mes</SelectItem><SelectItem value="custom">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {kardexPeriod === 'custom' && (
                                <div className='space-y-2'><label className='text-xs font-bold uppercase'>Rango</label>
                                    <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{kardexRange?.from ? (kardexRange.to ? `${format(kardexRange.from, "dd/MM/yy")} - ${format(kardexRange.to, "dd/MM/yy")}` : format(kardexRange.from, "dd/MM/yy")) : "Rango"}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={kardexRange} onSelect={setKardexRange} locale={es} /></PopoverContent></Popover>
                                </div>
                            )}
                            <Button onClick={handleGenerateKardex} disabled={loadingKardex} className='sm:ml-auto'>{loadingKardex ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}</Button>
                        </div>
                        <div className='rounded-md border overflow-x-auto'>
                            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Documento</TableHead><TableHead>Concepto</TableHead><TableHead className='text-center'>Entrada</TableHead><TableHead className='text-center'>Salida</TableHead><TableHead className='text-right'>Saldo</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loadingKardex ? <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    : kardexData.length > 0 ? kardexData.map((item, idx) => (
                                        <TableRow key={idx}><TableCell className='whitespace-nowrap'>{format(parseISO(item.date), 'dd/MM/yy HH:mm')}</TableCell><TableCell className='font-mono text-xs'>{item.document}</TableCell><TableCell className='text-xs uppercase text-muted-foreground'>{item.concept}</TableCell>
                                            <TableCell className='text-center text-green-600 font-bold'>{item.entry || ''}</TableCell>
                                            <TableCell className='text-center text-red-600 font-bold'>{item.exit > 0 ? `-${item.exit}` : ''}</TableCell>
                                            <TableCell className='text-right font-black'>{item.balance}</TableCell></TableRow>
                                    )) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Filtra para ver trazabilidad.</TableCell></TableRow>}
                                </TableBody></Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="financial" className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card><CardHeader><CardTitle>Ganancias</CardTitle><CardDescription>Últimos 6 meses.</CardDescription></CardHeader>
                    <CardContent>{loading ? <Skeleton className="h-[300px] w-full" /> : <MonthlyProfitChart data={data?.monthlyProfit} />}</CardContent></Card>
                <Card><CardHeader><CardTitle>Gastos</CardTitle><CardDescription>Distribución operativa.</CardDescription></CardHeader>
                    <CardContent>{loading ? <Skeleton className="h-[300px] w-full" /> : <ExpenseDistributionChart data={data?.expenseDistribution} />}</CardContent></Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
