
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Camera, ChevronLeft, Loader2, Scale } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
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
  imageUrl: z.string().url('URL de imagen inválida.').optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
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

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) throw new Error('Sesión no encontrada');

        const response = await fetch('/api/products/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });

        if (!response.ok) throw new Error('Fallo al guardar producto');

        toast({ title: 'Producto Creado', description: `"${data.name}" añadido con éxito.` });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Nuevo Artículo"
          description="Configura productos básicos, verduras por peso o servicios."
          actions={<Button variant="outline" asChild><Link href="/inventory"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
        />

        {showScanner && <BarcodeScanner onScan={(code) => { form.setValue('barcode', code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />}
        
        {!isClient ? <Skeleton className='h-96 w-full' /> : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card className='border-2'>
                    <CardHeader className='bg-muted/10'><CardTitle className='text-sm font-black uppercase'>Identidad del Producto</CardTitle></CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2 pt-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className='text-[10px] font-black uppercase'>Nombre Comercial</FormLabel>
                            <FormControl><Input placeholder="Ej: Papa Blanca Seleccionada" {...field} /></FormControl>
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
                                <SelectItem value="Unidad">Unidad (Pza/Caja)</SelectItem>
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
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-dashed p-3">
                            <div className="space-y-0.5">
                              <FormLabel className='text-[10px] font-black uppercase flex items-center gap-1'><Scale className='h-3 w-3'/> Venta por Peso</FormLabel>
                              <FormDescription className='text-[9px]'>Habilitar báscula/gramaje en POS</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card className='border-2'>
                    <CardHeader><CardTitle className='text-sm font-black uppercase'>Control de Stock y Costos</CardTitle></CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-3 pt-6">
                        <FormField control={form.control} name="stock" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Stock Inicial</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="minStock" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Punto Reorden</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                        )} />
                         <FormField control={form.control} name="cost" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Costo Unitario</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                        )} />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className='border-2 border-primary/20 bg-primary/[0.02] shadow-xl'>
                    <CardHeader className='bg-primary/5'><CardTitle className='text-sm font-black uppercase text-primary italic'>Precio de Venta</CardTitle></CardHeader>
                    <CardContent className='pt-6 space-y-4'>
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-[10px] font-black uppercase'>Precio (Bs)</FormLabel>
                                <FormControl><Input type="number" step="0.01" className='text-2xl font-black h-14 border-2 border-primary/40' {...field} /></FormControl>
                                <FormDescription className='text-[9px] font-bold uppercase'>Este precio es por la Unidad de Medida seleccionada.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taxRate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-[10px] font-black uppercase'>Impuesto (IVA)</FormLabel>
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
                      <CardHeader><CardTitle className='text-sm font-black uppercase'>Categorización</CardTitle></CardHeader>
                      <CardContent className='space-y-4'>
                          <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Departamento</FormLabel><FormControl><Input placeholder="Ej: Verduras" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="sku" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>SKU</FormLabel><FormControl><Input placeholder="Código Interno" {...field} /></FormControl></FormItem>
                          )} />
                      </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.push('/inventory')} className='font-bold'>CANCELAR</Button>
                  <Button type="submit" disabled={isSubmitting} className='font-black uppercase h-12 px-10 shadow-xl'>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Guardar en Sistema
                  </Button>
              </div>
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}
