
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
      if (!storeId) {
        throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
      }
      const response = await fetch(`/api/products?storeId=${storeId}`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener los productos.');
      }
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
    setError(null);
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
      setError("Error al obtener las recomendaciones de la IA.");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(`/api/products/${productToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar el producto.');
      }

      toast({
        title: 'Producto Eliminado',
        description: `El producto "${productToDelete.name}" ha sido eliminado.`,
      });
      
      await fetchProducts();

    } catch (err: any) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Ocurrió un error al eliminar el producto.',
      });
    } finally {
        setProductToDelete(null);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) {
      return products;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedQuery) ||
      String(product._id).toLowerCase().includes(lowercasedQuery)
    );
  }, [products, searchQuery]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
    }).format(value);
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Gestión integral de stock y productos."
          actions={
            <div className='flex flex-wrap gap-2 w-full sm:w-auto'>
              <Button variant="outline" className='flex-1 sm:flex-none' asChild>
                <Link href="/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reportes
                </Link>
              </Button>
              <Button asChild className='flex-1 sm:flex-none'>
                <Link href="/inventory/new-product">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Producto
                </Link>
              </Button>
            </div>
          }
        />
        
        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardHeader className='pb-2'><Skeleton className='h-4 w-1/2' /></CardHeader><CardContent><Skeleton className='h-7 w-1/3' /></CardContent></Card>
            )) : metrics && (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                            <TrendingDown className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.lowStockCount}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Agotados</CardTitle>
                            <Ban className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.outOfStockCount}</div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <Card className="h-full">
                  <CardHeader>
                      <CardTitle>IA: Optimización de Stock</CardTitle>
                      <CardDescription>Sugerencias para evitar quiebres de inventario.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loadingRecommendations ? (
                          <div className='space-y-2'>
                              <Skeleton className='h-8 w-full' />
                              <Skeleton className='h-8 w-full' />
                              <Skeleton className='h-8 w-4/5' />
                          </div>
                      ) : aiRecommendations.length > 0 ? (
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className='text-center'>Cant. Reponer</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {aiRecommendations.slice(0, 5).map(rec => (
                                        <TableRow key={rec.productId}>
                                            <TableCell>
                                                <div className='font-medium'>{products.find(p => String(p._id) === rec.productId)?.name}</div>
                                                <p className='text-[10px] text-muted-foreground line-clamp-1'>{rec.reasoning}</p>
                                            </TableCell>
                                            <TableCell className='text-center font-bold text-primary'>{rec.reorderQuantity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                      ) : (
                          <div className="text-center py-8 border-dashed border-2 rounded-lg bg-muted/20">
                              <p className="text-muted-foreground mb-4 text-sm">Analiza tu inventario con inteligencia artificial</p>
                              <Button onClick={handleGetRecommendations} disabled={loading} size="sm">
                                  Generar Análisis
                              </Button>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
            <div className="lg:col-span-2">
                {loading ? <Skeleton className="h-[300px] w-full" /> : <TopStockChart data={products} />}
            </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
              <div>
                <CardTitle>Listado de Productos</CardTitle>
                <CardDescription>Gestión y búsqueda rápida.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o ID..."
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="pl-4">Producto</TableHead>
                    <TableHead className='text-right'>Precio</TableHead>
                    <TableHead className='text-right'>Stock</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="w-[50px] pr-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[150px] ml-4" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell className='text-right'><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell className="pr-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                    ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                        <TableRow key={product._id}>
                        <TableCell className="pl-4">
                            <div className="font-medium text-sm sm:text-base">{product.name}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">{product.sku || String(product._id).slice(-6)}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(product.price)}</TableCell>
                        <TableCell className='text-right font-medium'>{product.stock}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge
                            variant={
                                product.status === 'En Stock' ? 'secondary'
                                : product.status === 'Stock Bajo' ? 'outline'
                                : 'destructive'
                            }
                            className={
                                product.status === 'En Stock' ? 'bg-green-100 text-green-800 border-none'
                                : product.status === 'Stock Bajo' ? 'bg-yellow-100 text-yellow-800 border-none'
                                : 'bg-red-100 text-red-800 border-none'
                            }
                            >
                            {product.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 ml-auto">
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => router.push(`/inventory/${product._id}`)}>Ver detalles</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(`/inventory/${product._id}/edit`)}>Editar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onSelect={() => setProductToDelete(product)}>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No se encontraron productos.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
        
        <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará permanentemente "{productToDelete?.name}" de tu inventario.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}
