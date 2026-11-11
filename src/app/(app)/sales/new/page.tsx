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
    Camera,
    Trash2
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
  paymentMethod: z.string().default('Efectivo'),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).default('USD'),
  amountReceived: z.string().default(''),
  referenceNumber: z.string().optional(),
});

interface IPayment {
    method: string;
    amount: number;
    currency: string;
    reference?: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates } = useExchangeRates();
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Estado para pagos mixtos (Split Payments)
  const [addedPayments, setAddedPayments] = useState<IPayment[]>([]);

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
        if (e.key === 'Escape' && showScanner) { setShowScanner(false); }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [showScanner]);

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

  // Calcular saldo abonado en VES
  const paidVES = useMemo(() => {
    return addedPayments.reduce((acc, p) => {
        if (p.currency === 'VES') return acc + p.amount;
        if (p.currency === 'USD' && rates.usd?.usd) return acc + (p.amount * rates.usd.usd);
        if (p.currency === 'COP' && rates.cop?.rate && rates.usd?.usd) {
            return acc + ((p.amount / rates.cop.rate) * rates.usd.usd);
        }
        return acc;
    }, 0);
  }, [addedPayments, rates]);

  const remainingVES = Math.max(0, totals.ves - paidVES);

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
    toast({ title: "Agregado", description: `${quantity}x ${product.name}` });
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

  const handleAddPayment = () => {
    const amount = parseFloat(watchAmountReceived) || 0;
    if (amount <= 0) return;

    const newPayment: IPayment = {
        method: watchMethod,
        amount: amount,
        currency: watchCurrency,
        reference: form.getValues().referenceNumber
    };

    setAddedPayments([...addedPayments, newPayment]);
    form.setValue('amountReceived', '');
    form.setValue('referenceNumber', '');
  };

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    
    // Si no hay pagos mixtos, tratar el pago actual como el único
    let finalPayments = addedPayments;
    if (finalPayments.length === 0) {
        const amount = parseFloat(watchAmountReceived) || 0;
        if (amount < targetAmount * 0.999) {
            toast({ variant: 'destructive', title: 'Monto Incompleto', description: 'El pago recibido es menor al total.' });
            return;
        }
        finalPayments = [{
            method: watchMethod,
            amount: amount,
            currency: watchCurrency,
            reference: form.getValues().referenceNumber
        }];
    } else {
        // Validar que el saldo esté cubierto
        if (remainingVES > 0.05) {
            toast({ variant: 'destructive', title: 'Saldo Pendiente', description: `Faltan Bs. ${formatCurrency(remainingVES)} por abonar.` });
            return;
        }
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
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Fallo al guardar venta");
        }
        const result = await response.json();
        toast({ title: "Venta Exitosa", description: "Generando comprobante..." });
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
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-4 md:px-6 pt-4 pb-6 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-primary italic">Consola de Despacho</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                                <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> Sistema Online
                             </Badge>
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border">
                                <div className={cn("h-2 w-2 rounded-full", storeConfig?.pagoMovil?.phone ? "bg-green-500" : "bg-red-500")} />
                                <span className="text-[8px] font-black uppercase opacity-60">Pago Móvil {storeConfig?.pagoMovil?.phone ? 'Activo' : 'Inactivo'}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black uppercase opacity-40">Tasas Oficiales BCV</span>
                        <div className='flex gap-3'>
                            <span className="text-xs font-black text-primary">USD: {rates.usd?.usd.toFixed(2)}</span>
                            <span className="text-xs font-black text-slate-500">COP: {rates.cop?.rate.toLocaleString()}</span>
                        </div>
                    </div>
                    <Button variant="outline" className="rounded-xl border-2 font-black text-xs uppercase h-10" onClick={() => setShowScanner(!showScanner)}>
                        <Camera className="mr-2 h-4 w-4" /> {showScanner ? 'Cerrar Cámara' : 'Escáner (C)'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* CARRITO */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden relative">
                    {showScanner && (
                        <div className='absolute inset-0 z-50 bg-black/5 rounded-2xl border-4 border-primary/20 overflow-hidden animate-in fade-in duration-300'>
                            <BarcodeScanner onScan={(code) => {
                                // Buscar producto por código
                                fetch(`/api/products/lookup?storeId=${localStorage.getItem('storeId')}&code=${code}`)
                                    .then(res => res.json())
                                    .then(p => {
                                        if (p._id) handleProductSelect(p, 1);
                                        else toast({ variant: 'destructive', title: "No encontrado", description: code });
                                    });
                            }} onClose={() => setShowScanner(false)} />
                            <Button variant="destructive" size="icon" className='absolute top-4 right-4 z-[60] rounded-full' onClick={() => setShowScanner(false)}>
                                <X className='h-5 w-5' />
                            </Button>
                        </div>
                    )}

                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden border-2">
                        <CardContent className="p-0 h-full">
                            <div className="overflow-auto h-full scrollbar-hide">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-6 font-black uppercase text-[10px]">Descripción Producto</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[10px]">Cantidad</TableHead>
                                            <TableHead className="text-right pr-6 font-black uppercase text-[10px]">Total (Bs)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((item, index) => {
                                            const currentItem = watchItems[index];
                                            return (
                                            <TableRow key={item.id} className="hover:bg-primary/[0.01] border-b group">
                                                <TableCell className="pl-6 py-4">
                                                    <div className='flex flex-col'>
                                                        <span className='font-black uppercase text-xs leading-tight'>{item.name}</span>
                                                        <span className='text-[9px] text-muted-foreground font-bold'>PVP: Bs. {formatCurrency(item.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-2" onClick={() => handleAdjustQuantity(index, -1)}><Minus className="h-3 w-3" /></Button>
                                                        <Input type="number" className='w-12 h-8 text-center font-black bg-muted/50 border-none rounded-lg' {...form.register(`items.${index}.quantity`)} />
                                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg border-2 border-primary/20 text-primary" onClick={() => handleAdjustQuantity(index, 1)}><Plus className="h-3 w-3" /></Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-black text-sm text-slate-900">
                                                    {currentItem ? formatCurrency(currentItem.price * currentItem.quantity * (1 + (currentItem.taxRate || 0))) : '0,00'}
                                                </TableCell>
                                                <TableCell className="pr-4">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-600 transition-colors" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-80 text-center'>
                                                    <div className="flex flex-col items-center gap-3 opacity-10">
                                                        <Zap className="h-16 w-16 fill-current" />
                                                        <p className="font-black uppercase text-xs tracking-widest italic">Terminal a la espera de mercancía...</p>
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

                {/* LIQUIDACIÓN */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
                    <Card className="immersive-card rounded-2xl bg-slate-950 text-white overflow-hidden shadow-2xl border-none">
                        <CardContent className="p-5 grid grid-cols-3 gap-4">
                             <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-primary tracking-widest mb-1">TOTAL VES</span>
                                <span className="text-xl font-black tracking-tighter">Bs. {formatCurrency(totals.ves)}</span>
                             </div>
                             <div className="flex flex-col border-x border-white/10 px-4">
                                <span className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-1">EQUIV USD</span>
                                <span className="text-xl font-black tracking-tighter">$ {formatCurrency(totals.usd)}</span>
                             </div>
                             <div className="flex flex-col items-end">
                                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">SALDO PENDIENTE</span>
                                <span className={cn("text-xl font-black tracking-tighter", remainingVES > 0 ? "text-red-500" : "text-green-500")}>
                                    {remainingVES > 0 ? `Bs. ${formatCurrency(remainingVES)}` : 'LIQUIDADO'}
                                </span>
                             </div>
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden flex flex-col border-2 border-slate-200">
                        <CardContent className="p-4 space-y-4 flex-1 flex flex-col scrollbar-hide overflow-y-auto">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <CustomerSearch onCustomerSelect={(c) => {
                                        form.setValue('customerId', c._id);
                                        form.setValue('customerName', c.name);
                                        setSelectedCustomer(c);
                                    }} />
                                </div>
                                {selectedCustomer ? (
                                    <Badge className="bg-primary h-11 px-4 rounded-xl gap-2 font-black uppercase text-[10px] shadow-lg">
                                        <UserCheck className="h-4 w-4" /> {selectedCustomer.name.split(' ')[0]}
                                        <button onClick={() => setSelectedCustomer(null)} className="ml-1 hover:text-red-200"><X size={14} /></button>
                                    </Badge>
                                ) : (
                                    <div className="bg-muted px-4 h-11 flex items-center rounded-xl text-[10px] font-black uppercase opacity-40 italic border-2 border-dashed">Consumidor Final</div>
                                )}
                            </div>

                            <Separator className='h-0.5 bg-slate-100' />

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Método de Liquidación</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'Efectivo', icon: Banknote, color: 'text-green-600' },
                                        { id: 'Pago Móvil', icon: Smartphone, color: 'text-primary' },
                                        { id: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
                                        { id: 'Zelle', icon: ShieldCheck, color: 'text-purple-600' },
                                        { id: 'Binance', icon: Coins, color: 'text-amber-500' },
                                        { id: 'Biopago', icon: ShieldCheck, color: 'text-red-500' },
                                    ].map((m) => (
                                        <button 
                                            key={m.id}
                                            type="button"
                                            className={cn(
                                                "h-12 flex items-center gap-2 px-3 rounded-xl transition-all font-black text-[9px] uppercase border-2",
                                                watchMethod === m.id 
                                                    ? "border-primary bg-primary/5 text-primary shadow-inner scale-[0.98]" 
                                                    : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/80"
                                            )}
                                            onClick={() => {
                                                form.setValue('paymentMethod', m.id);
                                                if (['Efectivo', 'Zelle', 'Binance'].includes(m.id)) form.setValue('paymentCurrency', 'USD');
                                                else if (m.id === 'Pesos') form.setValue('paymentCurrency', 'COP');
                                                else form.setValue('paymentCurrency', 'VES');
                                            }}
                                        >
                                            <m.icon className={cn("h-4 w-4", watchMethod === m.id ? m.color : "text-muted-foreground/30")} />
                                            {m.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-4 border-2 border-slate-200">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="flex gap-4">
                                        <div className="bg-white p-1 rounded-xl border-2 shadow-sm shrink-0 flex items-center justify-center w-[120px] h-[120px]">
                                             {qrString ? (
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}&ecc=L`} alt="QR" className="w-[110px] h-[110px]" />
                                             ) : (
                                                <div className="text-[8px] font-black text-center text-muted-foreground p-2 uppercase italic">Configurar Pago Móvil en Ajustes</div>
                                             )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="space-y-1">
                                                <Label className='text-[8px] font-black uppercase opacity-40'>Referencia Bancaria</Label>
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-3.5 w-3.5 text-primary" />
                                                    <Input placeholder="Últimos 6 dígitos" className="h-9 text-xs font-bold bg-white rounded-lg" {...form.register('referenceNumber')} />
                                                </div>
                                            </div>
                                            <Button size="sm" className='w-full font-black text-[10px] uppercase h-9 shadow-lg' onClick={handleAddPayment}>Registrar Abono</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex gap-2 p-1 bg-muted rounded-xl">
                                            {['USD', 'VES', 'COP'].map((curr: any) => (
                                                <button key={curr} type="button" className={cn("flex-1 h-8 rounded-lg font-black text-[9px] transition-all", watchCurrency === curr ? "bg-white text-primary shadow-sm" : "bg-transparent text-muted-foreground")} onClick={() => form.setValue('paymentCurrency', curr)}>{curr}</button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-40">Monto Recibido ({watchCurrency})</Label>
                                                <Input type="number" className="h-12 text-2xl font-black bg-white rounded-xl border-2 text-center" placeholder="0.00" {...form.register('amountReceived')} onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()} />
                                            </div>
                                            <div className={cn("rounded-xl p-3 flex flex-col justify-center text-center border-2", change > 0 ? "bg-emerald-500 text-white border-emerald-600 shadow-xl" : "bg-muted/50 text-muted-foreground/30 border-transparent")}>
                                                <span className="text-[8px] font-black uppercase">Cambio / Vuelto</span>
                                                <span className="text-xl font-black leading-none">
                                                    {watchCurrency === 'USD' ? '$' : watchCurrency === 'COP' ? '' : 'Bs.'} {formatCurrency(change)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button className='w-full font-black uppercase text-xs h-12 shadow-xl' onClick={handleAddPayment}>Confirmar Pago y Añadir</Button>
                                    </div>
                                )}
                            </div>

                            {/* LISTA DE PAGOS AGREGADOS */}
                            {addedPayments.length > 0 && (
                                <div className='space-y-2 mt-2'>
                                    <Label className='text-[8px] font-black uppercase opacity-40 tracking-[0.2em] ml-1'>Desglose de Liquidación</Label>
                                    <div className='max-h-32 overflow-y-auto space-y-2 pr-2 scrollbar-hide'>
                                        {addedPayments.map((p, idx) => (
                                            <div key={idx} className='bg-white border-2 border-slate-100 rounded-xl p-3 flex justify-between items-center animate-in slide-in-from-right-2'>
                                                <div className='flex items-center gap-3'>
                                                    <div className='p-2 bg-slate-50 rounded-lg'><CheckCircle2 className='h-4 w-4 text-emerald-500'/></div>
                                                    <div>
                                                        <p className='text-[10px] font-black uppercase leading-none mb-0.5'>{p.method}</p>
                                                        <p className='text-xs font-bold text-slate-600'>{p.currency === 'USD' ? '$' : ''}{p.amount.toLocaleString()} {p.currency}</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className='h-7 w-7 text-red-300 hover:text-red-500' onClick={() => setAddedPayments(addedPayments.filter((_, i) => i !== idx))}>
                                                    <X className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        <div className="p-4 bg-slate-900 border-t">
                             <Button 
                                type="button"
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0}
                                className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all border-none group"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Printer className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />}
                                CERRAR DESPACHO (F4)
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );
}