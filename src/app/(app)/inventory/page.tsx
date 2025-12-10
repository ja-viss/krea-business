'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Boxes, TrendingDown, Ban, Search } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IProduct } from '@/models/Product';
import { getInventoryOptimizationRecommendations, InventoryOptimizationInput } from '@/ai/flows/inventory-optimization-recommendations';
import { TopStockChart } from '@/components/inventory/top-stock-chart';
import { Input } from '@/components/ui/input';

interface InventoryMetrics {
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
          // Placeholder data - in a real app, this would come from sales data
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Gestiona tus productos, analiza el stock y obtén recomendaciones."
          actions={
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <Button variant="outline" className='w-full sm:w-auto'>
                <FileDown />
                Exportar
              </Button>
              <Button className='w-full sm:w-auto'>
                <PlusCircle />
                Añadir Producto
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

        <div className="grid gap-4 md:grid-cols-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardHeader className='pb-2'><Skeleton className='h-4 w-1/2' /></CardHeader><CardContent><Skeleton className='h-7 w-1/3' /></CardContent></Card>
            )) : metrics && (
                <>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total del Inventario</CardTitle>
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Productos con Stock Bajo</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.lowStockCount}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Productos Agotados</CardTitle>
                            <Ban className="h-4 w-4 text-muted-foreground" />
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
              <Card>
                  <CardHeader>
                      <CardTitle>Recomendaciones de IA para Inventario</CardTitle>
                      <CardDescription>Obtén sugerencias para optimizar tu stock y evitar quiebres.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {loadingRecommendations ? (
                          <div className='space-y-2'>
                              <Skeleton className='h-8 w-full' />
                              <Skeleton className='h-8 w-full' />
                              <Skeleton className='h-8 w-4/5' />
                          </div>
                      ) : aiRecommendations.length > 0 ? (
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Producto</TableHead>
                                     <TableHead className='text-center'>Nivel Rec.</TableHead>
                                     <TableHead className='text-center'>Cantidad a Reponer</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {aiRecommendations.slice(0, 5).map(rec => (
                                     <TableRow key={rec.productId}>
                                         <TableCell>
                                             <div className='font-medium'>{products.find(p => String(p._id) === rec.productId)?.name}</div>
                                             <p className='text-xs text-muted-foreground hidden sm:block'>{rec.reasoning}</p>
                                         </TableCell>
                                         <TableCell className='text-center font-bold'>{rec.recommendedStockLevel}</TableCell>
                                         <TableCell className='text-center font-bold text-primary'>{rec.reorderQuantity}</TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                      ) : (
                          <div className="text-center p-4 border-dashed border-2 rounded-lg">
                              <p className="text-muted-foreground mb-2">Analiza tu inventario con IA</p>
                              <Button onClick={handleGetRecommendations} disabled={loading}>
                                  Generar Recomendaciones
                              </Button>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
            <div className="lg:col-span-2">
                {loading ? <Skeleton className="h-[400px] w-full" /> : <TopStockChart data={products} />}
            </div>
        </div>

        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row justify-between sm:items-center gap-4'>
              <div>
                <CardTitle>Todos los Productos</CardTitle>
                <CardDescription>Busca, filtra y gestiona todos los productos de tu inventario.</CardDescription>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o ID..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className='text-right'>Precio</TableHead>
                  <TableHead className='text-right'>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      <TableCell className='text-right'><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {String(product._id).slice(-6)}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                      <TableCell className='text-right'>{product.stock}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === 'En Stock'
                              ? 'secondary'
                              : product.status === 'Stock Bajo'
                              ? 'outline'
                              : 'destructive'
                          }
                          className={
                            product.status === 'En Stock' ? 'bg-green-100 text-green-800'
                            : product.status === 'Stock Bajo' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          No se encontraron productos que coincidan con la búsqueda.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

    