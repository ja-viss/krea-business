
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
    Plus,
    Minus,
    Zap,
    UserCheck,
    Package,
    Lock,
    Scale,
    Coins
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
    isWeightable: z.boolean().optional()
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
  const [cashSession, setCashSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Lógica de Peso
  const [weightProduct, setWeightProduct] = useState<IProduct | null>(null);
  const [inputWeight, setInputWeight] = useState('0');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'GR'>('GR');

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

  useEffect(() => {
    const fetchData = async () => {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) return;
        try {
            const [configRes, sessionRes] = await Promise.all([
                fetch(`/api/settings/store?storeId=${storeId}`),
                fetch(`/api/cash-control?storeId=${storeId}`)
            ]);
            if (configRes.ok) setStoreConfig(await configRes.json());
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                setCashSession(sessionData.activeSession);
            }
        } catch (e) {} finally {
            setLoadingSession(false);
        }
    };
    fetchData();

    const handleGlobalKeys = (e: KeyboardEvent) => {
        if (e.key === 'F4') {
            e.preventDefault();
            handleFinalizeSale();
        }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Sincronizar moneda de vuelto con moneda de pago por defecto
  useEffect(() => {
    form.setValue('changeCurrency', watchCurrency);
  }, [watchCurrency, form]);

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

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    if (product.isWeightable) {
        setWeightProduct(product);
        setInputWeight('0');
        setWeightUnit('GR');
        return;
    }

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
  };

  const handleAddWeightedItem = () => {
      if (!weightProduct) return;
      const weightVal = parseFloat(inputWeight) || 0;
      const finalKg = weightUnit === 'GR' ? weightVal / 1000 : weightVal;
      
      if (finalKg <= 0) {
          toast({ variant: 'destructive', title: "Peso inválido" });
          return;
      }

      append({
          productId: String(weightProduct._id),
          name: weightProduct.name,
          price: weightProduct.price,
          quantity: finalKg,
          stock: weightProduct.stock,
          taxRate: weightProduct.taxRate,
          imageUrl: weightProduct.imageUrl,
          isWeightable: true
      });
      setWeightProduct(null);
  };

  const incrementQty = (index: number) => {
    const current = watchItems[index].quantity;
    const step = watchItems[index].isWeightable ? 0.1 : 1;
    update(index, { ...fields[index], quantity: Math.round((current + step) * 1000) / 1000 });
  };

  const decrementQty = (index: number) => {
    const current = watchItems[index].quantity;
    const step = watchItems[index].isWeightable ? 0.1 : 1;
    if (current > step) {
        update(index, { ...fields[index], quantity: Math.round((current - step) * 1000) / 1000 });
    }
  };

  const changeInfo = useMemo(() => {
    const received = parseFloat(watchAmountReceived) || 0;
    if (received <= targetAmount) return { amount: 0, currency: watchChangeCurrency };
    
    // Convertir lo recibido a VES para unificar el cálculo de base
    const receivedInVES = watchCurrency === 'USD' ? received * (rates.usd?.usd || 0) : 
                         watchCurrency === 'COP' ? (received / (rates.cop?.rate || 1)) * (rates.usd?.usd || 0) : 
                         received;
    
    const changeInVES = receivedInVES - totals.ves;
    
    // Convertir el vuelto de VES a la moneda de vuelto seleccionada
    let finalChange = 0;
    if (watchChangeCurrency === 'VES') {
        finalChange = changeInVES;
    } else if (watchChangeCurrency === 'USD') {
        finalChange = changeInVES / (rates.usd?.usd || 1);
    } else if (watchChangeCurrency === 'COP') {
        finalChange = (changeInVES / (rates.usd?.usd || 1)) * (rates.cop?.rate || 0);
    }

    return { amount: Math.max(0, finalChange), currency: watchChangeCurrency };
  }, [watchAmountReceived, watchCurrency, watchChangeCurrency, targetAmount, totals.ves, rates]);

  const handleFinalizeSale = async () => {
    if (watchItems.length === 0 || (storeConfig?.enforceCashControl && !cashSession) || isSubmitting) return;
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                amountReceived: parseFloat(watchAmountReceived) || 0,
                change: changeInfo.amount,
                storeId: localStorage.getItem('storeId')
            }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error en facturación");
        }
        const result = await response.json();
        toast({ title: "Factura Generada", description: "Venta guardada en sistema." });
        router.push(`/sales/${result._id}/invoice`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Fallo POS', description: e.message });
        setIsSubmitting(false);
    }
  };

  const isLocked = storeConfig?.enforceCashControl && !cashSession;

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-background">
       <main className="flex-1 p-2 md:p-4 overflow-y-auto lg:overflow-hidden flex flex-col gap-4">
            
            {isLocked && !loadingSession && (
                <Alert variant="destructive" className="border-4 shadow-xl animate-bounce">
                    <Lock className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase">Ventas Bloqueadas</AlertTitle>
                    <AlertDescription className="font-bold flex items-center justify-between">
                        Debes abrir un turno de caja para poder facturar.
                        <Button variant="outline" size="sm" asChild className="bg-white text-destructive font-black uppercase">
                            <Link href="/cash-control">Abrir Caja Ahora</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="rounded-full border bg-white"><Link href="/sales"><ChevronLeft className="h-5 w-5" /></Link></Button>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary">Terminal de Ventas</h2>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-[10px] font-black uppercase bg-green-50 text-green-600 border-green-200">
                                <Zap className="h-2.5 w-2.5 mr-1 fill-green-600" /> POS Online
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 lg:overflow-hidden pb-20 lg:pb-0">
                <div className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
                    <Card className='rounded-2xl border-2 shadow-sm'><CardContent className="p-2 md:p-3"><ProductSearch onProductSelect={handleProductSelect} /></CardContent></Card>
                    <Card className="rounded-2xl flex-1 lg:overflow-hidden flex flex-col border-2 shadow-sm overflow-hidden">
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="overflow-x-auto overflow-y-auto flex-1">
                                <Table>
                                    <TableHeader className='bg-muted/30 sticky top-0 z-10'>
                                        <TableRow>
                                            <TableHead className="pl-4 font-black uppercase text-[10px]">Item</TableHead>
                                            <TableHead className="text-center font-black uppercase text-[10px]">Cantidad</TableHead>
                                            <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                            <TableHead className="w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-primary/[0.02]">
                                                <TableCell className="pl-4 py-3">
                                                    <div className='flex items-center gap-3'>
                                                        <div className='h-8 w-8 rounded bg-muted relative overflow-hidden shrink-0 border hidden sm:block'>
                                                            {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="32px" unoptimized /> : <Package className='h-4 w-4 m-auto opacity-20' />}
                                                        </div>
                                                        <div className='flex flex-col'>
                                                            <span className='font-black uppercase text-[10px] md:text-[11px] leading-tight line-clamp-1'>{item.name}</span>
                                                            <span className='text-[8px] opacity-60 font-mono'>Bs. {item.price.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="icon" 
                                                                className="h-6 w-6 rounded-full border-2" 
                                                                onClick={() => decrementQty(index)}
                                                            >
                                                                <Minus className="h-3 w-3" />
                                                            </Button>
                                                            <span className="font-black text-xs md:text-sm w-12 text-center">
                                                                {watchItems[index]?.quantity}
                                                            </span>
                                                            <Button 
                                                                variant="outline" 
                                                                size="icon" 
                                                                className="h-6 w-6 rounded-full border-2" 
                                                                onClick={() => incrementQty(index)}
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-[7px] font-black uppercase text-muted-foreground">
                                                            {item.isWeightable ? 'Kilogramos' : 'Unidades'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 font-black text-primary text-[11px]">
                                                    {(item.price * item.quantity * (1 + item.taxRate)).toLocaleString('es-VE')}
                                                </TableCell>
                                                <TableCell className="pr-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => remove(index)}><X className="h-4 w-4" /></Button></TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className='h-48 text-center opacity-20 italic text-xs uppercase font-black'>Esperando Mercancía...</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-5 flex flex-col gap-4">
                    <Card className="rounded-2xl bg-primary text-primary-foreground border-none overflow-hidden shadow-xl">
                        <CardContent className="p-3 grid grid-cols-3 divide-x divide-white/10">
                            <div className="text-center"><span className="text-[8px] font-black uppercase opacity-60 block">USD</span><span className="text-base font-black">${totals.usd.toFixed(2)}</span></div>
                            <div className="text-center"><span className="text-[8px] font-black uppercase opacity-60 block">VES</span><span className="text-base font-black">Bs. {totals.ves.toLocaleString()}</span></div>
                            <div className="text-center"><span className="text-[8px] font-black uppercase opacity-60 block">COP</span><span className="text-base font-black">{totals.cop.toLocaleString()}</span></div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl flex-1 flex flex-col border-2 shadow-sm p-4 space-y-4">
                        {selectedCustomer ? (
                            <div className="p-3 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                        <UserCheck className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase opacity-50 tracking-widest">Titular Seleccionado</span>
                                        <span className="font-black text-[11px] uppercase text-primary leading-tight line-clamp-1">{selectedCustomer.name}</span>
                                        <span className="text-[9px] font-mono font-bold opacity-60">{selectedCustomer.idNumber}</span>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors" 
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        form.setValue('customerId', undefined);
                                        form.setValue('customerName', 'Cliente Contado');
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <CustomerSearch onCustomerSelect={(c) => { 
                                form.setValue('customerId', c._id); 
                                form.setValue('customerName', c.name); 
                                setSelectedCustomer(c); 
                            }} />
                        )}
                        
                        <div className="grid grid-cols-3 gap-2">
                            {['Pago Móvil', 'Tarjeta', 'Efectivo', 'Zelle', 'Binance', 'Biopago'].map(m => (
                                <button key={m} type="button" className={cn("h-12 rounded-xl text-[9px] font-black uppercase border-2 transition-all", watchMethod === m ? "bg-primary text-white border-primary shadow-lg" : "bg-muted/40 border-transparent hover:bg-muted/60")} onClick={() => form.setValue('paymentMethod', m)}>{m}</button>
                            ))}
                        </div>

                        <div className="space-y-4 bg-muted/20 p-4 rounded-xl border-2 border-dashed">
                             <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase opacity-40">Moneda de Pago</Label>
                                <div className="flex gap-2">
                                    {['USD', 'VES', 'COP'].map(curr => (
                                        <Button key={curr} type="button" variant={watchCurrency === curr ? 'default' : 'outline'} size="sm" className="flex-1 font-black" onClick={() => form.setValue('paymentCurrency', curr as any)}>{curr}</Button>
                                    ))}
                                </div>
                             </div>

                             <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase opacity-40">Monto Recibido ({watchCurrency})</Label>
                                <Input type="number" className="h-12 text-2xl font-black text-center" {...form.register('amountReceived')} />
                             </div>

                             <div className="space-y-2 pt-2 border-t border-dashed border-muted-foreground/20">
                                <div className="flex justify-between items-center">
                                    <Label className="text-[9px] font-black uppercase opacity-40">Devolver Vuelto en:</Label>
                                    <div className="flex gap-1">
                                        {['USD', 'VES', 'COP'].map(curr => (
                                            <Button 
                                                key={curr} 
                                                type="button" 
                                                variant={watchChangeCurrency === curr ? 'secondary' : 'ghost'} 
                                                size="xs" 
                                                className="h-6 px-2 text-[8px] font-black uppercase" 
                                                onClick={() => form.setValue('changeCurrency', curr as any)}
                                            >
                                                {curr}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className={cn("p-3 rounded-xl text-center border-2 transition-all", changeInfo.amount > 0 ? "bg-green-600 text-white border-green-700 shadow-lg scale-[1.02]" : "bg-muted opacity-40")}>
                                    <div className="flex items-center justify-center gap-2">
                                        <Coins className={cn("h-4 w-4", changeInfo.amount > 0 ? "animate-bounce" : "")} />
                                        <span className="text-[9px] font-black uppercase">Vuelto en {changeInfo.currency}</span>
                                    </div>
                                    <span className="text-xl font-black">
                                        {changeInfo.currency === 'USD' ? '$' : changeInfo.currency === 'VES' ? 'Bs.' : ''} {changeInfo.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {changeInfo.currency === 'COP' ? 'COP' : ''}
                                    </span>
                                </div>
                             </div>
                        </div>

                        <Button onClick={handleFinalizeSale} disabled={isSubmitting || watchItems.length === 0 || isLocked} className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-5 w-5" />}
                            FACTURAR (F4)
                        </Button>
                    </Card>
                </div>
            </div>
       </main>

       <Dialog open={!!weightProduct} onOpenChange={() => setWeightProduct(null)}>
           <DialogContent className='sm:max-w-[400px] border-4 border-primary'>
                <DialogHeader className='text-center'>
                    <div className='mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-2'><Scale className='h-8 w-8 text-primary'/></div>
                    <DialogTitle className='text-xl font-black uppercase italic'>{weightProduct?.name}</DialogTitle>
                </DialogHeader>
                <div className='py-6 space-y-6'>
                    <div className='flex gap-2 p-1 bg-muted rounded-xl border'>
                        <Button variant={weightUnit === 'GR' ? 'default' : 'ghost'} className='flex-1 font-black uppercase text-xs' onClick={() => setWeightUnit('GR')}>Gramos (Gr)</Button>
                        <Button variant={weightUnit === 'KG' ? 'default' : 'ghost'} className='flex-1 font-black uppercase text-xs' onClick={() => setWeightUnit('KG')}>Kilos (Kg)</Button>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase text-center block'>Cantidad a Vender</Label>
                        <Input type="number" value={inputWeight} onChange={e => setInputWeight(e.target.value)} className='h-20 text-5xl font-black text-center bg-primary/5 border-2 border-primary/20' autoFocus onKeyDown={e => e.key === 'Enter' && handleAddWeightedItem()} />
                    </div>
                    {weightProduct && (
                        <div className='bg-primary/5 p-4 rounded-xl border-2 border-primary/10 space-y-2'>
                             <div className='flex justify-between text-[10px] font-black uppercase opacity-60'><span>Subtotal Estimado:</span></div>
                             <div className='flex justify-between items-baseline'>
                                <span className='text-2xl font-black text-primary'>Bs. {((weightProduct.price * (weightUnit === 'GR' ? parseFloat(inputWeight)/1000 : parseFloat(inputWeight))) || 0).toLocaleString()}</span>
                                <span className='text-sm font-bold opacity-60'>REF: ${( ((weightProduct.price * (weightUnit === 'GR' ? parseFloat(inputWeight)/1000 : parseFloat(inputWeight))) || 0) / (rates.usd?.usd || 1)).toFixed(2)}</span>
                             </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" className='font-bold' onClick={() => setWeightProduct(null)}>CANCELAR</Button>
                    <Button className='font-black uppercase h-12 px-8' onClick={handleAddWeightedItem}>Añadir al Carrito</Button>
                </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  );
}
