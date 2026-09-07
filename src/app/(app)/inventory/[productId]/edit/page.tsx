
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins, Camera, ScanLine, Save, Wand2, Link2, Image as ImageIcon, Briefcase, Boxes, Trash2, CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { IProduct } from '@/models/Product';
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

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchingImage, setSearchingImage] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [imgKey, setImgKey] = useState(0);

  useEffect(() => { setIsClient(true); }, []);

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

  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        try {
          const response = await fetch(`/api/products/${productId}`);
          if (!response.ok) throw new Error('No se pudo encontrar el producto.');
          const data: IProduct = await response.json();
          form.reset({
            name: data.name,
            productType: data.productType as any,
            baseUnit: (data as any).baseUnit || 'Unidad',
            isWeightable: (data as any).isWeightable || false,
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
          setImgKey(new Date().getTime());
        } catch (err: any) {
          toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [productId, form, toast]);

  const handleBarcodeScan = (scannedCode: string) => {
    form.setValue('barcode', scannedCode);
    toast({ title: 'Código Escaneado', description: `Actualizado a: ${scannedCode}` });
    setShowScanner(false);
  };

  const handleAutoSearchImage = async () => {
    if (!watchName || watchName.length < 3) return;
    setSearchingImage(true);
    try {
      const cleanName = watchName.trim().replace(/[^a-zA-Z0-9 ]/g, "").split(' ').slice(0, 2).join(',');
      const keyword = encodeURIComponent(cleanName);
      const timestamp = new Date().getTime();
      const autoUrl = `https://loremflickr.com/600/600/${keyword}?lock=${timestamp}`;
      form.setValue('imageUrl', autoUrl, { shouldDirty: true });
      setImgKey(timestamp);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de búsqueda' });
    } finally {
      setSearchingImage(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, userId: localStorage.getItem('userId'), userName: localStorage.getItem('userName') }),
        });
        if (!response.ok) throw new Error('Error al actualizar');
        toast({ title: '¡Actualizado!', description: `"${data.name}" se guardó correctamente.` });
        router.push('/inventory');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-2xl" /></div>;

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc]">
      <main className="flex-1 space-y-8 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title={`Editando: ${watchName}`}
          description="Actualización maestra de parámetros y finanzas."
          actions={
            <Button variant="outline" asChild className="rounded-xl border-2 font-bold h-11 px-6 hover:bg-white shadow-sm">
              <Link href="/inventory"><ChevronLeft className='mr-2 h-4 w-4'/> Cancelar</Link>
            </Button>
          }
        />

        {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              
              {/* COLUMNA IZQUIERDA: INFORMACIÓN MAESTRA (8/12) */}
              <div className="space-y-6 lg:col-span-8">
                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-4'>
                    <CardTitle className='text-sm font-black uppercase flex items-center gap-2 text-slate-700 tracking-tight'>
                        <Briefcase className="h-4 w-4 text-primary" /> Ficha de Identidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem className='md:col-span-2'>
                            <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Nombre del Producto</FormLabel>
                            <div className="flex gap-2">
                              <FormControl><Input className="h-12 text-base font-bold rounded-xl border-slate-200" {...field} /></FormControl>
                              <Button type="button" variant="secondary" className="h-12 px-4 rounded-xl bg-amber-500 text-white" onClick={handleAutoSearchImage} disabled={searchingImage}>
                                {searchingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormItem>
                        )} />
                        
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-500'>Categoría</FormLabel>
                            <FormControl><Input className="h-12 font-bold rounded-xl border-slate-200" {...field} /></FormControl></FormItem>
                        )} />

                        <FormField control={form.control} name="productType" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-500'>Tipo de Artículo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className='h-12 font-bold rounded-xl border-slate-200'><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent className='rounded-xl'><SelectItem value="Inventariable" className="font-bold">CON EXISTENCIA</SelectItem><SelectItem value="No Inventariable" className="font-bold">SIN CONTROL STOCK</SelectItem><SelectItem value="Servicio" className="font-bold">SERVICIO</SelectItem><SelectItem value="Compuesto" className="font-bold">KIT / COMBO</SelectItem></SelectContent></Select>
                            </FormItem>
                        )} />
                      </div>
                  </CardContent>
                </Card>

                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-4'>
                    <CardTitle className='text-sm font-black uppercase flex items-center gap-2 text-slate-700 tracking-tight'>
                        <Boxes className="h-4 w-4 text-primary" /> Control de Almacén
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-6">
                    <FormField control={form.control} name="isWeightable" render={({ field }) => (
                        <FormItem className={cn("flex flex-row items-center justify-between rounded-2xl border-2 p-4", field.value ? "bg-amber-50/50 border-amber-200" : "bg-slate-50/30 border-dashed border-slate-200")}>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                <Scale className={cn("h-5 w-5", field.value ? "text-amber-600" : "text-slate-400")} />
                                <FormLabel className={cn('text-xs font-black uppercase', field.value ? 'text-amber-900' : 'text-slate-600')}>Venta a Granel (Peso)</FormLabel>
                            </div>
                            <p className='text-[10px] font-bold text-slate-400 italic'>Habilita entrada de Kg/Gr en Caja</p>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); form.setValue('baseUnit', v ? 'Kilogramos' : 'Unidad'); }} /></FormControl>
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField control={form.control} name="stock" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-slate-500'>{watchIsWeightable ? 'Disponible (Kilos)' : 'Disponible (Unidades)'}</FormLabel>
                              <FormControl><Input type="number" step="0.001" className="h-14 font-black rounded-xl border-slate-200 text-lg bg-slate-50/50 text-center" {...field} /></FormControl>
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="minStock" render={({ field }) => (
                          <FormItem>
                              <FormLabel className='text-[10px] font-black uppercase text-red-500'>Mínimo Alerta</FormLabel>
                              <FormControl><Input type="number" step="0.001" className="h-14 font-black rounded-xl border-red-100 bg-red-50/20 text-lg text-center" {...field} /></FormControl>
                          </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase text-slate-500'>Identificador EAN / SKU</FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <div className="relative flex-1 group">
                                        <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-30" />
                                        <Input className="h-14 pl-12 font-mono font-bold rounded-xl border-slate-200" {...field} />
                                    </div>
                                </FormControl>
                                <Button type="button" variant="outline" size="icon" className='h-14 w-14 rounded-xl' onClick={() => setShowScanner(true)}>
                                    <Camera className="h-6 w-6" />
                                </Button>
                            </div>
                        </FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA DERECHA (4/12) */}
              <div className="space-y-6 lg:col-span-4 lg:sticky lg:top-8">
                <Card className='border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl overflow-hidden bg-white'>
                  <CardHeader className='bg-slate-50/50 border-b border-slate-100 py-3'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2 text-slate-500'>
                        <ImageIcon className='h-3 w-3' /> Identidad Visual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50 relative overflow-hidden group">
                        {watchImageUrl ? (
                            <Image key={imgKey} src={watchImageUrl} alt="Preview" fill className="object-contain p-4 transition-transform duration-500" unoptimized />
                        ) : (
                            <div className="flex flex-col items-center opacity-20"><ImageIcon className="h-12 w-12 mb-2" /><span className="text-[10px] font-black uppercase">Sin Imagen</span></div>
                        )}
                        {searchingImage && <div className='absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center'><Loader2 className='h-8 w-8 text-primary animate-spin' /></div>}
                    </div>
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem><div className="relative"><Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <FormControl><Input placeholder="URL de la imagen" className="h-10 pl-10 font-mono text-[10px] rounded-xl border-slate-100 bg-slate-50/50" {...field} /></FormControl>
                        </div></FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className='border-none shadow-2xl rounded-2xl overflow-hidden bg-white'>
                  <div className='bg-gradient-to-r from-primary to-purple-600 p-5 text-white'>
                    <div className='flex justify-between items-center'>
                        <CardTitle className='text-xs font-black uppercase flex items-center gap-2 italic tracking-widest'><Coins className='h-4 w-4' /> Valorización</CardTitle>
                        <Badge className='bg-white/20 text-white border-none font-black text-[8px]'>PRÉMIUM</Badge>
                    </div>
                  </div>
                  <CardContent className='pt-6 space-y-6 px-6'>
                      <FormField control={form.control} name="cost" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-400'>Costo Unitario (Bs.)</FormLabel><FormControl><Input type="number" step="0.01" className='h-12 border-slate-100 font-bold text-center text-base rounded-xl' {...field} /></FormControl></FormItem>
                      )} />

                      <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem>
                            <div className='flex justify-between items-end mb-1.5'><FormLabel className='text-[10px] font-black uppercase text-primary'>Precio PVP</FormLabel><Badge variant="secondary" className="font-black text-[10px] text-green-600 bg-green-50 border-green-100 px-2.5 py-0.5 rounded-full flex gap-1"><TrendingUp className='h-3 w-3' /> {margin}%</Badge></div>
                            <FormControl><Input type="number" step="0.01" className='text-4xl font-black h-24 border-2 border-primary/10 rounded-2xl text-center text-primary' {...field} /></FormControl>
                          </FormItem>
                      )} />

                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-slate-400'>Carga Fiscal (IVA)</FormLabel><Select onValueChange={(v) => field.onChange(parseFloat(v))} value={String(field.value)}><FormControl><SelectTrigger className='h-12 font-bold rounded-xl border-slate-100'><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent className='rounded-xl'><SelectItem value="0.16" className="font-bold py-2 uppercase text-xs">General (16%)</SelectItem><SelectItem value="0.08" className="font-bold py-2 uppercase text-xs">Reducido (8%)</SelectItem><SelectItem value="0" className="font-bold py-2 uppercase text-xs">Exento (0%)</SelectItem></SelectContent></Select></FormItem>
                      )} />

                      <Button type="submit" disabled={isSubmitting} className='w-full h-16 text-lg font-black uppercase shadow-xl shadow-primary/20 rounded-2xl bg-primary'>
                          {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                          ACTUALIZAR FICHA
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

