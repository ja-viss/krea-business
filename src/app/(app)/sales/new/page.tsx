'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    X,
    Plus,
    Minus,
    ShoppingCart,
    CreditCard,
    Eraser,
    Search,
    Trash2,
    User,
    AlertTriangle,
    Camera,
    UserCheck,
    Receipt,
    Info,
    ArrowUpRight,
    Coins,
    Hash,
    Package,
    TrendingUp,
    Calculator,
    ShieldCheck,
    Monitor,
    Maximize2,
    Clock,
    DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Logo } from '@/components/logo';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
  }, [watchItems]);

  const tasaBCV = rates.usd?.usd || 0;
  const tasaCOP = rates.cop?.rate || 0;

  const totals = useMemo(() => {
    let totalVES = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        totalVES += (sub * (1 + (i.taxRate || 0)));
    });
    const ves = Math.round(totalVES * 100) / 100;
    const usd = tasaBCV > 0 ? Math.round((ves / tasaBCV) * 100) / 100 : 0;
    const cop = tasaBCV > 0 ? Math.round((usd * tasaCOP)) : 0;
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
    searchRef.current?.focus();
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
        if (!response.ok) throw new Error("Error en facturación");
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in duration-500">
       
       {/* BARRA SUPERIOR MINIMALISTA (Sustituye al Header Estándar) */}
       <header className="h-14 border-b bg-slate-50 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-6">
                <Logo className="scale-75 origin-left" />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Operativo</div>
                    <div className="flex items-center gap-2"><Clock className="h-3 w-3" /> {currentTime.toLocaleTimeString()}</div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tasa BCV</span>
                        <span className="text-xs font-mono font-black text-slate-900">{tasaBCV.toFixed(2)} Bs</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tasa COP</span>
                        <span className="text-xs font-mono font-black text-slate-900">{tasaCOP.toLocaleString()} COP</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="h-10 w-10 text-slate-400 hover:text-rose-600 transition-colors">
                    <X className="h-6 w-6" />
                </Button>
            </div>
       </header>

       <div className="flex-1 flex overflow-hidden">
            
            {/* IZQUIERDA: EL TICKET DIGITAL */}
            <main className="flex-1 flex flex-col min-w-0 bg-white border-r">
                <div className="p-6 bg-white border-b flex gap-3 items-center">
                    <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                            <Search className="h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Badge variant="outline" className="hidden sm:flex text-[8px] font-black border-slate-200 bg-slate-50 text-slate-400 px-1">F2</Badge>
                        </div>
                        <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                    </div>
                    <Button variant="outline" size="icon" className="h-12 w-12 border-2 rounded-xl bg-slate-50 hover:bg-slate-100">
                        <Camera className="h-5 w-5 text-slate-600" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
                    {watchItems.length > 0 ? (
                        <Table>
                            <TableHeader className="bg-white sticky top-0 z-10">
                                <TableRow className="border-b-2">
                                    <TableHead className="font-black uppercase text-[10px] h-10 tracking-widest text-slate-400 w-[50%]">Descripción del Artículo</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-10 tracking-widest text-slate-400">Unitario</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-10 tracking-widest text-slate-400">Cant.</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] h-10 tracking-widest text-slate-400 pr-4">Subtotal ($)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const unitUSD = item.price / (tasaBCV || 1);
                                    const subUSD = unitUSD * item.quantity;
                                    const subVES = item.price * item.quantity * (1 + (item.taxRate || 0));
                                    return (
                                        <TableRow key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-slate-100 relative overflow-hidden border shrink-0">
                                                        {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized /> : <Package className="h-5 w-5 m-auto opacity-10 absolute inset-0" />}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-black uppercase text-xs text-slate-800 tracking-tight leading-none truncate max-w-[250px]">{item.name}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">SKU: {item.productId.slice(-6)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-xs text-slate-900">$ {unitUSD.toFixed(2)}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">Bs. {item.price.toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"><Minus className="h-3 w-3"/></button>
                                                    <span className="font-black text-sm w-10 text-center">{item.quantity}</span>
                                                    <button onClick={() => handleProductSelect(fields[index] as any, (item.isWeightable ? 0.1 : 1))} className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all active:scale-90"><Plus className="h-3 w-3"/></button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <div className="flex items-center justify-end gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-sm text-slate-900">$ {subUSD.toFixed(2)}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Bs. {subVES.toLocaleString('es-VE')}</span>
                                                    </div>
                                                    <button onClick={() => remove(index)} className="h-8 w-8 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center active:scale-90"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 gap-6 opacity-20">
                            <div className="p-16 bg-slate-50 rounded-full border-4 border-dashed border-slate-100">
                                <Receipt className="h-40 w-40" />
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black uppercase tracking-[0.4em]">Sin Despacho</p>
                                <p className="text-sm font-bold uppercase mt-2 tracking-widest">F2 para buscar productos</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-10 bg-slate-50 text-slate-400 flex items-center px-6 justify-between shrink-0 border-t">
                    <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado</div>
                        <div className="flex items-center gap-2 opacity-50"><TrendingUp className="h-3.5 w-3.5" /> Multi-divisa: Activa</div>
                        <div className="flex items-center gap-2 opacity-50"><Calculator className="h-3.5 w-3.5" /> Redondeo: 2 Dec.</div>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary italic">Krea Terminal v98.0 Industrial</div>
                </div>
            </main>

            {/* DERECHA: CONSOLA DE LIQUIDACIÓN */}
            <aside className="w-[400px] flex flex-col bg-slate-50/30 shrink-0">
                
                {/* SECCIÓN CLIENTE SELECCIONADO */}
                <div className="p-6 border-b bg-white">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> Receptor del Despacho
                        </Label>
                        <Badge variant="outline" className="text-[8px] font-black border-slate-200 uppercase h-4 px-1.5">F4</Badge>
                    </div>

                    {!isSearchingCustomer && !selectedCustomer ? (
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-primary transition-all cursor-pointer group" onClick={() => { setIsSearchingCustomer(true); setTimeout(() => customerRef.current?.focus(), 100); }}>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Consumidor Final</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">General / Contado</span>
                                </div>
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                    ) : isSearchingCustomer ? (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                            <CustomerSearch onCustomerSelect={(c) => { 
                                form.setValue('customerId', c._id); 
                                form.setValue('customerName', c.name); 
                                setSelectedCustomer(c); 
                                setIsSearchingCustomer(false);
                            }} inputRef={customerRef} />
                            <Button variant="ghost" size="sm" onClick={() => setIsSearchingCustomer(false)} className="w-full h-8 text-[9px] font-black uppercase text-slate-400 hover:text-rose-600 transition-colors">
                                <X className="h-3.5 w-3.5 mr-1.5"/> Cancelar Búsqueda
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in zoom-in-95 shadow-lg shadow-primary/5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"><UserCheck className="h-6 w-6" /></div>
                                <div className="flex flex-col max-w-[180px]">
                                    <span className="text-xs font-black uppercase text-primary truncate tracking-tight">{selectedCustomer?.name}</span>
                                    <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-1.5 mt-0.5 w-fit">{selectedCustomer?.idNumber}</Badge>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', 'Cliente Contado'); form.setValue('customerId', undefined); }} className="h-8 w-8 rounded-full text-primary hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* RESUMEN DE TOTALES */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-slate-400 group">
                                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal Base</span>
                                <span className="font-mono font-bold text-xs text-slate-600">Bs. {(totals.ves * 0.84).toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 group">
                                <span className="text-[10px] font-black uppercase tracking-widest">Impuestos (IVA 16%)</span>
                                <span className="font-mono font-bold text-xs text-slate-600">Bs. {(totals.ves * 0.16).toLocaleString('es-VE')}</span>
                            </div>
                        </div>

                        <Separator className="bg-slate-200/50" />

                        {/* TARJETA DE TOTAL NEGRA PROFESIONAL */}
                        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group transition-all active:scale-[0.98] border-l-[6px] border-emerald-500">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform rotate-12"><ShoppingCart className="h-32 w-32 text-white" /></div>
                            
                            <div className="flex flex-col relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.4em]">Monto Total Factura</p>
                                </div>
                                <div className="flex items-baseline mb-6">
                                    <span className="text-3xl font-black tracking-tighter">Bs.{totals.ves.toLocaleString('es-VE')}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Dólar ($)</span>
                                        <span className="text-xl font-black text-emerald-400 tracking-tighter">$ {totals.usd.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right flex flex-col">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Peso COP</span>
                                        <span className="text-base font-black text-orange-400 tracking-tight">{totals.cop.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTONERA DE COMANDO */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            <Button 
                                className="h-16 font-black uppercase text-lg rounded-2xl shadow-2xl bg-emerald-600 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 group" 
                                onClick={() => setIsPaymentOpen(true)} 
                                disabled={watchItems.length === 0}
                            >
                                <CreditCard className="mr-3 h-6 w-6 group-hover:animate-bounce"/> COBRAR [F8]
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    className="h-12 font-black uppercase text-[10px] rounded-xl border-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all" 
                                    onClick={() => { if(watchItems.length > 0) setIsClearDialogOpen(true); }}
                                >
                                    <Eraser className="mr-2 h-4 w-4"/> Limpiar [F9]
                                </Button>
                                <Button variant="outline" className="h-12 font-black uppercase text-[10px] rounded-xl border-2 text-slate-400">
                                    <Maximize2 className="mr-2 h-4 w-4"/> Full Screen
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
       </div>

       {/* DIÁLOGOS */}
       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-[2rem] p-8 max-w-sm">
                <AlertDialogHeader>
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-xl">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <AlertDialogTitle className="text-xl font-black uppercase italic">¿Anular Venta?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Se perderán los artículos cargados.
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-3">
                    <AlertDialogCancel className="h-11 font-black uppercase text-[10px] rounded-xl flex-1 border-2">Cerrar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Cliente Contado' }); setSelectedCustomer(null); }} className="h-11 bg-rose-600 hover:bg-rose-700 font-black uppercase text-[10px] rounded-xl flex-1">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>

       <PaymentDialog 
            isOpen={isPaymentOpen} 
            onClose={() => setIsPaymentOpen(false)}
            totalVES={totals.ves}
            totalUSD={totals.usd}
            totalCOP={totals.cop}
            tasaBCV={tasaBCV}
            tasaCOP={tasaCOP}
            isSubmitting={isSubmitting}
            onConfirm={handleFinalizeSale}
       />
    </div>
  );
}

