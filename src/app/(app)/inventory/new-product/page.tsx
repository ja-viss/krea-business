
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
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
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Barcode, Camera, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio']),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  initialStock: z.coerce.number().min(0, 'El stock no puede ser negativo.'),
  minStock: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo.'),
  unitCost: z.coerce.number().min(0, 'El costo debe ser positivo.'),
  sellingPrice: z.coerce.number().min(0, 'El precio debe ser positivo.'),
  warehouseLocation: z.string().optional(),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      productType: 'Inventariable',
      barcode: '',
      sku: '',
      category: '',
      initialStock: 0,
      minStock: 0,
      unitCost: 0,
      sellingPrice: 0,
      warehouseLocation: '',
      imageUrl: '',
    },
  });

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
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se encontró la tienda. Por favor, inicia sesión de nuevo.');
        }

        const response = await fetch('/api/products/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al crear el producto.');
        }

        toast({
            title: '¡Producto Creado!',
            description: `El producto "${data.name}" ha sido añadido a tu inventario.`,
        });
        router.push('/inventory');

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

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Añadir Nuevo Producto"
          description="Rellena los detalles para registrar un nuevo artículo en tu inventario."
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
                          <FormDescription>
                            Define cómo se gestionará el stock.
                          </FormDescription>
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
                      name="warehouseLocation"
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
                      name="initialStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Actual / Cantidad Inicial</FormLabel>
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
                      name="unitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo Unitario Promedio</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio de Venta</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
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
                    {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
