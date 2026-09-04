
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
    AlertCircle
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
    
    if ((parseFloat(watchAmountReceived) || 0) < targetAmount * 0.999) {
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
       <main className="flex-1 p-2 md:p-6 overflow-y-auto lg:overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-primary">Nueva Venta</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[8px] md:text-[9px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                                <Zap className="h-2 w-2 mr-1 fill-green-600" /> Online
                             </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase opacity-40">Tasa BCV</span>
                    <span className="text-xs md:text-sm font-black text-primary">Bs. {rates.usd?.usd.toFixed(2)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 lg:overflow-hidden">
                {/* CARRITO RESPONSIVO */}
                <div className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="p-2 md:p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 lg:overflow-hidden flex flex-col">
                        <CardContent className="p-0 flex-1 overflow-x-auto">
                            <div className="min-w-[600px] lg:min-w-full">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-4 font-black uppercase text-[10px]">Producto</TableHead>
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
                                                <TableCell className="pl-4 py-3">
                                                    <div className='flex flex-col'>
                                                        <span className='font-black uppercase text-[10px] md:text-[11px] leading-tight'>{item.name}</span>
                                                        <span className='text-[8px] md:text-[9px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex items-center justify-center gap-1 md:gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-full border-2"
                                                            onClick={() => handleAdjustQuantity(index, -1)}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-8 text-center font-black text-sm">{currentItem?.quantity}</span>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8 rounded-full border-2 border-primary/20 text-primary"
                                                            onClick={() => handleAdjustQuantity(index, 1)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 font-black text-xs md:text-sm">
                                                    {currentItem ? formatCurrency(currentItem.price * currentItem.quantity * (1 + (currentItem.taxRate || 0))) : '0,00'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-40 text-center'>
                                                    <p className="font-black uppercase text-[10px] opacity-20 tracking-widest">Sin productos</p>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIQUIDACIÓN RESPONSIVA */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="immersive-card rounded-2xl bg-white border-2 border-primary/10">
                        <CardContent className="p-3 grid grid-cols-3 gap-1 md:gap-2">
                             <div className="flex flex-col border-r pr-1">
                                <span className="text-[8px] md:text-[9px] font-black uppercase opacity-40">Bolívares</span>
                                <span className="text-sm md:text-lg font-black truncate">Bs. {formatCurrency(totals.ves)}</span>
                             </div>
                             <div className="flex flex-col border-r px-1 text-primary">
                                <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60 text-primary">Dólares</span>
                                <span className="text-sm md:text-lg font-black truncate">${formatCurrency(totals.usd)}</span>
                             </div>
                             <div className="flex flex-col pl-1">
                                <span className="text-[8px] md:text-[9px] font-black uppercase opacity-40">Pesos</span>
                                <span className="text-sm md:text-lg font-black truncate">{totals.cop.toLocaleString()}</span>
                             </div>
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 flex flex-col">
                        <CardContent className="p-4 space-y-4 flex-1">
                            <CustomerSearch onCustomerSelect={(c) => {
                                form.setValue('customerId', c._id);
                                form.setValue('customerName', c.name);
                                setSelectedCustomer(c);
                            }} />

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Pago Móvil', icon: Smartphone },
                                    { id: 'Tarjeta', icon: CreditCard },
                                    { id: 'Efectivo', icon: Banknote },
                                    { id: 'Zelle', icon: CheckCircle2 },
                                    { id: 'Binance', icon: Coins },
                                    { id: 'Biopago', icon: ShieldCheck },
                                ].map((m) => (
                                    <button 
                                        key={m.id}
                                        type="button"
                                        className={cn(
                                            "h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all font-black text-[8px] uppercase border-2",
                                            watchMethod === m.id 
                                                ? "border-primary bg-primary/5 text-primary" 
                                                : "border-transparent bg-muted/40 text-muted-foreground"
                                        )}
                                        onClick={() => form.setValue('paymentMethod', m.id)}
                                    >
                                        <m.icon className="h-4 w-4" />
                                        {m.id}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-muted/20 rounded-2xl p-4 border-2 border-dashed">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="space-y-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="bg-white p-1 rounded-lg border shrink-0">
                                                {qrPayload && (
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrPayload)}&ecc=L`} 
                                                        alt="QR" className="w-24 h-24"
                                                    />
                                                )}
                                            </div>
                                            <div className="text-[9px] font-bold space-y-1">
                                                <p className="font-black text-primary">MONTO: {formatCurrency(totals.ves)} Bs.</p>
                                                <p>BANCO: {storeConfig?.pagoMovil?.bankCode || '---'}</p>
                                                <p>RIF: {storeConfig?.pagoMovil?.idNumber || '---'}</p>
                                                <p>TEL: {storeConfig?.pagoMovil?.phone || '---'}</p>
                                            </div>
                                        </div>
                                        <Input placeholder="Referencia" className="h-10 font-black uppercase text-center" {...form.register('referenceNumber')} />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            {['USD', 'VES', 'COP'].map((curr: any) => (
                                                <button key={curr} type="button" className={cn("flex-1 h-8 rounded-lg font-black text-[10px] border-2", watchCurrency === curr ? "bg-white border-primary text-primary" : "bg-transparent border-transparent")} onClick={() => form.setValue('paymentCurrency', curr)}>{curr}</button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-60">Recibido</Label>
                                                <Input type="number" className="h-10 text-xl font-black text-center" {...form.register('amountReceived')} />
                                            </div>
                                            <div className={cn("rounded-xl p-2 flex flex-col justify-center text-center", change > 0 ? "bg-green-500 text-white" : "bg-muted")}>
                                                <span className="text-[8px] font-black uppercase">Vuelto</span>
                                                <span className="text-lg font-black">{formatCurrency(change)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <div className="p-4 bg-muted/20 border-t mt-auto">
                             <Button 
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0 || (isDigitalPayment && !watchReference?.trim())}
                                className="w-full h-14 text-base font-black uppercase shadow-xl rounded-2xl bg-primary text-white"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Printer className="mr-2 h-5 w-5" />}
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
