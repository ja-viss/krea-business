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
import { 
    Loader2, 
    ChevronLeft, 
    X,
    Plus,
    Minus,
    Zap,
    Package,
    ShoppingCart,
    ArrowRight,
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
    Camera,
    LayoutGrid,
    Tag,
    UserCheck,
    Filter,
    ArrowUpRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
});

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  // HOTKEYS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4') { e.preventDefault(); setIsSearchingCustomer(true); setTimeout(() => customerRef.current?.focus(), 100); }
      if (e.key === 'F8') { e.preventDefault(); if (watchItems.length > 0) setIsPaymentOpen(true); }
      if (e.key === 'F9') { e.preventDefault(); if (watchItems.length > 0) setIsClearDialogOpen(true); }
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
        totalVES += (sub * (1 + (i.taxRate || 0)));
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

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['Todas', '⭐ Favoritos', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todas') return products.slice(0, 24);
    if (selectedCategory === '⭐ Favoritos') return products.slice(0, 8);
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

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
        if (!response.ok) throw new Error("Error en facturación");
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  if (loadingSession) return <div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
       
       {/* CABECERA COMPACTA MULTIMONEDA (V94.0) */}
       <header className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b bg-slate-950 text-white shrink-0">
            <div className="flex items-center justify-between px-6 py-3 border-r border-white/5 bg-emerald-500/5">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">USD (BASE)</span>
                <span className="text-2xl font-black text-white"><span className="text-emerald-500 mr-1">$</span>{totals.usd.toFixed(2)}</span>
            </div>
            <div className="flex flex-col px-6 py-3 border-r border-white/5 bg-amber-500/5 justify-center">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Bolívares (VES)</span>
                    <span className="text-2xl font-black text-white"><span className="text-amber-500 mr-1.5">Bs.</span>{totals.ves.toLocaleString('es-VE')}</span>
                </div>
                <span className="text-[8px] font-bold text-amber-400/40 uppercase tracking-tighter self-end">Tasa BCV: {tasaBCV}</span>
            </div>
            <div className="flex flex-col px-6 py-3 bg-orange-500/5 justify-center">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest">Pesos COP</span>
                    <span className="text-2xl font-black text-white"><span className="text-orange-500 mr-1.5">$</span>{totals.cop.toLocaleString('es-CO')}</span>
                </div>
                <span className="text-[8px] font-bold text-orange-400/40 uppercase tracking-tighter self-end">Tasa: {tasaCOP.toLocaleString()}</span>
            </div>
       </header>

       <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* IZQUIERDA: BUSQUEDA + CATÁLOGO GRID */}
            <section className="flex-1 flex flex-col min-w-0 bg-white border-r">
                <div className="p-4 space-y-4 border-b">
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                        </div>
                        <Button variant="outline" size="icon" className="h-12 w-12 border-2 rounded-xl"><Camera className="h-5 w-5" /></Button>
                    </div>

                    {/* SELECTOR DE CATEGORÍAS */}
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex gap-2 pb-1">
                            {categories.map(cat => (
                                <Button 
                                    key={cat} 
                                    size="sm"
                                    variant={selectedCategory === cat ? 'default' : 'outline'}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "h-9 rounded-full px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedCategory === cat ? "shadow-lg scale-105" : "hover:border-primary text-slate-500"
                                    )}
                                >
                                    {cat === '⭐ Favoritos' && <Star className="mr-1.5 h-3 w-3 fill-amber-400 text-amber-400" />}
                                    {cat}
                                </Button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>

                {/* GRID DE PRODUCTOS (V94.0) */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-slate-50/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                        {filteredProducts.map(p => (
                            <button 
                                key={p._id} 
                                onClick={() => handleProductSelect(p)}
                                className="bg-white border-2 border-slate-100 rounded-2xl p-2 flex flex-col items-center text-center gap-2 transition-all hover:border-primary hover:shadow-xl hover:-translate-y-1 active:scale-95 group relative"
                            >
                                <div className="relative h-20 w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-50">
                                    {p.imageUrl ? (
                                        <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-2 group-hover:scale-110 transition-transform" unoptimized />
                                    ) : (
                                        <Package className="h-8 w-8 m-auto text-slate-200" />
                                    )}
                                </div>
                                <div className="space-y-1 w-full">
                                    <span className="text-[10px] font-black uppercase leading-tight line-clamp-2 block h-8 text-slate-800">{p.name}</span>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        <span className="text-xs font-black text-primary">$ {(p.price / tasaBCV).toFixed(2)}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Bs. {p.price.toLocaleString()}</span>
                                    </div>
                                    <Badge variant={p.stock < 5 ? "destructive" : "outline"} className="text-[7px] font-black uppercase mt-1 py-0 px-2 h-4">
                                        STOCK: {p.stock}
                                    </Badge>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* DERECHA: ORDEN DE DESPACHO + CLIENTE */}
            <aside className="w-full lg:w-[450px] flex flex-col bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.02)]">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg"><ShoppingCart className="h-4 w-4 text-primary" /></div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 italic">Orden de Despacho</span>
                    </div>
                    <Badge className="bg-primary/90 text-white font-black px-3 py-1 text-[10px] rounded-full">{watchItems.length} ITEMS</Badge>
                </div>

                <div className="flex-1 overflow-y-auto px-1 scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                            <TableRow className="border-none hover:bg-transparent">
                                <TableHead className="font-black uppercase text-[8px] h-8 pl-4">Descripción / Unidad</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] h-8">Cantidad</TableHead>
                                <TableHead className="text-right font-black uppercase text-[8px] h-8 pr-4">Subtotal Divisa/Bs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => {
                                const subVES = item.price * item.quantity * (1 + (item.taxRate || 0));
                                const subUSD = subVES / tasaBCV;
                                const subCOP = subUSD * tasaCOP;
                                return (
                                    <TableRow key={item.id} className="group border-dashed hover:bg-slate-50/50">
                                        <TableCell className="py-3 pl-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-black uppercase text-[10px] text-slate-800 line-clamp-1">{item.name}</span>
                                                <span className="text-[9px] text-emerald-600 font-bold">@ $ {(item.price / tasaBCV).toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-0">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"><Minus className="h-3 w-3"/></button>
                                                <span className="font-black text-[11px] w-7 text-center">{item.quantity}</span>
                                                <button onClick={() => handleProductSelect(fields[index] as any, (item.isWeightable ? 0.1 : 1))} className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-90"><Plus className="h-3 w-3"/></button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-xs text-slate-900">$ {subUSD.toFixed(2)}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Bs. {subVES.toLocaleString()}</span>
                                                </div>
                                                <button onClick={() => remove(index)} className="h-7 w-7 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {watchItems.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-200 gap-2">
                            <ShoppingCart className="h-10 w-10 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Carrito Vacío</p>
                        </div>
                    )}
                </div>

                {/* GESTIÓN DE CLIENTE PROFESIONAL (V94.0) */}
                <div className="p-4 bg-slate-50 border-t-2 border-dashed space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Receptor de la Nota</Label>
                        
                        {!isSearchingCustomer && !selectedCustomer ? (
                            <div className="bg-white border-2 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-5 w-5" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase text-slate-800">Consumidor Final</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Venta Genérica / Contado</span>
                                    </div>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => { setIsSearchingCustomer(true); setTimeout(() => customerRef.current?.focus(), 100); }} className="h-8 rounded-lg font-black uppercase text-[9px] tracking-tight">
                                    Cambiar (F4)
                                </Button>
                            </div>
                        ) : isSearchingCustomer ? (
                            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                <CustomerSearch onCustomerSelect={(c) => { 
                                    form.setValue('customerId', c._id); 
                                    form.setValue('customerName', c.name); 
                                    setSelectedCustomer(c); 
                                    setIsSearchingCustomer(false);
                                }} inputRef={customerRef} />
                                <Button variant="ghost" size="sm" onClick={() => setIsSearchingCustomer(false)} className="w-full h-8 text-[9px] font-black uppercase text-slate-400">
                                    <X className="h-3 w-3 mr-1"/> Cancelar Búsqueda
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-3 flex items-center justify-between shadow-sm animate-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><UserCheck className="h-5 w-5" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase text-primary truncate max-w-[200px]">{selectedCustomer?.name}</span>
                                        <span className="text-[8px] font-bold text-primary/60 uppercase">{selectedCustomer?.idNumber} • {selectedCustomer?.phone || 'Sin telf.'}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', 'Cliente Contado'); form.setValue('customerId', undefined); }} className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-12 font-black uppercase text-[10px] rounded-2xl border-2 border-rose-100 text-rose-600 hover:bg-rose-50" onClick={() => { if(watchItems.length > 0) setIsClearDialogOpen(true); }}>
                            <Eraser className="mr-2 h-4 w-4"/> Limpiar [F9]
                        </Button>
                        <Button className="h-12 font-black uppercase text-xs rounded-2xl shadow-xl shadow-primary/30" onClick={() => setIsPaymentOpen(true)} disabled={watchItems.length === 0}>
                            <CreditCard className="mr-2 h-4 w-4"/> COBRAR [F8]
                        </Button>
                    </div>
                </div>
            </aside>
       </div>

       {/* DIALOGOS */}
       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 border-rose-500 rounded-3xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-rose-100 rounded-2xl"><AlertTriangle className="h-8 w-8 text-rose-600" /></div>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic tracking-tighter">¿Vaciar Carrito?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="font-bold text-slate-700">Se eliminarán todos los productos de la orden actual. Esta acción no se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel className="font-black uppercase text-xs rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Cliente Contado' }); setSelectedCustomer(null); toast({ title: "Carrito Vacío" }); }} className="bg-rose-600 font-black uppercase text-xs rounded-xl hover:bg-rose-700">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>

       <PaymentDialog 
            isOpen={isPaymentOpen} 
            onClose={() => setIsPaymentOpen(false)}
            totalVES={totals.ves}
            totalUSD={totals.usd}
            tasaBCV={tasaBCV}
            isSubmitting={isSubmitting}
            onConfirm={handleFinalizeSale}
       />
    </div>
  );
}
