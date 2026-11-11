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
    ShoppingCart
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
    if ((parseFloat(watchAmountReceived) || 0) < targetAmount * 0.999) {
        toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago recibido es menor al total.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        
        const payload = {
            ...form.getValues(),
            totalAmount: totals.ves,
            payments: [{
                method: watchMethod,
                amount: targetAmount,
                currency: watchCurrency,
                amountReceived: parseFloat(watchAmountReceived) || 0,
                changeGiven: change,
                reference: form.getValues().referenceNumber
            }],
            storeId 
        };

        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Fallo al guardar venta");
        }

        const result = await response.json();
        toast({ title: "Venta Exitosa", description: "Procesando comprobante..." });
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
    <div className="flex flex-1 flex-col min-h-screen bg-background pb-safe">
       <main className="flex-1 p-2 md:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 md:px-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full h-8 w-8"><Link href="/sales"><ChevronLeft className="h-4 w-4" /></Link></Button>
                    <div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-primary leading-none">Nueva Venta</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                             <Badge variant="outline" className="text-[8px] font-black uppercase bg-green-50 text-green-600 border-green-200 py-0 h-4">
                                <Zap className="h-2 w-2 mr-1 fill-green-600" /> POS
                             </Badge>
                             <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border">
                                <div className={cn("h-1.5 w-1.5 rounded-full", storeConfig?.pagoMovil?.phone ? "bg-green-500" : "bg-red-500")} />
                                <span className="text-[7px] font-black uppercase opacity-60">Pago Móvil {storeConfig?.pagoMovil?.phone ? 'OK' : '--'}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-1 md:mr-4">
                        <span className="text-[8px] font-black uppercase opacity-40">Tasa BCV</span>
                        <span className="text-xs md:text-sm font-black text-primary">Bs. {rates.usd?.usd.toFixed(2)}</span>
                    </div>
                    <Button variant="outline" className="hidden sm:flex rounded-xl border-2 font-black text-xs uppercase h-9"><Monitor className="mr-2 h-4 w-4" /> Visor</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1">
                {/* CARRITO Y BÚSQUEDA */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <Card className='rounded-2xl border-2 shadow-sm overflow-hidden'>
                        <CardContent className="p-2 md:p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 shadow-sm flex-1 overflow-hidden flex flex-col min-h-[300px]">
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <div className="overflow-x-auto flex-1">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow className='h-10'>
                                            <TableHead className="pl-4 font-black uppercase text-[9px] w-[50%]">Producto</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[9px] w-[25%]">Cant.</TableHead>
                                            <TableHead className="text-right pr-4 font-black uppercase text-[9px] w-[25%]">Total</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((item, index) => {
                                            const currentItem = watchItems[index];
                                            return (
                                            <TableRow key={item.id} className="hover:bg-muted/20 border-b group h-14">
                                                <TableCell className="pl-4 py-2">
                                                    <div className='flex flex-col max-w-[120px] md:max-w-none'>
                                                        <span className='font-black uppercase text-[10px] md:text-[11px] leading-tight truncate'>{item.name}</span>
                                                        <span className='text-[8px] md:text-[9px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center px-1'>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            type="button"
                                                            className="h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full border-2 bg-white active:scale-90 transition-transform"
                                                            onClick={() => handleAdjustQuantity(index, -1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <span className="w-6 text-center font-black text-[10px] md:text-sm">{currentItem.quantity}</span>
                                                        <button 
                                                            type="button"
                                                            className="h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary bg-white active:scale-90 transition-transform"
                                                            onClick={() => handleAdjustQuantity(index, 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-2 md:pr-6 font-black text-[11px] md:text-sm text-slate-800">
                                                    {currentItem ? formatCurrency(currentItem.price * currentItem.quantity * (1 + (currentItem.taxRate || 0))) : '0,00'}
                                                </TableCell>
                                                <TableCell className="pr-2 text-right">
                                                    <button type="button" className="text-muted-foreground hover:text-red-600 transition-colors" onClick={() => remove(index)}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        )}) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-48 text-center'>
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <div className="p-4 bg-muted rounded-full">
                                                            <ShoppingCart className="h-8 w-8" />
                                                        </div>
                                                        <p className="font-black uppercase text-[9px] tracking-[0.2em]">Caja vacía</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIQUIDACIÓN Y PAGO */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* TOTALES COMPACTOS */}
                    <Card className="rounded-2xl bg-white border-2 border-primary/10 overflow-hidden shadow-md">
                        <CardContent className="p-3 grid grid-cols-3 gap-1 text-center">
                             <div className="flex flex-col border-r">
                                <span className="text-[8px] font-black uppercase text-muted-foreground">Bolívares</span>
                                <span className="text-sm md:text-base font-black tracking-tighter text-slate-900">Bs. {formatCurrency(totals.ves)}</span>
                             </div>
                             <div className="flex flex-col border-r">
                                <span className="text-[8px] font-black uppercase text-primary">Dólares</span>
                                <span className="text-sm md:text-base font-black tracking-tighter text-primary">${formatCurrency(totals.usd)}</span>
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-muted-foreground">Pesos</span>
                                <span className="text-sm md:text-base font-black tracking-tighter text-slate-700">{totals.cop.toLocaleString()}</span>
                             </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 shadow-sm flex flex-col">
                        <CardContent className="p-3 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <CustomerSearch onCustomerSelect={(c) => {
                                        form.setValue('customerId', String(c._id));
                                        form.setValue('customerName', c.name);
                                        setSelectedCustomer(c);
                                    }} />
                                </div>
                                {selectedCustomer && (
                                    <Badge className="bg-primary h-11 px-2 rounded-xl gap-1 font-black uppercase text-[9px]">
                                        <UserCheck className="h-3 w-3" /> {selectedCustomer.name.split(' ')[0]}
                                        <button onClick={() => setSelectedCustomer(null)} className="ml-1"><X size={10} /></button>
                                    </Badge>
                                )}
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Pago</Label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { id: 'Efectivo', icon: Banknote, color: 'text-green-600' },
                                        { id: 'Pago Móvil', icon: Smartphone, color: 'text-primary' },
                                        { id: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
                                        { id: 'Zelle', icon: CheckCircle2, color: 'text-purple-600' },
                                        { id: 'Binance', icon: Coins, color: 'text-amber-500' },
                                        { id: 'Biopago', icon: ShieldCheck, color: 'text-red-500' },
                                    ].map((m) => (
                                        <button 
                                            key={m.id}
                                            type="button"
                                            className={cn(
                                                "h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all border-2 active:scale-95",
                                                watchMethod === m.id 
                                                    ? "border-primary bg-primary/5 text-primary" 
                                                    : "border-transparent bg-muted/40 text-muted-foreground"
                                            )}
                                            onClick={() => {
                                                form.setValue('paymentMethod', m.id);
                                                if (['Efectivo', 'Zelle', 'Binance'].includes(m.id)) form.setValue('paymentCurrency', 'USD');
                                                else form.setValue('paymentCurrency', 'VES');
                                            }}
                                        >
                                            <m.icon className={cn("h-3.5 w-3.5", watchMethod === m.id ? m.color : "opacity-40")} />
                                            <span className="text-[7px] font-black uppercase">{m.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-muted/20 rounded-2xl p-3 border-2 border-dashed border-border/50">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="flex gap-3 animate-in fade-in">
                                        <div className="bg-white p-1 rounded-lg border-2 shadow-sm shrink-0 flex items-center justify-center w-[100px] h-[100px]">
                                             {qrString ? (
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrString)}`} 
                                                    alt="QR" className="w-full h-full"
                                                />
                                             ) : <div className="text-[7px] text-center p-1 font-bold">Sin QR</div>}
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                                <p className="text-[7px] font-black uppercase text-primary">A cobrar</p>
                                                <p className="text-base font-black leading-none">Bs. {formatCurrency(totals.ves)}</p>
                                            </div>
                                            <Input 
                                                placeholder="Ref. (últimos 6)" 
                                                className="h-8 text-[10px] font-bold bg-white"
                                                {...form.register('referenceNumber')}
                                            />
                                        </div>
                                    </div>
                                ) : allowsChange ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-1.5">
                                            {['USD', 'VES', 'COP'].map((curr: any) => (
                                                <button 
                                                    key={curr}
                                                    type="button"
                                                    className={cn(
                                                        "flex-1 h-7 rounded-lg font-black text-[9px] border-2",
                                                        watchCurrency === curr ? "bg-white border-primary text-primary" : "bg-transparent border-transparent opacity-40"
                                                    )}
                                                    onClick={() => form.setValue('paymentCurrency', curr)}
                                                >
                                                    {curr}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[8px] font-black uppercase opacity-50">Recibido</Label>
                                                <Input 
                                                    type="number" 
                                                    className="h-10 text-xl font-black bg-white rounded-xl border-2" 
                                                    {...form.register('amountReceived')}
                                                />
                                            </div>
                                            <div className={cn("rounded-xl p-2 flex flex-col justify-center", change > 0 ? "bg-green-600 text-white" : "bg-muted text-muted-foreground/30")}>
                                                <span className="text-[7px] font-black uppercase">Vuelto</span>
                                                <span className="text-base font-black leading-none">
                                                    {watchCurrency === 'USD' ? '$' : ''} {formatCurrency(change)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 py-2">
                                        <ShieldCheck className="h-6 w-6 text-primary opacity-40" />
                                        <p className="text-[9px] font-black uppercase">Liquidación {watchMethod}</p>
                                        <Input 
                                            placeholder="Nº Referencia" 
                                            className="h-9 text-xs text-center font-bold bg-white"
                                            {...form.register('referenceNumber')}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <div className="p-3 bg-muted/20 border-t">
                             <Button 
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0}
                                className="w-full h-14 text-base font-black uppercase shadow-xl rounded-2xl"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Printer className="mr-2 h-5 w-5" />}
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
