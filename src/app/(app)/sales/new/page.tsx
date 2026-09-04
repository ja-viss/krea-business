'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    Trash2, 
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
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Separator } from '@/components/ui/separator';
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

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existing = fields.findIndex(item => item.productId === String(product._id));
    if (existing > -1) {
      update(existing, { ...fields[existing], quantity: fields[existing].quantity + quantity });
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

  const totals = useMemo(() => {
    let general = 0;
    let exempt = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) exempt += sub; else general += sub;
    });
    const ves = (general * 1.16) + exempt;
    const usd = rates.usd?.usd ? ves / rates.usd.usd : 0;
    const cop = rates.cop?.rate ? (usd * rates.cop.rate) : 0;
    return { ves, usd, cop };
  }, [watchItems, rates]);

  const targetAmount = useMemo(() => {
      if (watchCurrency === 'VES') return totals.ves;
      if (watchCurrency === 'COP') return totals.cop;
      return totals.usd;
  }, [watchCurrency, totals]);

  const change = useMemo(() => {
      const received = parseFloat(watchAmountReceived) || 0;
      return Math.max(0, received - targetAmount);
  }, [watchAmountReceived, targetAmount]);

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    if ((parseFloat(watchAmountReceived) || 0) < targetAmount * 0.99) {
        toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago recibido es menor al total.' });
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

  const qrString = useMemo(() => {
    if (!storeConfig?.pagoMovil?.phone) return '';
    const { bankCode, phone, idNumber } = storeConfig.pagoMovil;
    return `PM:${bankCode}:${phone.replace(/[^0-9]/g, '')}:${idNumber.replace(/[^0-9VJEG]/g, '')}:${totals.ves.toFixed(2)}`;
  }, [storeConfig, totals]);

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-4 md:px-8 pt-6 pb-12 overflow-hidden flex flex-col gap-6">
            <PageHeader
                title="POS Multimoneda"
                description="Terminal inmersiva de alta velocidad."
                actions={
                    <div className='flex gap-2'>
                        <Button variant="outline" className='bg-primary/5 text-primary border-primary/20 rounded-full'>
                            <Monitor className='mr-2 h-4 w-4' /> Visor Cliente
                        </Button>
                        <Button variant="ghost" asChild className="rounded-full"><Link href="/sales"><ChevronLeft className="mr-1 h-4 w-4" /> Salir</Link></Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* COLUMNA IZQUIERDA: PRODUCTOS */}
                <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="pt-6">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden">
                        <CardContent className="p-0 h-full">
                            <Table>
                                <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                    <TableRow>
                                        <TableHead className="pl-6 font-black uppercase text-[10px]">Item</TableHead>
                                        <TableHead className="text-center font-black uppercase text-[10px]">Cant</TableHead>
                                        <TableHead className="text-right pr-6 font-black uppercase text-[10px]">Subtotal</TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? fields.map((item, index) => (
                                        <TableRow key={item.id} className="hover:bg-muted/20 border-b">
                                            <TableCell className="pl-6 py-4">
                                                <div className='flex flex-col'>
                                                    <span className='font-black uppercase text-xs tracking-tight'>{item.name}</span>
                                                    <span className='text-[10px] text-muted-foreground'>Bs. {item.price.toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center'>
                                                <Input 
                                                    type="number" 
                                                    className='w-16 h-9 text-center font-black mx-auto bg-muted/30 border-none' 
                                                    {...form.register(`items.${index}.quantity`)} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-black text-primary">
                                                {(item.price * item.quantity).toLocaleString('es-VE')}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className='h-60 text-center text-muted-foreground'>
                                                <div className="flex flex-col items-center gap-3">
                                                    <Zap className="h-12 w-12 opacity-10" />
                                                    <p className="font-bold uppercase text-xs tracking-widest opacity-40">Escanea o busca un producto para comenzar</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: LIQUIDACIÓN (COBRO SIEMPRE VISIBLE) */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
                    {/* SECCIÓN CLIENTE */}
                    <Card className='immersive-card rounded-2xl'>
                        <CardHeader className='pb-2'>
                            <CardTitle className='text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2'>
                                <UserCheck className='h-3 w-3' /> Cliente (F2)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <CustomerSearch onCustomerSelect={(c) => {
                                form.setValue('customerId', c._id);
                                form.setValue('customerName', c.name);
                                setSelectedCustomer(c);
                            }} />
                            {selectedCustomer && (
                                <div className='mt-3 flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95'>
                                    <div className='flex flex-col'>
                                        <span className='text-[10px] font-black uppercase text-primary leading-none'>{selectedCustomer.name}</span>
                                        <span className='text-[8px] font-mono mt-1'>{selectedCustomer.idNumber}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className='h-6 w-6 text-red-500' onClick={() => {
                                        form.setValue('customerId', undefined);
                                        form.setValue('customerName', 'Cliente Contado');
                                        setSelectedCustomer(null);
                                    }}><X className='h-4 w-4'/></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* SECCIÓN MÉTODOS DE PAGO */}
                    <Card className='immersive-card rounded-2xl flex-1'>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Forma de Pago</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'Efectivo', icon: Banknote },
                                        { id: 'Tarjeta', icon: CreditCard },
                                        { id: 'Pago Móvil', icon: Smartphone },
                                        { id: 'Zelle', icon: CheckCircle2 },
                                        { id: 'Transferencia', icon: Monitor },
                                        { id: 'Binance', icon: Coins },
                                    ].map((m) => (
                                        <button 
                                            key={m.id}
                                            className={cn(
                                                "h-16 flex flex-col items-center justify-center gap-1 rounded-xl transition-all font-black text-[9px] uppercase border-2",
                                                watchMethod === m.id 
                                                    ? "border-primary bg-primary/5 text-primary scale-105" 
                                                    : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                                            )}
                                            onClick={() => {
                                                form.setValue('paymentMethod', m.id);
                                                if (['Pago Móvil', 'Tarjeta'].includes(m.id)) form.setValue('paymentCurrency', 'VES');
                                                else if (['Zelle', 'Binance'].includes(m.id)) form.setValue('paymentCurrency', 'USD');
                                            }}
                                        >
                                            <m.icon className={cn("h-5 w-5", watchMethod === m.id ? "text-primary" : "text-muted-foreground")} />
                                            {m.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl h-11 border-2 border-transparent">
                                    {['USD', 'VES', 'COP'].map((curr: any) => (
                                        <button 
                                            key={curr}
                                            className={cn(
                                                "flex-1 rounded-lg font-black text-[10px] transition-all",
                                                watchCurrency === curr ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
                                            )}
                                            onClick={() => form.setValue('paymentCurrency', curr)}
                                        >
                                            {curr}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Monto Percibido ({watchCurrency})</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            className="h-16 text-3xl font-black bg-white rounded-2xl border-2 focus:ring-primary" 
                                            placeholder="0.00"
                                            {...form.register('amountReceived')}
                                        />
                                        <button 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary/10 text-primary font-black text-[10px] rounded-lg hover:bg-primary/20"
                                            onClick={() => form.setValue('amountReceived', targetAmount.toFixed(2))}
                                        >
                                            EXACTO
                                        </button>
                                    </div>
                                </div>

                                {watchCurrency === 'USD' && (
                                    <div className="flex flex-wrap gap-2">
                                        {[1, 5, 10, 20, 50, 100].map(val => (
                                            <button 
                                                key={val}
                                                className="h-9 px-3 border-2 rounded-xl font-bold text-xs hover:bg-primary/5 transition-colors"
                                                onClick={() => form.setValue('amountReceived', val.toString())}
                                            >
                                                ${val}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {watchMethod === 'Pago Móvil' && storeConfig?.pagoMovil?.phone && (
                                <div className="bg-primary/5 p-4 rounded-2xl border-2 border-dashed border-primary/20 flex items-center gap-4 animate-in slide-in-from-bottom-2">
                                    <div className="bg-white p-1.5 rounded-lg border-2 border-black/5">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}&ecc=L`} 
                                            alt="QR" className="w-20 h-20"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] font-black uppercase text-primary">QR Suiche 7B</p>
                                        <p className="text-xs font-black leading-none">{storeConfig.pagoMovil.phone}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground">{storeConfig.pagoMovil.idNumber}</p>
                                        <Badge className="bg-primary text-[8px] h-4 font-black">Bs. {totals.ves.toFixed(2)}</Badge>
                                    </div>
                                </div>
                            )}

                            <div className={cn(
                                "p-5 rounded-2xl border-2 border-dashed flex justify-between items-center transition-colors duration-500",
                                change > 0 ? "bg-green-50 border-green-200" : "bg-muted/20 border-transparent"
                            )}>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase opacity-40">{change > 0 ? 'Vuelto a Entregar' : 'Saldo Pendiente'}</p>
                                    <p className={cn("text-2xl font-black tracking-tight", change > 0 ? "text-green-600" : "text-slate-900")}>
                                        {watchCurrency === 'USD' ? '$' : watchCurrency === 'VES' ? 'Bs.' : ''} {change.toLocaleString()}
                                    </p>
                                </div>
                                {change > 0 && <CheckCircle2 className="h-8 w-8 text-green-500 animate-pulse" />}
                            </div>
                        </CardContent>
                    </Card>

                    {/* TOTAL FINAL Y ACCIÓN */}
                    <Card className='immersive-card rounded-2xl bg-primary text-white border-none'>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase opacity-60">Total Venta</p>
                                    <p className="text-5xl font-black tracking-tighter leading-none">${totals.usd.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold opacity-80">{totals.ves.toLocaleString('es-VE')} Bs.</p>
                                    <p className="text-[9px] font-black uppercase opacity-40">Tasa: {rates.usd?.usd.toFixed(2)}</p>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0}
                                className="w-full h-16 text-xl font-black uppercase shadow-2xl rounded-2xl bg-white text-primary hover:bg-primary-foreground/90 transition-all border-none"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Printer className="mr-3 h-6 w-6" />}
                                FACTURAR (F4)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );
}
