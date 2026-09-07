
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto']),
  baseUnit: z.enum(['Unidad', 'Kilogramos', 'Gramos', 'Litros']),
  isWeightable: z.boolean().default(false),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      productType: 'Inventariable',
      baseUnit: 'Unidad',
      isWeightable: false,
      barcode: '',
      sku: '',
      stock: 0,
      minStock: 0,
      cost: 0,
      price: 0,
      taxRate: 0.16,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/products/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });
        if (!response.ok) throw new Error('Fallo al guardar');
        toast({ title: 'Éxito', description: 'Producto guardado correctamente.' });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isClient) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full">
        <PageHeader
          title="Registro de Mercancía"
          description="Añade artículos por unidad o pesables (verduras/carnes) a tu sistema."
          actions={<Button variant="outline" asChild><Link href="/inventory"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card className='border-2 shadow-sm'>
                  <CardHeader className='bg-muted/10 border-b'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2'>
                        <Package className='h-4 w-4 text-primary' /> Datos de Identidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2 pt-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className='text-[10px] font-black uppercase'>Nombre del Producto</FormLabel>
                          <FormControl><Input placeholder="Ej: Harina Pan o Tomate Perita" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="baseUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-[10px] font-black uppercase'>Unidad de Medida</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className='font-bold'><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Unidad">Unidad (Pza)</SelectItem>
                              <SelectItem value="Kilogramos">Kilogramos (Kg)</SelectItem>
                              <SelectItem value="Litros">Litros (Lt)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="isWeightable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 border-dashed p-4 bg-primary/[0.02]">
                          <div className="space-y-0.5">
                            <FormLabel className='text-[10px] font-black uppercase flex items-center gap-1 text-primary'>
                                <Scale className='h-4 w-4'/> Producto Pesable
                            </FormLabel>
                            <FormDescription className='text-[9px] font-bold'>Activa el modal de peso en caja</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className='border-2 shadow-sm'>
                  <CardHeader className='bg-muted/10 border-b'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2'>
                        <Tag className='h-4 w-4 text-primary' /> Logística y Códigos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-3 pt-6">
                      <FormField control={form.control} name="stock" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase'>Stock Inicial</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="minStock" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase'>Mínimo Alertar</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="barcode" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase'>Código Barras</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className='border-4 border-primary bg-primary/[0.03] shadow-xl'>
                  <CardHeader className='bg-primary text-white'>
                    <CardTitle className='text-xs font-black uppercase italic flex items-center gap-2'>
                        <Coins className='h-4 w-4' /> Finanzas (Venta)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='pt-6 space-y-6'>
                      <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-primary'>Precio Venta (Bs)</FormLabel>
                              <FormControl><Input type="number" step="0.01" className='text-3xl font-black h-16 border-2 border-primary/40 text-center' {...field} /></FormControl>
                              <FormDescription className='text-[9px] font-bold text-center italic'>Precio por la unidad de medida elegida.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={form.control}
                          name="taxRate"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase'>Tipo de IVA</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={String(field.value)}>
                                  <FormControl><SelectTrigger className='font-bold'><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="0.16">16% (General)</SelectItem>
                                      <SelectItem value="0.08">8% (Reducido)</SelectItem>
                                      <SelectItem value="0">0% (Exento)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                          )}
                      />
                  </CardContent>
                </Card>

                <Card className='border-2'>
                    <CardHeader><CardTitle className='text-[10px] font-black uppercase'>Imagen del Producto</CardTitle></CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input placeholder="URL de la fotografía" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory')} className='font-bold h-12 px-8'>CANCELAR</Button>
                <Button type="submit" disabled={isSubmitting} className='font-black uppercase h-12 px-12 shadow-2xl'>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    DAR DE ALTA EN SISTEMA
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
