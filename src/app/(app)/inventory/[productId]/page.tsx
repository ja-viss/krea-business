
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Edit, AlertTriangle } from 'lucide-react';
import { IProduct } from '@/models/Product';
import { Badge } from '@/components/ui/badge';

export default function ProductDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.productId as string;

    const [product, setProduct] = useState<IProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (productId) {
            const fetchProduct = async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/products/${productId}`);
                    if (!response.ok) {
                        throw new Error('No se pudo encontrar el producto.');
                    }
                    const data: IProduct = await response.json();
                    setProduct(data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [productId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) => (
        <div className={className}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'No especificado'}</p>
        </div>
    );
    
    if (loading) {
        return (
             <div className="flex flex-1 flex-col">
                <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                    <Skeleton className="h-10 w-3/4" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                        <div className="lg:col-span-1">
                             <Skeleton className="aspect-square w-full rounded-lg" />
                        </div>
                        <div className="lg:col-span-2 space-y-8">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-1 flex-col">
                <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                     <Button variant="outline" asChild>
                        <Link href="/inventory">
                            <ChevronLeft />
                            Volver a Inventario
                        </Link>
                    </Button>
                </main>
            </div>
        )
    }

    if (!product) return null;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader
                    title={product.name}
                    description={`ID: ${String(product._id).slice(-6)}`}
                    actions={
                        <div className="flex gap-2">
                             <Button variant="outline" asChild>
                                <Link href="/inventory">
                                    <ChevronLeft />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/inventory/${productId}/edit`}>
                                    <Edit />
                                    Editar Producto
                                </Link>
                            </Button>
                        </div>
                    }
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="p-4">
                               <div className="aspect-square relative bg-muted rounded-lg flex items-center justify-center">
                                 {product.imageUrl ? (
                                     <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-contain rounded-lg"
                                    />
                                 ) : (
                                    <span className="text-muted-foreground">Sin Imagen</span>
                                 )}
                               </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles Principales</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <DetailItem label="Nombre del Producto" value={product.name} className="col-span-full" />
                                <DetailItem label="Marca" value={product.brand} />
                                <DetailItem label="Proveedor" value={product.vendor} />
                                <DetailItem label="Tipo de Producto" value={product.productType} />
                                <DetailItem label="Categoría" value={product.category} />
                                <DetailItem label="Ubicación" value={product.location} />
                                <DetailItem label="SKU" value={product.sku} />
                                <DetailItem label="Código de Barras" value={product.barcode} />
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Stock y Precios</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <DetailItem label="Stock Actual" value={product.stock} />
                                <DetailItem label="Stock Mínimo" value={product.minStock} />
                                <DetailItem label="Precio de Venta" value={formatCurrency(product.price)} />
                                <DetailItem label="Costo Unitario" value={formatCurrency(product.cost)} />
                                 <div>
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <Badge
                                        variant={
                                            product.status === 'En Stock' ? 'secondary'
                                            : product.status === 'Stock Bajo' ? 'outline'
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
                                 </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

            </main>
        </div>
    )
}
