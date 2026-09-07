'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3, Package, Image as ImageIcon, Calendar, Trash2, Loader2, Truck } from 'lucide-react';
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
  const [userRole, setUserRole] = useState('');
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
      const role = localStorage.getItem('userRole') || '';
      setUserRole(role);

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
        toast({ variant: 'destructive', title: "Justificación requerida" });
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
        toast({ title: "Ajuste Procesado" });
        setAdjustingProduct(null);
        fetchProducts();
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
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

  const isAdmin = userRole === 'Administrador Principal';
  const isAccountant = userRole === 'Contador';
  const isSeller = userRole === 'Vendedor';
  const canManageLosses = isAdmin || userRole === 'Almacenista';
  const canSeeCosts = isAdmin || isAccountant;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Consola de gestión de activos y existencias."
          actions={
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {canManageLosses && (
                  <>
                    <Button variant="outline" asChild className="flex-1 sm:flex-none rounded-xl h-11 shadow-sm">
                        <Link href="/purchases"><Truck className="mr-2 h-4 w-4" />Compras</Link>
                    </Button>
                    <Button asChild className="flex-1 sm:flex-none rounded-xl font-black uppercase shadow-lg shadow-primary/20 h-11">
                        <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" />Dar de Alta</Link>
                    </Button>
                  </>
              )}
            </div>
          }
        />
        
        {metrics && metrics.nearExpiryCount > 0 && (
            <Alert variant="destructive" className="border-4 shadow-xl bg-red-50 border-red-500 animate-in fade-in slide-in-from-top-2 duration-500">
                <Calendar className="h-5 w-5 text-red-600" />
                <AlertTitle className="font-black uppercase text-red-700">Aviso de Vencimiento Próximo</AlertTitle>
                <AlertDescription className="font-bold text-red-800">
                    Se han detectado {metrics.nearExpiryCount} productos que vencerán pronto.
                </AlertDescription>
            </Alert>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {canSeeCosts && (
                <Card className="border-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valorización Almacén</CardTitle>
                        <Boxes className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent><div className="text-xl md:text-2xl font-black">{loading ? <Skeleton className='h-8 w-24'/> : formatCurrency(metrics?.totalValue || 0)}</div></CardContent>
                </Card>
            )}
            
            <Card className="border-2 shadow-sm border-amber-100 bg-amber-50/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Stock Crítico</CardTitle>
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent><div className="text-xl md:text-2xl font-black text-amber-800">{loading ? <Skeleton className='h-8 w-12'/> : metrics?.lowStockCount}</div></CardContent>
            </Card>

            <Card className="border-2 shadow-sm border-red-100 bg-red-50/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-700">Agotados</CardTitle>
                    <Ban className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent><div className="text-xl md:text-2xl font-black text-red-800">{loading ? <Skeleton className='h-8 w-12'/> : metrics?.outOfStockCount}</div></CardContent>
            </Card>

            <Card className={cn("border-2 shadow-sm", metrics?.nearExpiryCount! > 0 ? "border-red-500 bg-red-50" : "bg-muted/10")}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest">Vencimientos</CardTitle>
                    <Calendar className="h-4 w-4" />
                </CardHeader>
                <CardContent><div className="text-xl md:text-2xl font-black">{loading ? <Skeleton className='h-8 w-12'/> : metrics?.nearExpiryCount}</div></CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className={cn("lg:col-span-8", isSeller && "lg:col-span-12")}>
            <Card className="border-2 shadow-lg overflow-hidden">
              <CardHeader className="pb-4 border-b bg-muted/10">
                <div className='flex flex-col md:flex-row justify-between md:items-center gap-4'>
                  <CardTitle className="text-lg font-black uppercase tracking-tight italic">Listado de Mercancía</CardTitle>
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por SKU o nombre..." className="pl-9 h-11 font-bold border-2" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6 font-black text-[10px] uppercase">Producto</TableHead>
                            <TableHead className='text-right font-black text-[10px] uppercase'>PVP (Bs)</TableHead>
                            <TableHead className='text-right font-black text-[10px] uppercase'>Existencia</TableHead>
                            <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase">Estado</TableHead>
                            <TableHead className="w-[50px] pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell className="pl-6"><Skeleton className="h-8 w-40" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell><TableCell className='text-right'><Skeleton className="h-4 w-12" /></TableCell><TableCell className="hidden lg:table-cell"><Skeleton className="h-6 w-20 rounded-full" /></TableCell><TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
                        )) : filteredProducts.map((p) => (
                            <TableRow key={p._id} className={cn("hover:bg-primary/[0.02]", p.expiryDate && differenceInDays(new Date(p.expiryDate), new Date()) <= 15 ? "bg-red-50/20" : "")}>
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-muted relative overflow-hidden shrink-0 border">
                                            {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="40px" unoptimized /> : <Package className="h-5 w-5 m-auto opacity-20" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-[11px] uppercase truncate max-w-[180px]">{p.name}</span>
                                            {p.expiryDate && <span className="text-[8px] font-bold text-red-600 uppercase">Vence: {format(new Date(p.expiryDate), 'dd/MM/yy')}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-xs md:text-sm">{formatCurrency(p.price)}</TableCell>
                                <TableCell className='text-right font-black text-primary text-xs md:text-sm'>{p.stock}</TableCell>
                                <TableCell className="hidden lg:table-cell"><Badge variant={p.status === 'En Stock' ? 'secondary' : 'destructive'} className="text-[9px] font-black uppercase">{p.status}</Badge></TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 border-2 shadow-2xl">
                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer" onSelect={() => router.push(`/inventory/${p._id}`)}><ImageIcon className="mr-2 h-4 w-4" /> Ver Ficha</DropdownMenuItem>
                                            {(isAdmin || userRole === 'Almacenista') && (
                                                <>
                                                    <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer" onSelect={() => router.push(`/inventory/${p._id}/edit`)}><BarChart3 className="mr-2 h-4 w-4" /> Modificar</DropdownMenuItem>
                                                    <DropdownMenuItem className="font-black text-xs uppercase p-3 cursor-pointer text-amber-600" onSelect={() => setAdjustingProduct(p)}><Trash2 className="mr-2 h-4 w-4" /> Registrar Pérdida</DropdownMenuItem>
                                                </>
                                            )}
                                            {isAdmin && (
                                                <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3 cursor-pointer" onSelect={() => setProductToDelete(p)}><Ban className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {!isSeller && (
            <div className="lg:col-span-4 space-y-6">
                <TopStockChart data={products} />
                <Card className="border-2 border-dashed bg-muted/20">
                    <CardHeader><CardTitle className="text-[10px] font-black uppercase opacity-60">Guía de Roles</CardTitle></CardHeader>
                    <CardContent><p className="text-[10px] font-medium italic opacity-70 leading-relaxed">Como {userRole}, tu acceso está limitado a las funciones de {userRole === 'Almacenista' ? 'control físico' : 'auditoría financiera'}.</p></CardContent>
                </Card>
            </div>
          )}
        </div>
        
        {/* DIALOGOS DE CONTROL */}
        <Dialog open={!!adjustingProduct} onOpenChange={() => setAdjustingProduct(null)}>
            <DialogContent className='border-4 border-amber-500'>
                <DialogHeader><DialogTitle className='font-black uppercase italic'>Registrar Baja / Merma</DialogTitle></DialogHeader>
                <div className='py-4 space-y-4'>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase'>Cantidad a descontar</Label>
                        <Input type="number" step="0.001" className='h-12 text-2xl font-black text-center' value={adjustmentQty} onChange={e => setAdjustmentQty(e.target.value)} />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase'>Justificación</Label>
                        <Textarea placeholder="Ej: Producto dañado por transporte..." value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} />
                    </div>
                </div>
                <DialogFooter><Button disabled={isAdjusting} className='w-full font-black uppercase bg-amber-600' onClick={handleRegisterLoss}>Confirmar Merma</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent className="border-4 mx-4">
                <AlertDialogHeader><AlertDialogTitle className="font-black uppercase italic">¿Eliminar Producto?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 uppercase font-black">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
