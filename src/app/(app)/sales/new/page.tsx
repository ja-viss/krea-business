'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    Monitor,
    UserCheck,
    X,
    Smartphone,
    CreditCard,
    Banknote,
    Coins,
    Zap,
    CheckCircle2,
    ShieldCheck,
    Hash,
    Plus,
    Minus,
    Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import type { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';

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
  payments: z.array(z.object({
      method: z.string(),
      amount: z.number(),
      currency: z.string(),
      reference: z.string().optional()
  })).default([]),
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
  const [showScanner, setShowScanner] = useState(false);
  const [addedPayments, setAddedPayments] = useState<any[]>([]);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      payments: [],
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
        if (e.key === 'Escape') { setShowScanner(false); }
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

  const paidVES = useMemo(() => {
    return addedPayments.reduce((acc, p) => {
        if (p.currency === 'VES') return acc + p.amount;
        if (p.currency === 'USD') return acc + (p.amount * (rates.usd?.usd || 1));
        if (p.currency === 'COP') return acc + ((p.amount / (rates.cop?.rate || 1)) * (rates.usd?.usd || 1));
        return acc;
    }, 0);
  }, [addedPayments, rates]);

  const remainingVES = Math.max(0, totals.ves - paidVES);

  const targetAmount = useMemo(() => {
      const remainingForCurrency = (curr: string) => {
          if (curr === 'VES') return remainingVES;
          if (curr === 'COP') return (remainingVES / (rates.usd?.usd || 1)) * (rates.cop?.rate || 1);
          return remainingVES / (rates.usd?.usd || 1);
      };
      return remainingForCurrency(watchCurrency);
  }, [watchCurrency, remainingVES, rates]);

  const allowsChange = ['Efectivo'].includes(watchMethod);

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

  const handleProductSelect = useCallback((product: IProduct, quantity: number = 1) => {
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
  }, [fields, append, update, watchItems]);

  const handleAdjustQuantity = (index: number, delta: number) => {
    const currentItem = watchItems[index];
    if (!currentItem) return;
    const currentQty = parseFloat(currentItem.quantity.toString()) || 0;
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty <= 0) remove(index);
    else update(index, { ...fields[index], quantity: nextQty });
  };

  const handleAddPayment = () => {
    const amount = parseFloat(watchAmountReceived) || 0;
    if (amount <= 0) return;
    const newPayment = {
        method: watchMethod,
        amount: Math.min(amount, targetAmount),
        currency: watchCurrency,
        reference: form.getValues('referenceNumber')
    };
    setAddedPayments([...addedPayments, newPayment]);
    form.setValue('amountReceived', '');
    form.setValue('referenceNumber', '');
  };

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    let finalPayments = [...addedPayments];
    if (finalPayments.length === 0) {
        const amount = parseFloat(watchAmountReceived) || 0;
        if (amount < targetAmount * 0.999) {
            toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago recibido es menor al total.' });
            return;
        }
        finalPayments.push({
            method: watchMethod,
            amount: targetAmount,
            currency: watchCurrency,
            reference: form.getValues('referenceNumber')
        });
    } else if (remainingVES > 0.05) {
        toast({ variant: 'destructive', title: 'Saldo Pendiente', description: 'Aún falta liquidar parte de la cuenta.' });
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
                payments: finalPayments,
                totalAmount: totals.ves,
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

  const qrString = useMemo(() => {
    if (!storeConfig?.pagoMovil?.phone || !storeConfig?.pagoMovil?.bankCode) return '';
    const { bankCode, phone, idNumber } = storeConfig.pagoMovil;
    return `PM:${bankCode}:${phone.replace(/[^0-9]/g, '')}:${idNumber.replace(/[^0-9VJEG]/g, '')}:${totals.ves.toFixed(2)}`;
  }, [storeConfig, totals]);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-background">
       <main className="flex-1 p-4 md:px-6 pt-4 pb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-primary">Nueva Venta</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                                <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> Operativo
                             </Badge>
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border">
                                <div className={cn("h-2 w-2 rounded-full", storeConfig?.pagoMovil?.phone ? "bg-green-500" : "bg-red-500")} />
                                <span className="text-[8px] font-black uppercase opacity-60">Pago Móvil {storeConfig?.pagoMovil?.phone ? 'Habilitado' : 'Pendiente'}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black uppercase opacity-40">Tasa Oficial BCV</span>
                        <span className="text-sm font-black text-primary">Bs. {rates.usd?.usd.toFixed(2)}</span>
                    </div>
                    <Button variant="outline" className="rounded-xl border-2 font-black text-xs uppercase h-10"><Monitor className="mr-2 h-4 w-4" /> Pantalla Cliente</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1">
                {/* CARRITO */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="p-3 flex gap-2">
                            <div className="flex-1">
                                <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                            </div>
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-2" onClick={() => setShowScanner(!showScanner)}>
                                <Camera className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>

                    {showScanner && (
                        <div className="relative h-[300px] w-full rounded-2xl overflow-hidden border-4 border-primary/20 bg-black">
                            <BarcodeScanner onScan={(code) => {
                                fetch(`/api/products/lookup?storeId=${localStorage.getItem('storeId')}&code=${code}`)
                                    .then(res => res.json())
                                    .then(p => {
                                        if (p._id) {
                                            handleProductSelect(p, 1);
                                            toast({ title: "Producto escaneado", description: p.name });
                                        }
                                    });
                            }} onClose={() => setShowScanner(false)} />
                        </div>
                    )}

                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden">
                        <CardContent className="p-0 h-full">
                            <div className="overflow-auto max-h-[600px]">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-6 font-black uppercase text-[10px]">Producto</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                            <TableHead className="text-right pr-6 font-black uppercase text-[10px]">Total</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((item, index) => {
                                            const currentItem = watchItems[index];
                                            return (
                                            <TableRow key={item.id} className="hover:bg-muted/20 border-b group">
                                                <TableCell className="pl-6 py-3">
                                                    <div className='flex flex-col'>
                                                        <span className='font-black uppercase text-[11px] leading-tight'>{item.name}</span>
                                                        <span className='text-[9px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-2" onClick={() => handleAdjustQuantity(index, -1)}><Minus className="h-3 w-3" /></Button>
                                                        <Input type="number" className='w-12 h-8 text-center font-black bg-muted/50 border-none rounded-lg' {...form.register(`items.${index}.quantity`)} />
                                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-2" onClick={() => handleAdjustQuantity(index, 1)}><Plus className="h-3 w-3" /></Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-black text-sm text-slate-800">
                                                    {currentItem ? formatCurrency(currentItem.price * currentItem.quantity * (1 + (currentItem.taxRate || 0))) : '0,00'}
                                                </TableCell>
                                                <TableCell className="pr-4">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        )}) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-60 text-center opacity-20 font-black uppercase text-[10px] tracking-[0.2em]'>Caja vacía.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIQUIDACIÓN */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="immersive-card rounded-2xl bg-white border-2 border-primary/10 overflow-hidden shadow-xl">
                        <CardContent className="p-4 grid grid-cols-3 gap-2">
                             <div className="flex flex-col border-r pr-2"><span className="text-[9px] font-black uppercase text-muted-foreground">Bolívares</span><span className="text-xl font-black">Bs. {formatCurrency(totals.ves)}</span></div>
                             <div className="flex flex-col border-r px-2"><span className="text-[9px] font-black uppercase text-primary">Dólares</span><span className="text-xl font-black text-primary">${formatCurrency(totals.usd)}</span></div>
                             <div className="flex flex-col pl-2"><span className="text-[9px] font-black uppercase text-muted-foreground">Pesos</span><span className="text-xl font-black">{totals.cop.toLocaleString()}</span></div>
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex flex-col">
                        <CardContent className="p-4 space-y-4">
                            <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} />
                            <Separator />
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Método de Pago</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Efectivo', 'Pago Móvil', 'Tarjeta', 'Zelle', 'Binance', 'Pesos'].map((m) => (
                                        <Button key={m} variant={watchMethod === m ? 'default' : 'outline'} className="h-12 font-black uppercase text-[9px] rounded-xl border-2" onClick={() => form.setValue('paymentMethod', m)}>{m}</Button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-muted/20 rounded-2xl p-4 border-2 border-dashed">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase opacity-60">Recibido ({watchCurrency})</Label>
                                        <Input type="number" className="h-12 text-2xl font-black bg-white rounded-xl border-2" value={watchAmountReceived} onChange={e => form.setValue('amountReceived', e.target.value)} />
                                    </div>
                                    <div className={cn("rounded-xl p-3 flex flex-col justify-center", change > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground")}>
                                        <span className="text-[8px] font-black uppercase">Vuelto</span>
                                        <span className="text-xl font-black">{formatCurrency(change)}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    {['USD', 'VES', 'COP'].map((curr: any) => (
                                        <Button key={curr} variant={watchCurrency === curr ? 'secondary' : 'ghost'} size="sm" className="flex-1 font-black text-[10px]" onClick={() => form.setValue('paymentCurrency', curr)}>{curr}</Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <div className="p-4 bg-muted/20 border-t">
                             <Button onClick={handleFinalizeSale} disabled={isSubmitting || watchItems.length === 0} className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl">
                                {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Printer className="mr-3 h-6 w-6" />}
                                CERRAR VENTA (F4)
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );
}