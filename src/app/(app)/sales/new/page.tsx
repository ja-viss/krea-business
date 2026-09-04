'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
    CheckCircle2,
    ShieldCheck,
    Hash
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

  // Formateadores estrictos de 2 decimales para evitar el bug del 0.004
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
    let general = 0;
    let exempt = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) exempt += sub; else general += sub;
    });
    // Aplicar redondeo a 2 decimales exactos
    const ves = Math.round(((general * 1.16) + exempt) * 100) / 100;
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

  // Auto-completar monto al cambiar método para pagos digitales (monto exacto)
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

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0) return;
    if ((parseFloat(watchAmountReceived) || 0) < targetAmount * 0.999) {
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
    // Estándar Suiche 7B para Venezuela
    return `PM:${bankCode}:${phone.replace(/[^0-9]/g, '')}:${idNumber.replace(/[^0-9VJEG]/g, '')}:${totals.ves.toFixed(2)}`;
  }, [storeConfig, totals]);

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-4 md:px-6 pt-4 pb-6 overflow-hidden flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter italic">Terminal POS v4.0</h2>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[9px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                                <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> Sistema Online
                             </Badge>
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border">
                                <div className={cn("h-2 w-2 rounded-full", storeConfig?.pagoMovil?.phone ? "bg-green-500" : "bg-red-500")} />
                                <span className="text-[8px] font-black uppercase opacity-60">Pago Móvil {storeConfig?.pagoMovil?.phone ? 'OK' : 'OFF'}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black uppercase opacity-40">Tasa Oficial BCV</span>
                        <span className="text-sm font-black text-primary">Bs. {rates.usd?.usd.toFixed(2)}</span>
                    </div>
                    <Button variant="outline" className="rounded-xl border-2 font-black text-xs uppercase h-10"><Monitor className="mr-2 h-4 w-4" /> Visor Cliente</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* COLUMNA IZQUIERDA: CARRITO */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
                    <Card className='immersive-card rounded-2xl'>
                        <CardContent className="p-3">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden">
                        <CardContent className="p-0 h-full">
                            <div className="overflow-auto h-full">
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
                                        {fields.length > 0 ? fields.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/20 border-b group">
                                                <TableCell className="pl-6 py-3">
                                                    <div className='flex flex-col'>
                                                        <span className='font-black uppercase text-[11px] leading-tight'>{item.name}</span>
                                                        <span className='text-[9px] text-muted-foreground font-mono'>Bs. {formatCurrency(item.price)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <Input 
                                                        type="number" 
                                                        className='w-14 h-8 text-center font-black mx-auto bg-muted/50 border-none rounded-lg' 
                                                        {...form.register(`items.${index}.quantity`)} 
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right pr-6 font-black text-sm text-slate-800">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </TableCell>
                                                <TableCell className="pr-4">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-60 text-center'>
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <div className="p-6 bg-muted rounded-full">
                                                            <Zap className="h-10 w-10 fill-current" />
                                                        </div>
                                                        <p className="font-black uppercase text-[10px] tracking-[0.2em]">Caja vacía. Iniciar escaneo.</p>
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

                {/* COLUMNA DERECHA: LIQUIDACIÓN POS v4.0 */}
                <div className="lg:col-span-5 flex flex-col gap-4 overflow-hidden">
                    {/* BLOQUE 1: TOTALES MULTIMONEDA */}
                    <Card className="immersive-card rounded-2xl bg-slate-900 text-white border-none overflow-hidden shadow-2xl">
                        <CardContent className="p-4 grid grid-cols-3 gap-2">
                             <div className="flex flex-col border-r border-white/10 pr-2">
                                <span className="text-[9px] font-black uppercase text-white/40">Bolívares (VES)</span>
                                <span className="text-xl font-black tracking-tighter">Bs. {formatCurrency(totals.ves)}</span>
                             </div>
                             <div className="flex flex-col border-r border-white/10 px-2">
                                <span className="text-[9px] font-black uppercase text-primary">Dólares (USD)</span>
                                <span className="text-xl font-black tracking-tighter text-primary">${formatCurrency(totals.usd)}</span>
                             </div>
                             <div className="flex flex-col pl-2">
                                <span className="text-[9px] font-black uppercase text-white/40">Pesos (COP)</span>
                                <span className="text-xl font-black tracking-tighter">{totals.cop.toLocaleString()}</span>
                             </div>
                        </CardContent>
                    </Card>

                    {/* BLOQUE 2: CLIENTE Y MÉTODOS */}
                    <Card className="immersive-card rounded-2xl flex-1 overflow-hidden flex flex-col">
                        <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
                            {/* Selector de Cliente */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <CustomerSearch onCustomerSelect={(c) => {
                                        form.setValue('customerId', c._id);
                                        form.setValue('customerName', c.name);
                                        setSelectedCustomer(c);
                                    }} />
                                </div>
                                {selectedCustomer ? (
                                    <Badge className="bg-primary h-11 px-3 rounded-xl gap-2 font-black uppercase text-[10px]">
                                        <UserCheck className="h-3.5 w-3.5" /> {selectedCustomer.name.split(' ')[0]}
                                        <button onClick={() => setSelectedCustomer(null)} className="ml-1 hover:text-red-200"><X size={12} /></button>
                                    </Badge>
                                ) : (
                                    <div className="bg-muted px-4 h-11 flex items-center rounded-xl text-[10px] font-black uppercase opacity-40 italic">Consumidor Final</div>
                                )}
                            </div>

                            <Separator />

                            {/* Métodos de Pago (Selector Rápido) */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Método de Liquidación</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'Pago Móvil', icon: Smartphone, color: 'text-primary' },
                                        { id: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
                                        { id: 'Efectivo', icon: Banknote, color: 'text-green-600' },
                                        { id: 'Zelle', icon: CheckCircle2, color: 'text-purple-600' },
                                        { id: 'Binance', icon: Coins, color: 'text-amber-500' },
                                        { id: 'Biopago', icon: ShieldCheck, color: 'text-red-500' },
                                    ].map((m) => (
                                        <button 
                                            key={m.id}
                                            className={cn(
                                                "h-12 flex items-center gap-2 px-3 rounded-xl transition-all font-black text-[9px] uppercase border-2",
                                                watchMethod === m.id 
                                                    ? "border-primary bg-primary/5 text-primary" 
                                                    : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/80"
                                            )}
                                            onClick={() => {
                                                form.setValue('paymentMethod', m.id);
                                                if (['Efectivo', 'Zelle', 'Binance'].includes(m.id)) form.setValue('paymentCurrency', 'USD');
                                                else form.setValue('paymentCurrency', 'VES');
                                            }}
                                        >
                                            <m.icon className={cn("h-4 w-4", watchMethod === m.id ? m.color : "text-muted-foreground/40")} />
                                            {m.id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 bg-muted/20 rounded-2xl p-4 border-2 border-dashed border-border/50">
                                {watchMethod === 'Pago Móvil' ? (
                                    <div className="flex gap-4 animate-in slide-in-from-right-4">
                                        <div className="bg-white p-1 rounded-lg border-2 shadow-sm shrink-0">
                                             <img 
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}&ecc=L`} 
                                                alt="QR Suiche 7B" className="w-[120px] h-[120px]"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="bg-primary/10 p-2 rounded-lg">
                                                <p className="text-[10px] font-black uppercase text-primary leading-none">Monto Exacto</p>
                                                <p className="text-lg font-black text-slate-800">Bs. {formatCurrency(totals.ves)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-3 w-3 text-muted-foreground" />
                                                    <Input 
                                                        placeholder="Últimos 6 de Referencia" 
                                                        className="h-8 text-xs font-bold bg-white"
                                                        {...form.register('referenceNumber')}
                                                    />
                                                </div>
                                                <div className="text-[8px] font-bold text-muted-foreground uppercase pl-5">
                                                    {storeConfig?.pagoMovil?.phone || 'Sin cuenta vinculada'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : allowsChange ? (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                        <div className="flex gap-2">
                                            {['USD', 'VES', 'COP'].map((curr: any) => (
                                                <button 
                                                    key={curr}
                                                    className={cn(
                                                        "flex-1 h-9 rounded-lg font-black text-[10px] transition-all border-2",
                                                        watchCurrency === curr ? "bg-white border-primary text-primary" : "bg-transparent border-transparent text-muted-foreground"
                                                    )}
                                                    onClick={() => form.setValue('paymentCurrency', curr)}
                                                >
                                                    {curr}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase opacity-60">Recibido ({watchCurrency})</Label>
                                                <Input 
                                                    type="number" 
                                                    className="h-12 text-2xl font-black bg-white rounded-xl border-2" 
                                                    placeholder="0.00"
                                                    {...form.register('amountReceived')}
                                                />
                                            </div>
                                            <div className={cn("rounded-xl p-3 flex flex-col justify-center", change > 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground/40")}>
                                                <span className="text-[8px] font-black uppercase">Vuelto a entregar</span>
                                                <span className="text-xl font-black leading-none">
                                                    {watchCurrency === 'USD' ? '$' : 'Bs.'} {formatCurrency(change)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {[1, 5, 10, 20, 50, 100].map(val => (
                                                <button 
                                                    key={val}
                                                    className="flex-1 h-8 rounded-lg bg-white border-2 text-[10px] font-black hover:bg-primary/5 active:scale-95 transition-all"
                                                    onClick={() => form.setValue('amountReceived', val.toString())}
                                                >
                                                    ${val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 opacity-60">
                                        <ShieldCheck className="h-8 w-8 text-primary" />
                                        <p className="text-[10px] font-black uppercase">Liquidación {watchMethod} Directa</p>
                                        <div className="px-4 py-1 bg-white rounded-full font-bold text-sm">
                                            {watchCurrency === 'USD' ? '$' : 'Bs.'} {formatCurrency(targetAmount)}
                                        </div>
                                        <div className="w-full mt-2">
                                            <Input 
                                                placeholder="Nº Referencia / Aprobación" 
                                                className="h-9 text-xs text-center font-bold bg-white"
                                                {...form.register('referenceNumber')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        {/* BLOQUE FINAL: ACCIÓN FIJA */}
                        <div className="p-4 bg-slate-100 border-t">
                             <Button 
                                onClick={handleFinalizeSale}
                                disabled={isSubmitting || watchItems.length === 0}
                                className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all border-none"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Printer className="mr-3 h-6 w-6" />}
                                FINALIZAR Y FACTURAR (F4)
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
       </main>
    </div>
  );
}
