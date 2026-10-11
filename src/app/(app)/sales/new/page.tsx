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
    Coins,
    Trash2,
    Star,
    User,
    AlertTriangle,
    Settings
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
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
      if (e.key === 'F9' || (e.key === 'Escape' && !isPaymentOpen)) {
        if (watchItems.length > 0) {
            e.preventDefault();
            setIsClearDialogOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [watchItems, isPaymentOpen]);

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

  const setGeneralCustomer = () => {
    form.setValue('customerId', undefined);
    form.setValue('customerName', 'Cliente Contado');
    setSelectedCustomer(null);
    toast({ title: "Cliente General Seleccionado" });
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
       
       {/* BARRA DE TOTALES MULTIMONEDA - JERARQUÍA MEJORADA */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 md:p-4 bg-slate-950 text-white shadow-2xl z-20">
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 flex justify-between items-center transition-all hover:bg-emerald-500/20">
                <div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-1 flex items-center gap-2">
                        Total Dólares <span className="text-[8px] opacity-40 font-bold tracking-normal italic">(Base)</span>
                    </p>
                    <p className="text-4xl font-black tracking-tighter text-white">
                        <span className="text-emerald-500 mr-1">$</span>{totals.usd.toFixed(2)}
                    </p>
                </div>
                <DollarSign className="h-10 w-10 text-emerald-500 opacity-30" />
            </div>
            <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex justify-between items-center transition-all hover:bg-amber-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] mb-1">Bolívares (VES)</p>
                    <p className="text-3xl font-black tracking-tighter text-white">
                        <span className="text-amber-500 mr-1">Bs.</span>{totals.ves.toLocaleString('es-VE')}
                    </p>
                    <p className="text-[9px] font-black text-amber-400/60 mt-1 uppercase italic">Tasa BCV: {tasaBCV} Bs/$</p>
                </div>
                <Calculator className="h-10 w-10 text-amber-500 opacity-20" />
            </div>
            <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-4 flex justify-between items-center transition-all hover:bg-orange-500/20">
                <div>
                    <p className="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em] mb-1">Pesos COP</p>
                    <p className="text-3xl font-black tracking-tighter text-white">
                        <span className="text-orange-500 mr-1">$</span>{totals.cop.toLocaleString('es-CO')}
                    </p>
                    <p className="text-[9px] font-black text-orange-400/60 mt-1 uppercase italic">Tasa: {tasaCOP.toLocaleString()} COP/$</p>
                </div>
                <Coins className="h-10 w-10 text-orange-500 opacity-20" />
            </div>
       </div>

       <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-3 md:p-4">
            
            {/* IZQUIERDA: CATALOGO Y QUICK KEYS */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex flex-col gap-3">
                    <Card className='rounded-2xl border-2 shadow-sm bg-white'>
                        <CardContent className="p-2">
                            <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                        </CardContent>
                    </Card>
                    
                    {/* QUICK KEYS / FAVORITOS */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button variant="outline" size="sm" className="h-10 rounded-xl bg-white border-2 font-black uppercase text-[10px] shrink-0 hover:bg-primary hover:text-white transition-all">
                            <Star className="mr-1.5 h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Favoritos
                        </Button>
                        <Separator orientation="vertical" className="h-10" />
                        {products.slice(0, 6).map(p => (
                            <Button 
                                key={p._id} 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleProductSelect(p)}
                                className="h-10 rounded-xl bg-white border-2 border-dashed font-bold uppercase text-[9px] shrink-0 px-4 hover:border-primary"
                            >
                                {p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name}
                            </Button>
                        ))}
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
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest mt-1 block",
                                    p.stock < 5 ? "text-red-500 animate-pulse" : "text-muted-foreground"
                                )}>STOCK: {p.stock}</span>
                            </div>
                            {p.stock < 5 && <div className="absolute top-0 left-0 bg-red-600 text-white text-[7px] font-black px-2 py-0.5 rounded-br-lg shadow-lg">ALERTA STOCK</div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* DERECHA: CARRITO INDUSTRIAL */}
            <div className="hidden lg:flex w-[450px] flex-col gap-4 overflow-hidden">
                <Card className="rounded-[2.5rem] flex-1 flex flex-col border-2 shadow-2xl bg-white overflow-hidden border-primary/10">
                    <div className="bg-slate-50 p-5 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl"><ShoppingCart className="h-5 w-5 text-primary" /></div>
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-700">Orden de Despacho</span>
                        </div>
                        <Badge className="bg-primary/90 text-white font-black px-3 py-1 text-[10px] rounded-full">{fields.length} ITEMS</Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 scrollbar-hide">
                         <Table>
                            <TableHeader className='bg-white sticky top-0 z-10'>
                                <TableRow className='border-none hover:bg-transparent'>
                                    <TableHead className="font-black uppercase text-[9px] h-10">Item / Precio</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[9px] h-10">Cantidad</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[9px] h-10">Subtotal Divisa/Bs</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const subVES = item.price * item.quantity;
                                    const subUSD = subVES / tasaBCV;
                                    const subCOP = subUSD * tasaCOP;
                                    return (
                                        <TableRow key={item.id} className='group hover:bg-slate-50 border-dashed transition-colors'>
                                            <TableCell className="py-4 px-2">
                                                <div className='flex flex-col gap-1'>
                                                    <span className='font-black uppercase text-[11px] leading-tight line-clamp-2 text-slate-800'>{item.name}</span>
                                                    <span className='text-[10px] text-emerald-600 font-bold'>@ ${ (item.price / tasaBCV).toFixed(2) }</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='p-0'>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"><Minus className="h-4 w-4"/></button>
                                                    <span className="font-black text-xs w-8 text-center bg-slate-50 border-2 rounded-lg py-1">{item.quantity}</span>
                                                    <button onClick={() => handleProductSelect(fields[index] as any, (item.isWeightable ? 0.1 : 1))} className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90"><Plus className="h-4 w-4"/></button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right p-0 pr-2">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-[13px] text-slate-900">$ {subUSD.toFixed(2)}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Bs. {subVES.toLocaleString()} | {Math.round(subCOP).toLocaleString()} COP</span>
                                                    </div>
                                                    <button onClick={() => remove(index)} className="h-8 w-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all active:scale-90">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-6 bg-slate-50 border-t-2 border-dashed space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cliente / Receptor [F4]</Label>
                                <Button variant="ghost" size="sm" onClick={setGeneralCustomer} className="h-6 text-[8px] font-black uppercase bg-primary/10 text-primary rounded-full px-3 hover:bg-primary hover:text-white transition-all">
                                    <User className="h-2.5 w-2.5 mr-1" /> Consumidor Final
                                </Button>
                            </div>
                            <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} inputRef={customerRef} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-14 font-black uppercase text-xs rounded-2xl border-2 border-rose-100 text-rose-600 hover:bg-rose-50 transition-all" onClick={() => { if(watchItems.length > 0) setIsClearDialogOpen(true); }}>
                                <Eraser className="mr-2 h-4 w-4"/> Limpiar [F9]
                            </Button>
                            <Button className="h-14 font-black uppercase text-sm rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95" onClick={() => setIsPaymentOpen(true)} disabled={fields.length === 0}>
                                <CreditCard className="mr-2 h-5 w-5"/> COBRAR [F8]
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
       </main>

       {/* DIALOGO DE LIMPIEZA DE CARRITO */}
       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 border-rose-500 rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-rose-100 rounded-2xl"><AlertTriangle className="h-8 w-8 text-rose-600" /></div>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">¿Vaciar Carrito?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="font-bold text-slate-700">
                        Se eliminarán todos los productos de la orden actual. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel className="font-black uppercase text-xs rounded-xl">Mantener Orden</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset(); toast({ title: "Carrito Vacío" }); }} className="bg-rose-600 font-black uppercase text-xs rounded-xl hover:bg-rose-700">
                        Confirmar Limpieza
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>

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
                    <button className="w-full h-16 bg-slate-950 text-white rounded-3xl shadow-2xl flex items-center justify-between px-6 active:scale-95 transition-all border-2 border-primary/20">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-5 w-5 text-emerald-400" />
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{fields.length} ITEMS</span>
                                <span className="text-xl font-black leading-none text-emerald-400">$ {totals.usd.toFixed(2)}</span>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary" />
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[92dvh] rounded-t-[3rem] p-0 border-t-8 border-primary/20 bg-white">
                    <div className="h-full flex flex-col">
                        <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
                        <SheetHeader className="px-6 py-4">
                            <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">Mi Carrito</SheetTitle>
                        </SheetHeader>
                        
                        <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide">
                            {watchItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black uppercase text-xs truncate text-slate-800">{item.name}</h4>
                                        <p className="text-[10px] font-bold text-primary">Bs. {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border-2 shadow-sm" onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - 1) })}><Minus className="h-4 w-4"/></Button>
                                        <span className="font-black text-sm w-8 text-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white border-2 shadow-sm" onClick={() => update(index, { ...fields[index], quantity: item.quantity + 1 })}><Plus className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <SheetFooter className="p-6 bg-slate-100 border-t flex-col gap-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <span className="text-[10px] font-black uppercase text-slate-500">Total a Liquidar:</span>
                                <span className="text-2xl font-black text-primary">$ {totals.usd.toFixed(2)}</span>
                            </div>
                            <Button onClick={() => setIsPaymentOpen(true)} className="w-full h-20 text-xl font-black uppercase shadow-2xl rounded-[2rem] bg-primary hover:bg-primary/90">
                                PROCEDER AL PAGO
                            </Button>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>
       </div>
    </div>
  );
}
