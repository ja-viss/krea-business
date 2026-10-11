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
    CreditCard,
    DollarSign,
    Calculator,
    Eraser,
    Search,
    Coins
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { PaymentDialog } from '@/components/sales/payment-dialog';

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
  amountReceived: z.number().default(0),
});

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentCurrency: 'USD',
      amountReceived: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  // HOTKEYS SYSTEM
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        customerRef.current?.focus();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (watchItems.length > 0) setIsPaymentOpen(true);
      }
      if (e.key === 'Escape') {
        setIsPaymentOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [watchItems]);

  useEffect(() => {
    const fetchData = async () => {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) return;
        try {
            const productsRes = await fetch(`/api/products?storeId=${storeId}`);
            if (productsRes.ok) setProducts(await productsRes.json());
        } catch (e) {} finally {
            setLoadingSession(false);
        }
    };
    fetchData();
  }, []);

  const tasaBCV = rates.usd?.usd || 0;
  const tasaCOP = rates.cop?.rate || 0;

  const totals = useMemo(() => {
    let totalVES = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        const tax = sub * (i.taxRate || 0);
        totalVES += (sub + tax);
    });
    const ves = Math.round(totalVES * 100) / 100;
    const usd = tasaBCV ? Math.round((ves / tasaBCV) * 100) / 100 : 0;
    const cop = tasaBCV ? Math.round((usd * tasaCOP)) : 0;
    return { ves, usd, cop };
  }, [watchItems, tasaBCV, tasaCOP]);

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
  };

  const handleFinalizeSale = async (payments: any[]) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                payments,
                totalAmount: totals.ves,
                storeId 
            }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error en facturación");
        }
        const result = await response.json();
        toast({ title: "Despacho Completado", description: "Generando Nota de Entrega..." });
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Fallo POS', description: e.message });
        setIsSubmitting(false);
    }
  };

  if (loadingSession) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f0f2f5] font-sans">
       
       {/* BARRA DE TOTALES MULTIMONEDA */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 md:p-4 bg-slate-900 text-white shadow-2xl z-20">
            <div className="bg-primary/20 border-2 border-primary/30 rounded-2xl p-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Total Dólares</p>
                    <p className="text-3xl font-black tracking-tighter">$ {totals.usd.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-40" />
            </div>
            <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Bolívares (BCV)</p>
                    <p className="text-2xl font-black tracking-tighter">Bs. {totals.ves.toLocaleString('es-VE')}</p>
                </div>
                <Calculator className="h-8 w-8 text-white opacity-20" />
            </div>
            <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl p-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Pesos COP</p>
                    <p className="text-2xl font-black tracking-tighter">$ {totals.cop.toLocaleString('es-CO')}</p>
                </div>
                <Coins className="h-8 w-8 text-amber-500 opacity-20" />
            </div>
       </div>

       <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-3 md:p-4">
            
            {/* IZQUIERDA: CATALOGO */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center gap-3">
                    <Card className='flex-1 rounded-2xl border-2 shadow-sm'>
                        <CardContent className="p-2">
                            <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                        </CardContent>
                    </Card>
                    <div className="hidden md:flex bg-white p-1 rounded-xl border-2 shadow-sm">
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-9 rounded-lg"><List className="h-4 w-4" /></Button>
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-9 rounded-lg"><LayoutGrid className="h-4 w-4" /></Button>
                    </div>
                </div>

                <div className={cn(
                    "flex-1 overflow-y-auto pr-1 scrollbar-hide pb-20 lg:pb-0",
                    viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 gap-3" : "flex flex-col gap-2"
                )}>
                    {products.map(p => (
                        <button 
                            key={p._id} 
                            onClick={() => handleProductSelect(p)} 
                            className={cn(
                                "bg-white border-2 rounded-2xl p-2 flex transition-all group relative overflow-hidden shadow-sm hover:border-primary active:scale-95",
                                viewMode === 'grid' ? "flex-col items-center text-center gap-2 h-fit" : "flex-row items-center gap-4 text-left"
                            )}
                        >
                            <div className={cn("relative overflow-hidden rounded-xl bg-slate-50 shrink-0", viewMode === 'grid' ? "h-28 w-full" : "h-14 w-14 border")}>
                                {p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-2 group-hover:scale-110 transition-transform" unoptimized /> : <Package className="h-6 w-6 m-auto opacity-10" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase leading-tight line-clamp-2 block">{p.name}</span>
                                <span className="text-xs font-black text-primary block mt-1">Bs. {p.price.toLocaleString()}</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">STOCK: {p.stock}</span>
                            </div>
                            {p.stock <= p.minStock && <div className="absolute top-0 left-0 bg-red-500 text-white text-[7px] font-black px-2 py-0.5 rounded-br-lg">STOCK BAJO</div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* DERECHA: CARRITO Y CLIENTE */}
            <div className="hidden lg:flex w-[400px] flex-col gap-4 overflow-hidden">
                <Card className="rounded-[2rem] flex-1 flex flex-col border-2 shadow-2xl bg-white overflow-hidden">
                    <div className="bg-muted/30 p-4 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Orden de Despacho</span>
                        </div>
                        <Badge variant="outline" className="font-black text-[10px]">{fields.length} Items</Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
                         <Table>
                            <TableHeader className='bg-white sticky top-0 z-10'>
                                <TableRow className='border-none hover:bg-transparent'>
                                    <TableHead className="font-black uppercase text-[9px] h-8">Item</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[9px] h-8">Cant.</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[9px] h-8">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id} className='group hover:bg-slate-50 border-dashed'>
                                        <TableCell className="py-3 px-2">
                                            <div className='flex flex-col'>
                                                <span className='font-black uppercase text-[10px] leading-tight line-clamp-2'>{item.name}</span>
                                                <span className='text-[9px] text-primary font-bold'>$ {(item.price / tasaBCV).toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className='p-0'>
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center hover:bg-red-100 transition-colors"><Minus className="h-3 w-3"/></button>
                                                <span className="font-black text-[11px] w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => update(index, { ...fields[index], quantity: item.quantity + (item.isWeightable ? 0.1 : 1) })} className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center hover:bg-green-100 transition-colors"><Plus className="h-3 w-3"/></button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right p-0 pr-2">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-[11px]">Bs. {(item.price * item.quantity).toLocaleString()}</span>
                                                <button onClick={() => remove(index)} className="text-red-400 opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase transition-all">Eliminar</button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-4 bg-slate-50 border-t-2 border-dashed space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-60 ml-1">Cliente [F4]</Label>
                            <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} inputRef={customerRef} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-12 font-black uppercase text-[10px] rounded-xl border-2" onClick={() => form.reset()}><Eraser className="mr-2 h-4 w-4"/> Limpiar</Button>
                            <Button className="h-12 font-black uppercase text-[10px] rounded-xl shadow-lg" onClick={() => setIsPaymentOpen(true)} disabled={fields.length === 0}>
                                <CreditCard className="mr-2 h-4 w-4"/> Pagar [F8]
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
       </main>

       {/* MODAL DE PAGO MIXTO */}
       <PaymentDialog 
            isOpen={isPaymentOpen} 
            onClose={() => setIsPaymentOpen(false)}
            totalVES={totals.ves}
            totalUSD={totals.usd}
            tasaBCV={tasaBCV}
            isSubmitting={isSubmitting}
            onConfirm={handleFinalizeSale}
       />

       {/* MOBILE FLOATING CART BAR */}
       <div className="lg:hidden fixed bottom-16 left-0 right-0 z-[45] p-4">
            <Sheet>
                <SheetTrigger asChild>
                    <button className="w-full h-16 bg-slate-900 text-white rounded-3xl shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-all">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{fields.length} ITEMS</span>
                                <span className="text-lg font-black leading-none">$ {totals.usd.toFixed(2)}</span>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[92dvh] rounded-t-[3rem] p-0 border-t-8 border-primary/20">
                    <div className="h-full flex flex-col">
                        <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
                        <SheetHeader className="px-6 py-4">
                            <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">Mi Carrito</SheetTitle>
                        </SheetHeader>
                        
                        <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide">
                            {watchItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black uppercase text-xs truncate">{item.name}</h4>
                                        <p className="text-[10px] font-bold text-primary">Bs. {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border" onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - 1) })}><Minus className="h-4 w-4"/></Button>
                                        <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border" onClick={() => update(index, { ...fields[index], quantity: item.quantity + 1 })}><Plus className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <SheetFooter className="p-6 bg-slate-100 border-t flex-col gap-4">
                            <Button onClick={() => setIsPaymentOpen(true)} className="w-full h-20 text-xl font-black uppercase shadow-2xl rounded-[2rem]">
                                IR A PAGAR
                            </Button>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
       </div>
    </div>
  );
}
