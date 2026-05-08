
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MoreVertical, AlertTriangle, Calendar as CalendarIcon, Loader2, FileSpreadsheet, BarChart3, TrendingUp, ShoppingBag, Package } from 'lucide-react';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { IProduct } from '@/models/Product';
import { ISale } from '@/models/Sale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
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

export default function ReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Kardex
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [kardexData, setKardexData] = useState<KardexEntry[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  // State for Sales Ledger
  const [salesReportData, setSalesReportData] = useState<ISale[]>([]);
  const [loadingSalesReport, setLoadingSalesReport] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(String(new Date().getMonth()));
  const [reportYear, setReportYear] = useState<string>(String(new Date().getFullYear()));
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
        }
        
        const [dashboardRes, productsRes] = await Promise.all([
             fetch(`/api/dashboard?storeId=${storeId}`),
             fetch(`/api/products?storeId=${storeId}`)
        ]);

        if (!dashboardRes.ok || !productsRes.ok) {
          throw new Error('No se pudieron cargar los datos para los reportes.');
        }

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

  const handleGenerateKardex = async () => {
    if (!selectedProductId || !dateRange?.from) {
        toast({ variant: 'destructive', title: 'Campos faltantes', description: "Por favor, selecciona un producto y un rango de fechas." });
        return;
    }
    setLoadingKardex(true);
    setKardexData([]);

    try {
        const storeId = localStorage.getItem('storeId');
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
        
        const response = await fetch(`/api/sales?storeId=${storeId}&productId=${selectedProductId}&from=${fromDate}&to=${toDate}`);
        if (!response.ok) throw new Error('No se pudieron obtener los movimientos.');

        const sales: ISale[] = await response.json();
        const selectedProduct = data?.inventoryProducts.find(p => p._id === selectedProductId);
        
        if (!selectedProduct) throw new Error('Producto no encontrado.');

        // Simple Kardex Logic: We use current stock as end point and work backwards
        // (In a production app, we would have an Audit/StockMovements collection)
        let currentBalance = selectedProduct.stock;
        
        const saleMovements = sales
            .flatMap(sale => 
                sale.items
                    .filter((item: any) => String(item.product) === selectedProductId)
                    .map((item: any) => ({
                        date: String(sale.createdAt),
                        document: `FV-${String(sale.invoiceNumber).padStart(8, '0')}`,
                        concept: `Venta: ${sale.customerName}`,
                        entry: 0,
                        exit: item.quantity,
                        balance: 0 
                    }))
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const finalMovements = saleMovements.map(mov => {
            const movementWithBalance = { ...mov, balance: currentBalance };
            currentBalance += mov.exit; // Work backwards to find previous balance
            return movementWithBalance;
        }).reverse(); 

        setKardexData(finalMovements);
        toast({ title: 'Kardex Generado', description: `Se encontraron ${finalMovements.length} movimientos.` });

    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setLoadingKardex(false);
    }
  };

  const handleGenerateSalesReport = async () => {
    setLoadingSalesReport(true);
    setSalesReportData([]);

    try {
      const storeId = localStorage.getItem('storeId');
      const date = new Date(parseInt(reportYear), parseInt(reportMonth));
      const fromDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const toDate = format(endOfMonth(date), 'yyyy-MM-dd');

      const response = await fetch(`/api/sales?storeId=${storeId}&from=${fromDate}&to=${toDate}`);
      if (!response.ok) throw new Error('Error al obtener datos de ventas.');
      
      const sales: ISale[] = await response.json();
      setSalesReportData(sales);
      toast({ title: 'Libro de Ventas Generado', description: `Se cargaron ${sales.length} facturas.` });

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoadingSalesReport(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        toast({ variant: 'destructive', title: 'Sin datos', description: 'No hay información para exportar.' });
        return;
    }
    
    // Clean data for CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => {
        let str = String(value).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);
  };
  
  const salesTotals = salesReportData.reduce((acc, sale) => {
    acc.total += sale.totalAmount;
    acc.base += (sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0);
    acc.tax += (sale.taxDetails?.general || 0) + (sale.taxDetails?.reduced || 0);
    acc.exempt += (sale.subtotals?.exempt || 0);
    return acc;
  }, { total: 0, base: 0, tax: 0, exempt: 0 });

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Central de Reportes"
          description="Analiza el rendimiento fiscal, financiero y de inventario de tu negocio."
        />

        <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="inventory">Inventario</TabsTrigger>
                <TabsTrigger value="financial">Financieros</TabsTrigger>
            </TabsList>

            {/* TAB: VENTAS (LIBRO DE VENTAS) */}
            <TabsContent value="sales" className="space-y-6">
                 <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className='pb-2'><CardDescription>Total Ventas Período</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-bold'>{formatCurrency(salesTotals.total)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='pb-2'><CardDescription>IVA Total</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-bold text-primary'>{formatCurrency(salesTotals.tax)}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='pb-2'><CardDescription>Monto Exento</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-bold text-muted-foreground'>{formatCurrency(salesTotals.exempt)}</div></CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between'>
                        <div>
                            <CardTitle>Libro de Ventas Mensual</CardTitle>
                            <CardDescription>Genera el reporte para declaraciones de IVA (SENIAT).</CardDescription>
                        </div>
                        {salesReportData.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(salesReportData.map(s => ({
                                Fecha: format(parseISO(String(s.createdAt)), 'dd/MM/yyyy'),
                                Factura: s.invoiceNumber,
                                Cliente: s.customerName,
                                Total: s.totalAmount,
                                Base: (s.subtotals?.general || 0) + (s.subtotals?.reduced || 0),
                                IVA: (s.taxDetails?.general || 0) + (s.taxDetails?.reduced || 0),
                                Exento: s.subtotals?.exempt || 0
                            })), 'Libro_Ventas')}>
                                <FileSpreadsheet className='mr-2 h-4 w-4' /> Exportar CSV
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/20 items-end'>
                             <div className='flex-1 space-y-2'>
                                <label className='text-xs font-bold uppercase'>Mes</label>
                                <Select value={reportMonth} onValueChange={setReportMonth}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Array.from({length: 12}).map((_, i) => (
                                            <SelectItem key={i} value={String(i)}>{format(new Date(0, i), 'MMMM', { locale: es })}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='w-full sm:w-[120px] space-y-2'>
                                <label className='text-xs font-bold uppercase'>Año</label>
                                <Select value={reportYear} onValueChange={setReportYear}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleGenerateSalesReport} disabled={loadingSalesReport} className='w-full sm:w-auto'>
                                {loadingSalesReport ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Reporte"}
                            </Button>
                        </div>

                        <div className='rounded-md border overflow-x-auto'>
                           <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Nº Factura</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className='text-right'>Base</TableHead>
                                    <TableHead className='text-right'>IVA</TableHead>
                                    <TableHead className='text-right'>Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingSalesReport ? (
                                    <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : salesReportData.length > 0 ? (
                                    salesReportData.map((sale) => (
                                        <TableRow key={sale._id}>
                                            <TableCell className='whitespace-nowrap'>{format(parseISO(String(sale.createdAt)), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className='font-mono text-xs'>{String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                                            <TableCell className='max-w-[200px] truncate uppercase font-medium'>{sale.customerName}</TableCell>
                                            <TableCell className='text-right'>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0))}</TableCell>
                                            <TableCell className='text-right text-primary font-medium'>{formatCurrency((sale.taxDetails?.general || 0) + (sale.taxDetails?.reduced || 0))}</TableCell>
                                            <TableCell className='text-right font-bold'>{formatCurrency(sale.totalAmount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Selecciona un período y presiona generar.</TableCell></TableRow>
                                )}
                            </TableBody>
                             {salesReportData.length > 0 && (
                                <TableFooter>
                                    <TableRow className='bg-muted/50 font-bold'>
                                        <TableCell colSpan={3} className='text-right'>TOTALES</TableCell>
                                        <TableCell className='text-right'>{formatCurrency(salesTotals.base)}</TableCell>
                                        <TableCell className='text-right'>{formatCurrency(salesTotals.tax)}</TableCell>
                                        <TableCell className='text-right'>{formatCurrency(salesTotals.total)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                             )}
                           </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB: INVENTARIO (KARDEX) */}
            <TabsContent value="inventory" className="space-y-6">
                <Card>
                    <CardHeader className='flex flex-row items-center justify-between'>
                         <div>
                            <CardTitle>Kardex de Movimientos</CardTitle>
                            <CardDescription>Análisis de entradas y salidas por producto individual.</CardDescription>
                        </div>
                        {kardexData.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => exportToCSV(kardexData, `Kardex_${selectedProductId}`)}>
                                <FileSpreadsheet className='mr-2 h-4 w-4' /> Exportar CSV
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-muted/20 items-end'>
                            <div className='flex-1 space-y-2'>
                                <label className='text-xs font-bold uppercase'>Producto</label>
                                <Select onValueChange={setSelectedProductId} value={selectedProductId || ""}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                    <SelectContent>
                                        {data?.inventoryProducts.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='space-y-2'>
                                <label className='text-xs font-bold uppercase'>Rango de Fechas</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}` : format(dateRange.from, "dd/MM/yy")) : <span>Seleccionar...</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar locale={es} mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleGenerateKardex} disabled={loadingKardex} className='w-full sm:w-auto'>
                                {loadingKardex ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Kardex"}
                            </Button>
                        </div>

                        <div className='rounded-md border overflow-x-auto'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className='text-center'>Entrada</TableHead>
                                        <TableHead className='text-center'>Salida</TableHead>
                                        <TableHead className='text-right'>Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingKardex ? (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                    ) : kardexData.length > 0 ? (
                                        kardexData.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className='whitespace-nowrap'>{format(parseISO(item.date), 'dd/MM/yy HH:mm')}</TableCell>
                                                <TableCell className='font-mono text-xs'>{item.document}</TableCell>
                                                <TableCell className='text-xs uppercase text-muted-foreground'>{item.concept}</TableCell>
                                                <TableCell className='text-center text-green-600 font-bold'>{item.entry || ''}</TableCell>
                                                <TableCell className='text-center text-red-600 font-bold'>{item.exit > 0 ? `-${item.exit}` : ''}</TableCell>
                                                <TableCell className='text-right font-black'>{item.balance}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">Elige un producto y rango para ver movimientos.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB: FINANCIEROS */}
            <TabsContent value="financial">
                 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tendencia de Ganancias</CardTitle>
                            <CardDescription>Resumen de los últimos 6 meses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {loading ? <Skeleton className="h-[300px] w-full" /> : <MonthlyProfitChart data={data?.monthlyProfit} />}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Gastos por Categoría</CardTitle>
                            <CardDescription>Desglose porcentual del gasto operativo.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-[300px] w-full" /> : <ExpenseDistributionChart data={data?.expenseDistribution} />}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
