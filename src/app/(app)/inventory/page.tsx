'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3, Package, Calendar, Trash2, Loader2, Truck, ArrowRight, Eye, Edit3 } from 'lucide-react';
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
    const totalValue = productsData.reduce((acc, p) => acc + (p.stock * (p.cost || 0)), 0);
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
      const storeId = localStorage.getItem('storeId');
      const response = await fetch(`/api/products/${productToDelete._id}?storeId=${storeId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo eliminar el registro.');
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
    setIsAdjusting(true);
    try {
        const res = await fetch(`/api/products/${adjustingProduct._id}/adjust-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantity: parseFloat(adjustmentQty),
                reason: adjustmentReason,
                storeId: localStorage.getItem('storeId')
            })
        });
        if (!res.ok) throw new Error("Error en ajuste");
        toast({ title: "Merma Registrada" });
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
        String(p.sku || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  const isAdmin = userRole === 'Administrador Principal';
  const isSeller = userRole === 'Vendedor';

  return (
    <div className="flex flex-1 flex-col pb- safe">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title="Inventario"
          description="Gestión física y valorización de mercancía."
          actions={
            <div className="flex gap-2 w-full sm:w-auto">
              {(isAdmin || userRole === 'Almacenista') && (
                <Button asChild className="flex-1 sm:flex-none rounded-xl font-black uppercase shadow-lg shadow-primary/20 h-12">
                    <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Item</Link>
                </Button>
              )}
            </div>
          }
        />
        
        {/* KPI GRID RESPONSIVO */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 shadow-sm p-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valorización</span>
                    <div className="text-xl font-black truncate">{loading ? '...' : formatCurrency(metrics?.totalValue || 0)}</div>
                </div>
            </Card>
            <Card className="border-2 shadow-sm p-4 border-amber-100 bg-amber-50/10">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Stock Crítico</span>
                    <div className="text-xl font-black text-amber-800">{loading ? '...' : metrics?.lowStockCount}</div>
                </div>
            </Card>
            <Card className="border-2 shadow-sm p-4 border-red-100 bg-red-50/10">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-red-700 tracking-widest">Agotados</span>
                    <div className="text-xl font-black text-red-800">{loading ? '...' : metrics?.outOfStockCount}</div>
                </div>
            </Card>
            <Card className="border-2 shadow-sm p-4 bg-primary/5 border-primary/10">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest">Vencimientos</span>
                    <div className="text-xl font-black text-primary">{loading ? '...' : metrics?.nearExpiryCount}</div>
                </div>
            </Card>
        </div>
        
        <div className="flex flex-col gap-4">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Buscar producto por nombre o SKU..." 
                    className="pl-10 h-14 font-bold border-2 rounded-2xl shadow-sm text-base"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* VISTA HÍBRIDA: TABLA (DESKTOP) VS CARDS (MOBILE) */}
            <div className="grid grid-cols-1 md:hidden gap-3">
                {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />) : 
                filteredProducts.map(p => (
                    <Card key={p._id} className="border-2 p-4 shadow-sm active:scale-[0.98] transition-all">
                        <div className="flex gap-4">
                            <div className="h-16 w-16 rounded-xl bg-muted relative overflow-hidden shrink-0 border">
                                {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="h-6 w-6 m-auto opacity-20" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black uppercase text-xs truncate leading-tight">{p.name}</h3>
                                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">SKU: {p.sku || 'S/N'}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase opacity-40">Precio</span>
                                        <span className="font-black text-sm text-primary">{formatCurrency(p.price)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase opacity-40">Stock</span>
                                        <Badge variant={p.status === 'En Stock' ? 'secondary' : 'destructive'} className="text-[10px] font-black h-6">{p.stock}</Badge>
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl border-2">
                                    <DropdownMenuItem onSelect={() => router.push(`/inventory/${p._id}`)} className="p-3 font-bold uppercase text-xs"><Eye className="mr-2 h-4 w-4"/> Ver Detalle</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => router.push(`/inventory/${p._id}/edit`)} className="p-3 font-bold uppercase text-xs"><Edit3 className="mr-2 h-4 w-4"/> Editar Ficha</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="hidden md:block border-2 shadow-xl overflow-hidden rounded-2xl">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6 font-black text-[10px] uppercase">Producto</TableHead>
                            <TableHead className='text-right font-black text-[10px] uppercase'>PVP (Bs)</TableHead>
                            <TableHead className='text-right font-black text-[10px] uppercase'>Existencia</TableHead>
                            <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                            <TableHead className="w-[50px] pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell className="pl-6"><Skeleton className="h-10 w-48" /></TableCell><TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell><TableCell className='text-right'><Skeleton className="h-6 w-12 ml-auto" /></TableCell><TableCell><Skeleton className="h-8 w-24 rounded-full" /></TableCell><TableCell className="pr-6"><Skeleton className="h-10 w-10 ml-auto" /></TableCell></TableRow>
                        )) : filteredProducts.map((p) => (
                            <TableRow key={p._id} className="hover:bg-primary/[0.02] transition-all cursor-pointer" onClick={() => router.push(`/inventory/${p._id}`)}>
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-muted relative overflow-hidden shrink-0 border">
                                            {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="h-5 w-5 m-auto opacity-20" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs uppercase truncate max-w-[250px]">{p.name}</span>
                                            <span className="text-[10px] font-mono text-muted-foreground">SKU: {p.sku || 'S/N'}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-sm">{formatCurrency(p.price)}</TableCell>
                                <TableCell className='text-right font-black text-primary text-sm'>{p.stock}</TableCell>
                                <TableCell><Badge variant={p.status === 'En Stock' ? 'secondary' : 'destructive'} className="text-[10px] font-black uppercase">{p.status}</Badge></TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 border-2 shadow-2xl rounded-xl">
                                            <DropdownMenuItem onSelect={() => router.push(`/inventory/${p._id}/edit`)} className="p-3 font-bold uppercase text-xs"><Edit3 className="mr-2 h-4 w-4"/> Modificar</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3" onSelect={() => setProductToDelete(p)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>

        {/* DIALOGOS DE CONTROL */}
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent className="border-4 mx-4 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-black uppercase italic text-red-600">¿Eliminar Producto?</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-foreground">Esta acción es irreversible y purgará el registro de la base de datos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel className="font-bold rounded-xl h-12">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 uppercase font-black shadow-lg h-12 rounded-xl">Confirmar Borrado</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
