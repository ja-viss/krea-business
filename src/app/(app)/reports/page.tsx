'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MoreVertical, AlertTriangle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
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
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

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
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Kardex
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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
  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));


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
        setError("Por favor, selecciona un producto y un rango de fechas.");
        return;
    }
    setLoadingKardex(true);
    setError(null);
    setKardexData([]);

    try {
        const storeId = localStorage.getItem('storeId');
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
        
        const response = await fetch(`/api/sales?storeId=${storeId}&productId=${selectedProductId}&from=${fromDate}&to=${toDate}`);
        if (!response.ok) {
            throw new Error('No se pudieron obtener los movimientos de venta.');
        }

        const sales: ISale[] = await response.json();
        const selectedProduct = data?.inventoryProducts.find(p => p._id === selectedProductId);
        if (!selectedProduct) {
             throw new Error('Producto seleccionado no encontrado.');
        }

        let currentBalance = selectedProduct.stock;
        
        const saleMovements = sales
            .flatMap(sale => 
                sale.items
                    .filter((item: any) => String(item.product) === selectedProductId)
                    .map((item: any) => ({
                        date: String(sale.createdAt),
                        document: `FV-${String(sale.invoiceNumber).padStart(8, '0')}`,
                        concept: 'Venta a Cliente',
                        entry: 0,
                        exit: item.quantity,
                        balance: 0 
                    }))
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const finalMovements = saleMovements.map(mov => {
            const movementWithBalance = { ...mov, balance: currentBalance };
            currentBalance += mov.exit;
            return movementWithBalance;
        }).reverse(); 

        setKardexData(finalMovements);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoadingKardex(false);
    }
  };

   const handleGenerateSalesReport = async () => {
    setLoadingSalesReport(true);
    setError(null);
    setSalesReportData([]);

    try {
      const storeId = localStorage.getItem('storeId');
      const date = new Date(parseInt(reportYear), parseInt(reportMonth));
      const fromDate = format(startOfMonth(date), 'yyyy-MM-dd');
      const toDate = format(endOfMonth(date), 'yyyy-MM-dd');

      const response = await fetch(`/api/sales?storeId=${storeId}&from=${fromDate}&to=${toDate}`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener los datos de ventas para el libro.');
      }
      
      const sales: ISale[] = await response.json();
      setSalesReportData(sales);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSalesReport(false);
    }
  };

  const getReportComponent = (componentName: string) => {
    if (loading) return <Skeleton className="h-[250px] w-full" />;
    switch(componentName) {
        case 'MonthlyProfitChart': return <MonthlyProfitChart data={data?.monthlyProfit} />;
        case 'ExpenseDistributionChart': return <ExpenseDistributionChart data={data?.expenseDistribution} />;
        default: return <div className="flex h-full items-center justify-center text-muted-foreground">Componente no encontrado</div>;
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);
  };
  
  const salesReportTotals = salesReportData.reduce((acc, sale) => {
    const taxableBase = (sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0);
    const taxAmount = (sale.taxDetails?.general || 0) + (sale.taxDetails?.reduced || 0);
    acc.totalAmount += sale.totalAmount;
    acc.taxableBase += taxableBase;
    acc.taxAmount += taxAmount;
    return acc;
  }, { totalAmount: 0, taxableBase: 0, taxAmount: 0 });

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Central de Reportes"
          description="Analiza el rendimiento de tu negocio con reportes financieros, de ventas e inventario."
        />
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="inventory">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="financial">Financieros</TabsTrigger>
                <TabsTrigger value="sales">Ventas</TabsTrigger>
                <TabsTrigger value="inventory">Inventario</TabsTrigger>
            </TabsList>

            <TabsContent value="financial">
                 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 mt-6">
                    {[{
                        title: 'Reporte de Ventas Mensuales',
                        description: 'Análisis detallado de las ventas del último mes.',
                        component: 'MonthlyProfitChart',
                        },
                        {
                        title: 'Distribución de Gastos',
                        description: 'Desglose de los gastos por categoría.',
                        component: 'ExpenseDistributionChart',
                    }].map((report) => (
                        <Card key={report.title} className="flex flex-col">
                        <CardHeader className='flex-row items-start justify-between'>
                            <div>
                                <CardTitle>{report.title}</CardTitle>
                                <CardDescription>{report.description}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Exportar a PDF</DropdownMenuItem>
                                    <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Exportar a Excel (XLS)</DropdownMenuItem>
                                    <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Exportar a CSV</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {getReportComponent(report.component)}
                        </CardContent>
                        </Card>
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="sales">
                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Libro de Ventas (SENIAT)</CardTitle>
                        <CardDescription>Genera el reporte de ventas con formato fiscal para el período que selecciones.</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='flex flex-col sm:flex-row gap-4 items-center p-4 border rounded-lg bg-muted/50'>
                             <div className='w-full sm:w-auto'>
                                <p className='text-sm font-medium mb-2'>Mes</p>
                                <Select value={reportMonth} onValueChange={setReportMonth}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({length: 12}).map((_, i) => (
                                            <SelectItem key={i} value={String(i)}>
                                                {format(new Date(0, i), 'MMMM', { locale: es })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='w-full sm:w-auto'>
                                <p className='text-sm font-medium mb-2'>Año</p>
                                <Select value={reportYear} onValueChange={setReportYear}>
                                    <SelectTrigger className="w-full sm:w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='self-end w-full sm:w-auto'>
                                <Button onClick={handleGenerateSalesReport} className="w-full" disabled={loadingSalesReport}>
                                    {loadingSalesReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generar Reporte
                                </Button>
                            </div>
                        </div>
                         <div className='border rounded-lg'>
                           <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Nº Factura</TableHead>
                                    <TableHead>Nº Control</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>RIF/Cédula</TableHead>
                                    <TableHead className='text-right'>Total</TableHead>
                                    <TableHead className='text-right'>Base Imponible</TableHead>
                                    <TableHead className='text-right'>IVA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingSalesReport ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : salesReportData.length > 0 ? (
                                    salesReportData.map((sale) => (
                                        <TableRow key={sale._id}>
                                            <TableCell>{format(new Date(`${String(sale.createdAt).split('T')[0]}T00:00:00`), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>00-{String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                                            <TableCell>01-{String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                                            <TableCell>{sale.customerName}</TableCell>
                                            <TableCell>{(sale.customer as any)?.idNumber || 'N/A'}</TableCell>
                                            <TableCell className='text-right'>{formatCurrency(sale.totalAmount)}</TableCell>
                                            <TableCell className='text-right'>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0))}</TableCell>
                                            <TableCell className='text-right'>{formatCurrency((sale.taxDetails?.general || 0) + (sale.taxDetails?.reduced || 0))}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Selecciona un período y genera el reporte.</TableCell></TableRow>
                                )}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-right font-bold text-lg">TOTALES</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(salesReportTotals.totalAmount)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(salesReportTotals.taxableBase)}</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(salesReportTotals.taxAmount)}</TableCell>
                                </TableRow>
                            </TableFooter>
                           </Table>
                         </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="inventory">
                <Card className="mt-6">
                    <CardHeader>
                         <CardTitle>Reporte Kardex por Producto</CardTitle>
                        <CardDescription>Consulta la trazabilidad de un producto, incluyendo entradas y salidas para un rango de fechas.</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='flex flex-col sm:flex-row gap-4 items-center p-4 border rounded-lg bg-muted/50'>
                            <div className='w-full sm:w-auto flex-1'>
                               <p className='text-sm font-medium mb-2'>Producto</p>
                                <Select onValueChange={setSelectedProductId} value={selectedProductId || ""}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un producto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loading ? <SelectItem value="loading" disabled>Cargando...</SelectItem> :
                                         data?.inventoryProducts.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className='w-full sm:w-auto'>
                                 <p className='text-sm font-medium mb-2'>Rango de Fechas</p>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                            "w-full sm:w-[300px] justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                    {format(dateRange.from, "dd/MM/yy", {locale: es})} -{" "}
                                                    {format(dateRange.to, "dd/MM/yy", {locale: es})}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "dd/MM/yy", {locale: es})
                                                )
                                            ) : (
                                            <span>Selecciona un rango de fechas</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            locale={es}
                                            initialFocus
                                            mode="range"
                                            captionLayout="dropdown-buttons" fromYear={1960} toYear={2030}
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div className='self-end'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button onClick={handleGenerateKardex} disabled={loadingKardex}>
                                            {loadingKardex && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Generar Reporte
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Generar en PDF</DropdownMenuItem>
                                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Generar en Excel (XLS)</DropdownMenuItem>
                                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" />Generar en CSV</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                         <div className='border rounded-lg'>
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
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                <p>Generando reporte...</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : kardexData.length > 0 ? (
                                        kardexData.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{format(new Date(`${item.date.split('T')[0]}T00:00:00`), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                                <TableCell className='font-mono text-xs'>{item.document}</TableCell>
                                                <TableCell>{item.concept}</TableCell>
                                                <TableCell className='text-center text-green-600 font-medium'>{item.entry > 0 ? `+${item.entry}` : ''}</TableCell>
                                                <TableCell className='text-center text-red-600 font-medium'>{item.exit > 0 ? `-${item.exit}` : ''}</TableCell>
                                                <TableCell className='text-right font-bold'>{item.balance}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                Selecciona un producto y genera el reporte para ver los movimientos.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </div>


                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
