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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins, Camera, ScanLine, Plus, Wand2, Link2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
  const [searchingImage, setSearchingImage] = useState(false);

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
      imageUrl: '',
    },
  });

  const watchIsWeightable = form.watch('isWeightable');
  const watchName = form.watch('name');
  const watchImageUrl = form.watch('imageUrl');

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({
      title: 'Código Escaneado',
      description: `Se ha registrado: ${scannedCode}`,
    });
    setShowScanner(false);
  };

  const handleAutoSearchImage = async () => {
    if (!watchName || watchName.length < 3) {
      toast({ 
        variant: 'destructive', 
        title: 'Nombre requerido', 
        description: 'Escribe el nombre del producto para buscar una imagen.' 
      });
      return;
    }

    setSearchingImage(true);
    try {
      const keyword = encodeURIComponent(watchName.trim().split(' ')[0]);
      const autoUrl = `https://loremflickr.com/600/600/${keyword}?lock=${Math.floor(Math.random() * 1000)}`;
      
      form.setValue('imageUrl', autoUrl);
      
      toast({
        title: 'Imagen Localizada',
        description: `Se ha vinculado una imagen sugerida para "${watchName}".`
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de búsqueda' });
    } finally {
      setSearchingImage(false);
    }
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
          title="Alta de Mercancía"
          description="Añade artículos por unidad o a granel (Kg/Gr) de forma profesional."
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
              
              {/* COLUMNA PRINCIPAL: IDENTIDAD Y MODO */}
              <div className="space-y-6 lg:col-span-8">
                <Card className='border-2 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-muted/10 border-b border-dashed py-4'>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Package className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                            <CardTitle className='text-sm font-black uppercase tracking-tight'>Identidad del Artículo</CardTitle>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="flex flex-col gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Nombre del Producto / Alimento</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Ej: Harina Pan o Tomate Perita" className="h-14 text-lg font-bold rounded-2xl border-2" {...field} />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="secondary" 
                                className="h-14 px-4 rounded-2xl bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-md group"
                                onClick={handleAutoSearchImage}
                                disabled={searchingImage}
                                title="Buscar imagen automáticamente"
                              >
                                {searchingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5 group-hover:rotate-12 transition-transform" />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* URL DE IMAGEN */}
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Enlace de Imagen (URL)</FormLabel>
                              <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                                <FormControl>
                                  <Input placeholder="https://..." className="h-12 pl-10 font-mono text-xs rounded-xl" {...field} />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* PREVISUALIZACION DE IMAGEN */}
                        <div className="flex flex-col gap-2">
                           <Label className="text-[10px] font-black uppercase text-muted-foreground">Previsualización</Label>
                           <div className="h-24 w-full rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/20 relative overflow-hidden">
                              {watchImageUrl ? (
                                <Image 
                                  src={watchImageUrl} 
                                  alt="Preview" 
                                  fill 
                                  className="object-cover"
                                  onError={() => form.setValue('imageUrl', '')}
                                />
                              ) : (
                                <div className="flex flex-col items-center opacity-20">
                                  <ImageIcon className="h-8 w-8" />
                                  <span className="text-[9px] font-black uppercase mt-1">Sin Imagen</span>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="productType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Tipo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className='h-12 font-bold rounded-xl'><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Inventariable" className="font-bold">INVENTARIABLE</SelectItem>
                                            <SelectItem value="No Inventariable" className="font-bold">NO INVENTARIABLE</SelectItem>
                                            <SelectItem value="Servicio" className="font-bold">SERVICIO</SelectItem>
                                            <SelectItem value="Compuesto" className="font-bold">COMBO / KIT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Categoría</FormLabel>
                                    <FormControl><Input placeholder="Ej: Víveres" className="h-12 font-bold rounded-xl" {...field} /></FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* MODO PESABLE SIMPLIFICADO */}
                    <FormField
                      control={form.control}
                      name="isWeightable"
                      render={({ field }) => (
                        <FormItem className={cn(
                            "flex flex-row items-center justify-between rounded-2xl border-2 p-5 transition-all",
                            field.value ? "bg-primary/5 border-primary/30" : "bg-muted/10 border-dashed"
                        )}>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Scale className={cn("h-5 w-5", field.value ? "text-primary" : "text-muted-foreground")} />
                                <FormLabel className='text-xs font-black uppercase'>Producto a Granel (Peso)</FormLabel>
                            </div>
                            <p className='text-[10px] font-bold text-muted-foreground leading-tight'>
                                {field.value ? "El stock se manejará en Kilogramos y se pedirá peso en el POS." : "El artículo se venderá por unidades fijas."}
                            </p>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={(v) => {
                              field.onChange(v);
                              form.setValue('baseUnit', v ? 'Kilogramos' : 'Unidad');
                          }} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className='border-2 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-muted/10 border-b border-dashed py-4'>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Tag className='h-5 w-5 text-primary' />
                        </div>
                        <div>
                            <CardTitle className='text-sm font-black uppercase tracking-tight'>Control de Stock {watchIsWeightable ? '(KG)' : '(Und)'}</CardTitle>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-6 sm:grid-cols-2 pt-6">
                      <div className="grid grid-cols-2 gap-6 sm:col-span-2">
                          <FormField control={form.control} name="stock" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>
                                      {watchIsWeightable ? "Existencia en Kilos" : "Existencia Inicial"}
                                  </FormLabel>
                                  <div className="relative">
                                      <FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg" {...field} /></FormControl>
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">{watchIsWeightable ? 'KG' : 'Und'}</span>
                                  </div>
                              </FormItem>
                          )} />
                          <FormField control={form.control} name="minStock" render={({ field }) => (
                              <FormItem>
                                  <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>
                                      {watchIsWeightable ? "Kilos para Alerta" : "Stock Crítico"}
                                  </FormLabel>
                                  <div className="relative">
                                      <FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg bg-amber-50/20 border-amber-100" {...field} /></FormControl>
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">{watchIsWeightable ? 'KG' : 'Und'}</span>
                                  </div>
                              </FormItem>
                          )} />
                      </div>

                      <FormField control={form.control} name="barcode" render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Identificador de Escáner</FormLabel>
                              <div className="flex gap-2">
                                  <FormControl>
                                      <div className="relative flex-1">
                                          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                                          <Input placeholder="Código de Barras" className="h-12 pl-10 font-mono font-bold rounded-xl" {...field} />
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
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA LATERAL: PRECIOS */}
              <div className="space-y-6 lg:col-span-4">
                <Card className='border-4 border-primary bg-primary/[0.04] shadow-2xl rounded-3xl overflow-hidden sticky top-4'>
                  <CardHeader className='bg-primary text-white p-5'>
                    <div className="flex items-center gap-3">
                        <Coins className='h-6 w-6 animate-pulse' />
                        <div>
                            <CardTitle className='text-sm font-black uppercase italic tracking-wider'>Estructura Económica</CardTitle>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-6 space-y-6'>
                      <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-primary/60'>Costo de Compra (Bs.)</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" className='h-14 border-2 font-black text-center text-xl rounded-2xl bg-white' {...field} />
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
                              <FormLabel className='text-[10px] font-black uppercase text-primary'>Precio PVP {watchIsWeightable ? 'por Kg' : 'Unitario'}</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" className='text-4xl font-black h-20 border-4 border-primary/30 rounded-2xl text-center bg-white shadow-inner' {...field} />
                              </FormControl>
                              <FormDescription className='text-[10px] font-black text-center text-primary italic'>Precio final cargado al cliente.</FormDescription>
                              <FormMessage />
                          </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="taxRate"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground text-center block'>Impuesto (IVA)</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={String(field.value)}>
                                  <FormControl><SelectTrigger className='h-11 font-black rounded-xl bg-white'><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="0.16" className="font-bold">IVA 16% (General)</SelectItem>
                                      <SelectItem value="0.08" className="font-bold">IVA 8% (Reducido)</SelectItem>
                                      <SelectItem value="0" className="font-bold">EXENTO (0%)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                          )}
                      />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t-2 border-dashed">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/inventory')} 
                    className='font-bold h-14 px-10 rounded-2xl order-2 sm:order-1 border-2'
                >
                    DESCARTAR
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className='font-black uppercase h-14 px-16 rounded-2xl shadow-2xl shadow-primary/30 text-lg tracking-tight'
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            GUARDANDO...
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
