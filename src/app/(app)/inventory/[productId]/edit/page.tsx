
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ChevronLeft, Loader2, Scale, Package, Tag, Coins, Camera, ScanLine, Save, Wand2, Link2, Image as ImageIcon, Briefcase, Boxes, Trash2 } from 'lucide-react';
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
    toast({ title: 'Código Escaneado', description: `Se ha actualizado a: ${scannedCode}` });
    setShowScanner(false);
  };

  const handleAutoSearchImage = async () => {
    if (!watchName || watchName.length < 3) return;
    setSearchingImage(true);
    try {
      const keywords = watchName.trim().split(' ').slice(0, 2).join(',');
      const autoUrl = `https://loremflickr.com/600/600/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random() * 1000)}`;
      form.setValue('imageUrl', autoUrl, { shouldDirty: true });
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

  if (loading) return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-3xl" /></div>;

  return (
    <div className="flex flex-1 flex-col bg-slate-50/30">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title={`Editando: ${watchName}`}
          description={`Actualiza la información técnica y financiera de este ítem.`}
          actions={
            <Button variant="outline" asChild className="rounded-full border-2 font-bold h-10 shadow-sm">
              <Link href="/inventory"><ChevronLeft className='mr-1 h-4 w-4'/> Cancelar</Link>
            </Button>
          }
        />

        {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
              
              {/* COLUMNA 1: IDENTIDAD (4/12) */}
              <div className="space-y-6 xl:col-span-4">
                <Card className='border-2 shadow-xl rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-primary/5 border-b py-4'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2 italic text-primary'>
                        <Briefcase className="h-4 w-4" /> Identidad y Visual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                      <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-[10px] font-black uppercase'>Nombre Oficial</FormLabel>
                            <div className="flex gap-2">
                              <FormControl><Input className="h-12 text-base font-bold rounded-xl border-2" {...field} /></FormControl>
                              <Button type="button" variant="secondary" className="h-12 px-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md group" onClick={handleAutoSearchImage} disabled={searchingImage}>
                                {searchingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 group-hover:rotate-12 transition-transform" />}
                              </Button>
                            </div>
                          </FormItem>
                      )} />

                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Previsualización</Label>
                        <div className="aspect-square w-full rounded-2xl border-4 border-dashed flex items-center justify-center bg-muted/20 relative overflow-hidden group">
                            {watchImageUrl ? (
                                <Image src={watchImageUrl} alt="Preview" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                            ) : (
                                <div className="flex flex-col items-center opacity-20">
                                    <ImageIcon className="h-12 w-12" />
                                    <span className="text-[9px] font-black uppercase mt-2">Sin Imagen</span>
                                </div>
                            )}
                        </div>
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem><div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-40" />
                                <FormControl><Input placeholder="URL de imagen" className="h-10 pl-10 font-mono text-[10px] rounded-xl bg-muted/30" {...field} /></FormControl>
                            </div></FormItem>
                        )} />
                      </div>
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA 2: LOGÍSTICA (4/12) */}
              <div className="space-y-6 xl:col-span-4">
                <Card className='border-2 shadow-xl rounded-3xl overflow-hidden bg-white'>
                  <CardHeader className='bg-muted/10 border-b py-4'>
                    <CardTitle className='text-xs font-black uppercase flex items-center gap-2 italic'>
                        <Boxes className="h-4 w-4" /> Existencias y Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="productType" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className='h-11 font-bold rounded-xl'><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="Inventariable" className="font-bold">STOCK</SelectItem><SelectItem value="No Inventariable" className="font-bold">SIMPLE</SelectItem><SelectItem value="Servicio" className="font-bold">SERVICIO</SelectItem><SelectItem value="Compuesto" className="font-bold">COMBO</SelectItem></SelectContent></Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Categoría</FormLabel><FormControl><Input className="h-11 font-bold rounded-xl" {...field} /></FormControl></FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="isWeightable" render={({ field }) => (
                        <FormItem className={cn("flex flex-row items-center justify-between rounded-2xl border-2 p-4 transition-all", field.value ? "bg-amber-50 border-amber-300 ring-4 ring-amber-500/10" : "bg-muted/10 border-dashed")}>
                          <div className="space-y-0.5"><div className="flex items-center gap-2"><Scale className={cn("h-5 w-5", field.value ? "text-amber-600" : "text-muted-foreground")} /><FormLabel className='text-[11px] font-black uppercase'>Modo Pesable</FormLabel></div><p className='text-[9px] font-bold text-muted-foreground italic'>Vende por Kg/Gr en POS</p></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); form.setValue('baseUnit', v ? 'Kilogramos' : 'Unidad'); }} /></FormControl>
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="stock" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase'>Stock Actual ({watchIsWeightable ? 'KG' : 'UND'})</FormLabel><FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg bg-primary/[0.02]" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="minStock" render={({ field }) => (
                            <FormItem><FormLabel className='text-[10px] font-black uppercase text-red-600'>Min. Alerta</FormLabel><FormControl><Input type="number" step="0.001" className="h-12 font-black rounded-xl border-2 text-center text-lg bg-red-50/30" {...field} /></FormControl></FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="barcode" render={({ field }) => (
                        <FormItem><FormLabel className='text-[10px] font-black uppercase'>Código de Barras</FormLabel><div className="flex gap-2"><FormControl><Input className="h-12 font-mono font-bold rounded-xl border-2" {...field} /></FormControl>
                        <Button type="button" variant="outline" size="icon" className='h-12 w-12 rounded-xl border-2' onClick={() => setShowScanner(true)}><Camera className="h-6 w-6" /></Button></div></FormItem>
                    )} />
                  </CardContent>
                </Card>
              </div>

              {/* COLUMNA 3: FINANZAS (4/12) */}
              <div className="space-y-6 xl:col-span-4 xl:sticky xl:top-4">
                <Card className='border-4 border-primary bg-primary/[0.04] shadow-2xl rounded-3xl overflow-hidden'>
                  <CardHeader className='bg-primary text-white p-5'><CardTitle className='text-xs font-black uppercase italic flex items-center gap-2'><Coins className='h-5 w-5' /> Estructura Económica</CardTitle></CardHeader>
                  <CardContent className='pt-6 space-y-6'>
                      <FormField control={form.control} name="cost" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-primary/60'>Costo Operativo (Bs.)</FormLabel><FormControl><Input type="number" step="0.01" className='h-14 border-2 font-black text-center text-xl rounded-2xl bg-white' {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-primary'>Precio PVP Final</FormLabel><FormControl><Input type="number" step="0.01" className='text-4xl font-black h-24 border-4 border-primary/30 rounded-2xl text-center bg-white text-primary' {...field} /></FormControl>
                          <div className="flex justify-between items-center mt-2 px-1"><span className='text-[10px] font-black uppercase text-muted-foreground'>Margen Real:</span><Badge variant="secondary" className="font-black text-xs text-green-600 bg-green-50">{margin}%</Badge></div></FormItem>
                      )} />
                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                          <FormItem><FormLabel className='text-[10px] font-black uppercase text-muted-foreground block mb-2'>Fiscalidad (IVA)</FormLabel><Select onValueChange={(v) => field.onChange(parseFloat(v))} value={String(field.value)}><FormControl><SelectTrigger className='h-11 font-black rounded-xl bg-white border-2'><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="0.16" className="font-bold">IVA 16% (GENERAL)</SelectItem><SelectItem value="0.08" className="font-bold">IVA 8% (REDUCIDO)</SelectItem><SelectItem value="0" className="font-bold">EXENTO (0%)</SelectItem></SelectContent></Select></FormItem>
                      )} />

                      <div className="pt-4 space-y-3">
                        <Button type="submit" disabled={isSubmitting} className='w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl'>
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} ACTUALIZAR FICHA
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
