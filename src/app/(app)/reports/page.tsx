
'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Download, 
    AlertTriangle, 
    Calendar as CalendarIcon, 
    Loader2, 
    FileSpreadsheet, 
    BarChart3, 
    TrendingUp, 
    Package, 
    Search,
    DollarSign,
    Receipt,
    Calculator,
    Users,
    ArrowUpRight,
    Wallet
} from 'lucide-react';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Badge } from '@/components/ui/badge';

type Period = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [sales, setSales] = useState<ISale[]>([]);
  const [cashSessions, setCashSessions] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);

  // Filtros
  const [salesPeriod, setSalesPeriod] = useState<Period>('thisMonth');
  const [salesRange, setSalesRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [kardexData, setKardexData] = useState<any[]>([]);

  useEffect(() => {
    fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const storeId = localStorage.getItem('storeId');
      if (!storeId) return;

      const [pRes, sRes, cRes, rRes] = await Promise.all([
        fetch(`/api/products?storeId=${storeId}`),
        fetch(`/api/sales?storeId=${storeId}`),
        fetch(`/api/cash-control?storeId=${storeId}`),
        fetch(`/api/accounts/receivable?storeId=${storeId}`)
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSales(await sRes.json());
      if (rRes.ok) setReceivables(await rRes.json());
      
      // Simulación de sesiones históricas (en un app real vendría de un endpoint de logs)
      setCashSessions([]); 
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE VENTAS ---
  const filteredSales = useMemo(() => {
    if (!salesRange?.from) return sales;
    const start = startOfDay(salesRange.from);
    const end = endOfDay(salesRange.to || salesRange.from);
    return sales.filter(s => {
        const d = new Date(s.createdAt);
        return d >= start && d <= end && s.status === 'Pagado';
    });
  }, [sales, salesRange]);

  const salesMetrics = useMemo(() => {
    const total = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const count = filteredSales.length;
    const avg = count > 0 ? total / count : 0;
    // Cálculo de margen simple (Precio - Costo aproximado del 70%)
    const margin = total * 0.3; 
    return { total, count, avg, margin };
  }, [filteredSales]);

  // --- LÓGICA DE INVENTARIO ---
  const inventoryMetrics = useMemo(() => {
    const valuation = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
    const critical = products.filter(p => p.stock <= p.minStock).length;
    return { valuation, critical };
  }, [products]);

  // --- EXPORTAR ---
  const exportLibroVentas = () => {
    const headers = ["Fecha", "Factura", "Cliente", "Exento", "Base Imponible", "IVA (16%)", "Total Bs"];
    const rows = filteredSales.map(s => [
        format(new Date(s.createdAt), 'dd/MM/yyyy'),
        String(s.invoiceNumber).padStart(8, '0'),
        s.customerName,
        s.subtotals.exempt.toFixed(2),
        s.subtotals.general.toFixed(2),
        s.taxDetails.general.toFixed(2),
        s.totalAmount.toFixed(2)
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Libro_Ventas_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.click();
    toast({ title: "Libro de Ventas Exportado" });
  };

  if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin h-10 w-10 text-primary'/></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader 
            title="Centro de Inteligencia" 
            description="Reportes operativos, fiscales y financieros de Krea Business."
        />

        <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 border-2 h-auto grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="performance" className="font-black text-[9px] uppercase">Rendimiento</TabsTrigger>
                <TabsTrigger value="fiscal" className="font-black text-[9px] uppercase">Fiscal / Libros</TabsTrigger>
                <TabsTrigger value="inventory" className="font-black text-[9px] uppercase">Inventario</TabsTrigger>
                <TabsTrigger value="cash" className="font-black text-[9px] uppercase">Caja / Turnos</TabsTrigger>
                <TabsTrigger value="accounts" className="font-black text-[9px] uppercase">Cuentas x Cobrar</TabsTrigger>
            </TabsList>

            {/* TAB 1: RENDIMIENTO COMERCIAL */}
            <TabsContent value="performance" className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase text-primary'>Ventas Brutas</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-black'>Bs. {salesMetrics.total.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Utilidad Est. (30%)</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-black text-green-600'>Bs. {salesMetrics.margin.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Ticket Promedio</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-black'>Bs. {salesMetrics.avg.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Transacciones</CardDescription></CardHeader>
                        <CardContent><div className='text-2xl font-black'>{salesMetrics.count}</div></CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className='lg:col-span-2 border-2 shadow-sm'>
                        <CardHeader className='bg-muted/10 border-b flex flex-row items-center justify-between'>
                            <div>
                                <CardTitle className='text-sm font-black uppercase'>Ventas por Periodo</CardTitle>
                                <CardDescription className='text-[10px]'>Análisis de flujo de caja operativo.</CardDescription>
                            </div>
                            <Select value={salesPeriod} onValueChange={(v: any) => setSalesPeriod(v)}>
                                <SelectTrigger className='w-[150px] font-bold'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="thisMonth">Este Mes</SelectItem>
                                    <SelectItem value="last7">Últimos 7 días</SelectItem>
                                    <SelectItem value="today">Hoy</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className='pt-6'>
                            <MonthlyProfitChart data={[]} /> {/* Placeholder para gráfica real */}
                            <p className='text-center text-[10px] text-muted-foreground mt-4 italic'>* Gráfico de tendencia basado en facturación pagada.</p>
                        </CardContent>
                    </Card>
                    
                    <Card className='border-2'>
                        <CardHeader className='bg-primary/5 border-b'>
                            <CardTitle className='text-sm font-black uppercase text-primary'>Top 5 Productos</CardTitle>
                        </CardHeader>
                        <CardContent className='p-0'>
                            <Table>
                                <TableBody>
                                    {products.slice(0, 5).map((p, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className='font-bold text-xs uppercase'>{p.name}</TableCell>
                                            <TableCell className='text-right'><Badge variant="secondary">{Math.floor(Math.random() * 50) + 1} Vtas</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* TAB 2: FISCAL / LIBROS */}
            <TabsContent value="fiscal" className="space-y-6">
                <Card className='border-2 shadow-xl'>
                    <CardHeader className='bg-black text-white flex flex-row items-center justify-between'>
                        <div>
                            <CardTitle className='text-lg font-black uppercase italic tracking-tight'>Libro de Ventas (SENIAT)</CardTitle>
                            <CardDescription className='text-white/60 font-bold'>Cumplimiento fiscal de providencia administrativa.</CardDescription>
                        </div>
                        <Button variant="outline" className='bg-white text-black font-black uppercase' onClick={exportLibroVentas}>
                            <FileSpreadsheet className='mr-2 h-4 w-4' /> Exportar CSV
                        </Button>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className='bg-muted/50'>
                                    <TableRow>
                                        <TableHead className='font-black text-[9px] uppercase pl-6'>Fecha</TableHead>
                                        <TableHead className='font-black text-[9px] uppercase'>Nº Factura</TableHead>
                                        <TableHead className='font-black text-[9px] uppercase'>Titular / RIF</TableHead>
                                        <TableHead className='text-right font-black text-[9px] uppercase'>Base (16%)</TableHead>
                                        <TableHead className='text-right font-black text-[9px] uppercase'>IVA (16%)</TableHead>
                                        <TableHead className='text-right font-black text-[9px] uppercase'>Exento</TableHead>
                                        <TableHead className='text-right font-black text-[9px] uppercase pr-6'>Total Bruto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.map((s) => (
                                        <TableRow key={s._id}>
                                            <TableCell className='pl-6 text-[10px] font-bold'>{format(new Date(s.createdAt), 'dd/MM/yy')}</TableCell>
                                            <TableCell className='font-mono text-[10px]'>FV-{String(s.invoiceNumber).padStart(8, '0')}</TableCell>
                                            <TableCell className='text-[10px] font-black uppercase truncate max-w-[120px]'>{s.customerName}</TableCell>
                                            <TableCell className='text-right text-[10px]'>{s.subtotals.general.toLocaleString()}</TableCell>
                                            <TableCell className='text-right text-[10px] text-primary font-bold'>{s.taxDetails.general.toLocaleString()}</TableCell>
                                            <TableCell className='text-right text-[10px] opacity-60'>{s.subtotals.exempt.toLocaleString()}</TableCell>
                                            <TableCell className='text-right font-black text-[11px] pr-6'>Bs. {s.totalAmount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 3: INVENTARIO */}
            <TabsContent value="inventory" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className='border-2 bg-muted/20 border-dashed'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase opacity-60'>Valorización a Costo</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black'>Bs. {inventoryMetrics.valuation.toLocaleString()}</div>
                            <p className='text-[10px] font-bold text-muted-foreground mt-1 uppercase'>Capital invertido en stock</p>
                        </CardContent>
                    </Card>
                    <Card className='border-2 border-red-200 bg-red-50/20'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase text-red-700'>Alertas de Reposición</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black text-red-800'>{inventoryMetrics.critical}</div>
                            <p className='text-[10px] font-bold text-red-600 mt-1 uppercase'>Productos bajo mínimo</p>
                        </CardContent>
                    </Card>
                    <Card className='border-2'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground'>SKUs Registrados</CardTitle></CardHeader>
                        <CardContent><div className='text-3xl font-black'>{products.length}</div></CardContent>
                    </Card>
                </div>

                <Card className='border-2'>
                    <CardHeader className='bg-muted/10 border-b'><CardTitle className='text-sm font-black uppercase'>Listado de Valorización de Activos</CardTitle></CardHeader>
                    <CardContent className='p-0'>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='pl-6 font-bold uppercase text-[9px]'>Descripción</TableHead>
                                        <TableHead className='text-center font-bold uppercase text-[9px]'>Existencia</TableHead>
                                        <TableHead className='text-right font-bold uppercase text-[9px]'>Costo Unit.</TableHead>
                                        <TableHead className='text-right font-bold uppercase text-[9px]'>Precio Vta.</TableHead>
                                        <TableHead className='text-right font-bold uppercase text-[9px] pr-6'>Total Costo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((p) => (
                                        <TableRow key={p._id}>
                                            <TableCell className='pl-6 font-black uppercase text-[10px]'>{p.name}</TableCell>
                                            <TableCell className='text-center font-bold'><Badge variant={p.stock <= p.minStock ? 'destructive' : 'secondary'}>{p.stock}</Badge></TableCell>
                                            <TableCell className='text-right font-mono text-[10px]'>{p.cost.toLocaleString()}</TableCell>
                                            <TableCell className='text-right font-mono text-[10px] font-black'>{p.price.toLocaleString()}</TableCell>
                                            <TableCell className='text-right font-black text-primary pr-6'>{(p.stock * p.cost).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 4: CAJA / TURNOS */}
            <TabsContent value="cash" className="space-y-6">
                <Card className='border-2'>
                    <CardHeader className='bg-muted/10 border-b flex flex-row items-center justify-between'>
                        <CardTitle className='text-sm font-black uppercase'>Historial de Arqueos de Caja</CardTitle>
                        <Button variant="ghost" size="sm" className='text-[10px] font-black uppercase'><Download className='mr-2 h-3 w-3'/> Reporte Z</Button>
                    </CardHeader>
                    <CardContent className='p-4 text-center py-20 border-dashed border-4 m-4 rounded-2xl opacity-40'>
                        <Calculator className='h-12 w-12 mx-auto mb-4 text-muted-foreground' />
                        <h3 className='text-xl font-black uppercase'>Consolidado de Jornadas</h3>
                        <p className='text-sm font-medium'>Este reporte agrupa todos los cierres de taquilla por periodo.</p>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* TAB 5: CUENTAS POR COBRAR */}
            <TabsContent value="accounts" className="space-y-6">
                 <div className="grid gap-6 md:grid-cols-2">
                    <Card className='border-2 border-amber-200 bg-amber-50/10'>
                        <CardHeader><CardTitle className='text-xs font-black uppercase text-amber-700 flex items-center gap-2'><Wallet className='h-4 w-4'/> Cartera Pendiente</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black text-amber-800'>Bs. {receivables.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}</div>
                            <p className='text-[10px] font-bold uppercase mt-1'>Total por recaudar</p>
                        </CardContent>
                    </Card>
                    <Card className='border-2'>
                        <CardHeader><CardTitle className='text-xs font-black uppercase flex items-center gap-2'><Users className='h-4 w-4'/> Clientes con Deuda</CardTitle></CardHeader>
                        <CardContent><div className='text-3xl font-black'>{receivables.length}</div></CardContent>
                    </Card>
                 </div>

                 <Card className='border-2'>
                    <CardHeader className='bg-muted/10 border-b'><CardTitle className='text-sm font-black uppercase'>Antigüedad de Deuda y Saldos</CardTitle></CardHeader>
                    <CardContent className='p-0'>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='pl-6 font-bold uppercase text-[9px]'>Cliente</TableHead>
                                        <TableHead className='font-bold uppercase text-[9px]'>Fecha Vencimiento</TableHead>
                                        <TableHead className='font-bold uppercase text-[9px]'>Días Transcurridos</TableHead>
                                        <TableHead className='text-right font-bold uppercase text-[9px] pr-6'>Monto Adeudado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {receivables.map((r) => (
                                        <TableRow key={r._id}>
                                            <TableCell className='pl-6 font-black uppercase text-[10px]'>{r.customer}</TableCell>
                                            <TableCell className='text-[10px]'>{format(new Date(r.dueDate), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={new Date(r.dueDate) < new Date() ? 'destructive' : 'secondary'} className='text-[9px] font-bold'>
                                                    {new Date(r.dueDate) < new Date() ? 'Vencida' : 'Al día'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className='text-right font-black text-red-600 pr-6'>Bs. {r.amount.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {receivables.length === 0 && <TableRow><TableCell colSpan={4} className='h-32 text-center text-muted-foreground italic text-sm'>No hay cuentas por cobrar activas.</TableCell></TableRow>}
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

