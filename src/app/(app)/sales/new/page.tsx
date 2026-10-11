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
    Printer,
    Search,
    Trash2,
    User,
    AlertTriangle,
    Receipt,
    Calculator,
    ChevronDown,
    Coins
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
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
    isWeightable: z.boolean().optional(),
  })).min(1),
});

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  
  // Estados de pago integrados en la barra lateral
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'VES'>('USD');
  const [receivedAmount, setReceivedAmount] = useState<string>('0');

  const searchRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Consumidor Final',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  const tasaBCV = rates.usd?.usd || 0;

  // Cálculos de Totales
  const totals = useMemo(() => {
    let subtotalExento = 0;
    let subtotalGravable = 0;
    let totalIVA = 0;

    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) {
            subtotalExento += sub;
        } else {
            subtotalGravable += sub;
            totalIVA += (sub * i.taxRate);
        }
    });

    const totalVES = subtotalExento + subtotalGravable + totalIVA;
    const totalUSD = tasaBCV > 0 ? totalVES / tasaBCV : 0;

    return { 
        ves: totalVES, 
        usd: totalUSD, 
        exento: subtotalExento, 
        gravable: subtotalGravable, 
        iva: totalIVA 
    };
  }, [watchItems, tasaBCV]);

  // Cálculo de Vuelto
  const changeToGive = useMemo(() => {
    const received = parseFloat(receivedAmount) || 0;
    if (received === 0) return 0;

    if (paymentCurrency === 'USD') {
        const totalNeededUSD = totals.usd;
        return Math.max(0, received - totalNeededUSD);
    } else {
        const totalNeededVES = totals.ves;
        return Math.max(0, received - totalNeededVES);
    }
  }, [receivedAmount, paymentCurrency, totals]);

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
            isWeightable: product.isWeightable
        });
    }
    searchRef.current?.focus();
  };

  const handleEmitTicket = async () => {
    if (watchItems.length === 0) return;
    
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                payments: [{
                    method: paymentMethod,
                    amount: totals.ves,
                    currency: 'VES', // Siempre se liquida en VES internamente
                }],
                totalAmount: totals.ves,
                storeId 
            }),
        });
        
        if (!response.ok) throw new Error("Error al procesar la venta");
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
       
       {/* SECCIÓN IZQUIERDA: LISTADO DE PRODUCTOS */}
       <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-white sticky top-0 z-10 border-b">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] h-12 tracking-widest text-slate-400 pl-6">Producto</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-400">Precio</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-400">Cant.</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] h-12 tracking-widest text-slate-400 pr-6">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {watchItems.length > 0 ? fields.map((item, index) => (
                                <TableRow key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-xs text-slate-700">{item.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">REF: {item.productId.slice(-6)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <span className="font-bold text-xs text-slate-600">Bs. {item.price.toLocaleString('es-VE')}</span>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => update(index, { ...fields[index], quantity: Math.max(0.1, item.quantity - 1) })} className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button>
                                            <span className="font-black text-sm">{item.quantity}</span>
                                            <button onClick={() => handleProductSelect(fields[index] as any, 1)} className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-4">
                                        <div className="flex items-center justify-end gap-4">
                                            <span className="font-black text-sm text-slate-900">{(item.price * item.quantity).toLocaleString('es-VE')}</span>
                                            <button onClick={() => remove(index)} className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <p className="text-sm font-bold text-slate-300 italic">Escanea o busca productos para facturar.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       {/* SECCIÓN DERECHA: PANEL DE PAGO */}
       <aside className="w-[380px] bg-white border-l shadow-2xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                
                <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Forma de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-12 font-bold text-sm border-2 rounded-xl bg-slate-50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                            <SelectItem value="Efectivo" className="font-bold">Efectivo</SelectItem>
                            <SelectItem value="Pago Móvil" className="font-bold">Pago Móvil</SelectItem>
                            <SelectItem value="Tarjeta" className="font-bold">Tarjeta (Punto)</SelectItem>
                            <SelectItem value="Transferencia" className="font-bold">Transferencia</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="p-5 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Moneda de Pago</Label>
                            <Select value={paymentCurrency} onValueChange={(v: any) => setPaymentCurrency(v)}>
                                <SelectTrigger className="h-11 font-bold text-xs bg-white border-2 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2">
                                    <SelectItem value="USD" className="font-bold">Dólares ($)</SelectItem>
                                    <SelectItem value="VES" className="font-bold">Bolívares (Bs.)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Monto Recibido</Label>
                            <Input 
                                type="number" 
                                className="h-11 font-black text-center text-lg border-2 rounded-xl"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(e.target.value)}
                                onFocus={e => e.target.select()}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cambio a Entregar:</span>
                        <span className="text-2xl font-black text-emerald-500 underline decoration-2 underline-offset-4 tracking-tighter">
                            {paymentCurrency === 'USD' ? '$' : 'Bs.'} {changeToGive.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="space-y-3 px-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">Gravable (IVA 16%):</span>
                        <span className="text-xs font-bold text-slate-500 font-mono">Bs.S {totals.gravable.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">Monto Exento:</span>
                        <span className="text-xs font-bold text-slate-500 font-mono">Bs.S {totals.exento.toLocaleString()}</span>
                    </div>
                </div>

                <div className="pt-4 border-t-2 border-slate-100">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black uppercase text-primary tracking-widest">Total Bs:</span>
                        <span className="text-4xl font-black text-primary tracking-tighter">
                            Bs.S {totals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 opacity-60 italic">
                        <span className="text-[10px] font-black uppercase text-slate-400">Equiv. Divisa:</span>
                        <span className="text-sm font-black text-slate-900">$ {totals.usd.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 border-t shrink-0">
                <Button 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                    onClick={handleEmitTicket}
                    disabled={isSubmitting || watchItems.length === 0}
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <Printer className="h-6 w-6" />}
                    Emitir Ticket
                </Button>
            </div>
       </aside>

       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase italic">¿Anular Venta?</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-slate-400 uppercase text-xs">
                        Se perderán los artículos cargados en la sesión actual.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="font-bold uppercase text-[10px] rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Consumidor Final' }); setReceivedAmount('0'); }} className="bg-rose-600 hover:bg-rose-700 font-black uppercase text-[10px] rounded-xl">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
