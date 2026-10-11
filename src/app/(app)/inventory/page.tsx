'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3, Package, Calendar, Trash2, Loader2, Truck, ArrowRight, Eye, Edit3, AlertCircle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { differenceInDays, isBefore, addDays, format } from 'date-fns';

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
  
  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);

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
    
    // Alerta de vencimiento (Próximos 15 días)
    const today = new Date();
    const horizon = addDays(today, 15);
    const nearExpiryCount = productsData.filter(p => {
        if (!p.expiryDate) return false;
        const expDate = new Date(p.expiryDate);
        return isBefore(expDate, horizon) && !isBefore(expDate, today);
    }).length;

    setMetrics({ totalValue, lowStockCount, outOfStockCount, nearExpiryCount });
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        String(p.sku || '').toLowerCase().includes(q) ||
        String(p.barcode || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
        const storeId = localStorage.getItem('storeId');
        const res = await fetch(`/api/products/${productToDelete._id}?storeId=${storeId}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("No se pudo eliminar el producto.");
        toast({ title: "Producto Eliminado" });
        fetchProducts();
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Error", description: e.message });
    } finally {
        setProductToDelete(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col pb-safe">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title="Inventario"
          description="Gestión física y control de vencimientos."
          actions={
            <Button asChild className="w-full sm:w-auto rounded-xl font-black uppercase shadow-lg shadow-primary/20 h-12">
                <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Item</Link>
            </Button>
          }
        />
        
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="border-2 shadow-sm p-4">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Valorización</span>
                <div className="text-xl font-black truncate">{loading ? '...' : formatCurrency(metrics?.totalValue || 0)}</div>
            </Card>
            <Card className="border-2 shadow-sm p-4 border-amber-100 bg-amber-50/10">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Vencen Pronto</span>
                <div className="text-xl font-black text-amber-800">{loading ? '...' : metrics?.nearExpiryCount}</div>
            </Card>
            <Card className="border-2 shadow-sm p-4 border-red-100 bg-red-50/10">
                <span className="text-[10px] font-black uppercase text-red-700 tracking-widest">Sin Stock</span>
                <div className="text-xl font-black text-red-800">{loading ? '...' : metrics?.outOfStockCount}</div>
            </Card>
            <Card className="border-2 shadow-sm p-4 bg-primary/5 border-primary/10">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Total SKUs</span>
                <div className="text-xl font-black text-primary">{loading ? '...' : products.length}</div>
            </Card>
        </div>
        
        <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nombre, barras o pasillo..." 
                className="pl-10 h-14 font-bold border-2 rounded-2xl shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="pl-6 font-black text-[10px] uppercase">Producto / Pasillo</TableHead>
                        <TableHead className='text-right font-black text-[10px] uppercase'>PVP (Bs)</TableHead>
                        <TableHead className='text-center font-black text-[10px] uppercase'>Vencimiento</TableHead>
                        <TableHead className='text-center font-black text-[10px] uppercase'>Stock</TableHead>
                        <TableHead className="w-[50px] pr-6"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5} className="p-6"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    )) : filteredProducts.map((p) => {
                        const isExpired = p.expiryDate && isBefore(new Date(p.expiryDate), new Date());
                        const isNearExpiry = p.expiryDate && differenceInDays(new Date(p.expiryDate), new Date()) <= 15;

                        return (
                            <TableRow key={p._id} className="hover:bg-primary/[0.02]">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-muted relative overflow-hidden border shrink-0">
                                            {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="h-5 w-5 m-auto opacity-20" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-xs uppercase truncate max-w-[200px]">{p.name}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{p.category || 'Sin Pasillo'}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-sm">{formatCurrency(p.price)}</TableCell>
                                <TableCell className="text-center">
                                    {p.expiryDate ? (
                                        <Badge variant={isExpired ? "destructive" : isNearExpiry ? "outline" : "secondary"} 
                                            className={cn("text-[9px] font-black uppercase", isNearExpiry && !isExpired && "bg-amber-50 text-amber-700 border-amber-200")}>
                                            {isExpired ? "VENCIDO" : format(new Date(p.expiryDate), 'dd/MM/yy')}
                                        </Badge>
                                    ) : <span className="text-[10px] opacity-30">N/A</span>}
                                </TableCell>
                                <TableCell className='text-center font-black text-primary text-sm'>
                                    <Badge variant={p.stock <= p.minStock ? 'destructive' : 'secondary'} className="text-[10px] font-black">
                                        {p.stock}
                                    </Badge>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 border-2 rounded-xl shadow-2xl">
                                            <DropdownMenuItem onSelect={() => router.push(`/inventory/${p._id}/edit`)} className="p-3 font-bold uppercase text-xs"><Edit3 className="mr-2 h-4 w-4"/> Modificar</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3" onSelect={() => setProductToDelete(p)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Card>
      </main>

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent className="border-4 mx-4 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase italic">¿Eliminar producto del catálogo?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold">Esta acción es permanente y afectará los reportes históricos asociados a este SKU.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="font-bold rounded-xl h-12">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 font-black uppercase shadow-lg h-12 rounded-xl">Confirmar Eliminación</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
