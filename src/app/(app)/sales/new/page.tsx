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
    QrCode,
    UserCheck,
    Package
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
    imageUrl: z.string().optional()
  })).min(1),
  paymentMethod: z.string().default('Efectivo'),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
  changeCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
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
      changeCurrency: 'USD',
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
  const watchChangeCurrency = form.watch('changeCurrency');
  const watchAmountReceived = form.watch('amountReceived');
  const watchReference = form.watch('referenceNumber');

  const formatCurrency = (val: number, currency = 'VES') => {
      if (currency === 'COP') return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val);
      return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

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

  useEffect(() => {
    if (watchMethod === 'Efectivo') {
        form.setValue('changeCurrency', watchCurrency);
    }
  }, [watchCurrency, watchMethod, form]);

  const changeInfo = useMemo(() => {
      const received = parseFloat(watchAmountReceived) || 0;
      if (received <= targetAmount) return { amount: 0, currency: watchChangeCurrency };

      const receivedInVES = watchCurrency === 'USD' ? received * (rates.usd?.usd || 0) : 
                           watchCurrency === 'COP' ? (received / (rates.cop?.rate || 1)) * (rates.usd?.usd || 0) : 
                           received;
      
      const changeInVES = receivedInVES - totals.ves;

      let finalChange = 0;
      if (watchChangeCurrency === 'VES') {
          finalChange = changeInVES;
      } else if (watchChangeCurrency === 'USD') {
          finalChange = changeInVES / (rates.usd?.usd || 1);
      } else if (watchChangeCurrency === 'COP') {
          finalChange = (changeInVES / (rates.usd?.usd || 1)) * (rates.cop?.rate || 0);
      }

      return {
          amount: Math.max(0, finalChange),
          currency: watchChangeCurrency
      };
  }, [watchAmountReceived, watchCurrency, watchChangeCurrency, targetAmount, totals.ves, rates]);

  useEffect(() => {
    if (['Pago Móvil', 'Tarjeta', 'Biopago'].includes(watchMethod)) {
        form.setValue('paymentCurrency', 'VES');
        form.setValue('changeCurrency', 'VES');
        form.setValue('amountReceived', totals.ves.toFixed(2));
    } else if (['Zelle', 'Binance'].includes(watchMethod)) {
        form.setValue('paymentCurrency', 'USD');
        form.setValue('changeCurrency', 'USD');
        form.setValue('amountReceived', totals.usd.toFixed(2));
    }
  }, [watchMethod, totals.ves, totals.usd, form]);

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
            taxRate: product.taxRate,
            imageUrl: product.imageUrl
        });
    }
  };

  const handleAdjustQuantity = (index: number, delta: number) => {
    const currentQty = parseFloat(watchItems[index]?.quantity?.toString()) || 0;
    const nextQty = Math.max(0, currentQty + delta);
    if (nextQty <= 0) remove(index);
    else update(index, { ...fields[index], quantity: nextQty });
  };

  const isDigitalPayment = ['Pago Móvil', 'Tarjeta', 'Zelle', 'Binance', 'Biopago'].includes(watchMethod);
  const isReferenceMissing = isDigitalPayment && !watchReference?.trim();

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    const received = parseFloat(watchAmountReceived) || 0;
    
    if (received < targetAmount * 0.999) {
        toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago es insuficiente.' });
        return;
    }

    if (isReferenceMissing) {
        toast({ variant: 'destructive', title: 'Referencia Requerida', description: 'Por favor ingrese el número de confirmación bancaria.' });
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
                amountReceived: received,
                change: changeInfo.amount,
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
  }, [storeConfig, totals.ves]);

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-2 md:p-4 overflow-y-auto lg:overflow-hidden flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full border bg-white"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Terminal de Ventas</h2>
                        <Badge variant="outline" className="text-[10px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                           <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> POS Online
                        </Badge>
                    </div>
                </div>
                <div className="text-left sm:text-right px-1">
                    <span className="text-[10px] font-black uppercase opacity-40 block">Tasa Oficial BCV</span>
                    <span className="text-sm font-black text-primary">Bs. {formatCurrency(rates.usd?.usd || 0)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 lg:overflow-hidden pb-20 lg:pb-0">
                {/* IZQUIERDA: CARRITO */}
                <div className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
                    <Card className='rounded-2xl border-2 shadow-sm'>
                        <CardContent className="p-2 md:p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl flex-1 lg:overflow-hidden flex flex-col overflow-hidden border-2 shadow-sm">
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-4 font-black uppercase text-[10px]">Item / Imagen</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                            <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-primary/[0.02] border-b">
                                                <TableCell className="pl-4 py-2 md:py-3">
                                                    <div className='flex items-center gap-3'>
                                                        <div className='h-10 w-10 rounded-lg bg-muted relative overflow-hidden shrink-0 border'>
                                                            {item.imageUrl ? (
                                                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="40px" />
                                                            ) : (
                                                                <div className='flex h-full w-full items-center justify-center opacity-20'>
                                                                    <Package className='h-5 w-5' />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className='flex flex-col'>
                                                            <span className='font-black uppercase text-[10px] md:text-[11px] leading-tight line-clamp-1'>{item.name}</span>
                                                            <span className='text-[8px] md:text-[9px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button variant="outline" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-lg border-2" onClick={() => handleAdjustQuantity(index, -1)}><Minus className="h-3 w-3" /></Button>
                                                        <span className="w-6 md:w-8 text-center font-black text-xs md:text-sm">{watchItems[index]?.quantity}</span>
                                                        <Button variant="outline" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-lg border-2 border-primary/20 text-primary" onClick={() => handleAdjustQuantity(index, 1)}><Plus className="h-3 w-3" /></Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 font-black text-[11px] md:text-sm text-primary whitespace-nowrap">
                                                    {formatCurrency(item.price * item.quantity * (1 + (item.taxRate || 0)))}
                                                </TableCell>
                                                <TableCell className="pr-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(index)}><X className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-48 md:h-64 text-center opacity-20'>
                                                    <QrCode className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4" />
                                                    <p className="font-black uppercase text-[10px] md:text-xs tracking-widest">Esperando Productos</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* DERECHA: LIQUIDACIÓN */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="rounded-2xl bg-primary text-primary-foreground border-none overflow-hidden shadow-xl">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
                                <div className={cn("p-2 md:p-3 text-center transition-all", watchCurrency === 'USD' ? "bg-white/10 scale-105" : "opacity-60")}>
                                    <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60 block">Dólares</span>
                                    <span className="text-base md:text-lg font-black">${formatCurrency(totals.usd, 'USD')}</span>
                                </div>
                                <div className={cn("p-2 md:p-3 text-center transition-all", watchCurrency === 'VES' ? "bg-white/10 scale-105" : "opacity-60")}>
                                    <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60 block">Bolívares</span>
                                    <span className="text-base md:text-lg font-black">Bs. {formatCurrency(totals.ves)}</span>
                                </div>
                                <div className={cn("p-2 md:p-3 text-center transition-all", watchCurrency === 'COP' ? "bg-white/10 scale-105" : "opacity-60")}>
                                    <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60 block">Pesos</span>
                                    <span className="text-base md:text-lg font-black">{totals.cop.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl flex-1 flex flex-col overflow-hidden border-2 shadow-sm">
                        <CardContent className="p-3 md:p-4 space-y-4 flex-1 overflow-y-auto">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase opacity-50 ml-1">Titular de Factura</Label>
                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between p-3 bg-primary/5 border-2 border-primary/20 rounded-xl animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-primary text-white p-1.5 rounded-lg"><UserCheck className="h-4 w-4" /></div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs font-black uppercase truncate">{selectedCustomer.name}</span>
                                                <span className="text-[9px] font-mono opacity-60">{selectedCustomer.idNumber}</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-500 shrink-0" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', 'Cliente Contado'); form.setValue('customerId', undefined); }}><X className="h-4 w-4" /></Button>
                                    </div>
                                ) : (
                                    <CustomerSearch onCustomerSelect={(c) => { form.setValue('customerId', c._id); form.setValue('customerName', c.name); setSelectedCustomer(c); }} />
                                )}
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
                                            "min-h-[56px] flex flex-col items-center justify-center gap-1 rounded-xl transition-all font-black text-[9px] uppercase border-2",
                                            watchMethod === m.id ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted"
                                        )}
                                        onClick={() => form.setValue('paymentMethod', m.id)}
                                    >
                                        <m.icon className={cn("h-4 w-4", watchMethod === m.id ? "text-primary" : m.color)} />
                                        {m.id}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-muted/30 rounded-2xl p-3 md:p-4 border-2 border-dashed space-y-4">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                                        <div className="bg-white p-2 rounded-xl border-2 border-primary/10 shadow-sm shrink-0">
                                            {qrPayload ? (
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}&ecc=L`} alt="QR" className="w-24 h-20 sm:w-20" />
                                            ) : <div className="w-20 h-20 flex items-center justify-center text-[7px] font-black text-center opacity-20 uppercase">Faltan Datos Cuenta</div>}
                                        </div>
                                        <div className="flex-1 w-full space-y-2">
                                            <div className="text-[9px] font-bold">
                                                <p className="font-black text-primary text-[11px]">Banco: {storeConfig?.pagoMovil?.bankCode || 'N/A'}</p>
                                                <p className="opacity-70">CI: {storeConfig?.pagoMovil?.idNumber || 'N/A'}</p>
                                                <p className="opacity-70">TEL: {storeConfig?.pagoMovil?.phone || 'N/A'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black uppercase opacity-50 ml-1">Referencia (Últimos 6)</Label>
                                                <Input placeholder="000000" className="h-10 font-black uppercase text-center rounded-xl bg-white border-2" {...form.register('referenceNumber')} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {watchMethod === 'Efectivo' && (
                                            <div className="flex gap-1 p-1 bg-white/50 rounded-xl border">
                                                {['USD', 'VES', 'COP'].map((curr: any) => (
                                                    <button key={curr} type="button" className={cn("flex-1 h-8 rounded-lg font-black text-[10px] transition-all", watchCurrency === curr ? "bg-primary text-white" : "text-muted-foreground opacity-50")} onClick={() => form.setValue('paymentCurrency', curr)}>{curr}</button>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Recibido ({watchCurrency})</Label>
                                                <div className="relative">
                                                    <Input type="number" className="h-11 text-xl font-black text-center rounded-xl border-2 border-primary/20 focus:border-primary" {...form.register('amountReceived')} />
                                                    {watchMethod === 'Efectivo' && (
                                                         <button type="button" className="absolute right-1 top-1 h-9 px-2 font-black text-[8px] uppercase text-primary bg-primary/5 rounded-md" onClick={() => form.setValue('amountReceived', targetAmount.toFixed(2))}>Exacto</button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={cn("rounded-xl p-2 flex flex-col justify-center text-center border-2 transition-all", changeInfo.amount > 0 ? "bg-green-600 text-white border-green-700 scale-105 shadow-lg" : "bg-muted border-transparent opacity-40")}>
                                                <span className="text-[9px] font-black uppercase opacity-60">Vuelto ({changeInfo.currency})</span>
                                                <span className="text-lg font-black">{formatCurrency(changeInfo.amount, changeInfo.currency)}</span>
                                            </div>
                                        </div>

                                        {isDigitalPayment && (
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-40 ml-1">Nº Referencia / Lote</Label>
                                                <Input placeholder="Ej: 014523" className="h-10 font-black uppercase text-center rounded-xl bg-white border-2" {...form.register('referenceNumber')} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <div className="p-3 md:p-4 bg-white border-t mt-auto sticky bottom-0 z-20">
                             <Button 
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0 || isReferenceMissing}
                                className="w-full h-14 md:h-16 text-lg font-black uppercase shadow-2xl rounded-2xl bg-primary text-white"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-5 w-5" />}
                                FACTURAR VENTA (F4)
                             </Button>
                        </div>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );
}
