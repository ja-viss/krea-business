
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
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins, Layers, Camera, QrCode, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto']),
  baseUnit: z.enum(['Unidad', 'Kilogramos', 'Gramos', 'Litros']).default('Unidad'),
  isWeightable: z.boolean().default(false),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  vendor: z.string().optional(),
  category: z.string().optional(),
  stock: z.coerce.number().min(0, 'La existencia no puede ser negativa.'),
  minStock: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo.'),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo.'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  taxRate: z.coerce.number().min(0).default(0.16),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({
      title: 'Código Escaneado',
      description: `Se ha registrado: ${scannedCode}`,
    });
    setShowScanner(false);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) throw new Error('Sesión no válida');

        const response = await fetch('/api/products/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Fallo al guardar producto');
        }

        toast({ title: 'Producto Registrado', description: `"${data.name}" ha sido añadido al inventario.` });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isClient) return <div className="p-8"><Skeleton className="h-96 w-full rounded-3xl" /></div>;

  return (
    <div className="flex flex-1 flex-col bg-slate-50/50">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
        <PageHeader
          title="Registro de Mercancía"
          description="Añade artículos, servicios o productos a granel de forma profesional."
          actions={
            <Button variant="outline" asChild className="rounded-full border-2 hover:bg-white transition-all shadow-sm">
              <Link href="/inventory"><ChevronLeft className='mr-1 h-4 w-4'/> Volver</Link>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              
              {/* COLUMNA PRINCIPAL: IDENTIDAD Y LOGISTICA */}
              <div className="space-y-6 lg:col-span-8">
                <Card className='border-2 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-muted/10 border-b border-dashed'>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Package className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                            <CardTitle className='text-sm font-black uppercase tracking-tight'>Identidad del Artículo</CardTitle>
                            <CardDescription className='text-[10px] font-bold'>Datos básicos y clasificación de venta.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2 pt-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Nombre del Producto / Servicio</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Harina Pan 1Kg o Tomate Perita" className="h-14 text-lg font-bold rounded-2xl border-2 focus:border-primary/50" {...field} />
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
                          <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Clasificación</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className='h-12 font-bold rounded-xl border-2'>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-2">
                              <SelectItem value="Inventariable" className="font-bold">INVENTARIABLE</SelectItem>
                              <SelectItem value="No Inventariable" className="font-bold">NO INVENTARIABLE</SelectItem>
                              <SelectItem value="Servicio" className="font-bold">SERVICIO</SelectItem>
                              <SelectItem value="Compuesto" className="font-bold">COMPUESTO (KIT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="baseUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Unidad de Medida</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className='h-12 font-bold rounded-xl border-2'>
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border-2">
                              <SelectItem value="Unidad" className="font-bold">Unidad (Pza)</SelectItem>
                              <SelectItem value="Kilogramos" className="font-bold">Kilogramos (Kg)</SelectItem>
                              <SelectItem value="Litros" className="font-bold">Litros (Lt)</SelectItem>
                              <SelectItem value="Gramos" className="font-bold">Gramos (Gr)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                     <FormField
                      control={form.control}
                      name="isWeightable"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-2xl border-2 border-dashed p-5 bg-primary/[0.03] transition-all hover:bg-primary/[0.05]">
                          <div className="space-y-0.5">
                            <FormLabel className='text-[11px] font-black uppercase flex items-center gap-2 text-primary'>
                                <Scale className='h-4 w-4'/> Producto Pesable (Granel)
                            </FormLabel>
                            <FormDescription className='text-[10px] font-bold text-muted-foreground leading-tight'>
                                Activa el calculador de KG/GR automático en la terminal de ventas. Ideal para verduras, carnes o quesos.
                            </FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className='border-2 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-muted/10 border-b border-dashed'>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Tag className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                            <CardTitle className='text-sm font-black uppercase tracking-tight'>Control y Almacén</CardTitle>
                            <CardDescription className='text-[10px] font-bold'>Códigos de barras y niveles de existencia.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2 pt-6">
                      <FormField control={form.control} name="barcode" render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Código de Barras (EAN/UPC)</FormLabel>
                              <div className="flex gap-2">
                                  <FormControl>
                                      <div className="relative flex-1">
                                          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                                          <Input placeholder="Escanea o escribe el código" className="h-12 pl-10 font-mono font-bold rounded-xl border-2" {...field} />
                                      </div>
                                  </FormControl>
                                  <Button 
                                    type="button" 
                                    variant="secondary" 
                                    size="icon" 
                                    className='h-12 w-12 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-md'
                                    onClick={() => setShowScanner(true)}
                                  >
                                      <Camera className="h-6 w-6" />
                                  </Button>
                              </div>
                          </FormItem>
                      )} />
                      
                      <div className="grid grid-cols-2 gap-6 sm:col-span-2">
                          <FormField control={form.control} name="stock" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Existencia Inicial</FormLabel>
                                  <FormControl><Input type="number" className="h-12 font-black rounded-xl border-2 text-center" {...field} /></FormControl>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="minStock" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Stock Crítico</FormLabel>
                                  <FormControl><Input type="number" className="h-12 font-black rounded-xl border-2 text-center border-amber-200 bg-amber-50/20" {...field} /></FormControl>
                              </FormItem>
                          )} />
                      </div>

                      <FormField control={form.control} name="sku" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>SKU / Código Interno</FormLabel>
                              <FormControl><Input placeholder="Opcional" className="h-12 font-mono font-bold rounded-xl border-2" {...field} /></FormControl>
                          </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="category" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Categoría / Familia</FormLabel>
                              <FormControl><Input placeholder="Ej: Víveres" className="h-12 font-bold rounded-xl border-2" {...field} /></FormControl>
                          </FormItem>
                      )} />
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA LATERAL: FINANZAS Y PRECIOS */}
              <div className="space-y-6 lg:col-span-4">
                <Card className='border-4 border-primary bg-primary/[0.04] shadow-2xl rounded-3xl overflow-hidden'>
                  <CardHeader className='bg-primary text-white p-5'>
                    <div className="flex items-center gap-3">
                        <Coins className='h-6 w-6 animate-pulse' />
                        <div>
                            <CardTitle className='text-sm font-black uppercase italic tracking-wider'>Estructura de Precios</CardTitle>
                            <CardDescription className='text-white/70 text-[9px] font-bold uppercase'>Parámetros financieros del producto.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-6 space-y-8'>
                      <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-primary/60'>Costo de Compra (Bs.)</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" className='h-14 border-2 font-black text-center text-xl rounded-2xl bg-white' {...field} />
                              </FormControl>
                              <FormDescription className='text-[9px] font-bold text-center opacity-60'>Base para cálculo de utilidad.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-primary'>Precio PVP al Cliente (Bs.)</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" className='text-4xl font-black h-20 border-4 border-primary/30 rounded-2xl text-center bg-white shadow-inner' {...field} />
                              </FormControl>
                              <FormDescription className='text-[10px] font-black text-center text-primary italic'>Precio final por unidad/kilogramo.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="taxRate"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground text-center block'>Impuesto (Alícuota IVA)</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={String(field.value)}>
                                  <FormControl>
                                      <SelectTrigger className='h-12 font-black rounded-xl border-2 bg-white'>
                                          <SelectValue placeholder="IVA" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl border-2">
                                      <SelectItem value="0.16" className="font-bold">IVA GENERAL (16%)</SelectItem>
                                      <SelectItem value="0.08" className="font-bold">IVA REDUCIDO (8%)</SelectItem>
                                      <SelectItem value="0" className="font-bold">PRODUCTO EXENTO (0%)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                          )}
                      />
                  </CardContent>
                </Card>

                <Card className='border-2 rounded-3xl shadow-lg bg-white overflow-hidden'>
                    <CardHeader className="bg-muted/5 border-b py-3"><CardTitle className='text-[10px] font-black uppercase opacity-60'>Multimedia del Producto</CardTitle></CardHeader>
                    <CardContent className="pt-4">
                         <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[9px] font-black uppercase text-muted-foreground'>URL de la Imagen (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="https://dominio.com/foto.jpg" className="text-xs h-10 rounded-lg" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
              </div>
            </div>

            {/* BARRA DE ACCIÓN INFERIOR */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t-2 border-dashed">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/inventory')} 
                    className='font-bold h-14 px-10 rounded-2xl order-2 sm:order-1 border-2 transition-all hover:bg-slate-100'
                >
                    CANCELAR
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className='font-black uppercase h-14 px-16 rounded-2xl shadow-2xl shadow-primary/30 transition-transform active:scale-95 order-1 sm:order-2 text-lg tracking-tight'
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            PROCESANDO...
                        </>
                    ) : (
                        <>
                            <Plus className="mr-2 h-5 w-5" />
                            DAR DE ALTA EN SISTEMA
                        </>
                    )}
                </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
