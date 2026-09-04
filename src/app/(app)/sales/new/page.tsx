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
    Smartphone,
    CreditCard,
    Banknote,
    Coins,
    Zap,
    CheckCircle2,
    ShieldCheck,
    Plus,
    Minus,
    QrCode
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

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Cliente requerido'),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), 
    quantity: z.coerce.number().min(0.001),
    stock: z.number(),
    taxRate: z.number()
  })).min(1),
  paymentMethod: z.string().default('Efectivo'),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
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
  const productSearchRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentCurrency: 'USD',
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
  const watchAmountReceived = form.watch('amountReceived');
  const watchReference = form.watch('referenceNumber');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  useEffect(() => {
    const fetchStoreConfig = async () => {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) return;
        try {
            const res = await fetch(`/api/settings/store?storeId=${storeId}`);
            if (res.ok) setStoreConfig(await res.json());
        } catch (e) {}
    };
    fetchStoreConfig();

    const handleGlobalKeys = (e: any) => {
        if (e.key === 'F1') { e.preventDefault(); productSearchRef.current?.focus(); }
        if (e.key === 'F4') { e.preventDefault(); handleFinalizeSale(); }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
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

  const targetAmount = useMemo(() => {
      if (watchCurrency === 'VES') return totals.ves;
      if (watchCurrency === 'COP') return totals.cop;
      return totals.usd;
  }, [watchCurrency, totals]);

  const allowsChange = ['Efectivo'].includes(watchMethod);
  const isDigitalPayment = ['Pago Móvil', 'Tarjeta', 'Zelle', 'Binance', 'Biopago'].includes(watchMethod);

  useEffect(() => {
    if (!allowsChange) {
        form.setValue('amountReceived', targetAmount.toFixed(2));
    }
  }, [watchMethod, targetAmount, allowsChange, form]);

  const change = useMemo(() => {
      if (!allowsChange) return 0;
      const received = parseFloat(watchAmountReceived) || 0;
      return Math.max(0, received - targetAmount);
  }, [watchAmountReceived, targetAmount, allowsChange]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existing = fields.findIndex(item => item.productId === String(product._id));
    if (existing > -1) {
      const currentQty = parseFloat(watchItems[existing].quantity.toString()) || 0;
      update(existing, { ...fields[existing], quantity: currentQty + quantity });
    } else {
        append({
            productId: String(product._id),
            name: product.name,
            price: product.price, 
            quantity: quantity,
            stock: product.stock,
            taxRate: product.taxRate
        });
    }
  };

  const handleAdjustQuantity = (index: number, delta: number) => {
    const currentItem = watchItems[index];
    if (!currentItem) return;

    const currentQty = parseFloat(currentItem.quantity.toString()) || 0;
    const nextQty = Math.max(0, currentQty + delta);
    
    if (nextQty <= 0) {
        remove(index);
    } else {
        update(index, { ...fields[index], quantity: nextQty });
    }
  };

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    
    if (parseFloat(watchAmountReceived) < targetAmount * 0.99) {
        toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago recibido es menor al total.' });
        return;
    }

    if (isDigitalPayment && !watchReference?.trim()) {
        toast({ 
            variant: 'destructive', 
            title: 'Referencia Requerida', 
            description: `Para ${watchMethod} es obligatorio ingresar el número de referencia.` 
        });
        return;
    }

    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                amountReceived: parseFloat(watchAmountReceived) || 0,
                change,
                storeId 
            }),
        });
        if (!response.ok) throw new Error("Fallo al guardar venta");
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error POS', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const qrPayload = useMemo(() => {
    if (!storeConfig?.pagoMovil?.phone || !storeConfig?.pagoMovil?.bankCode) return '';
    const { bankCode, phone, idNumber } = storeConfig.pagoMovil;
    const cleanDoc = idNumber.replace(/[^0-9VJEG]/g, '').toUpperCase();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `${bankCode};${cleanDoc};${cleanPhone};${totals.ves.toFixed(2)}`;
  }, [storeConfig, totals]);

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-3 md:p-6 overflow-y-auto lg:overflow-hidden flex flex-col gap-4">
            {/* Header POS */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 border"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Nueva Venta</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[10px] font-black uppercase bg-green-50 text-green-600 border-green-200 py-0">
                                <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> Online
                             </Badge>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black uppercase opacity-40 block">Tasa Oficial</span>
                    <span className="text-sm font-black text-primary">Bs. {formatCurrency(rates.usd?.usd || 0)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 lg:overflow-hidden">
                {/* ÁREA DE PRODUCTOS (IZQUIERDA) */}
                <div className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 lg:overflow-hidden flex flex-col overflow-hidden">
                        <CardContent className="p-0 flex-1 overflow-x-auto">
                            <Table>
                                <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                    <TableRow>
                                        <TableHead className="pl-4 font-black uppercase text-[10px] py-4">Ítem</TableHead>
                                        <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                        <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                        <TableHead className="w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? fields.map((item, index) => {
                                        const currentItem = watchItems[index];
                                        return (
                                        <TableRow key={item.id} className="hover:bg-muted/20 border-b group">
                                            <TableCell className="pl-4 py-4">
                                                <div className='flex flex-col'>
                                                    <span className='font-black uppercase text-xs md:text-sm leading-tight'>{item.name}</span>
                                                    <span className='text-[10px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center'>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                        onClick={() => handleAdjustQuantity(index, -1)}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-black text-sm">{currentItem?.quantity}</span>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-xl border-2 border-primary/20 text-primary hover:bg-primary/5"
                                                        onClick={() => handleAdjustQuantity(index, 1)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-4 font-black text-sm md:text-base">
                                                {formatCurrency(currentItem.price * currentItem.quantity * (1 + (currentItem.taxRate || 0)))}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-600" onClick={() => remove(index)}>
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )}) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className='h-64 text-center'>
                                                <div className="flex flex-col items-center opacity-20 grayscale">
                                                    <QrCode className="h-16 w-16 mb-4" />
                                                    <p className="font-black uppercase text-xs tracking-[0.2em]">Esperando Productos</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* PANEL DE PAGO (DERECHA) */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Visualización de Totales */}
                    <Card className="immersive-card rounded-2xl bg-white border-2 border-primary/10 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-3 divide-x">
                                <div className="p-4 text-center">
                                    <span className="text-[10px] font-black uppercase opacity-40 block mb-1">Dólares</span>
                                    <span className="text-xl font-black text-primary">${formatCurrency(totals.usd)}</span>
                                </div>
                                <div className="p-4 text-center bg-primary/[0.02]">
                                    <span className="text-[10px] font-black uppercase text-primary block mb-1">Bolívares</span>
                                    <span className="text-xl font-black">Bs. {formatCurrency(totals.ves)}</span>
                                </div>
                                <div className="p-4 text-center">
                                    <span className="text-[10px] font-black uppercase opacity-40 block mb-1">Pesos (COP)</span>
                                    <span className="text-xl font-black">{totals.cop.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formulario de Pago */}
                    <Card className="immersive-card rounded-2xl flex-1 flex flex-col overflow-hidden">
                        <CardContent className="p-4 space-y-4 flex-1">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase ml-1 opacity-50">Cliente</Label>
                                <CustomerSearch onCustomerSelect={(c) => {
                                    form.setValue('customerId', c._id);
                                    form.setValue('customerName', c.name);
                                    setSelectedCustomer(c);
                                }} />
                            </div>

                            <Separator />

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Pago Móvil', icon: Smartphone, color: 'text-blue-500' },
                                    { id: 'Tarjeta', icon: CreditCard, color: 'text-purple-500' },
                                    { id: 'Efectivo', icon: Banknote, color: 'text-green-600' },
                                    { id: 'Zelle', icon: CheckCircle2, color: 'text-blue-600' },
                                    { id: 'Binance', icon: Coins, color: 'text-amber-500' },
                                    { id: 'Biopago', icon: ShieldCheck, color: 'text-red-500' },
                                ].map((m) => (
                                    <button 
                                        key={m.id}
                                        type="button"
                                        className={cn(
                                            "h-16 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all font-black text-[9px] uppercase border-2",
                                            watchMethod === m.id 
                                                ? "border-primary bg-primary/5 text-primary shadow-inner" 
                                                : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted"
                                        )}
                                        onClick={() => form.setValue('paymentMethod', m.id)}
                                    >
                                        <m.icon className={cn("h-5 w-5", watchMethod === m.id ? "text-primary" : m.color)} />
                                        {m.id}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-muted/30 rounded-3xl p-5 border-2 border-dashed">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="flex gap-5 items-center">
                                        <div className="bg-white p-2 rounded-2xl border-2 border-primary/10 shadow-lg shrink-0">
                                            {qrPayload ? (
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&ecc=L`} 
                                                    alt="QR Suiche 7B" className="w-28 h-24"
                                                />
                                            ) : <div className="w-28 h-24 flex items-center justify-center text-[8px] font-black text-center uppercase opacity-20">Configurar Datos PM</div>}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="text-[10px] font-bold space-y-1">
                                                <p className="font-black text-primary text-xs">Monto: {formatCurrency(totals.ves)} Bs.</p>
                                                <p className="opacity-60">Banco: {storeConfig?.pagoMovil?.bankCode || '---'}</p>
                                                <p className="opacity-60">Tel: {storeConfig?.pagoMovil?.phone || '---'}</p>
                                            </div>
                                            <Input 
                                                placeholder="Referencia (últimos 6)" 
                                                className="h-11 font-black uppercase text-center rounded-xl bg-white border-2 focus:ring-primary" 
                                                {...form.register('referenceNumber')} 
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex gap-2 p-1 bg-white/50 rounded-xl border">
                                            {['USD', 'VES', 'COP'].map((curr: any) => (
                                                <button key={curr} type="button" className={cn("flex-1 h-9 rounded-lg font-black text-[11px] transition-all", watchCurrency === curr ? "bg-white text-primary shadow-sm border-2 border-primary/20" : "bg-transparent text-muted-foreground opacity-50")} onClick={() => form.setValue('paymentCurrency', curr)}>{curr}</button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Recibido</Label>
                                                <Input type="number" className="h-12 text-2xl font-black text-center rounded-2xl border-2" {...form.register('amountReceived')} />
                                            </div>
                                            <div className={cn("rounded-2xl p-2 flex flex-col justify-center text-center border-2 transition-all", change > 0 ? "bg-green-600 text-white border-green-700 shadow-lg" : "bg-muted border-transparent")}>
                                                <span className="text-[10px] font-black uppercase opacity-60">Vuelto</span>
                                                <span className="text-xl font-black">{formatCurrency(change)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <div className="p-4 bg-white border-t mt-auto">
                             <Button 
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0 || (isDigitalPayment && !watchReference?.trim())}
                                className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl bg-primary text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Printer className="mr-3 h-6 w-6" />}
                                FACTURAR VENTA (F4)
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
       </main>

       <style jsx global>{`
           @media (max-width: 1024px) {
               .immersive-card { border-radius: 1.5rem; }
           }
           input::-webkit-outer-spin-button,
           input::-webkit-inner-spin-button {
             -webkit-appearance: none;
             margin: 0;
           }
       `}</style>
    </div>
  );
}
