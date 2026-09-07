
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins, Camera, ScanLine, Plus, Wand2, Link2, Image as ImageIcon, Briefcase, Boxes, Info, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

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
  const [imgKey, setImgKey] = useState(0);

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
  const watchPrice = form.watch('price');
  const watchCost = form.watch('cost');

  const margin = watchPrice > 0 ? (((watchPrice - watchCost) / watchPrice) * 100).toFixed(1) : '0';

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({ title: 'Código Escaneado', description: `Se ha registrado: ${scannedCode}` });
    setShowScanner(false);
  };

  const handleAutoSearchImage = async () => {
    if (!watchName || watchName.length < 3) {
      toast({ variant: 'destructive', title: 'Nombre requerido', description: 'Escribe el nombre del producto primero.' });
      return;
    }

    setSearchingImage(true);
    try {
      const cleanName = watchName.trim().replace(/[^a-zA-Z0-9 ]/g, "").split(' ').slice(0, 2).join(',');
      const keyword = encodeURIComponent(cleanName);
      const timestamp = new Date().getTime();
      const autoUrl = `https://loremflickr.com/600/600/${keyword}?lock=${timestamp}`;
      
      form.setValue('imageUrl', autoUrl, { shouldDirty: true });
      setImgKey(timestamp);
      
      toast({ title: 'Imagen Localizada', description: "Se ha vinculado un arte visual sugerido." });
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

        toast({ title: 'Éxito', description: `"${data.name}" registrado en sistema.` });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isClient) return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-3xl" /></div>;

  return (
    <div className="flex flex-1 flex-col bg-[#f1f5f9]/30">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1500px] mx-auto w-full">
        <PageHeader
          title="Alta de Mercancía"
          description="Consola de registro profesional para inventarios inteligentes."
          actions={
            <Button variant="outline" asChild className="rounded-full border-2 h-10 px-6 font-bold hover:bg-white transition-all shadow-sm">
              <Link href="/inventory"><ChevronLeft className='mr-1 h-4 w-4'/> Descartar</Link>
            </Button>
          }
        />

        {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
              
              {/* COLUMNA 1: IDENTIDAD Y VISUAL (4/12) */}
              <div className="space-y-6 xl:col-span-4">
                <Card className='border-2 shadow-xl rounded-3xl overflow-hidden bg-white border-primary/5'>
                  <CardHeader className='bg-primary/5 border-b py-4'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2 italic text-primary tracking-widest'>
                        <Briefcase className="h-4 w-4" /> Ficha de Identidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase text-muted-foreground'>Nombre Comercial</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="Ej: Harina Pan 1kg" className="h-12 text-base font-bold rounded-xl border-2 focus:border-primary transition-all" {...field} />
                              </FormControl>
                              <Button 
                                type="button" 
                                variant="secondary" 
                                className="h-12 px-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-md group shrink-0"
                                onClick={handleAutoSearchImage}
                                disabled={searchingImage}
                                title="Buscar imagen automáticamente"
                              >
                                {searchingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                            <ImageIcon className='h-3 w-3' /> Identidad Visual
                        </Label>
                        <div className="aspect-square w-full rounded-2xl border-4 border-dashed border-muted flex items-center justify-center bg-slate-50 relative overflow-hidden group shadow-inner">
                            {watchImageUrl ? (
                                <Image 
                                    key={imgKey}
                                    src={watchImageUrl} 
                                    alt="Preview" 
                                    fill 
                                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                    unoptimized 
                                />
                            ) : (
                                <div className="flex flex-col items-center opacity-30">
                                    <div className='p-4 bg-muted rounded-full mb-3'>
                                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Esperando Imagen...</span>
                                </div>
                            )}
                            {searchingImage && (
                                <div className='absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10'>
                                    <Loader2 className='h-8 w-8 text-primary animate-spin' />
                                </div>
                            )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                                <FormControl>
                                  <Input placeholder="URL del recurso visual" className="h-10 pl-10 font-mono text-[10px] rounded-xl bg-muted/20 border-none focus:bg-white transition-all" {...field} />
                                </FormControl>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA 2: LOGÍSTICA Y CONTROL (4/12) */}
              <div className="space-y-6 xl:col-span-4">
                <Card className='border-2 shadow-xl rounded-3xl overflow-hidden bg-white border-slate-100'>
                  <CardHeader className='bg-slate-50 border-b py-4'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2 italic tracking-widest'>
                        <Boxes className="h-4 w-4" /> Gestión de Stock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="productType" render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-[10px] font-black uppercase'>Clasificación</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className='h-11 font-bold rounded-xl border-2'><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Inventariable" className="font-bold">CON STOCK</SelectItem>
                                        <SelectItem value="No Inventariable" className="font-bold">SIMPLE</SelectItem>
                                        <SelectItem value="Servicio" className="font-bold">SERVICIO</SelectItem>
                                        <SelectItem value="Compuesto" className="font-bold">KIT / COMBO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-[10px] font-black uppercase'>Categoría</FormLabel>
                                <FormControl><Input placeholder="Ej: Víveres" className="h-11 font-bold rounded-xl border-2" {...field} /></FormControl>
                            </FormItem>
                        )} />
                    </div>

                    <Separator className="opacity-50" />

                    <FormField
                      control={form.control}
                      name="isWeightable"
                      render={({ field }) => (
                        <FormItem className={cn(
                            "flex flex-row items-center justify-between rounded-2xl border-2 p-4 transition-all duration-300",
                            field.value ? "bg-amber-50/50 border-amber-300 shadow-lg shadow-amber-500/5 ring-4 ring-amber-500/5" : "bg-slate-50/50 border-dashed border-slate-300"
                        )}>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Scale className={cn("h-5 w-5 transition-colors", field.value ? "text-amber-600" : "text-slate-400")} />
                                <FormLabel className={cn('text-[11px] font-black uppercase tracking-tight', field.value ? 'text-amber-900' : 'text-slate-600')}>Venta por Peso (Granel)</FormLabel>
                            </div>
                            <p className='text-[9px] font-bold text-muted-foreground leading-tight italic'>Habilita entrada de Kg/Gr en Caja</p>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); form.setValue('baseUnit', v ? 'Kilogramos' : 'Unidad'); }} /></FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <FormField control={form.control} name="stock" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase'>{watchIsWeightable ? 'Disponible (KG)' : 'Disponible (UND)'}</FormLabel>
                              <FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg bg-slate-50 focus:bg-white transition-all" {...field} /></FormControl>
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="minStock" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-red-500'>Mínimo Alerta</FormLabel>
                              <FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg bg-red-50/20 border-red-100 focus:border-red-200 transition-all" {...field} /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase'>Identificador (EAN/UPC)</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <div className="relative flex-1 group">
                                        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                                        <Input placeholder="Código de Barras" className="h-12 pl-10 font-mono font-bold rounded-xl border-2" {...field} />
                                    </div>
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" className='h-12 w-12 rounded-xl border-2 hover:bg-primary/5 transition-all shrink-0' onClick={() => setShowScanner(true)}>
                                    <Camera className="h-6 w-6" />
                                </Button>
                            </div>
                        </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA 3: FINANZAS Y PRECIOS (4/12 - STICKY) */}
              <div className="space-y-6 xl:col-span-4 xl:sticky xl:top-6">
                <Card className='border-4 border-primary bg-primary/[0.03] shadow-2xl rounded-[2.5rem] overflow-hidden transition-all hover:shadow-primary/5'>
                  <CardHeader className='bg-primary text-white p-6'>
                    <div className='flex justify-between items-center'>
                        <CardTitle className='text-xs font-black uppercase italic tracking-[0.2em] flex items-center gap-2'>
                            <Coins className='h-5 w-5' /> Valorización
                        </CardTitle>
                        <Badge className='bg-white/20 text-white border-none font-black text-[9px]'>PRÉMIUM</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-8 space-y-8 px-8'>
                      <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-primary/60 tracking-widest'>Costo de Inversión (Bs.)</FormLabel>
                              <FormControl><Input type="number" step="0.01" className='h-14 border-2 border-primary/20 font-black text-center text-xl rounded-2xl bg-white shadow-sm focus:border-primary transition-all' {...field} /></FormControl>
                          </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                          <FormItem>
                              <div className='flex justify-between items-end mb-2'>
                                <FormLabel className='text-[10px] font-black uppercase text-primary tracking-widest'>Precio de Venta Final</FormLabel>
                                <Badge variant="secondary" className="font-black text-xs text-green-600 bg-green-100/50 px-3 py-1 rounded-full">MARGEN: {margin}%</Badge>
                              </div>
                              <FormControl><Input type="number" step="0.01" className='text-5xl font-black h-28 border-[6px] border-primary/10 rounded-[2rem] text-center bg-white shadow-xl text-primary focus:border-primary/30 transition-all' {...field} /></FormControl>
                          </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="taxRate"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-muted-foreground block mb-3 tracking-widest'>Carga Fiscal (IVA)</FormLabel>
                              <Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={String(field.value)}>
                                  <FormControl><SelectTrigger className='h-12 font-black rounded-2xl bg-white border-2 border-slate-200'><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent className='rounded-2xl border-2'>
                                      <SelectItem value="0.16" className="font-bold py-3 uppercase text-xs">General (16%)</SelectItem>
                                      <SelectItem value="0.08" className="font-bold py-3 uppercase text-xs">Reducido (8%)</SelectItem>
                                      <SelectItem value="0" className="font-bold py-3 uppercase text-xs">Exento (0%)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </FormItem>
                          )}
                      />

                      <div className="pt-4 flex flex-col gap-4">
                        <div className="flex items-start gap-3 p-5 bg-white rounded-3xl border-2 border-dashed border-primary/10">
                            <div className='p-2 bg-primary/10 rounded-full shrink-0'><Info className="h-4 w-4 text-primary" /></div>
                            <p className="text-[10px] font-medium text-slate-500 leading-relaxed italic">
                                Al confirmar, el sistema propagará los cambios a todas las terminales de venta sincronizadas de forma inmediata.
                            </p>
                        </div>
                        <Button type="submit" disabled={isSubmitting} className='w-full h-20 text-xl font-black uppercase shadow-2xl shadow-primary/30 rounded-[2rem] bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]'>
                            {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Plus className="mr-2 h-6 w-6" />}
                            ACTIVAR ARTÍCULO
                        </Button>
                      </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
