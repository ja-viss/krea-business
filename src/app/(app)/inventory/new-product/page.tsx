
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Scale, Camera, ScanLine, Plus, Link2, Image as ImageIcon, Briefcase, Boxes, Coins, Save, TrendingUp, Calendar as CalendarIcon, Tag, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  productType: z.enum(['Inventariable', 'No Inventariable', 'Servicio', 'Compuesto']),
  baseUnit: z.enum(['Unidad', 'Kilogramos', 'Gramos', 'Litros', 'Mililitros']).default('Unidad'),
  isWeightable: z.boolean().default(false),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  serialNumber: z.string().optional(),
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
  expiryDate: z.date().optional(),
  variants: z.array(z.object({
      size: z.string(),
      color: z.string(),
      stock: z.number()
  })).optional()
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { 
    const fetchConfig = async () => {
        const storeId = localStorage.getItem('storeId');
        const res = await fetch(`/api/settings/store?storeId=${storeId}`);
        if (res.ok) setStoreConfig(await res.ok ? await res.json() : null);
    };
    fetchConfig();
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      productType: 'Inventariable',
      baseUnit: 'Unidad',
      isWeightable: false,
      barcode: '',
      stock: 0,
      minStock: 0,
      cost: 0,
      price: 0,
      taxRate: 0.16,
    },
  });

  const watchItems = form.watch();
  const margin = watchItems.price > 0 ? (((watchItems.price - watchItems.cost) / watchItems.price) * 100).toFixed(1) : '0';

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({ title: 'Código Escaneado', description: `Registrado: ${scannedCode}` });
    setShowScanner(false);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/products/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });
        if (!response.ok) throw new Error('Error al procesar el alta');
        toast({ title: 'Registro Exitoso', description: `"${data.name}" añadido al catálogo.` });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Fallo de Guardado', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!storeConfig) return <div className="p-8"><Skeleton className="h-96 w-full rounded-3xl" /></div>;

  const { inventory: invConfig } = storeConfig.settings;

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc]">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1300px] mx-auto w-full">
        <PageHeader
          title="Alta de Artículo"
          description={`Perfil de Tienda: ${storeConfig.businessType?.toUpperCase()}`}
          actions={
            <Button variant="outline" asChild className="rounded-xl font-bold h-11 px-6 shadow-sm border-2">
              <Link href="/inventory"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link>
            </Button>
          }
        />

        {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              
              <div className="space-y-6 lg:col-span-8">
                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-3'>
                    <CardTitle className='text-[11px] font-black uppercase flex items-center gap-2 text-slate-700 tracking-wider'>
                        <Briefcase className="h-3.5 w-3.5 text-primary" /> Identidad del Producto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem className='md:col-span-2'>
                            <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Nombre Comercial</FormLabel>
                            <FormControl><Input placeholder="Ej: Harina de Maíz Precocida" className="h-11 text-base font-bold rounded-xl border-slate-200" {...field} value={field.value ?? ''} /></FormControl>
                          </FormItem>
                        )} />
                        
                        {invConfig.trackSerials && (
                            <FormField control={form.control} name="serialNumber" render={({ field }) => (
                                <FormItem className="animate-in zoom-in-95 duration-300">
                                    <FormLabel className='text-[10px] font-black uppercase text-blue-600 flex items-center gap-1'><Fingerprint className="h-3 w-3" /> Nº de Serie / IMEI</FormLabel>
                                    <FormControl><Input placeholder="Único por unidad" className="h-11 font-mono border-blue-100 bg-blue-50/10" {...field} value={field.value ?? ''} /></FormControl>
                                </FormItem>
                            )} />
                        )}

                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-500'>Categoría</FormLabel>
                            <FormControl><Input placeholder="Ej: Alimentos" className="h-11 font-bold rounded-xl border-slate-200" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )} />
                      </div>
                  </CardContent>
                </Card>

                {invConfig.hasVariants && (
                    <Card className='border-4 border-dashed border-primary/20 bg-primary/[0.02] rounded-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500'>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-primary tracking-widest">
                                <Tag className="h-4 w-4" /> Matriz de Variantes (Moda)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <p className="text-[10px] font-bold text-muted-foreground italic leading-tight">
                                Este producto requiere desglose por tallas y colores. El stock total será la suma de la matriz.
                            </p>
                            <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border-2">
                                <div className="text-center font-black text-[9px] uppercase opacity-40">Talla</div>
                                <div className="text-center font-black text-[9px] uppercase opacity-40">Color</div>
                                <div className="text-center font-black text-[9px] uppercase opacity-40">Existencia</div>
                                <Input placeholder="38" className="h-8 text-[10px] font-bold" />
                                <Input placeholder="Azul" className="h-8 text-[10px] font-bold" />
                                <Input type="number" placeholder="0" className="h-8 text-[10px] font-bold text-center" />
                            </div>
                            <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase h-7"><Plus className="mr-1 h-3 w-3" /> Añadir Fila de Variante</Button>
                        </CardContent>
                    </Card>
                )}

                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-3'>
                    <CardTitle className='text-[11px] font-black uppercase flex items-center gap-2 text-slate-700 tracking-wider'>
                        <Boxes className="h-3.5 w-3.5 text-primary" /> Almacén y Logística
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="baseUnit" render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Unidad</FormLabel>
                                <Select onValueChange={(v) => field.onChange(v)} defaultValue={field.value}>
                                    <FormControl><SelectTrigger className='h-11 font-bold rounded-xl border-slate-200'><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className='rounded-xl'>
                                        <SelectItem value="Unidad" className="font-bold">UNIDAD (Und)</SelectItem>
                                        <SelectItem value="Kilogramos" className="font-bold">KILOGRAMOS (Kg)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        {invConfig.trackBatches && (
                            <FormField control={form.control} name="expiryDate" render={({ field }) => (
                                <FormItem className="flex flex-col justify-center rounded-xl border-2 border-dashed bg-slate-50/30 p-3 animate-in zoom-in-95 duration-300">
                                    <FormLabel className='text-[10px] font-black uppercase text-slate-500 mb-1'>Vencimiento</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("h-9 pl-3 text-left font-bold rounded-lg text-xs", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )} />
                        )}

                        <div className="grid grid-cols-2 gap-4 md:col-span-1">
                            <FormField control={form.control} name="stock" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Existencia</FormLabel>
                                    <FormControl><Input type="number" step="0.001" className="h-11 font-black rounded-xl border-slate-200 text-center" {...field} value={field.value ?? 0} /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                    </div>

                    <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Código de Barras</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <div className="relative flex-1">
                                        <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-30" />
                                        <Input placeholder="EAN / SKU" className="h-12 pl-11 font-mono font-bold rounded-xl border-slate-200" {...field} value={field.value ?? ''} />
                                    </div>
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" className='h-12 w-12 rounded-xl border-2' onClick={() => setShowScanner(true)}>
                                    <Camera className="h-6 w-6" />
                                </Button>
                            </div>
                        </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-4">
                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-2 px-4'>
                    <CardTitle className='text-[9px] font-black uppercase flex items-center gap-2 text-slate-500'>
                        <ImageIcon className='h-3 w-3' /> Identidad Visual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 pb-4 px-4 space-y-3">
                    <div className="h-28 w-full rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/30 relative overflow-hidden group">
                        {watchItems.imageUrl ? (
                            <Image src={watchItems.imageUrl} alt="Preview" fill className="object-contain p-2" unoptimized />
                        ) : (
                            <div className="flex flex-col items-center opacity-20">
                                <ImageIcon className="h-6 w-6 mb-1" />
                                <span className="text-[7px] font-black uppercase">Sin Imagen</span>
                            </div>
                        )}
                    </div>
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem><div className="relative"><Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <FormControl><Input placeholder="URL de imagen" className="h-8 pl-8 font-mono text-[9px] rounded-lg border-slate-100 bg-slate-50/50" {...field} value={field.value ?? ''} /></FormControl>
                        </div></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className='border-none shadow-2xl rounded-2xl overflow-hidden bg-white'>
                  <div className='bg-gradient-to-r from-primary to-purple-600 p-4 text-white'>
                    <div className='flex justify-between items-center'>
                        <CardTitle className='text-[10px] font-black uppercase italic tracking-widest'><Coins className='h-4 w-4' /> Precio Venta</CardTitle>
                        <Badge className='bg-white/20 text-white border-none font-black text-[7px]'>KREA SUITE</Badge>
                    </div>
                  </div>
                  <CardContent className='pt-6 space-y-5 px-6'>
                      <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem>
                            <div className='flex justify-between items-end mb-1'><FormLabel className='text-[10px] font-black uppercase text-primary'>Monto Bruto (PVP)</FormLabel><Badge variant="secondary" className="font-black text-[9px] text-green-600 bg-green-50 border-green-100 px-2 py-0.5 rounded-full flex gap-1"><TrendingUp className='h-3 w-3' /> {margin}%</Badge></div>
                            <FormControl><Input type="number" step="0.01" className='text-3xl font-black h-16 border-2 border-primary/10 rounded-2xl text-center text-primary shadow-inner' {...field} value={field.value ?? 0} /></FormControl>
                          </FormItem>
                      )} />

                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-400'>IVA Aplicable</FormLabel><Select onValueChange={(v) => field.onChange(parseFloat(v))} defaultValue={String(field.value)}><FormControl><SelectTrigger className='h-11 font-bold rounded-xl border-slate-100 bg-slate-50/50'><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className='rounded-xl'><SelectItem value="0.16" className="font-bold py-2 uppercase text-[10px]">General (16%)</SelectItem><SelectItem value="0" className="font-bold py-2 uppercase text-[10px]">Exento (0%)</SelectItem></SelectContent></Select></FormItem>
                      )} />

                      <Button type="submit" disabled={isSubmitting} className='w-full h-14 text-base font-black uppercase shadow-xl shadow-primary/20 rounded-2xl bg-primary hover:scale-[1.01] transition-transform active:scale-[0.98]'>
                          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                          CREAR PRODUCTO
                      </Button>
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
