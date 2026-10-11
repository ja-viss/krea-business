
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
    Trash2,
    User,
    Receipt,
    Calculator,
    Camera,
    ShieldCheck,
    Banknote,
    Smartphone,
    CreditCard,
    Coins,
    ArrowRightLeft,
    CheckCircle2,
    Wallet,
    DollarSign,
    RefreshCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const METHODS = [
    { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'Pago Móvil', label: 'P. Móvil', icon: Smartphone },
    { id: 'Tarjeta', label: 'Punto', icon: CreditCard },
    { id: 'Zelle', label: 'Zelle', icon: ShieldCheck },
    { id: 'Binance', label: 'Binance', icon: Coins },
    { id: 'Pesos', label: 'Pesos', icon: ArrowRightLeft },
];

const CURRENCIES = [
    { id: 'USD', label: 'Dólares ($)', symbol: '$' },
    { id: 'VES', label: 'Bolívares (Bs)', symbol: 'Bs' },
    { id: 'COP', label: 'Pesos (COP)', symbol: 'P.' },
];

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
  })).min(1, 'Añada al menos un producto'),
});

interface Payment {
    method: string;
    amount: number;
    currency: 'USD' | 'VES' | 'COP';
    amountReceived?: number;
    changeGiven?: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  
  const [isScannerActive, setIsScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentMethod, setCurrentMethod] = useState('Efectivo');
  const [currentCurrency, setCurrentCurrency] = useState<'USD' | 'VES' | 'COP'>('USD');
  const [amountReceived, setAmountReceived] = useState('');

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: { customerName: 'Consumidor Final', items: [] },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const tasaBCV = rates.usd?.usd || 52.40;
  const tasaCOPValue = rates.cop?.rate || 4200;

  const totals = useMemo(() => {
    let exento = 0, gravable = 0, iva = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) exento += sub;
        else { gravable += sub; iva += (sub * i.taxRate); }
    });
    const ves = exento + gravable + iva;
    return { ves, usd: ves / tasaBCV, cop: (ves / tasaBCV) * tasaCOPValue, exento, gravable, iva };
  }, [watchItems, tasaBCV, tasaCOPValue]);

  const paidVES = useMemo(() => {
    return payments.reduce((acc, p) => {
        if (p.currency === 'VES') return acc + p.amount;
        if (p.currency === 'USD') return acc + (p.amount * tasaBCV);
        if (p.currency === 'COP') return acc + ((p.amount / tasaCOPValue) * tasaBCV);
        return acc;
    }, 0);
  }, [payments, tasaBCV, tasaCOPValue]);

  const remainingVES = Math.max(0, totals.ves - paidVES);
  const remainingUSD = remainingVES / tasaBCV;
  const remainingCOP = (remainingVES / tasaBCV) * tasaCOPValue;

  const changeDue = useMemo(() => {
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received <= 0) return 0;
    
    let currentLimit = currentCurrency === 'USD' ? remainingUSD : currentCurrency === 'COP' ? remainingCOP : remainingVES;
    return Math.max(0, received - currentLimit);
  }, [amountReceived, currentCurrency, remainingVES, remainingUSD, remainingCOP]);

  useEffect(() => {
    const defaultVal = currentCurrency === 'USD' ? remainingUSD : currentCurrency === 'COP' ? remainingCOP : remainingVES;
    setAmountReceived(defaultVal > 0 ? defaultVal.toFixed(2) : '');
  }, [currentCurrency, remainingVES, remainingUSD, remainingCOP]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingIndex = watchItems.findIndex(item => item.productId === String(product._id));
    if (existingIndex > -1) {
      update(existingIndex, { ...watchItems[existingIndex], quantity: Number(watchItems[existingIndex].quantity) + quantity });
    } else {
      append({ productId: String(product._id), name: product.name, price: product.price, quantity, stock: product.stock, taxRate: product.taxRate, isWeightable: product.isWeightable });
    }
  };

  const handleAddPayment = () => {
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received <= 0) return;

    let targetLimit = currentCurrency === 'USD' ? remainingUSD : currentCurrency === 'COP' ? remainingCOP : remainingVES;
    const appliedAmount = Math.min(received, targetLimit);

    setPayments([...payments, {
        method: currentMethod,
        amount: appliedAmount,
        currency: currentCurrency,
        amountReceived: received,
        changeGiven: changeDue
    }]);
    setAmountReceived('');
  };

  const handleProcessSale = async () => {
    if (remainingVES > 0.1) {
        toast({ variant: 'destructive', title: "Saldo Pendiente", description: "Cobra el total antes de facturar." });
        return;
    }
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form.getValues(), payments, totalAmount: totals.ves, storeId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
       {/* AREA IZQUIERDA: PRODUCTOS */}
       <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 overflow-hidden border-r">
            
            <div className="flex gap-2 shrink-0">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 p-1 focus-within:border-primary transition-all">
                    <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                </div>
                <Button variant={isScannerActive ? "destructive" : "outline"} className="h-12 w-12 rounded-2xl border-2" onClick={() => setIsScannerActive(!isScannerActive)}>
                    <Camera className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-1 border-2 rounded-2xl overflow-hidden flex flex-col min-h-0 bg-white shadow-sm">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] pl-6">Descripción</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px]">Precio</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell className="py-3 pl-6">
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-xs truncate max-w-[200px]">{item.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400">SKU: {item.productId.slice(-6).toUpperCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-xs">Bs. {item.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); if (v > 1) update(index, { ...fields[index], quantity: v - 1 }); else remove(index); }} className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button>
                                            <span className="font-black text-xs w-8">{watchItems[index].quantity}</span>
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); update(index, { ...fields[index], quantity: v + 1 }); }} className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 font-black text-sm">{(item.price * watchItems[index].quantity).toLocaleString()} Bs.</TableCell>
                                </TableRow>
                            ))}
                            {fields.length === 0 && <TableRow><TableCell colSpan={4} className="h-60 text-center opacity-20"><Receipt className="h-16 w-16 mx-auto mb-2"/><p className="text-xs font-black uppercase">Terminal listo • Escanea productos</p></TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       {/* SIDEBAR DERECHO: PAGO Y CLIENTE */}
       <aside className="w-80 md:w-96 bg-slate-50/30 flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
            <div className="p-5 space-y-6 flex-1">
                <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> Ficha del Cliente
                    </Label>
                    {!selectedCustomer ? (
                        <div className="bg-white p-1 rounded-xl border-2 shadow-sm">
                            <CustomerSearch onCustomerSelect={(c) => { setSelectedCustomer(c); form.setValue('customerId', c._id); form.setValue('customerName', c.name); }} />
                        </div>
                    ) : (
                        <div className="p-3 bg-white rounded-2xl flex justify-between items-center border-2 animate-in zoom-in-95 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-800 truncate max-w-[200px]">{selectedCustomer.name}</span>
                                <span className="text-[9px] font-bold text-slate-400">{selectedCustomer.idNumber}</span>
                            </div>
                            <button onClick={() => { setSelectedCustomer(null); form.setValue('customerId', undefined); form.setValue('customerName', 'Consumidor Final'); }} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X className="h-4 w-4" /></button>
                        </div>
                    )}
                </div>

                <Separator />

                <div className="space-y-5">
                    {/* TARJETA MAESTRA DE VENTA */}
                    <div className={cn("p-5 rounded-3xl border-2 transition-all shadow-xl overflow-hidden relative", remainingVES > 0.1 ? "bg-primary border-primary text-white" : "bg-emerald-600 border-emerald-700 text-white")}>
                        <div className="absolute top-0 right-0 p-2 opacity-10"><Calculator className="h-20 w-20" /></div>
                        
                        <div className="relative z-10 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black uppercase opacity-60">Total de la Venta</span>
                                    <Badge className="text-[7px] bg-white/20 text-white border-none font-black uppercase">Tasa: {tasaBCV}</Badge>
                                </div>
                                <p className="text-3xl font-black tracking-tighter">Bs. {totals.ves.toLocaleString('es-VE')}</p>
                                <div className="flex gap-3 text-[10px] font-bold opacity-80 uppercase mt-1">
                                    <span>$ {totals.usd.toFixed(2)} USD</span>
                                    <span className="opacity-30">|</span>
                                    <span>{Math.ceil(totals.cop).toLocaleString()} COP</span>
                                </div>
                            </div>

                            <Separator className="bg-white/20" />

                            <div>
                                <p className="text-[10px] font-black uppercase opacity-60">Saldo Pendiente</p>
                                <p className="text-2xl font-black tracking-tighter">Bs. {remainingVES.toLocaleString('es-VE')}</p>
                                {remainingVES <= 0.1 && (
                                    <div className="flex items-center gap-2 mt-1 text-[10px] font-black uppercase">
                                        <CheckCircle2 className="h-4 w-4" /> Pago Completado
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-white p-5 rounded-[2rem] border-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase opacity-50 ml-1">Vía de Pago</Label>
                                <Select value={currentMethod} onValueChange={setCurrentMethod}>
                                    <SelectTrigger className="h-10 font-black text-[10px] rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {METHODS.map(m => <SelectItem key={m.id} value={m.id} className="font-bold text-[10px] uppercase">{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase opacity-50 ml-1">Moneda</Label>
                                <Select value={currentCurrency} onValueChange={(v:any) => setCurrentCurrency(v)}>
                                    <SelectTrigger className="h-10 font-black text-[10px] rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-[10px] uppercase">{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-primary ml-1">Efectivo Recibido</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">{CURRENCIES.find(c => c.id === currentCurrency)?.symbol}</span>
                                <Input type="number" step="0.01" className="h-14 pl-10 text-xl font-black border-2 rounded-2xl focus:ring-4 focus:ring-primary/5" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} onFocus={(e) => e.target.select()} />
                            </div>
                        </div>

                        {changeDue > 0 && (
                            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex justify-between items-center animate-in zoom-in-95">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase text-emerald-600">Cambio (Vuelto)</span>
                                    <span className="text-2xl font-black text-emerald-700">{CURRENCIES.find(c => c.id === currentCurrency)?.symbol} {changeDue.toLocaleString()}</span>
                                </div>
                                <RefreshCcw className="h-6 w-6 text-emerald-500 opacity-20" />
                            </div>
                        )}

                        <Button className="w-full h-12 font-black uppercase text-[10px] rounded-xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg" onClick={handleAddPayment} disabled={!amountReceived || parseFloat(amountReceived) <= 0}>
                            <Plus className="h-3 w-3 mr-2" /> Agregar Abono
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm animate-in slide-in-from-right-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary"><CheckCircle2 className="h-4 w-4" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase opacity-40 leading-none">{p.method}</span>
                                        <span className="text-[11px] font-black">{p.currency === 'USD' ? '$' : p.currency === 'VES' ? 'Bs' : 'P.'} {p.amount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-5 bg-white border-t space-y-4">
                <Button 
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg shadow-2xl transition-all active:scale-95 disabled:opacity-50" 
                    onClick={handleProcessSale} 
                    disabled={watchItems.length === 0 || remainingVES > 0.1 || isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <ShieldCheck className="mr-3 h-8 w-8" />}
                    Emitir Ticket
                </Button>
                <button onClick={() => setIsClearDialogOpen(true)} className="w-full text-[9px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors tracking-widest">Anular Proceso</button>
            </div>
       </aside>

       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-[2.5rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase italic text-red-600 flex items-center gap-2"><Trash2 className="h-6 w-6" /> ¿Vaciar todo el terminal?</AlertDialogTitle>
                    <AlertDialogDescription className="font-bold">Se perderán todos los artículos y abonos cargados hasta el momento.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel className="font-bold uppercase text-[10px] rounded-2xl h-12 flex-1 border-2">Cerrar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Consumidor Final' }); setPayments([]); }} className="bg-red-600 font-black uppercase text-[10px] rounded-2xl h-12 flex-1">Vaciar Terminal</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
