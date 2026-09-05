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
import { ChevronLeft, Edit, AlertTriangle, Package } from 'lucide-react';
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
        return new Intl.NumberFormat('es-VE', {
            style: 'currency',
            currency: 'VES',
        }).format(value);
    };

    const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) => (
        <div className={className}>
            <p className="text-sm text-muted-foreground uppercase text-[10px] font-black">{label}</p>
            <p className="font-bold text-sm">{value || 'No especificado'}</p>
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
                     <Button variant="outline" asChild className="mt-4">
                        <Link href="/inventory">
                            <ChevronLeft className="mr-2 h-4 w-4" />
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
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
                <PageHeader
                    title={product.name}
                    description={`SKU: ${product.sku || 'S/N'} • CREADO: ${new Date(product.createdAt).toLocaleDateString()}`}
                    actions={
                        <div className="flex gap-2">
                             <Button variant="outline" asChild className="font-bold">
                                <Link href="/inventory">
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild className="font-black uppercase shadow-lg shadow-primary/20">
                                <Link href={`/inventory/${productId}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Producto
                                </Link>
                            </Button>
                        </div>
                    }
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* IMAGEN DEL PRODUCTO */}
                    <div className="lg:col-span-4">
                        <Card className="border-2 overflow-hidden shadow-xl">
                            <CardContent className="p-0">
                               <div className="aspect-square relative bg-muted flex items-center justify-center">
                                 {product.imageUrl ? (
                                     <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 400px"
                                        priority
                                    />
                                 ) : (
                                    <div className="flex flex-col items-center gap-2 opacity-20">
                                        <Package className="h-20 w-20" />
                                        <span className="text-xs font-black uppercase">Sin Imagen</span>
                                    </div>
                                 )}
                               </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* INFORMACION DEL PRODUCTO */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="bg-muted/10 border-b">
                                <CardTitle className="text-xs font-black uppercase italic">Detalles de Identidad</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-6">
                                <DetailItem label="Nombre Oficial" value={product.name} className="col-span-full" />
                                <DetailItem label="Marca / Fabr." value={product.brand} />
                                <DetailItem label="Proveedor" value={product.vendor} />
                                <DetailItem label="Categoría" value={product.category} />
                                <DetailItem label="Tipo" value={product.productType} />
                                <DetailItem label="Ubicación" value={product.location} />
                                <DetailItem label="Barras" value={product.barcode} />
                            </CardContent>
                        </Card>
                        
                        <Card className="border-2 shadow-md border-primary/10 bg-primary/[0.02]">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="text-xs font-black uppercase text-primary italic">Finanzas y Existencia</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary mb-1">Estado Stock</p>
                                    <Badge
                                        variant={
                                            product.status === 'En Stock' ? 'secondary'
                                            : product.status === 'Stock Bajo' ? 'outline'
                                            : 'destructive'
                                        }
                                         className={cn(
                                            "uppercase font-black text-[9px] h-7 px-3",
                                            product.status === 'En Stock' ? 'bg-green-100 text-green-800 border-green-200'
                                            : product.status === 'Stock Bajo' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            : 'bg-red-100 text-red-800'
                                        )}
                                        >
                                        {product.status}
                                    </Badge>
                                 </div>
                                <DetailItem label="Existencia" value={product.stock} />
                                <DetailItem label="Mínimo" value={product.minStock} />
                                <DetailItem label="Precio Venta" value={formatCurrency(product.price)} />
                            </CardContent>
                        </Card>
                    </div>

                </div>

            </main>
        </div>
    )
}
