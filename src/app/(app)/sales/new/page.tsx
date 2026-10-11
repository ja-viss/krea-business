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
    Navigation,
    Calculator,
    ShieldCheck
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

  // HOTKEYS OPERATIVOS
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
    <div className="flex flex-col h-screen overflow-hidden bg-white">
       
       {/* HEADER TRICOMPONENTE DE ALTO CONTRASTE - REESTRUCTURADO */}
       <header className="grid grid-cols-3 gap-0 border-b bg-white shrink-0 shadow-sm z-20">
            {/* USD: MONEDA BASE */}
            <div className="flex items-center justify-between px-8 py-5 border-r group hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-1">Total USD ($)</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">$ {totals.usd.toFixed(2)}</span>
                </div>
                <div className="text-right">
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-emerald-200 bg-emerald-50 text-emerald-700 h-5">Moneda Base</Badge>
                </div>
            </div>

            {/* VES: MONEDA FISCAL */}
            <div className="flex items-center justify-between px-8 py-5 border-r group hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-amber-600 tracking-[0.2em] mb-1">Bolívares (VES)</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">Bs. {totals.ves.toLocaleString('es-VE')}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasa BCV</span>
                    <span className="text-sm font-mono font-black text-amber-600">{tasaBCV.toFixed(2)}</span>
                </div>
            </div>

            {/* COP: MONEDA FRONTERIZA */}
            <div className="flex items-center justify-between px-8 py-5 group hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-orange-600 tracking-[0.2em] mb-1">Pesos COP ($)</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">$ {totals.cop.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasa COP</span>
                    <span className="text-sm font-mono font-black text-orange-600">{tasaCOP.toLocaleString()}</span>
                </div>
            </div>
       </header>

       <div className="flex-1 flex overflow-hidden">
            
            {/* ÁREA DE DESPACHO (LISTADO DE ARTÍCULOS) */}
            <main className="flex-1 flex flex-col min-w-0 bg-white border-r relative">
                
                {/* BARRA DE COMANDO SUPERIOR */}
                <div className="p-4 bg-white border-b flex gap-3 items-center sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                            <Search className="h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Badge variant="outline" className="hidden sm:flex text-[8px] font-black border-slate-200 bg-slate-50 text-slate-400 px-1">F2</Badge>
                        </div>
                        <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                    </div>
                    <Button variant="outline" size="icon" className="h-12 w-12 border-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all active:scale-90">
                        <Camera className="h-5 w-5 text-slate-600" />
                    </Button>
                </div>

                {/* TABLA DE FACTURACIÓN DE ALTA DENSIDAD */}
                <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                    {watchItems.length > 0 ? (
                        <Table className="bg-white border-collapse table-fixed w-full">
                            <TableHeader className="bg-slate-50/80 backdrop-blur sticky top-0 z-20">
                                <TableRow className="border-b-2">
                                    <TableHead className="font-black uppercase text-[10px] h-12 pl-6 tracking-widest text-slate-500 w-[45%]">Item / Descripción</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500 w-[15%]">Unitario</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500 w-[15%]">Cantidad</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] h-12 pr-6 tracking-widest text-slate-500 w-[25%]">Subtotal Global</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const subVES = item.price * item.quantity * (1 + (item.taxRate || 0));
                                    const subUSD = tasaBCV > 0 ? subVES / tasaBCV : 0;
                                    const subCOP = subUSD * tasaCOP;
                                    return (
                                        <TableRow key={item.id} className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-5 pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-slate-100 relative overflow-hidden border-2 border-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                                        {item.imageUrl ? (
                                                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                                                        ) : (
                                                            <Package className="h-6 w-6 m-auto opacity-10 absolute inset-0 m-auto" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        <span className="font-black uppercase text-xs text-slate-900 tracking-tight leading-tight truncate">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={cn("text-[8px] font-black h-4 px-1.5 border-slate-200 uppercase", item.stock < 5 ? "text-red-600 bg-red-50 border-red-200" : "text-slate-400")}>Stock: {item.stock}</Badge>
                                                            <span className="text-[9px] font-mono text-slate-300 uppercase tracking-tighter">SKU: {item.productId.slice(-6)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-sm text-slate-700">$ {(item.price / (tasaBCV || 1)).toFixed(2)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bs. {item.price.toLocaleString('es-VE')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-0">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"><Minus className="h-4 w-4"/></button>
                                                    <span className="font-black text-base w-12 text-center text-slate-900">{item.quantity}</span>
                                                    <button onClick={() => handleProductSelect(fields[index] as any, (item.isWeightable ? 0.1 : 1))} className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90"><Plus className="h-4 w-4"/></button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-5">
                                                <div className="flex items-center justify-end gap-6">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="font-black text-lg text-slate-900 tracking-tighter">$ {subUSD.toFixed(2)}</span>
                                                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                            <span className="text-amber-600/80">Bs. {subVES.toLocaleString('es-VE')}</span>
                                                            <span className="opacity-20">/</span>
                                                            <span className="text-orange-600/70">{Math.round(subCOP).toLocaleString('es-CO')} COP</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => remove(index)} className="h-10 w-10 rounded-2xl text-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center border-2 border-transparent active:scale-90"><Trash2 className="h-5 w-5" /></button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-30 animate-in fade-in zoom-in-95 duration-500">
                            <div className="p-16 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100">
                                <Receipt className="h-40 w-40" />
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-black uppercase tracking-[0.4em]">Sin Despacho</p>
                                <p className="text-sm font-bold uppercase mt-2 tracking-widest">F2 para buscar o escanea un código</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* BARRA DE ESTADO TÉCNICO */}
                <div className="h-10 bg-slate-50 text-slate-400 flex items-center px-8 justify-between shrink-0 border-t z-30">
                    <div className="flex items-center gap-8 text-[9px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Nodo Cloud Sincronizado</div>
                        <div className="flex items-center gap-2 opacity-50"><TrendingUp className="h-3.5 w-3.5" /> Motor Multidivisa Activo</div>
                        <div className="flex items-center gap-2 opacity-50"><Calculator className="h-3.5 w-3.5" /> Precision: 2 Dec.</div>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary italic">Krea Terminal v97.0 Industrial</div>
                </div>
            </main>

            {/* PANEL LATERAL DE LIQUIDACIÓN Y CLIENTE (SIDEBAR) */}
            <aside className="w-[420px] flex flex-col bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10 shrink-0">
                
                {/* SECCIÓN CLIENTE */}
                <div className="p-8 border-b bg-slate-50/20">
                    <div className="flex items-center justify-between mb-5">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> Receptor del Despacho
                        </Label>
                        {!selectedCustomer && !isSearchingCustomer && (
                            <Badge className="bg-slate-200 text-slate-600 border-none text-[8px] font-black uppercase h-5 px-2">POR DEFECTO</Badge>
                        )}
                    </div>

                    {!isSearchingCustomer && !selectedCustomer ? (
                        <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 flex items-center justify-between shadow-sm group hover:border-primary transition-all cursor-pointer active:scale-95" onClick={() => { setIsSearchingCustomer(true); setTimeout(() => customerRef.current?.focus(), 100); }}>
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-[1.2rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    <User className="h-7 w-7" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black uppercase text-slate-800 tracking-tight">Consumidor Final</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">F4 para buscar <ArrowUpRight className="h-2.5 w-2.5" /></span>
                                </div>
                            </div>
                        </div>
                    ) : isSearchingCustomer ? (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <CustomerSearch onCustomerSelect={(c) => { 
                                form.setValue('customerId', c._id); 
                                form.setValue('customerName', c.name); 
                                setSelectedCustomer(c); 
                                setIsSearchingCustomer(false);
                            }} inputRef={customerRef} />
                            <Button variant="ghost" size="sm" onClick={() => setIsSearchingCustomer(false)} className="w-full h-10 text-[10px] font-black uppercase text-slate-400 hover:text-rose-600 transition-colors">
                                <X className="h-4 w-4 mr-2"/> Cancelar Búsqueda
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border-2 border-primary/20 rounded-3xl p-5 flex items-center justify-between animate-in zoom-in-95 shadow-lg shadow-primary/5">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-[1.2rem] bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"><UserCheck className="h-7 w-7" /></div>
                                <div className="flex flex-col max-w-[200px]">
                                    <span className="text-sm font-black uppercase text-primary truncate tracking-tight">{selectedCustomer?.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-1">{selectedCustomer?.idNumber}</Badge>
                                        <span className="text-[8px] font-bold text-primary/40 uppercase">Cliente VIP</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', 'Cliente Contado'); form.setValue('customerId', undefined); }} className="h-10 w-10 rounded-full text-primary hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* RESUMEN DE TOTALES Y ACCIONES FINALES */}
                <div className="p-10 flex-1 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-slate-400 group">
                                <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-slate-600 transition-colors">Base Imponible</span>
                                <span className="font-mono font-black text-sm">Bs. {(totals.ves * 0.84).toLocaleString('es-VE')}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 group">
                                <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-slate-600 transition-colors">Carga IVA (16%)</span>
                                <span className="font-mono font-black text-sm">Bs. {(totals.ves * 0.16).toLocaleString('es-VE')}</span>
                            </div>
                        </div>

                        <Separator className="bg-slate-100 h-0.5" />

                        {/* TARJETA DE TOTAL PREMIUM - COLOR ACTUALIZADO (DARK SLATE) */}
                        <div className="space-y-5">
                            <div className="bg-slate-950 p-9 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group transition-transform active:scale-[0.98] border-l-[8px] border-primary">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 transition-transform rotate-12"><ShoppingCart className="h-32 w-32 text-primary" /></div>
                                
                                <div className="flex flex-col relative z-10">
                                    <div className="flex items-center gap-2 mb-5">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[11px] font-black uppercase text-white/50 tracking-[0.4em]">Total Liquidación</p>
                                    </div>
                                    <div className="flex items-baseline mb-8">
                                        <span className="text-xs font-black mr-3 text-primary uppercase italic">VES</span>
                                        <span className="text-6xl font-black tracking-tighter">Bs.{totals.ves.toLocaleString('es-VE')}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Eq. Dólar Base</span>
                                            <span className="text-2xl font-black text-emerald-400 tracking-tighter">$ {totals.usd.toFixed(2)}</span>
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Eq. Pesos COP</span>
                                            <span className="text-lg font-black text-orange-500 tracking-tight">{totals.cop.toLocaleString('es-CO')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-5 rounded-3xl flex items-start gap-4">
                            <div className="p-2 bg-slate-200 rounded-xl"><Info className="h-5 w-5 text-slate-500 shrink-0" /></div>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase italic">
                                Verifique los abonos antes de confirmar. Use F8 para liquidar con múltiples métodos.
                            </p>
                        </div>
                    </div>

                    {/* BOTONERA DE COMANDO FINAL */}
                    <div className="space-y-5 pt-10">
                        <div className="grid grid-cols-2 gap-5">
                            <Button 
                                variant="outline" 
                                className="h-16 font-black uppercase text-[11px] rounded-[1.5rem] border-2 border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95" 
                                onClick={() => { if(watchItems.length > 0) setIsClearDialogOpen(true); }}
                            >
                                <Eraser className="mr-2 h-4 w-4"/> Limpiar [F9]
                            </Button>
                            <Button 
                                className="h-16 font-black uppercase text-base rounded-[1.5rem] shadow-2xl bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 group" 
                                onClick={() => setIsPaymentOpen(true)} 
                                disabled={watchItems.length === 0}
                            >
                                <CreditCard className="mr-3 h-6 w-6 group-hover:animate-bounce"/> COBRAR [F8]
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
       </div>

       {/* DIÁLOGOS DE SEGURIDAD Y PAGO */}
       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-[8px] border-rose-500/10 rounded-[3rem] p-10 max-w-lg">
                <AlertDialogHeader>
                    <div className="flex flex-col items-center gap-6 mb-4">
                        <div className="h-20 w-20 rounded-[2rem] bg-rose-100 flex items-center justify-center text-rose-600 shadow-xl shadow-rose-200 animate-in zoom-in-75 duration-300">
                            <AlertTriangle className="h-10 w-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <AlertDialogTitle className="text-4xl font-black uppercase italic tracking-tighter">¿Vaciar Carrito?</AlertDialogTitle>
                            <AlertDialogDescription className="text-base font-bold text-slate-400 uppercase tracking-widest">
                                Esta acción eliminará los {watchItems.length} artículos del despacho actual.
                            </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-8">
                    <AlertDialogCancel className="h-14 font-black uppercase text-xs rounded-2xl flex-1 border-2">Ignorar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Cliente Contado' }); setSelectedCustomer(null); }} className="h-14 bg-rose-600 hover:bg-rose-700 font-black uppercase text-xs rounded-2xl flex-1 shadow-2xl">Confirmar Anulación</AlertDialogAction>
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
