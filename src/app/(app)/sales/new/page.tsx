'use client';

import { useState, useEffect, useMemo } from 'react';
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
    X,
    Plus,
    Minus,
    Zap,
    Package,
    LayoutGrid,
    List,
    ShoppingCart,
    ArrowRight,
    UserCheck,
    CreditCard
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';

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
  })).min(1),
  paymentMethod: z.string().default('Efectivo'),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
  amountReceived: z.string().default(''),
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentCurrency: 'USD',
      amountReceived: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchMethod = form.watch('paymentMethod');
  const watchCurrency = form.watch('paymentCurrency');
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
            if (configRes.ok) setStoreConfig(await configRes.json());
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
    return { ves, usd };
  }, [watchItems, rates]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
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
    toast({ title: "Añadido", description: product.name });
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
        toast({ title: "Factura Generada" });
        router.push(`/sales/${result._id}/invoice`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Fallo POS', description: e.message });
        setIsSubmitting(false);
    }
  };

  if (loadingSession) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col gap-4 p-3 md:p-6 lg:flex-row lg:gap-6">
            
            {/* PANEL IZQUIERDO: CATALOGO Y BUSQUEDA */}
            <div className="flex-1 flex flex-col gap-4 lg:overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild className="rounded-full border bg-white shadow-sm active:scale-90"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Terminal POS</h2>
                    </div>
                    <div className="flex bg-muted/50 p-1 rounded-xl border-2">
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 rounded-lg text-[9px] font-black uppercase">
                            <List className="h-3.5 w-3.5 mr-1" /> Lista
                        </Button>
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 rounded-lg text-[9px] font-black uppercase">
                            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 lg:overflow-hidden">
                    <Card className='rounded-2xl border-2 shadow-sm sticky top-0 z-20'><CardContent className="p-3"><ProductSearch onProductSelect={handleProductSelect} /></CardContent></Card>
                    
                    <div className={cn(
                        "flex-1 overflow-y-auto pr-1 scrollbar-hide pb-24 lg:pb-0",
                        viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-2"
                    )}>
                        {products.map(p => (
                            viewMode === 'grid' ? (
                                <button key={p._id} onClick={() => handleProductSelect(p)} className="bg-white border-2 rounded-2xl p-2 flex flex-col items-center text-center gap-2 hover:border-primary active:scale-95 transition-all group relative overflow-hidden shadow-sm">
                                    <div className="h-20 w-full relative overflow-hidden rounded-xl bg-muted">
                                        {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover group-hover:scale-110 transition-transform" unoptimized /> : <Package className="h-6 w-6 m-auto opacity-10" />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase leading-tight line-clamp-2 px-1">{p.name}</span>
                                    <span className="text-xs font-black text-primary">Bs. {p.price.toLocaleString()}</span>
                                    {p.stock <= p.minStock && <Badge className="absolute top-1 right-1 bg-red-500 text-[7px] p-1">STOCK BAJO</Badge>}
                                </button>
                            ) : (
                                <Card key={p._id} className="border-2 rounded-xl p-3 hover:border-primary active:scale-[0.98] transition-all cursor-pointer shadow-sm" onClick={() => handleProductSelect(p)}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-muted relative overflow-hidden border shrink-0">
                                            {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-cover" unoptimized /> : <Package className="h-5 w-5 m-auto opacity-10" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black uppercase text-[10px] truncate">{p.name}</h3>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[10px] font-black text-primary">Bs. {p.price.toLocaleString()}</span>
                                                <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">STOCK: {p.stock}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        ))}
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO: CARRITO (VISIBLE EN DESKTOP) */}
            <div className="hidden lg:flex w-[380px] flex-col gap-4">
                <Card className="rounded-[2.5rem] bg-primary text-primary-foreground p-8 shadow-2xl border-none">
                    <div className="flex justify-between items-baseline mb-4">
                        <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Total Pedido</span>
                        <Badge className="bg-white/20 text-white font-black text-[10px] border-none px-3 py-1">BS. {totals.ves.toLocaleString()}</Badge>
                    </div>
                    <div className="text-6xl font-black tracking-tighter drop-shadow-lg">
                        ${totals.usd.toFixed(2)}
                    </div>
                </Card>

                <Card className="rounded-[2rem] flex-1 flex flex-col border-2 shadow-xl p-6 space-y-6 overflow-hidden">
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                         <Table>
                            <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                <TableRow className='border-none'>
                                    <TableHead className="font-black uppercase text-[9px]">Item</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[9px]">Cant.</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[9px]">Sub</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id} className='border-muted/30'>
                                        <TableCell className="py-3 px-1">
                                            <div className='flex flex-col'>
                                                <span className='font-black uppercase text-[9px] leading-tight line-clamp-2'>{item.name}</span>
                                                <span className='text-[8px] text-primary font-bold'>Bs. {item.price.toLocaleString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='p-0'>
                                            <div className="flex items-center justify-center">
                                                <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center hover:bg-red-100 transition-colors"><Minus className="h-3 w-3"/></button>
                                                <span className="font-black text-[11px] w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => update(index, { ...fields[index], quantity: item.quantity + (item.isWeightable ? 0.1 : 1) })} className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center hover:bg-green-100 transition-colors"><Plus className="h-3 w-3"/></button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-[10px] p-0">
                                            {(item.price * item.quantity).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-4 pt-4 border-t-2 border-dashed">
                        <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} />
                        <div className="grid grid-cols-2 gap-2">
                            {['Efectivo', 'Pago Móvil', 'Tarjeta', 'Zelle'].map(m => (
                                <Button key={m} variant={watchMethod === m ? "default" : "outline"} onClick={() => form.setValue('paymentMethod', m)} className="h-12 font-black uppercase text-[9px] rounded-xl">{m}</Button>
                            ))}
                        </div>
                        <Button onClick={handleFinalizeSale} disabled={isSubmitting || watchItems.length === 0} className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl group transition-all">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>PAGAR <ArrowRight className='ml-2 group-hover:translate-x-2 transition-transform' /></>}
                        </Button>
                    </div>
                </Card>
            </div>
       </main>

       {/* MOBILE FLOATING CART BAR */}
       <div className="lg:hidden fixed bottom-16 left-0 right-0 z-[45] p-4 animate-in slide-in-from-bottom-4">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                    <button className="w-full h-16 bg-primary text-white rounded-3xl shadow-[0_12px_24px_rgba(var(--primary),0.3)] flex items-center justify-between px-6 active:scale-95 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl relative">
                                <ShoppingCart className="h-5 w-5" />
                                <Badge className="absolute -top-2 -right-2 bg-secondary text-white border-none h-5 w-5 flex items-center justify-center p-0 rounded-full font-black text-[10px]">{watchItems.length}</Badge>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Total a Pagar</span>
                                <span className="text-lg font-black leading-none">${totals.usd.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 font-black text-xs uppercase tracking-widest">
                            REVISAR <ArrowRight className="h-4 w-4" />
                        </div>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[92dvh] rounded-t-[3rem] p-0 border-t-8 border-primary/20">
                    <div className="h-full flex flex-col">
                        <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
                        <SheetHeader className="px-6 py-4">
                            <div className="flex justify-between items-center">
                                <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">Mi Carrito</SheetTitle>
                                <Badge variant="secondary" className="font-black px-4 py-1 rounded-full text-xs">BS. {totals.ves.toLocaleString()}</Badge>
                            </div>
                        </SheetHeader>
                        
                        <div className="flex-1 overflow-y-auto px-6 space-y-4">
                            {watchItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 bg-muted/20 p-4 rounded-3xl border-2 border-dashed">
                                    <div className="h-12 w-12 rounded-xl bg-white border flex items-center justify-center font-black text-primary text-xs shrink-0">{item.quantity}x</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black uppercase text-xs truncate">{item.name}</h4>
                                        <p className="text-[10px] font-bold text-muted-foreground">Bs. {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm" onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })}><Minus className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm" onClick={() => update(index, { ...fields[index], quantity: item.quantity + (item.isWeightable ? 0.1 : 1) })}><Plus className="h-4 w-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400" onClick={() => remove(index)}><X className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                            {watchItems.length === 0 && (
                                <div className="h-60 flex flex-col items-center justify-center text-center opacity-30 gap-4">
                                    <ShoppingCart className="h-16 w-16" />
                                    <p className="font-black uppercase text-sm">Tu carrito está vacío</p>
                                </div>
                            )}
                        </div>

                        <SheetFooter className="p-6 bg-slate-50 border-t flex-col gap-4 sm:flex-col">
                            <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} />
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant={watchMethod === 'Efectivo' ? 'default' : 'outline'} className="h-12 font-black uppercase text-[10px] rounded-2xl" onClick={() => form.setValue('paymentMethod', 'Efectivo')}><Zap className="mr-2 h-4 w-4"/> Efectivo</Button>
                                <Button variant={watchMethod === 'Pago Móvil' ? 'default' : 'outline'} className="h-12 font-black uppercase text-[10px] rounded-2xl" onClick={() => form.setValue('paymentMethod', 'Pago Móvil')}><CreditCard className="mr-2 h-4 w-4"/> P. Móvil</Button>
                            </div>
                            <Button onClick={handleFinalizeSale} disabled={isSubmitting || watchItems.length === 0} className="w-full h-20 text-xl font-black uppercase shadow-2xl rounded-[2rem]">
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "PROCESAR PAGO"}
                            </Button>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
       </div>
    </div>
  );
}
