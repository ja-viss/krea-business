
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Wallet,
    Info,
    ArrowUpRight,
    Coins,
    Hash,
    Package
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
       
       {/* HEADER MULTIMONEDA (TEMA CLARO) */}
       <header className="grid grid-cols-3 gap-0 border-b bg-white shrink-0 shadow-sm z-20">
            <div className="flex items-center justify-between px-8 py-3 border-r bg-emerald-50/20">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em] leading-none mb-1">Total USD</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter"><span className="text-emerald-600 mr-1">$</span>{totals.usd.toFixed(2)}</span>
                </div>
                <Coins className="h-6 w-6 text-emerald-600/20" />
            </div>
            <div className="flex items-center justify-between px-8 py-3 border-r bg-amber-50/20">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-amber-600 tracking-[0.2em] leading-none mb-1">Bolívares (VES)</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter"><span className="text-amber-500 mr-1.5">Bs.</span>{totals.ves.toLocaleString('es-VE')}</span>
                </div>
                <div className="text-right flex flex-col justify-center">
                    <span className="text-[8px] font-black text-amber-600/40 uppercase tracking-widest">Tasa BCV</span>
                    <span className="text-[11px] font-mono font-bold text-amber-600">{tasaBCV.toFixed(2)}</span>
                </div>
            </div>
            <div className="flex items-center justify-between px-8 py-3 bg-orange-50/20">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-orange-600 tracking-[0.2em] leading-none mb-1">Pesos COP</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter"><span className="text-orange-500 mr-1.5">$</span>{totals.cop.toLocaleString('es-CO')}</span>
                </div>
                <div className="text-right flex flex-col justify-center">
                    <span className="text-[8px] font-black text-orange-600/40 uppercase tracking-widest">Tasa COP</span>
                    <span className="text-[11px] font-mono font-bold text-orange-600">{tasaCOP.toLocaleString()}</span>
                </div>
            </div>
       </header>

       <div className="flex-1 flex overflow-hidden">
            
            {/* ÁREA PRINCIPAL: CONSOLA DE DESPACHO */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                
                {/* BUSCADOR SUPERIOR */}
                <div className="p-4 bg-white border-b flex gap-3 items-center sticky top-0 z-10 shadow-sm">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                    </div>
                    <Button variant="outline" size="icon" className="h-12 w-12 border-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all">
                        <Camera className="h-5 w-5 text-slate-600" />
                    </Button>
                </div>

                {/* TABLA DE FACTURACIÓN (INDUSTRIAL) */}
                <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                    {watchItems.length > 0 ? (
                        <Table className="bg-white border-collapse">
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow className="border-b">
                                    <TableHead className="font-black uppercase text-[10px] h-12 pl-6 tracking-widest text-slate-500">Item / Imagen</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500">PVP Unit.</TableHead>
                                    <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500">Cantidad</TableHead>
                                    <TableHead className="text-right font-black uppercase text-[10px] h-12 pr-6 tracking-widest text-slate-500">Subtotal Neto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                    const subVES = item.price * item.quantity * (1 + (item.taxRate || 0));
                                    const subUSD = subVES / tasaBCV;
                                    return (
                                        <TableRow key={item.id} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-lg bg-slate-100 relative overflow-hidden border shrink-0">
                                                        {item.imageUrl ? (
                                                            <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                                                        ) : (
                                                            <Package className="h-6 w-6 m-auto opacity-20 absolute inset-0 m-auto" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-black uppercase text-xs text-slate-900 tracking-tight leading-tight">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 border-slate-200 text-slate-400">STOCK: {item.stock}</Badge>
                                                            <span className="text-[9px] font-mono text-slate-400 uppercase">Ref: {item.productId.slice(-6)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-sm text-emerald-600">$ {(item.price / tasaBCV).toFixed(2)}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">Bs. {item.price.toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-0">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - (item.isWeightable ? 0.1 : 1)) })} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button>
                                                    <span className="font-black text-sm w-10 text-center text-slate-900">{item.quantity}</span>
                                                    <button onClick={() => handleProductSelect(fields[index] as any, (item.isWeightable ? 0.1 : 1))} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                <div className="flex items-center justify-end gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-black text-base text-slate-900 tracking-tighter">Bs. {subVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">$ {subUSD.toFixed(2)}</span>
                                                    </div>
                                                    <button onClick={() => remove(index)} className="h-9 w-9 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center border-2 border-transparent"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-30">
                            <div className="p-10 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100">
                                <Receipt className="h-32 w-32" />
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black uppercase tracking-[0.4em]">Esperando Selección</p>
                                <p className="text-xs font-bold uppercase mt-2 tracking-widest">Escanea un producto para facturar</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* STATUS BAR */}
                <div className="h-10 bg-slate-50 text-slate-400 flex items-center px-6 justify-between shrink-0 border-t">
                    <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Nodo Cloud Activo</div>
                        <div className="flex items-center gap-2 opacity-50"><Hash className="h-3 w-3" /> Transacción en curso...</div>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary italic">Krea Terminal v94.5 PRO</div>
                </div>
            </main>

            {/* SIDEBAR DERECHO (LIQUIDACIÓN) */}
            <aside className="w-[400px] flex flex-col bg-white border-l shadow-2xl z-10">
                
                {/* SECCIÓN CLIENTE */}
                <div className="p-6 border-b bg-slate-50/30">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                            <User className="h-3 w-3" /> Receptor del Despacho
                        </Label>
                        {!selectedCustomer && !isSearchingCustomer && (
                            <Badge className="bg-slate-200 text-slate-600 border-none text-[8px] font-black uppercase">Genérico</Badge>
                        )}
                    </div>

                    {!isSearchingCustomer && !selectedCustomer ? (
                        <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm group hover:border-primary transition-all cursor-pointer" onClick={() => { setIsSearchingCustomer(true); setTimeout(() => customerRef.current?.focus(), 100); }}>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    <User className="h-6 w-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black uppercase text-slate-700">Identificar Cliente</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">F4 para buscar cédula</span>
                                </div>
                            </div>
                            <ArrowUpRight className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors" />
                        </div>
                    ) : isSearchingCustomer ? (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <CustomerSearch onCustomerSelect={(c) => { 
                                form.setValue('customerId', c._id); 
                                form.setValue('customerName', c.name); 
                                setSelectedCustomer(c); 
                                setIsSearchingCustomer(false);
                            }} inputRef={customerRef} />
                            <Button variant="ghost" size="sm" onClick={() => setIsSearchingCustomer(false)} className="w-full h-8 text-[9px] font-black uppercase text-slate-400">
                                <X className="h-3 w-3 mr-1"/> Cancelar
                            </Button>
                        </div>
                    ) : (
                        <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 flex items-center justify-between animate-in zoom-in-95">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"><UserCheck className="h-6 w-6" /></div>
                                <div className="flex flex-col max-w-[200px]">
                                    <span className="text-sm font-black uppercase text-primary truncate">{selectedCustomer?.name}</span>
                                    <span className="text-[10px] font-bold text-primary/60 uppercase">{selectedCustomer?.idNumber}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', 'Cliente Contado'); form.setValue('customerId', undefined); }} className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* TOTALES Y ACCIONES */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">Base Imponible</span>
                            <span className="font-mono font-bold text-sm">Bs. {(totals.ves * 0.84).toLocaleString('es-VE')}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">IVA (16%)</span>
                            <span className="font-mono font-bold text-sm">Bs. {(totals.ves * 0.16).toLocaleString('es-VE')}</span>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="bg-primary p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><ShoppingCart className="h-24 w-24" /></div>
                                <p className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em] mb-4">Total Liquidación</p>
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-5xl font-black tracking-tighter">Bs. {totals.ves.toLocaleString('es-VE')}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
                                    <span className="text-xl font-black text-white/80 tracking-tighter">$ {totals.usd.toFixed(2)}</span>
                                    <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase tracking-widest">USD Base</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 border-2 border-dashed p-4 rounded-2xl flex items-start gap-3">
                            <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-slate-500 leading-tight uppercase italic">
                                Verifique los ítems antes de proceder al cobro. La anulación requiere permiso de supervisor.
                            </p>
                        </div>
                    </div>

                    {/* BOTONERA FINAL */}
                    <div className="space-y-4 pt-8">
                        <div className="grid grid-cols-2 gap-4">
                            <Button 
                                variant="outline" 
                                className="h-14 font-black uppercase text-[10px] rounded-2xl border-2 border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100" 
                                onClick={() => { if(watchItems.length > 0) setIsClearDialogOpen(true); }}
                            >
                                <Eraser className="mr-2 h-4 w-4"/> Limpiar [F9]
                            </Button>
                            <Button 
                                className="h-14 font-black uppercase text-sm rounded-2xl shadow-xl bg-primary hover:bg-primary/90" 
                                onClick={() => setIsPaymentOpen(true)} 
                                disabled={watchItems.length === 0}
                            >
                                <CreditCard className="mr-2 h-5 w-5"/> COBRAR [F8]
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
       </div>

       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 border-rose-500 rounded-[2rem]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <AlertTriangle className="h-10 w-10 text-rose-600" />
                        <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter">¿Anular Operación?</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="font-bold text-slate-500">
                        Esta acción vaciará el carrito actual. El stock reservado será liberado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-3">
                    <AlertDialogCancel className="font-black uppercase text-xs">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Cliente Contado' }); setSelectedCustomer(null); }} className="bg-rose-600 font-black uppercase text-xs rounded-xl shadow-xl">Confirmar Anulación</AlertDialogAction>
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
