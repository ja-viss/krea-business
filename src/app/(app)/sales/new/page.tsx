'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    RefreshCcw,
    ScanLine,
    Package
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
import { BarcodeScanner } from '@/components/inventory/barcode-scanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const METHODS = [
    { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'Pago Móvil', label: 'Pago Móvil', icon: Smartphone },
    { id: 'Tarjeta', label: 'Punto POS', icon: CreditCard },
    { id: 'Zelle', label: 'Zelle', icon: ShieldCheck },
    { id: 'Binance', label: 'Binance', icon: Coins },
    { id: 'Pesos', label: 'Pesos COP', icon: ArrowRightLeft },
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
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Estados de Pago
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
  const tasaBCV = rates.usd?.usd || 52.50;
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
  }, [currentCurrency, remainingVES, remainingUSD, remainingCOP, totals.ves]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingIndex = watchItems.findIndex(item => item.productId === String(product._id));
    if (existingIndex > -1) {
      update(existingIndex, { ...watchItems[existingIndex], quantity: Number(watchItems[existingIndex].quantity) + quantity });
    } else {
      append({ productId: String(product._id), name: product.name, price: product.price, quantity, stock: product.stock, taxRate: product.taxRate });
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

  // Manejo de tecla ESC para cerrar escáner
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isScannerActive) setIsScannerActive(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isScannerActive]);

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

            {isScannerActive && (
                <div className="shrink-0 animate-in fade-in zoom-in-95">
                    <BarcodeScanner onScan={(code) => {
                        toast({ title: "Producto escaneado" });
                        // El ProductSearch ya tiene lógica de búsqueda por código si se implementó
                    }} onClose={() => setIsScannerActive(false)} />
                </div>
            )}

            <div className="flex-1 border-2 rounded-2xl overflow-hidden flex flex-col min-h-0 bg-white shadow-sm">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] pl-6 py-4">Descripción del Item</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px]">Precio Unit.</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] pr-6">Subtotal (Bs)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-xs truncate max-w-[300px]">{item.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">SKU: {item.productId.slice(-8).toUpperCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs">Bs. {item.price.toLocaleString()}</span>
                                            <span className="text-[9px] text-muted-foreground">$ {(item.price / tasaBCV).toFixed(2)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); if (v > 1) update(index, { ...fields[index], quantity: v - 1 }); else remove(index); }} className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button>
                                            <span className="font-black text-sm w-10 text-center">{watchItems[index].quantity}</span>
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); update(index, { ...fields[index], quantity: v + 1 }); }} className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-sm text-slate-900">{(item.price * watchItems[index].quantity).toLocaleString()} Bs.</span>
                                            <span className="text-[9px] font-bold text-emerald-600">$ {((item.price * watchItems[index].quantity) / tasaBCV).toFixed(2)}</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {fields.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-80 text-center opacity-20">
                                        <Receipt className="h-20 w-20 mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">Esperando artículos...</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       {/* SIDEBAR DERECHO: LIQUIDACIÓN */}
       <aside className="w-80 md:w-96 bg-slate-50/50 flex flex-col shrink-0 overflow-y-auto scrollbar-hide border-l">
            <div className="p-5 space-y-6 flex-1">
                {/* FICHA DE CLIENTE */}
                <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> Ficha del Receptor
                    </Label>
                    {!selectedCustomer ? (
                        <div className="bg-white p-1 rounded-xl border-2 shadow-sm">
                            <CustomerSearch onCustomerSelect={(c) => { setSelectedCustomer(c); form.setValue('customerId', c._id); form.setValue('customerName', c.name); }} />
                        </div>
                    ) : (
                        <div className="p-4 bg-white rounded-2xl flex justify-between items-center border-2 border-primary/20 animate-in zoom-in-95 shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-800 truncate max-w-[200px]">{selectedCustomer.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 font-mono">{selectedCustomer.idNumber}</span>
                            </div>
                            <button onClick={() => { setSelectedCustomer(null); form.setValue('customerId', undefined); form.setValue('customerName', 'Consumidor Final'); }} className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"><X className="h-4 w-4" /></button>
                        </div>
                    )}
                </div>

                <Separator />

                {/* TARJETA DE TOTALES MULTIMONEDA */}
                <div className={cn("p-6 rounded-[2.5rem] border-2 transition-all shadow-2xl overflow-hidden relative", remainingVES > 0.1 ? "bg-primary border-primary text-white" : "bg-emerald-600 border-emerald-700 text-white")}>
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Calculator className="h-24 w-24" /></div>
                    
                    <div className="relative z-10 space-y-5">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase opacity-60">Total a Liquidar</span>
                                <Badge className="text-[8px] bg-white/20 text-white border-none font-black uppercase">Tasa BCV: {tasaBCV}</Badge>
                            </div>
                            <p className="text-4xl font-black tracking-tighter leading-none">Bs. {totals.ves.toLocaleString('es-VE')}</p>
                            <div className="flex gap-4 text-[11px] font-bold opacity-80 uppercase mt-2">
                                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {totals.usd.toFixed(2)}</span>
                                <span className="opacity-30">|</span>
                                <span className="flex items-center gap-1"><RefreshCcw className="h-3 w-3" /> {Math.ceil(totals.cop).toLocaleString()} COP</span>
                            </div>
                        </div>

                        <Separator className="bg-white/20" />

                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <p className="text-[10px] font-black uppercase opacity-60">Saldo Pendiente</p>
                                {remainingVES <= 0.1 && <Badge className="bg-white text-emerald-600 font-black text-[9px] uppercase px-3 py-1">PAGADO</Badge>}
                            </div>
                            <p className={cn("text-3xl font-black tracking-tighter", remainingVES <= 0.1 && "opacity-40")}>Bs. {remainingVES.toLocaleString('es-VE')}</p>
                        </div>
                    </div>
                </div>

                {/* CONSOLA DE ABONO */}
                <div className="space-y-4 bg-white p-6 rounded-[2.5rem] border-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase opacity-50 ml-1">Vía de Pago</Label>
                            <Select value={currentMethod} onValueChange={setCurrentMethod}>
                                <SelectTrigger className="h-11 font-black text-[10px] rounded-xl border-2"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-2 shadow-2xl">
                                    {METHODS.map(m => (
                                        <SelectItem key={m.id} value={m.id} className="font-bold text-[10px] uppercase py-3">
                                            <div className="flex items-center gap-2"><m.icon className="h-3.5 w-3.5 text-primary" /> {m.label}</div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase opacity-50 ml-1">Moneda</Label>
                            <Select value={currentCurrency} onValueChange={(v:any) => setCurrentCurrency(v)}>
                                <SelectTrigger className="h-11 font-black text-[10px] rounded-xl border-2"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl border-2 shadow-2xl">
                                    {CURRENCIES.map(c => <SelectItem key={c.id} value={c.id} className="font-bold text-[10px] uppercase py-3">{c.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-primary ml-1">Monto Recibido ({CURRENCIES.find(c => c.id === currentCurrency)?.symbol})</Label>
                        <Input 
                            type="number" 
                            step="0.01" 
                            className="h-14 text-2xl font-black border-2 rounded-2xl focus:ring-4 focus:ring-primary/5 text-center shadow-inner" 
                            value={amountReceived} 
                            onChange={e => setAmountReceived(e.target.value)} 
                            onFocus={(e) => e.target.select()} 
                        />
                    </div>

                    {changeDue > 0 && (
                        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-3xl flex justify-between items-center animate-in zoom-in-95 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Vuelto / Cambio</span>
                                <span className="text-2xl font-black text-emerald-700 font-mono">{CURRENCIES.find(c => c.id === currentCurrency)?.symbol} {changeDue.toLocaleString()}</span>
                            </div>
                            <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><Banknote className="h-5 w-5" /></div>
                        </div>
                    )}

                    <Button className="w-full h-14 font-black uppercase text-[11px] rounded-2xl bg-slate-900 text-white hover:bg-black transition-all shadow-xl hover:scale-[1.01] active:scale-95" onClick={handleAddPayment} disabled={!amountReceived || parseFloat(amountReceived) <= 0}>
                        <Plus className="h-4 w-4 mr-2" /> Registrar Abono
                    </Button>
                </div>

                {/* LISTA DE ABONOS CARGADOS */}
                <div className="space-y-3 pb-6">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Desglose de Liquidación</Label>
                    {payments.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl opacity-20 text-center bg-white/50">
                            <Package className="h-10 w-10 mb-2" />
                            <p className="text-[10px] font-black uppercase">Sin abonos registrados</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {payments.map((p, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm animate-in slide-in-from-right-2 hover:border-primary/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10"><CheckCircle2 className="h-5 w-5" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase opacity-40 leading-none mb-1">{p.method}</span>
                                            <span className="text-sm font-black text-slate-900">{p.currency === 'USD' ? '$' : p.currency === 'VES' ? 'Bs.' : 'P.'} {p.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="h-9 w-9 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÓN FINAL DE PROCESAMIENTO */}
            <div className="p-6 bg-white border-t-2 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
                <Button 
                    className="w-full h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black uppercase text-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 hover:scale-[1.02]" 
                    onClick={handleProcessSale} 
                    disabled={watchItems.length === 0 || remainingVES > 0.1 || isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-3 h-7 w-7" /> : <ShieldCheck className="mr-3 h-9 w-9" />}
                    Emitir Despacho
                </Button>
                <div className="mt-4 flex justify-center">
                    <button onClick={() => router.push('/sales')} className="text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors tracking-[0.2em] italic">Anular Operación POS</button>
                </div>
            </div>
       </aside>
    </div>
  );
}
