
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
    Loader2, 
    ChevronLeft, 
    Printer, 
    X,
    Plus,
    Minus,
    Zap,
    UserCheck,
    Package,
    Lock,
    Scale,
    Coins,
    QrCode,
    LayoutGrid,
    List,
    AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Cliente requerido'),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), 
    quantity: z.coerce.number().min(0.001),
    stock: z.number(),
    taxRate: z.number(),
    imageUrl: z.string().optional(),
    isWeightable: z.boolean().optional(),
    variantInfo: z.string().optional()
  })).min(1),
  paymentMethod: z.string().default('Efectivo'),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
  changeCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
  amountReceived: z.string().default(''),
  referenceNumber: z.string().optional(),
});

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates } = useExchangeRates();
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Vista Dinámica
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Lógica de Peso
  const [weightProduct, setWeightProduct] = useState<IProduct | null>(null);
  const [inputWeight, setInputWeight] = useState('0');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'GR'>('GR');

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentCurrency: 'USD',
      changeCurrency: 'USD',
      amountReceived: '',
      referenceNumber: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchMethod = form.watch('paymentMethod');
  const watchCurrency = form.watch('paymentCurrency');
  const watchChangeCurrency = form.watch('changeCurrency');
  const watchAmountReceived = form.watch('amountReceived');

  useEffect(() => {
    const fetchData = async () => {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) return;
        try {
            const [configRes, productsRes] = await Promise.all([
                fetch(`/api/settings/store?storeId=${storeId}`),
                fetch(`/api/products?storeId=${storeId}`)
            ]);
            if (configRes.ok) {
                const config = await configRes.json();
                setStoreConfig(config);
                setViewMode(config.settings?.pos?.defaultView || 'list');
            }
            if (productsRes.ok) setProducts(await productsRes.json());
        } catch (e) {} finally {
            setLoadingSession(false);
        }
    };
    fetchData();
  }, []);

  const totals = useMemo(() => {
    let totalVES = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        const tax = sub * (i.taxRate || 0);
        totalVES += (sub + tax);
    });
    const ves = Math.round(totalVES * 100) / 100;
    const usd = rates.usd?.usd ? Math.round((ves / rates.usd.usd) * 100) / 100 : 0;
    const cop = rates.cop?.rate ? Math.round((usd * rates.cop.rate) / 100) * 100 : 0; 
    return { ves, usd, cop };
  }, [watchItems, rates]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    if (product.isWeightable) {
        setWeightProduct(product);
        setInputWeight('0');
        setWeightUnit('GR');
        return;
    }

    const existing = fields.findIndex(item => item.productId === String(product._id));
    if (existing > -1) {
      const newQty = parseFloat(watchItems[existing].quantity.toString()) + quantity;
      update(existing, { ...fields[existing], quantity: newQty });
    } else {
        append({
            productId: String(product._id),
            name: product.name,
            price: product.price, 
            quantity,
            stock: product.stock,
            taxRate: product.taxRate,
            imageUrl: product.imageUrl,
            isWeightable: product.isWeightable
        });
    }
  };

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                amountReceived: parseFloat(watchAmountReceived) || 0,
                storeId: localStorage.getItem('storeId')
            }),
        });
        if (!response.ok) throw new Error("Error en facturación");
        const result = await response.json();
        toast({ title: "Factura Generada", description: "Venta guardada en sistema." });
        router.push(`/sales/${result._id}/invoice`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Fallo POS', description: e.message });
        setIsSubmitting(false);
    }
  };

  if (loadingSession) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-2 md:p-4 overflow-y-auto lg:overflow-hidden flex flex-col gap-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full border bg-white"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Punto de Venta</h2>
                        <Badge variant="outline" className="text-[10px] font-black uppercase bg-muted/30">
                            {storeConfig?.businessType?.toUpperCase()} MODE
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-full border-2 border-dashed">
                    <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 rounded-full text-[9px] font-black uppercase">
                        <List className="h-3.5 w-3.5 mr-1" /> Escáner
                    </Button>
                    <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 rounded-full text-[9px] font-black uppercase">
                        <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Catálogo
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 lg:overflow-hidden">
                {/* LADO IZQUIERDO: BÚSQUEDA Y CARRITO */}
                <div className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
                    {viewMode === 'list' ? (
                        <Card className='rounded-2xl border-2 shadow-sm'><CardContent className="p-3"><ProductSearch onProductSelect={handleProductSelect} /></CardContent></Card>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 overflow-y-auto max-h-[300px] lg:max-h-none p-1">
                            {products.map(p => (
                                <button 
                                    key={p._id} 
                                    onClick={() => handleProductSelect(p)}
                                    className="bg-white border-2 rounded-xl p-2 flex flex-col items-center text-center gap-1 hover:border-primary transition-all group"
                                >
                                    <div className="h-16 w-16 relative overflow-hidden rounded-lg bg-muted">
                                        {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform" unoptimized /> : <Package className="h-4 w-4 m-auto opacity-20" />}
                                    </div>
                                    <span className="text-[9px] font-black uppercase leading-tight line-clamp-2">{p.name}</span>
                                    <span className="text-[10px] font-black text-primary">Bs. {p.price.toLocaleString()}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <Card className="rounded-2xl flex-1 lg:overflow-hidden flex flex-col border-2 shadow-sm">
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="overflow-y-auto flex-1">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-4 font-black uppercase text-[10px]">Producto</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                            <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="pl-4 py-3">
                                                    <div className='flex flex-col'>
                                                        <span className='font-black uppercase text-[10px] leading-tight'>{item.name}</span>
                                                        <span className='text-[8px] opacity-60'>Bs. {item.price.toLocaleString()}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => decrementQty(index)}><Minus className="h-3 w-3"/></Button>
                                                        <span className="font-black text-xs w-8">{item.quantity}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => incrementQty(index)}><Plus className="h-3 w-3"/></Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 font-black text-[11px]">
                                                    {(item.price * item.quantity * (1 + item.taxRate)).toLocaleString('es-VE')}
                                                </TableCell>
                                                <TableCell className="pr-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(index)}><X className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LADO DERECHO: TOTALES Y COBRO */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="rounded-3xl bg-primary text-primary-foreground p-6 shadow-2xl border-none">
                        <div className="flex justify-between items-baseline mb-4">
                            <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">Total a Pagar</span>
                            <Badge className="bg-white/20 text-white font-black text-[10px]">BS. {totals.ves.toLocaleString()}</Badge>
                        </div>
                        <div className="text-5xl font-black tracking-tighter">
                            ${totals.usd.toFixed(2)}
                        </div>
                    </Card>

                    <Card className="rounded-3xl flex-1 flex flex-col border-2 shadow-lg p-6 space-y-4 overflow-y-auto">
                        <CustomerSearch onCustomerSelect={(c) => { 
                            form.setValue('customerId', c._id); 
                            form.setValue('customerName', c.name); 
                            setSelectedCustomer(c); 
                        }} />

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase opacity-50 tracking-widest">Método de Cobro</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Pago Móvil', 'Tarjeta', 'Efectivo', 'Zelle'].map(m => (
                                    <button 
                                        key={m} 
                                        className={cn(
                                            "h-14 rounded-2xl text-xs font-black uppercase border-2 transition-all",
                                            watchMethod === m ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/30 border-transparent hover:bg-muted/50"
                                        )}
                                        onClick={() => form.setValue('paymentMethod', m)}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-4 bg-muted/10 p-4 rounded-3xl border-2 border-dashed">
                             <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase">Recibido ({watchCurrency})</Label>
                                <div className="flex gap-1">
                                    {['USD', 'VES', 'COP'].map(c => (
                                        <button key={c} onClick={() => form.setValue('paymentCurrency', c as any)} className={cn("text-[9px] font-black px-2 py-0.5 rounded", watchCurrency === c ? "bg-primary text-white" : "bg-muted")}>{c}</button>
                                    ))}
                                </div>
                             </div>
                             <Input 
                                type="number" 
                                className="h-16 text-3xl font-black text-center border-none bg-transparent" 
                                placeholder="0.00"
                                {...form.register('amountReceived')}
                             />
                        </div>

                        <Button 
                            onClick={handleFinalizeSale} 
                            disabled={isSubmitting || watchItems.length === 0} 
                            className="w-full h-20 text-xl font-black uppercase shadow-2xl rounded-3xl mt-auto"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Procesar Venta (F4)"}
                        </Button>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );

  function incrementQty(index: number) {
    const current = watchItems[index].quantity;
    update(index, { ...fields[index], quantity: Math.round((current + (watchItems[index].isWeightable ? 0.1 : 1)) * 100) / 100 });
  }

  function decrementQty(index: number) {
    const current = watchItems[index].quantity;
    if (current > 0.1) {
        update(index, { ...fields[index], quantity: Math.round((current - (watchItems[index].isWeightable ? 0.1 : 1)) * 100) / 100 });
    }
  }
}
