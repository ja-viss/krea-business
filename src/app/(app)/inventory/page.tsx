
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search, BarChart3, Package, Image as ImageIcon } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
    const totalValue = productsData.reduce((acc, p) => acc + (p.stock * p.cost || 0), 0);
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
          title="Inventario de Mercancía"
          description="Consola de gestión de activos y control de existencias."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="rounded-full shadow-sm">
                <Link href="/reports"><BarChart3 className="mr-2 h-4 w-4" />Reportes</Link>
              </Button>
              <Button asChild className="rounded-full font-black uppercase shadow-lg shadow-primary/20">
                <Link href="/inventory/new-product"><PlusCircle className="mr-2 h-4 w-4" />Dar de Alta</Link>
              </Button>
            </div>
          }
        />
        
        {error && <Alert variant="destructive" className="border-2"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-2"><CardHeader className='pb-2'><Skeleton className='h-4 w-1/2' /></CardHeader><CardContent><Skeleton className='h-7 w-1/3' /></CardContent></Card>
            )) : metrics && (
                <>
                    <Card className="border-2 shadow-sm relative overflow-hidden group">
                        <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                            <Boxes className="h-24 w-24" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Valor de Activos</CardTitle>
                            <Boxes className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">{formatCurrency(metrics.totalValue)}</div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Inversión a precio de costo</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="border-2 shadow-sm border-amber-100 bg-amber-50/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black uppercase text-amber-700 tracking-widest">Stock Crítico</CardTitle>
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-amber-800">{metrics.lowStockCount}</div>
                            <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Requieren reposición</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm border-red-100 bg-red-50/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-black uppercase text-red-700 tracking-widest">Agotados</CardTitle>
                            <Ban className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-800">{metrics.outOfStockCount}</div>
                            <p className="text-[10px] font-bold text-red-600 uppercase mt-1">Ventas bloqueadas</p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card className="border-2 shadow-lg overflow-hidden h-full flex flex-col">
              <CardHeader className="pb-4 border-b bg-muted/10">
                <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight italic">Catálogo Maestro</CardTitle>
                    <CardDescription className="text-xs font-bold">{filteredProducts.length} productos en lista.</CardDescription>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre, SKU o barras..." className="pl-9 w-full h-11 font-bold border-2" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 font-black text-[10px] uppercase">Identidad</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>PVP (Bs)</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>Stock</TableHead>
                                <TableHead className="hidden md:table-cell font-black text-[10px] uppercase">Estado</TableHead>
                                <TableHead className="w-[50px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell className="pl-6"><Skeleton className="h-12 w-[180px]" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-[80px]" /></TableCell><TableCell className='text-right'><Skeleton className="h-4 w-[40px]" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell><TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>
                            )) : filteredProducts.length > 0 ? filteredProducts.map((p) => (
                                <TableRow key={p._id} className="hover:bg-primary/[0.02] group transition-colors">
                                <TableCell className="pl-6 py-3">
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
                                            <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{p.sku || String(p._id).slice(-6)}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-sm font-black">{formatCurrency(p.price)}</TableCell>
                                <TableCell className='text-right font-black text-sm text-primary'>{p.stock} <span className="text-[9px] font-bold text-muted-foreground uppercase ml-0.5">{p.isWeightable ? 'Kg' : 'Und'}</span></TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Badge variant={p.status === 'En Stock' ? 'secondary' : p.status === 'Stock Bajo' ? 'outline' : 'destructive'} className="text-[9px] font-black uppercase h-6">
                                        {p.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 border-2 shadow-xl">
                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3" onSelect={() => router.push(`/inventory/${p._id}`)}>
                                                <ImageIcon className="mr-2 h-4 w-4" /> Ver Detalle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3" onSelect={() => router.push(`/inventory/${p._id}/edit`)}>
                                                <BarChart3 className="mr-2 h-4 w-4" /> Editar Datos
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3" onSelect={() => setProductToDelete(p)}>
                                                <Ban className="mr-2 h-4 w-4" /> Eliminar Permanentemente
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic font-medium">Sin coincidencias para la búsqueda.</TableCell></TableRow>}
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
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase line-clamp-1">{prod?.name}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Stock: {prod?.stock}</span>
                                        </div>
                                        <Badge className="bg-primary text-white font-black text-[9px] uppercase">Reponer: {rec.reorderQuantity}</Badge>
                                    </div>
                                );
                            })}
                            <Button variant="outline" size="sm" className="w-full font-black uppercase text-[9px] h-9" onClick={handleGetRecommendations}>Refrescar Análisis</Button>
                        </div>
                    ) : (
                        <div className="text-center py-10 border-dashed border-2 rounded-2xl bg-muted/10">
                            <Package className="h-8 w-8 mx-auto mb-2 opacity-20 text-primary" />
                            <p className="text-[10px] font-black uppercase opacity-60 mb-4 px-4">Detecta productos con alta rotación y bajo stock.</p>
                            <Button onClick={handleGetRecommendations} variant="outline" className="font-black uppercase text-[10px] h-9 shadow-sm">Iniciar IA Insights</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="h-[350px]">
                {loading ? <Skeleton className="h-full w-full rounded-2xl border-2" /> : <TopStockChart data={products} />}
            </div>
          </div>
        </div>
        
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent className="border-4 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight italic">¿Confirmar Eliminación?</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-base">
                        Estás a punto de borrar <span className="text-primary uppercase">"{productToDelete?.name}"</span>. Esta acción es irreversible y eliminará el historial vinculado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-4">
                    <AlertDialogCancel className="font-bold rounded-xl h-12">CANCELAR</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700 font-black uppercase h-12 shadow-lg shadow-red-200">
                        ELIMINAR AHORA
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
