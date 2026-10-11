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
    Printer,
    Search,
    Trash2,
    User,
    AlertTriangle,
    Receipt,
    Calculator,
    ChevronDown,
    Coins,
    Banknote,
    TrendingUp,
    ArrowRightLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card } from '@/components/ui/card';

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

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { rates } = useExchangeRates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  
  // Estados de pago integrados
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'VES' | 'COP'>('USD');
  const [receivedAmount, setReceivedAmount] = useState<string>('0');

  const searchRef = useRef<HTMLInputElement>(null);

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

  // Cálculos de Totales
  const totals = useMemo(() => {
    let subtotalExento = 0;
    let subtotalGravable = 0;
    let totalIVA = 0;

    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) {
            subtotalExento += sub;
        } else {
            subtotalGravable += sub;
            totalIVA += (sub * i.taxRate);
        }
    });

    const totalVES = subtotalExento + subtotalGravable + totalIVA;
    const totalUSD = tasaBCV > 0 ? totalVES / tasaBCV : 0;
    const totalCOP = totalUSD * tasaCOPValue;

    return { 
        ves: totalVES, 
        usd: totalUSD, 
        cop: totalCOP,
        exento: subtotalExento, 
        gravable: subtotalGravable, 
        iva: totalIVA 
    };
  }, [watchItems, tasaBCV, tasaCOPValue]);

  // Cálculo de Vuelto
  const changeToGive = useMemo(() => {
    const received = parseFloat(receivedAmount) || 0;
    if (received === 0) return 0;

    if (paymentCurrency === 'USD') {
        return Math.max(0, received - totals.usd);
    } else if (paymentCurrency === 'COP') {
        return Math.max(0, received - totals.cop);
    } else {
        return Math.max(0, received - totals.ves);
    }
  }, [receivedAmount, paymentCurrency, totals]);

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingIndex = watchItems.findIndex(item => item.productId === String(product._id));
    
    if (existingIndex > -1) {
      const currentItem = watchItems[existingIndex];
      update(existingIndex, {
        ...currentItem,
        quantity: Number(currentItem.quantity) + quantity
      });
    } else {
        append({
            productId: String(product._id),
            name: product.name,
            price: product.price, 
            quantity,
            stock: product.stock,
            taxRate: product.taxRate,
            isWeightable: product.isWeightable
        });
    }
    
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleEmitTicket = async () => {
    if (watchItems.length === 0) {
        toast({ variant: 'destructive', title: 'Orden Vacía', description: 'Debe añadir al menos un producto.' });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        
        // Estructura de pagos detallada
        const paymentData = [{
            method: paymentMethod,
            amount: totals.ves,
            currency: 'VES', // Siempre guardamos el monto base en VES para reporte fiscal
            reference: '',
            bank: ''
        }];

        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                payments: paymentData,
                totalAmount: totals.ves,
                storeId 
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || "Error al procesar la venta");
        }

        toast({ title: 'Venta Exitosa', description: 'Generando comprobante...' });
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#fcfcfc] overflow-hidden">
       
       {/* SECCIÓN IZQUIERDA: LISTADO DE PRODUCTOS */}
       <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden space-y-6">
            
            {/* MONITOR DE TOTALES MULTIMONEDA SUPERIOR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <Card className="p-4 border-2 shadow-sm bg-white border-primary/40 relative overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-2">Total Dólares (USD)</p>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-black tracking-tighter text-primary">$ {totals.usd.toFixed(2)}</span>
                        <div className="p-2 bg-primary/5 rounded-lg">
                            <Banknote className="h-5 w-5 text-primary opacity-30" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-2 shadow-sm bg-white border-amber-400 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Total Bolívares (VES)</p>
                        <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-700 bg-amber-50">TASA: {tasaBCV.toFixed(2)}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-3xl font-black tracking-tighter text-slate-900">Bs. {totals.ves.toLocaleString('es-VE')}</span>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Coins className="h-5 w-5 text-amber-500 opacity-30" />
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-2 shadow-sm bg-white border-emerald-400 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Total Pesos (COP)</p>
                        <Badge variant="outline" className="text-[8px] font-black border-emerald-100 text-emerald-700 bg-emerald-50">REF: {tasaCOPValue.toLocaleString()}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black tracking-tighter text-slate-900">$ {totals.cop.toLocaleString('es-CO')}</span>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ArrowRightLeft className="h-5 w-5 text-emerald-500 opacity-30" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* BUSCADOR MAESTRO */}
            <div className="bg-white rounded-2xl shadow-md border-2 p-1.5 shrink-0 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
            </div>

            {/* TABLA DE ARTÍCULOS */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black uppercase text-[10px] h-12 tracking-widest text-slate-500 pl-8">Producto / Descripción</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500">Precio Unitario</TableHead>
                                <TableHead className="text-center font-black uppercase text-[10px] h-12 tracking-widest text-slate-500">Cantidad</TableHead>
                                <TableHead className="text-right font-black uppercase text-[10px] h-12 tracking-widest text-slate-500 pr-8">Subtotal Línea</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {watchItems.length > 0 ? fields.map((item, index) => (
                                <TableRow key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex flex-col">
                                            <span className="font-black uppercase text-xs text-slate-800 tracking-tight">{item.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SKU: {item.productId.slice(-8).toUpperCase()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-600">Bs. {item.price.toLocaleString('es-VE')}</span>
                                            <span className="text-[9px] font-black text-emerald-600">$ {(item.price / tasaBCV).toFixed(2)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <button 
                                                onClick={() => {
                                                    const val = Number(watchItems[index].quantity);
                                                    if (val > 1) update(index, { ...fields[index], quantity: val - 1 });
                                                    else remove(index);
                                                }} 
                                                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                                <Minus className="h-3 w-3"/>
                                            </button>
                                            <span className="font-black text-sm w-10 text-center text-primary">{watchItems[index].quantity}</span>
                                            <button 
                                                onClick={() => {
                                                    const val = Number(watchItems[index].quantity);
                                                    update(index, { ...fields[index], quantity: val + 1 });
                                                }} 
                                                className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                                <Plus className="h-3 w-3"/>
                                            </button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-4">
                                        <div className="flex items-center justify-end gap-4">
                                            <div className="text-right">
                                                <p className="font-black text-sm text-slate-900">{(item.price * watchItems[index].quantity).toLocaleString('es-VE')}</p>
                                                <p className="text-[9px] font-bold text-primary opacity-60 uppercase">Bs.</p>
                                            </div>
                                            <button onClick={() => remove(index)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-80 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <Receipt className="h-14 w-14 text-slate-300" />
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Esperando lectura de artículos...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       {/* SECCIÓN DERECHA: PANEL DE PAGO INTEGRADO */}
       <aside className="w-full max-w-[340px] bg-white border-l-2 shadow-2xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-hide bg-slate-50/30">
                
                {/* GESTIÓN DE CLIENTE */}
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <User className="h-3 w-3" /> Receptor del Despacho
                    </Label>
                    <div className="bg-white p-1 rounded-xl border-2">
                        <CustomerSearch onCustomerSelect={(c) => { setSelectedCustomer(c); form.setValue('customerId', c._id); form.setValue('customerName', c.name); }} />
                    </div>
                </div>

                <Separator />

                {/* FORMA DE PAGO */}
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Calculator className="h-3 w-3" /> Forma de Pago
                    </Label>
                    <Select 
                        value={paymentMethod} 
                        onValueChange={(val) => {
                            setPaymentMethod(val);
                            if (['Zelle', 'Binance'].includes(val)) setPaymentCurrency('USD');
                            else if (['Pesos Cash'].includes(val)) setPaymentCurrency('COP');
                            else setPaymentCurrency('VES');
                        }}
                    >
                        <SelectTrigger className="h-11 font-bold text-xs border-2 rounded-xl bg-white shadow-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                            <SelectItem value="Efectivo" className="font-bold">Efectivo Cash (Divisa)</SelectItem>
                            <SelectItem value="Efectivo VES" className="font-bold">Efectivo Bolívares</SelectItem>
                            <SelectItem value="Pago Móvil" className="font-bold">Pago Móvil (S7B)</SelectItem>
                            <SelectItem value="Zelle" className="font-bold">Zelle (USD)</SelectItem>
                            <SelectItem value="Tarjeta" className="font-bold">Tarjeta (Punto)</SelectItem>
                            <SelectItem value="Pesos Cash" className="font-bold">Pesos Colombianos (COP)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* CALCULADORA DE CAMBIO / VUELTO */}
                <div className="p-5 bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-4 shadow-inner">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Recibido en</Label>
                            <Select value={paymentCurrency} onValueChange={(v: any) => setPaymentCurrency(v)}>
                                <SelectTrigger className="h-10 font-black text-xs bg-slate-50 border-2 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2">
                                    <SelectItem value="USD" className="font-black text-[10px]">Dólares ($)</SelectItem>
                                    <SelectItem value="VES" className="font-black text-[10px]">Bolívares (Bs)</SelectItem>
                                    <SelectItem value="COP" className="font-black text-[10px]">Pesos (COP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Monto Pago</Label>
                            <Input 
                                type="number" 
                                className="h-10 font-black text-center text-lg border-2 rounded-xl focus:ring-4 focus:ring-primary/5"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(e.target.value)}
                                onFocus={e => e.target.select()}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cambio / Vuelto:</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-black text-emerald-500 tracking-tighter">
                                {changeToGive.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-black text-emerald-500/60 uppercase">{paymentCurrency}</span>
                        </div>
                    </div>
                </div>

                {/* RESUMEN FISCAL FINAL */}
                <div className="pt-4 border-t border-slate-200">
                    <div className="space-y-1 mb-5">
                         <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                            <span>Base Imponible:</span>
                            <span className="text-slate-600">Bs. {totals.gravable.toLocaleString('es-VE')}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                            <span>Exento:</span>
                            <span className="text-slate-600">Bs. {totals.exento.toLocaleString('es-VE')}</span>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs font-black uppercase text-primary tracking-widest">Total Bs:</span>
                        <span className="text-4xl font-black text-primary tracking-tighter">
                            {totals.ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* BOTÓN DE EMISIÓN FINAL */}
            <div className="p-6 bg-white border-t shrink-0">
                <Button 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                    onClick={handleEmitTicket}
                    disabled={isSubmitting || watchItems.length === 0}
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <Printer className="h-6 w-6" />}
                    Emitir Ticket
                </Button>
                <button onClick={() => setIsClearDialogOpen(true)} className="w-full mt-4 text-[10px] font-black uppercase text-rose-500 hover:underline tracking-widest opacity-40">Anular Orden Actual</button>
            </div>
       </aside>

       {/* DIÁLOGO DE CONFIRMACIÓN PARA LIMPIAR */}
       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-3xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase italic tracking-tighter text-rose-600 flex items-center gap-3">
                        <Trash2 className="h-7 w-7" /> ¿Vaciado de Carrito?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-bold text-slate-500 text-sm leading-relaxed">
                        Esta acción eliminará todos los artículos cargados y reseteará el proceso de cobro. Esta operación no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 flex gap-3">
                    <AlertDialogCancel className="font-bold uppercase text-[10px] rounded-xl h-11 flex-1 border-2">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Consumidor Final' }); setReceivedAmount('0'); }} className="bg-rose-600 hover:bg-rose-700 font-black uppercase text-[10px] rounded-xl h-11 flex-1">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
