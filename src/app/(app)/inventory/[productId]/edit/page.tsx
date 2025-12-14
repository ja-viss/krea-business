
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { IProduct } from '@/models/Product';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio']),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo.'),
  minStock: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo.'),
  cost: z.coerce.number().min(0, 'El costo debe ser positivo.'),
  price: z.coerce.number().min(0, 'El precio debe ser positivo.'),
  taxRate: z.coerce.number().min(0, "La tasa de impuesto no puede ser negativa."),
  location: z.string().optional(),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      productType: 'Inventariable',
      barcode: '',
      sku: '',
      brand: '',
      vendor: '',
      category: '',
      stock: 0,
      minStock: 0,
      cost: 0,
      price: 0,
      taxRate: 0.16,
      location: '',
      imageUrl: '',
    },
  });

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
          // Populate form with fetched data
          form.reset({
            name: data.name,
            productType: data.productType,
            barcode: data.barcode || '',
            sku: data.sku || '',
            brand: data.brand || '',
            vendor: data.vendor || '',
            category: data.category || '',
            stock: data.stock,
            minStock: data.minStock,
            cost: data.cost,
            price: data.price,
            taxRate: data.taxRate,
            location: data.location || '',
            imageUrl: data.imageUrl || '',
          });
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [productId, form]);

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({
      title: 'Código Escaneado',
      description: `Se ha registrado el código: ${scannedCode}`,
    });
    setShowScanner(false);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar el producto.');
        }

        toast({
            title: '¡Producto Actualizado!',
            description: `Los cambios en "${data.name}" se han guardado correctamente.`,
        });
        router.push('/inventory');
        router.refresh();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
     return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-3/4" />
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-6">
                    <div className="space-y-6 lg:col-span-2">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-40 w-full" />
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

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Editar Producto"
          description="Actualiza los detalles de este artículo en tu inventario."
          actions={
            <Button variant="outline" asChild>
              <Link href="/inventory">
                <ChevronLeft />
                Volver a Inventario
              </Link>
            </Button>
          }
        />

        {showScanner && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Columna Izquierda */}
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>
                      Datos básicos del producto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Nombre del Producto</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Leche Entera 1L"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: La Pradera" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proveedor</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Lácteos Los Andes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="productType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Producto</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Inventariable">
                                Inventariable
                              </SelectItem>
                              <SelectItem value="No Inventariable">
                                No Inventariable
                              </SelectItem>
                              <SelectItem value="Servicio">
                                Servicio
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Lácteos" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Códigos y Almacén</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código de Barras (UPC/EAN)</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input placeholder="Escanea o ingresa el código" {...field} />
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)}>
                                    <Camera className="h-4 w-4" />
                                    <span className="sr-only">Escanear</span>
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU (Código Interno)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: LAC-001" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Ubicación en Almacén</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Pasillo 3, Estante B" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Columna Derecha */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stock y Precios</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                     <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Actual</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="minStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Mínimo (Punto de Reorden)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Unitario (VES)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio de Venta (VES)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Impuesto (IVA)</FormLabel>
                           <Select onValueChange={(value) => field.onChange(parseFloat(value))} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un impuesto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0.16">Gravado (16%)</SelectItem>
                              <SelectItem value="0.08">Reducido (8%)</SelectItem>
                              <SelectItem value="0">Exento (0%)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Imagen del Producto</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL de la Imagen</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                    </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory')}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Guardando Cambios...' : 'Guardar Cambios'}
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

    