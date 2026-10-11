
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
    Fingerprint,
    Hash,
    CheckCircle2
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
    { id: 'Pago Móvil', label: 'Pago Móvil', icon: Smartphone },
    { id: 'Tarjeta', label: 'Punto', icon: CreditCard },
    { id: 'Zelle', label: 'Zelle', icon: ShieldCheck },
    { id: 'Binance', label: 'Binance', icon: Coins },
    { id: 'Pesos', label: 'Pesos COP', icon: ArrowRightLeft },
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
    reference?: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  
  // Scanner state
  const [isScannerActive, setIsScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Payment State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentMethod, setCurrentMethod] = useState('Efectivo');
  const [currentCurrency, setCurrentCurrency] = useState<'USD' | 'VES' | 'COP'>('USD');
  const [amountInput, setAmountInput] = useState('');

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Consumidor Final',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const tasaBCV = rates.usd?.usd || 52.40;
  const tasaCOPValue = rates.cop?.rate || 4200;

  useEffect(() => {
    if (isScannerActive) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
      codeReader.current = new BrowserMultiFormatReader(hints);
      codeReader.current.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) handleBarcodeScanned(result.getText());
      });
    } else {
      codeReader.current?.reset();
    }
    return () => codeReader.current?.reset();
  }, [isScannerActive]);

  const handleBarcodeScanned = async (code: string) => {
    try {
      const storeId = localStorage.getItem('storeId');
      const res = await fetch(`/api/products/lookup?storeId=${storeId}&code=${code}`);
      if (res.ok) {
        const product = await res.json();
        handleProductSelect(product);
      }
    } catch (e) {}
  };

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

  useEffect(() => {
    if (currentCurrency === 'USD') setAmountInput(remainingUSD.toFixed(2));
    else if (currentCurrency === 'COP') setAmountInput(Math.ceil(remainingCOP).toString());
    else setAmountInput(remainingVES.toFixed(2));
  }, [currentCurrency, remainingVES, remainingUSD, remainingCOP]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingIndex = watchItems.findIndex(item => item.productId === String(product._id));
    if (existingIndex > -1) {
      update(existingIndex, { ...watchItems[existingIndex], quantity: Number(watchItems[existingIndex].quantity) + quantity });
    } else {
      append({ productId: String(product._id), name: product.name, price: product.price, quantity, stock: product.stock, taxRate: product.taxRate, isWeightable: product.isWeightable });
    }
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleAddPayment = () => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) return;

    setPayments([...payments, {
        method: currentMethod,
        amount: amount,
        currency: currentCurrency
    }]);
    setAmountInput('');
  };

  const handleProcessSale = async () => {
    if (remainingVES > 0.1) {
        toast({ variant: 'destructive', title: "Cuenta Incompleta", description: "Aún hay saldo pendiente por cobrar." });
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
        if (!response.ok) throw new Error(result.message || "Error al procesar la venta");
        toast({ title: 'Venta Procesada Exitosamente' });
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
       <div className="flex-1 flex flex-col p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden">
            {/* CABECERA MULTIMONEDA */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 shrink-0">
                <div className="p-3 md:p-4 bg-slate-50 border-2 rounded-2xl flex flex-col">
                    <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Total Dólares</span>
                    <span className="text-xl md:text-2xl font-black text-slate-900">$ {totals.usd.toFixed(2)}</span>
                </div>
                <div className="p-3 md:p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-primary">Total Bolívares</span>
                        <Badge className="text-[7px] md:text-[8px] h-4 bg-primary/20 text-primary border-none">BCV: {tasaBCV}</Badge>
                    </div>
                    <span className="text-xl md:text-2xl font-black text-primary relative z-10">Bs. {totals.ves.toLocaleString('es-VE')}</span>
                </div>
                <div className="p-3 md:p-4 bg-slate-50 border-2 rounded-2xl flex flex-col">
                    <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Total Pesos</span>
                    <span className="text-xl md:text-2xl font-black text-slate-900">$ {totals.cop.toLocaleString('es-CO')}</span>
                </div>
            </div>

            <div className="flex gap-2 md:gap-3 shrink-0">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 p-1 focus-within:border-primary transition-all">
                    <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                </div>
                <Button variant={isScannerActive ? "destructive" : "outline"} className="h-12 w-12 md:h-14 md:w-14 rounded-2xl border-2" onClick={() => setIsScannerActive(!isScannerActive)}>
                    {isScannerActive ? <X className="h-5 w-5 md:h-6 md:w-6" /> : <Camera className="h-5 w-5 md:h-6 md:w-6" />}
                </Button>
            </div>

            {isScannerActive && (
                <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border-4 border-primary">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-0.5 bg-primary/50 animate-pulse" /></div>
                </div>
            )}

            <div className="flex-1 border-2 rounded-2xl overflow-hidden flex flex-col min-h-0 bg-white">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[8px] md:text-[10px] pl-4 md:pl-8">Producto</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] md:text-[10px]">Precio (Bs)</TableHead>
                                <TableHead className="text-center font-black uppercase text-[8px] md:text-[10px]">Cant.</TableHead>
                                <TableHead className="text-right font-black uppercase text-[8px] md:text-[10px] pr-4 md:pr-8">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell className="py-2 md:py-4 pl-4 md:pl-8">
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-[10px] md:text-xs truncate max-w-[120px] md:max-w-none">{item.name}</span>
                                            <span className="text-[7px] md:text-[9px] font-bold text-slate-400">SKU: {item.productId.slice(-6)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-2 md:py-4 font-bold text-[10px] md:text-xs">Bs. {item.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-center py-2 md:py-4">
                                        <div className="flex items-center justify-center gap-1 md:gap-2">
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); if (v > 1) update(index, { ...fields[index], quantity: v - 1 }); else remove(index); }} className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button>
                                            <span className="font-black text-[10px] md:text-xs w-6 md:w-8">{watchItems[index].quantity}</span>
                                            <button onClick={() => { const v = Number(watchItems[index].quantity); update(index, { ...fields[index], quantity: v + 1 }); }} className="h-6 w-6 md:h-7 md:w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4 md:pr-8 font-black text-[10px] md:text-sm">{(item.price * watchItems[index].quantity).toLocaleString()} Bs.</TableCell>
                                </TableRow>
                            ))}
                            {fields.length === 0 && <TableRow><TableCell colSpan={4} className="h-40 md:h-60 text-center opacity-20"><Receipt className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2"/><p className="text-[8px] md:text-[10px] font-black uppercase">Esperando artículos...</p></TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       <aside className="w-72 md:w-96 bg-slate-50/50 border-l-2 flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1">
                {/* SECCIÓN CLIENTE */}
                <div className="space-y-3">
                    <Label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> Identificación Cliente
                    </Label>
                    <div className="bg-white p-1 rounded-xl border-2">
                        <CustomerSearch onCustomerSelect={(c) => { setSelectedCustomer(c); form.setValue('customerId', c._id); form.setValue('customerName', c.name); }} />
                    </div>
                    {selectedCustomer && (
                        <div className="p-2 bg-primary/10 rounded-lg flex justify-between items-center border border-primary/20 animate-in zoom-in-95">
                            <span className="text-[10px] font-black uppercase text-primary truncate max-w-[150px]">{selectedCustomer.name}</span>
                            <button onClick={() => setSelectedCustomer(null)}><X className="h-3 w-3 text-primary" /></button>
                        </div>
                    )}
                </div>

                <Separator />

                {/* SECCIÓN PAGOS (SPLIT PAYMENT) */}
                <div className="space-y-4">
                    <Label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Calculator className="h-3 w-3" /> Liquidación Multidivisa
                    </Label>

                    {/* SALDO PENDIENTE */}
                    <div className={cn("p-4 rounded-2xl border-2 transition-all shadow-lg overflow-hidden relative", remainingVES > 0 ? "bg-primary border-primary text-white" : "bg-emerald-500 border-emerald-600 text-white")}>
                        <div className="absolute top-0 right-0 p-2 opacity-10"><ShieldCheck className="h-16 w-16" /></div>
                        <p className="text-[9px] font-black uppercase opacity-60 relative z-10">Saldo por Cobrar</p>
                        <p className="text-3xl font-black tracking-tighter relative z-10">Bs. {remainingVES.toLocaleString('es-VE')}</p>
                        <div className="flex gap-2 text-[9px] font-bold opacity-80 uppercase relative z-10 mt-1">
                            <span>$ {remainingUSD.toFixed(2)}</span>
                            <span>|</span>
                            <span>{Math.ceil(remainingCOP).toLocaleString()} COP</span>
                        </div>
                    </div>

                    {/* MÉTODOS DE PAGO RAPIDOS */}
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map(m => (
                            <button 
                                key={m.id}
                                onClick={() => {
                                    setCurrentMethod(m.id);
                                    if (['Zelle', 'Binance'].includes(m.id)) setCurrentCurrency('USD');
                                    else if (m.id === 'Pesos') setCurrentCurrency('COP');
                                    else setCurrentCurrency('VES');
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1",
                                    currentMethod === m.id ? "bg-primary/10 border-primary text-primary" : "bg-white border-transparent hover:bg-slate-100"
                                )}
                            >
                                <m.icon className="h-4 w-4" />
                                <span className="text-[7px] md:text-[8px] font-black uppercase leading-none">{m.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* INPUT DE ABONO */}
                    <div className="bg-white p-3 rounded-2xl border-2 border-dashed space-y-3">
                        <div className="flex gap-2">
                            <Select value={currentCurrency} onValueChange={(v:any) => setCurrentCurrency(v)}>
                                <SelectTrigger className="w-20 h-10 font-black text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD" className="font-bold text-[10px]">$</SelectItem>
                                    <SelectItem value="VES" className="font-bold text-[10px]">Bs</SelectItem>
                                    <SelectItem value="COP" className="font-bold text-[10px]">COP</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input 
                                type="number" 
                                className="h-10 text-right font-black text-sm border-2" 
                                value={amountInput}
                                onChange={e => setAmountInput(e.target.value)}
                            />
                        </div>
                        <Button className="w-full h-10 font-black uppercase text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white" onClick={handleAddPayment}>
                            <Plus className="h-3 w-3 mr-2" /> Agregar Abono
                        </Button>
                    </div>

                    {/* LISTA DE PAGOS AGREGADOS */}
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-white rounded-lg border shadow-sm animate-in slide-in-from-right-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded bg-primary/5 flex items-center justify-center text-primary"><CheckCircle2 className="h-3.5 w-3.5" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase opacity-40 leading-none">{p.method}</span>
                                        <span className="text-[10px] font-black">{p.currency === 'USD' ? '$' : ''} {p.amount.toLocaleString()} {p.currency}</span>
                                    </div>
                                </div>
                                <button onClick={() => setPayments(payments.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* TOTALES FINALES */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[8px] md:text-[9px] font-bold text-slate-400 uppercase"><span>IVA (16%):</span><span>Bs. {totals.iva.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[8px] md:text-[9px] font-bold text-slate-400 uppercase"><span>Exento:</span><span>Bs. {totals.exento.toLocaleString()}</span></div>
                </div>
            </div>

            {/* BOTÓN FINAL */}
            <div className="p-4 md:p-6 bg-white border-t space-y-3">
                <Button 
                    className="w-full h-14 md:h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-base md:text-lg shadow-xl" 
                    onClick={handleProcessSale} 
                    disabled={watchItems.length === 0 || remainingVES > 0.1 || isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <ShieldCheck className="mr-3 h-6 w-6" />}
                    Finalizar Despacho
                </Button>
                <button onClick={() => setIsClearDialogOpen(true)} className="w-full text-[8px] md:text-[10px] font-black uppercase text-red-500 hover:underline opacity-40">Vaciar Orden</button>
            </div>
       </aside>

       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-3xl">
                <AlertDialogHeader><AlertDialogTitle className="text-xl font-black uppercase italic text-red-600">¿Anular proceso de venta?</AlertDialogTitle><AlertDialogDescription className="font-bold">Se eliminarán todos los artículos y pagos registrados en esta sesión.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2"><AlertDialogCancel className="font-bold uppercase text-[10px] rounded-xl h-11 flex-1 border-2">Volver</AlertDialogCancel><AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Consumidor Final' }); setPayments([]); }} className="bg-red-600 font-black uppercase text-[10px] rounded-xl h-11 flex-1">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
