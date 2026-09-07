
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3, Package, Image as ImageIcon, Calendar, Trash2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IProduct } from '@/models/Product';
import { getInventoryOptimizationRecommendations, InventoryOptimizationInput } from '@/ai/flows/inventory-optimization-recommendations';
import { TopStockChart } from '@/components/inventory/top-stock-chart';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface InventoryMetrics {
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  nearExpiryCount: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals States
  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<IProduct | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('0');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const storeId = localStorage.getItem('storeId');
      if (!storeId) throw new Error('No se ha iniciado sesión.');
      const response = await fetch(`/api/products?storeId=${storeId}`);
      if (!response.ok) throw new Error('Error al cargar productos.');
      const data: IProduct[] = await response.json();
      setProducts(data);
      calculateMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const calculateMetrics = (productsData: IProduct[]) => {
    const totalValue = productsData.reduce((acc, p) => acc + (p.stock * p.cost || 0), 0);
    const lowStockCount = productsData.filter(p => p.status === 'Stock Bajo').length;
    const outOfStockCount = productsData.filter(p => p.status === 'Sin Stock').length;
    const nearExpiryCount = productsData.filter(p => {
        if (!p.expiryDate) return false;
        const days = differenceInDays(new Date(p.expiryDate), new Date());
        return days >= 0 && days <= 15;
    }).length;

    setMetrics({ totalValue, lowStockCount, outOfStockCount, nearExpiryCount });
  };

  const handleGetRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const input: InventoryOptimizationInput = {
        products: products.map(p => ({
          productId: String(p._id),
          productName: p.name,
          currentStock: p.stock,
          averageMonthlySales: Math.floor(Math.random() * 50) + 10,
          holdingCostPerUnit: p.price * 0.05,
          leadTimeInMonths: 0.5,
        })),
      };
      const result = await getInventoryOptimizationRecommendations(input);
      setAiRecommendations(result.recommendations);
    } catch (err: any) {
      setError("Error IA.");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(`/api/products/${productToDelete._id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar.');
      toast({ title: 'Producto Eliminado' });
      fetchProducts();
    } catch (err: any) {
       toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setProductToDelete(null);
    }
  };

  const handleRegisterLoss = async () => {
    if (!adjustingProduct || isAdjusting) return;
    
    const qty = parseFloat(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
        toast({ variant: 'destructive', title: "Cantidad inválida" });
        return;
    }

    if (adjustmentReason.trim().length < 5) {
        toast({ variant: 'destructive', title: "Justificación requerida", description: "Explique brevemente el motivo de la pérdida." });
        return;
    }

    setIsAdjusting(true);
    try {
        const res = await fetch(`/api/products/${adjustingProduct._id}/adjust-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantity: qty,
                reason: adjustmentReason,
                userId: localStorage.getItem('userId'),
                userName: localStorage.getItem('userName'),
                storeId: localStorage.getItem('storeId')
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        toast({ title: "Ajuste Procesado", description: "El stock ha sido descontado y la auditoría registrada." });
        setAdjustingProduct(null);
        setAdjustmentQty('0');
        setAdjustmentReason('');
        fetchProducts();
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Fallo de Ajuste", description: e.message });
    } finally {
        setIsAdjusting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        String(p.sku).toLowerCase().includes(q) ||
        String(p.barcode).includes(q)
    );
  }, [products, searchQuery]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Consola de gestión de activos y existencias."
          actions={
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" asChild className="flex-1 sm:flex-none rounded-xl h-11 shadow-sm">
                <Link href="/reports"><BarChart3 className="mr-2 h-4 w-4" /><span className="sm:inline">Reportes</span></Link>
              </Button>
              <Button asChild className="flex-1 sm:flex-none rounded-xl font-black uppercase shadow-lg shadow-primary/20 h-11">
                <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" /><span className="whitespace-nowrap">Dar de Alta</span></Link>
              </Button>
            </div>
          }
        />
        
        {error && <Alert variant="destructive" className="border-2"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-2"><CardHeader className='pb-2'><Skeleton className='h-4 w-1/2' /></CardHeader><CardContent><Skeleton className='h-7 w-1/3' /></CardContent></Card>
            )) : metrics && (
                <>
                    <Card className="border-2 shadow-sm relative overflow-hidden group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valorización</CardTitle>
                            <Boxes className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl md:text-2xl font-black">{formatCurrency(metrics.totalValue)}</div>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-2 shadow-sm border-amber-100 bg-amber-50/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Stock Crítico</CardTitle>
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl md:text-2xl font-black text-amber-800">{metrics.lowStockCount}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm border-red-100 bg-red-50/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-red-700 tracking-widest">Agotados</CardTitle>
                            <Ban className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl md:text-2xl font-black text-red-800">{metrics.outOfStockCount}</div>
                        </CardContent>
                    </Card>

                    <Card className={cn("border-2 shadow-sm transition-all", metrics.nearExpiryCount > 0 ? "border-red-500 bg-red-50" : "bg-muted/10")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className={cn("text-[10px] font-black uppercase tracking-widest", metrics.nearExpiryCount > 0 ? "text-red-700" : "text-muted-foreground")}>Vencimientos</CardTitle>
                            <Calendar className={cn("h-4 w-4", metrics.nearExpiryCount > 0 ? "text-red-600 animate-pulse" : "text-muted-foreground")} />
                        </CardHeader>
                        <CardContent>
                            <div className={cn("text-xl md:text-2xl font-black", metrics.nearExpiryCount > 0 ? "text-red-800" : "")}>{metrics.nearExpiryCount}</div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card className="border-2 shadow-lg overflow-hidden h-full flex flex-col">
              <CardHeader className="pb-4 border-b bg-muted/10">
                <div className='flex flex-col md:flex-row justify-between md:items-center gap-4'>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic">Catálogo Maestro</CardTitle>
                    <CardDescription className="text-xs font-bold">{filteredProducts.length} registros.</CardDescription>
                  </div>
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar SKU, nombre o barras..." className="pl-9 w-full h-11 font-bold border-2 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="overflow-x-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 font-black text-[10px] uppercase">Identidad</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>PVP (Bs)</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>Stock</TableHead>
                                <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase">Estado</TableHead>
                                <TableHead className="w-[50px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell className="pl-6"><Skeleton className="h-12 w-full max-w-[200px]" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-[80px]" /></TableCell><TableCell className='text-right'><Skeleton className="h-4 w-[40px]" /></TableCell><TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell><TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
                            )) : filteredProducts.length > 0 ? filteredProducts.map((p) => {
                                const isNearExpiry = p.expiryDate && differenceInDays(new Date(p.expiryDate), new Date()) <= 15;
                                return (
                                <TableRow key={p._id} className={cn("hover:bg-primary/[0.02] group transition-colors", isNearExpiry ? "bg-red-50/30" : "")}>
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-muted relative overflow-hidden flex-shrink-0 border-2 border-muted-foreground/10">
                                            {p.imageUrl ? (
                                                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="40px" unoptimized />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-primary/20">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-black text-[11px] uppercase leading-tight line-clamp-1 group-hover:text-primary transition-colors">{p.name}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{p.sku || String(p._id).slice(-6)}</div>
                                                {p.expiryDate && (
                                                    <span className={cn("text-[8px] font-black uppercase px-1.5 rounded-sm border", isNearExpiry ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                                                        Vence: {format(new Date(p.expiryDate), 'dd/MM/yy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-xs md:text-sm font-black">{formatCurrency(p.price)}</TableCell>
                                <TableCell className='text-right font-black text-xs md:text-sm text-primary whitespace-nowrap'>{p.stock} <span className="text-[8px] opacity-60">{p.isWeightable ? 'Kg' : 'Und'}</span></TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <Badge variant={p.status === 'En Stock' ? 'secondary' : p.status === 'Stock Bajo' ? 'outline' : 'destructive'} className="text-[9px] font-black uppercase h-6">
                                        {p.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 transition-all"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 border-2 shadow-2xl">
                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer" onSelect={() => router.push(`/inventory/${p._id}`)}>
                                                <ImageIcon className="mr-2 h-4 w-4" /> Ver Ficha
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer" onSelect={() => router.push(`/inventory/${p._id}/edit`)}>
                                                <BarChart3 className="mr-2 h-4 w-4" /> Modificar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="font-black text-xs uppercase p-3 cursor-pointer text-amber-600" onSelect={() => setAdjustingProduct(p)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Registrar Pérdida
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3 cursor-pointer" onSelect={() => setProductToDelete(p)}>
                                                <Ban className="mr-2 h-4 w-4" /> Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell></TableRow>
                            )}) : <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic font-medium">Sin coincidencias.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-2 shadow-md">
                <CardHeader className="bg-primary/5 border-b pb-4">
                    <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-primary tracking-tight">
                        <TrendingDown className="h-4 w-4" /> IA: Alertas de Reposición
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loadingRecommendations ? (
                        <div className='space-y-4'><Skeleton className='h-12 w-full rounded-xl' /><Skeleton className='h-12 w-full rounded-xl' /></div>
                    ) : aiRecommendations.length > 0 ? (
                        <div className="space-y-3">
                            {aiRecommendations.slice(0, 4).map(rec => {
                                const prod = products.find(p => String(p._id) === rec.productId);
                                return (
                                    <div key={rec.productId} className="flex items-center justify-between p-3 rounded-xl border-2 border-dashed bg-muted/20">
                                        <div className="flex flex-col overflow-hidden pr-2">
                                            <span className="text-[10px] font-black uppercase truncate">{prod?.name}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Stock: {prod?.stock}</span>
                                        </div>
                                        <Badge className="bg-primary text-white font-black text-[9px] uppercase shrink-0">Reponer: {rec.reorderQuantity}</Badge>
                                    </div>
                                );
                            })}
                            <Button variant="outline" size="sm" className="w-full font-black uppercase text-[9px] h-9 rounded-xl" onClick={handleGetRecommendations}>Actualizar IA</Button>
                        </div>
                    ) : (
                        <div className="text-center py-8 border-dashed border-2 rounded-2xl bg-muted/10">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-20 text-primary" />
                            <p className="text-[9px] font-black uppercase opacity-60 mb-4 px-4 leading-tight">Analiza rotación de stock con Inteligencia Artificial.</p>
                            <Button onClick={handleGetRecommendations} variant="outline" className="font-black uppercase text-[10px] h-9 shadow-sm rounded-xl">Activar IA</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="h-[350px]">
                {loading ? <Skeleton className="h-full w-full rounded-2xl border-2" /> : <TopStockChart data={products} />}
            </div>
          </div>
        </div>
        
        {/* DIALOGO DE MERMA / PÉRDIDA */}
        <Dialog open={!!adjustingProduct} onOpenChange={() => setAdjustingProduct(null)}>
            <DialogContent className='sm:max-w-[450px] border-4 border-amber-500'>
                <DialogHeader className='text-center'>
                    <div className='mx-auto w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-2'><Trash2 className='h-8 w-8 text-amber-600'/></div>
                    <DialogTitle className='text-xl font-black uppercase italic tracking-tight'>Registrar Baja / Merma</DialogTitle>
                    <DialogDescription className='font-bold text-amber-800 uppercase text-[10px]'>
                        Esta acción descontará el stock físico permanentemente.
                    </DialogDescription>
                </DialogHeader>
                <div className='py-4 space-y-6'>
                    <div className='bg-muted/30 p-3 rounded-xl border-2 border-dashed'>
                        <p className='text-[10px] font-black uppercase opacity-50'>Producto afectado:</p>
                        <p className='text-sm font-black uppercase text-primary'>{adjustingProduct?.name}</p>
                        <p className='text-[9px] font-bold opacity-60'>Stock Actual: {adjustingProduct?.stock} {adjustingProduct?.isWeightable ? 'Kg' : 'Und'}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase'>Cantidad a descontar</Label>
                        <Input 
                            type="number" 
                            step="0.001"
                            placeholder="0.00"
                            className='h-14 text-3xl font-black text-center border-2' 
                            value={adjustmentQty}
                            onChange={e => setAdjustmentQty(e.target.value)}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase text-red-600'>Justificación (Motivo de la pérdida)</Label>
                        <Textarea 
                            placeholder="Ej: Producto vencido en estantería / Verdura dañada por humedad..." 
                            className='min-h-[100px] font-medium text-xs border-2'
                            value={adjustmentReason}
                            onChange={e => setAdjustmentReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className='flex-col gap-2 sm:flex-row'>
                    <Button variant="outline" className='font-bold flex-1' onClick={() => setAdjustingProduct(null)}>CANCELAR</Button>
                    <Button 
                        disabled={isAdjusting}
                        className='font-black uppercase h-12 px-8 flex-1 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200' 
                        onClick={handleRegisterLoss}
                    >
                        {isAdjusting ? <Loader2 className='animate-spin' /> : "Confirmar Baja"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent className="border-4 shadow-2xl mx-4">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight italic">¿Eliminar Producto?</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold">
                        Esta acción es irreversible y borrará a <span className="text-primary uppercase">"{productToDelete?.name}"</span> del sistema.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel className="font-bold rounded-xl h-11">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700 font-black uppercase h-11 shadow-lg shadow-red-200 rounded-xl">
                        Eliminar Ahora
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
