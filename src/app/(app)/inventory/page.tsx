'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3 } from 'lucide-react';
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
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';

interface InventoryMetrics {
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
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
  const [productToDelete, setProductToDelete] = useState<IProduct | null>(null);

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
    const totalValue = productsData.reduce((acc, p) => acc + p.stock * p.price, 0);
    const lowStockCount = productsData.filter(p => p.status === 'Stock Bajo').length;
    const outOfStockCount = productsData.filter(p => p.status === 'Sin Stock').length;
    setMetrics({ totalValue, lowStockCount, outOfStockCount });
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || String(p._id).toLowerCase().includes(q));
  }, [products, searchQuery]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Gestión integral de stock."
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href="/reports"><BarChart3 className="mr-2 h-4 w-4" />Reportes</Link>
              </Button>
              <Button asChild>
                <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" />Añadir Producto</Link>
              </Button>
            </>
          }
        />
        
        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardHeader className='pb-2'><Skeleton className='h-4 w-1/2' /></CardHeader><CardContent><Skeleton className='h-7 w-1/3' /></CardContent></Card>
            )) : metrics && (
                <>
                    <Card className="border-2 shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-black uppercase text-muted-foreground">Valor Total</CardTitle><Boxes className="h-4 w-4 text-primary" /></CardHeader>
                    <CardContent><div className="text-xl md:text-2xl font-black">{formatCurrency(metrics.totalValue)}</div></CardContent></Card>
                    <Card className="border-2 shadow-sm border-amber-100 bg-amber-50/10"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-black uppercase text-amber-700">Stock Bajo</CardTitle><TrendingDown className="h-4 w-4 text-amber-600" /></CardHeader>
                    <CardContent><div className="text-xl md:text-2xl font-black text-amber-800">{metrics.lowStockCount}</div></CardContent></Card>
                    <Card className="border-2 shadow-sm border-red-100 bg-red-50/10"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-black uppercase text-red-700">Agotados</CardTitle><Ban className="h-4 w-4 text-red-600" /></CardHeader>
                    <CardContent><div className="text-xl md:text-2xl font-black text-red-800">{metrics.outOfStockCount}</div></CardContent></Card>
                </>
            )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <Card className="h-full border-2">
                  <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-sm font-black uppercase">IA: Sugerencia de Reposición</CardTitle></CardHeader>
                  <CardContent className="pt-6">
                      {loadingRecommendations ? <div className='space-y-2'><Skeleton className='h-8 w-full' /><Skeleton className='h-8 w-full' /></div> : aiRecommendations.length > 0 ? (
                         <div className="overflow-x-auto"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead className="font-black text-[10px] uppercase">Producto</TableHead><TableHead className='text-center font-black text-[10px] uppercase'>Cant. Recomendada</TableHead></TableRow></TableHeader>
                                <TableBody>{aiRecommendations.slice(0, 5).map(rec => (
                                        <TableRow key={rec.productId}><TableCell><div className="font-bold text-xs uppercase">{products.find(p => String(p._id) === rec.productId)?.name}</div></TableCell><TableCell className='text-center font-black text-sm text-primary'>{rec.reorderQuantity}</TableCell></TableRow>
                                    ))}</TableBody></Table></div>
                      ) : <div className="text-center py-10 border-dashed border-4 rounded-2xl bg-muted/20"><Button onClick={handleGetRecommendations} variant="outline" className="font-black uppercase shadow-sm">Iniciar Análisis de IA</Button></div>}
                  </CardContent>
              </Card>
          </div>
          <div className="lg:col-span-2">{loading ? <Skeleton className="h-[300px] w-full rounded-2xl" /> : <TopStockChart data={products} />}</div>
        </div>

        <Card className="border-2 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/10">
            <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
              <CardTitle className="text-lg font-black uppercase">Catálogo de Productos</CardTitle>
              <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o SKU..." className="pl-9 w-full h-10 font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50"><TableRow><TableHead className="pl-6 font-black text-[10px] uppercase">Producto / Identidad</TableHead><TableHead className='text-right font-black text-[10px] uppercase'>Precio (Bs)</TableHead><TableHead className='text-right font-black text-[10px] uppercase'>Existencia</TableHead><TableHead className="hidden md:table-cell font-black text-[10px] uppercase">Estado</TableHead><TableHead className="w-[50px] pr-6"></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell className="pl-6"><Skeleton className="h-4 w-[150px]" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-[80px]" /></TableCell><TableCell className='text-right'><Skeleton className="h-4 w-[40px]" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell><TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
                        )) : filteredProducts.length > 0 ? filteredProducts.map((p) => (
                            <TableRow key={p._id} className="hover:bg-primary/[0.02]">
                            <TableCell className="pl-6 py-4"><div className="font-black text-xs md:text-sm uppercase">{p.name}</div><div className="text-[9px] font-mono text-muted-foreground uppercase">{p.sku || String(p._id).slice(-6)}</div></TableCell>
                            <TableCell className="text-right text-xs md:text-sm font-black">{formatCurrency(p.price)}</TableCell>
                            <TableCell className='text-right font-black text-xs md:text-sm text-primary'>{p.stock}</TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant={p.status === 'En Stock' ? 'secondary' : p.status === 'Stock Bajo' ? 'outline' : 'destructive'} className="text-[9px] font-black uppercase">{p.status}</Badge></TableCell>
                            <TableCell className="pr-6 text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0 ml-auto"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem className="font-bold text-xs uppercase" onSelect={() => router.push(`/inventory/${p._id}`)}>Ver Detalle</DropdownMenuItem><DropdownMenuItem className="font-bold text-xs uppercase" onSelect={() => router.push(`/inventory/${p._id}/edit`)}>Editar Datos</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600 font-black text-xs uppercase" onSelect={() => setProductToDelete(p)}>Eliminar Producto</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic font-medium">Sin resultados para tu búsqueda.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
        
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent className="border-4"><AlertDialogHeader><AlertDialogTitle className="text-xl font-black uppercase">¿Eliminar producto?</AlertDialogTitle><AlertDialogDescription className="font-bold">Se borrará permanentemente "{productToDelete?.name}". Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 font-black uppercase">Confirmar Eliminación</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
