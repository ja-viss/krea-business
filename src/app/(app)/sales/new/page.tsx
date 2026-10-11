
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
    Trash2,
    User,
    Receipt,
    Calculator,
    Camera,
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
import { Card } from '@/components/ui/card';
import { PaymentDialog } from '@/components/sales/payment-dialog';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  
  const [isScannerActive, setIsScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
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

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingIndex = watchItems.findIndex(item => item.productId === String(product._id));
    if (existingIndex > -1) {
      update(existingIndex, { ...watchItems[existingIndex], quantity: Number(watchItems[existingIndex].quantity) + quantity });
    } else {
      append({ productId: String(product._id), name: product.name, price: product.price, quantity, stock: product.stock, taxRate: product.taxRate, isWeightable: product.isWeightable });
    }
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleProcessSale = async (payments: any[]) => {
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
        toast({ title: 'Venta Exitosa' });
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
       <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
            <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="p-4 bg-slate-50 border-2 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400">Total Dólares</span>
                    <span className="text-2xl font-black text-slate-900">$ {totals.usd.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl flex flex-col">
                    <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-primary">Total Bolívares</span><Badge className="text-[8px] h-4">BCV: {tasaBCV}</Badge></div>
                    <span className="text-2xl font-black text-primary">Bs. {totals.ves.toLocaleString('es-VE')}</span>
                </div>
                <div className="p-4 bg-slate-50 border-2 rounded-2xl flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400">Total Pesos</span>
                    <span className="text-2xl font-black text-slate-900">$ {totals.cop.toLocaleString('es-CO')}</span>
                </div>
            </div>

            <div className="flex gap-3 shrink-0">
                <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 p-1 focus-within:border-primary transition-all">
                    <ProductSearch onProductSelect={handleProductSelect} inputRef={searchRef} />
                </div>
                <Button variant={isScannerActive ? "destructive" : "outline"} className="h-14 w-14 rounded-2xl border-2" onClick={() => setIsScannerActive(!isScannerActive)}>
                    {isScannerActive ? <X className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                </Button>
            </div>

            {isScannerActive && (
                <div className="relative w-full aspect-video md:aspect-[21/9] bg-black rounded-3xl overflow-hidden border-4 border-primary">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full h-0.5 bg-primary/50 animate-pulse" /></div>
                </div>
            )}

            <div className="flex-1 border-2 rounded-2xl overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                            <TableRow><TableHead className="font-black uppercase text-[10px] pl-8">Producto</TableHead><TableHead className="text-center font-black uppercase text-[10px]">Precio (Bs)</TableHead><TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead><TableHead className="text-right font-black uppercase text-[10px] pr-8">Subtotal</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50">
                                    <TableCell className="py-4 pl-8"><div className="flex flex-col"><span className="font-black uppercase text-xs">{item.name}</span><span className="text-[9px] font-bold text-slate-400">SKU: {item.productId.slice(-6)}</span></div></TableCell>
                                    <TableCell className="text-center py-4 font-bold text-xs">Bs. {item.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-center py-4"><div className="flex items-center justify-center gap-2"><button onClick={() => { const v = Number(watchItems[index].quantity); if (v > 1) update(index, { ...fields[index], quantity: v - 1 }); else remove(index); }} className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Minus className="h-3 w-3"/></button><span className="font-black text-xs w-8">{watchItems[index].quantity}</span><button onClick={() => { const v = Number(watchItems[index].quantity); update(index, { ...fields[index], quantity: v + 1 }); }} className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><Plus className="h-3 w-3"/></button></div></TableCell>
                                    <TableCell className="text-right pr-8 font-black text-sm">{(item.price * watchItems[index].quantity).toLocaleString()} Bs.</TableCell>
                                </TableRow>
                            ))}
                            {fields.length === 0 && <TableRow><TableCell colSpan={4} className="h-60 text-center opacity-20"><Receipt className="h-12 w-12 mx-auto mb-2"/><p className="text-[10px] font-black uppercase">Esperando artículos...</p></TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </div>
       </div>

       <aside className="w-80 bg-slate-50/50 border-l-2 flex flex-col shrink-0">
            <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><User className="h-3 w-3" /> Identificación Cliente</Label>
                    <div className="bg-white p-1 rounded-xl border-2"><CustomerSearch onCustomerSelect={(c) => { setSelectedCustomer(c); form.setValue('customerId', c._id); form.setValue('customerName', c.name); }} /></div>
                </div>
                <Separator />
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Base Imponible:</span><span>Bs. {totals.gravable.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>I.V.A (16%):</span><span>Bs. {totals.iva.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase"><span>Exento:</span><span>Bs. {totals.exento.toLocaleString()}</span></div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-baseline"><span className="text-xs font-black uppercase text-primary tracking-widest">Total a Pagar</span></div>
                    <p className="text-4xl font-black text-primary tracking-tighter">Bs. {totals.ves.toLocaleString('es-VE')}</p>
                    <div className="flex gap-3 text-[11px] font-bold text-slate-400 uppercase mt-2"><span>$ {totals.usd.toFixed(2)}</span><span>|</span><span>{Math.ceil(totals.cop).toLocaleString()} COP</span></div>
                </div>
            </div>
            <div className="p-6 bg-white border-t space-y-3">
                <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-lg shadow-xl" onClick={() => setIsPaymentDialogOpen(true)} disabled={watchItems.length === 0}>
                    <Calculator className="mr-3 h-6 w-6" /> Liquidar Venta
                </Button>
                <button onClick={() => setIsClearDialogOpen(true)} className="w-full text-[10px] font-black uppercase text-red-500 hover:underline opacity-40">Anular Carrito</button>
            </div>
       </aside>

       <PaymentDialog 
            isOpen={isPaymentDialogOpen} 
            onClose={() => setIsPaymentDialogOpen(false)} 
            totalVES={totals.ves} 
            totalUSD={totals.usd} 
            totalCOP={totals.cop} 
            tasaBCV={tasaBCV} 
            tasaCOP={tasaCOPValue} 
            onConfirm={handleProcessSale}
            isSubmitting={isSubmitting}
        />

       <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
            <AlertDialogContent className="border-4 rounded-3xl">
                <AlertDialogHeader><AlertDialogTitle className="text-xl font-black uppercase italic text-red-600">¿Vaciar Carrito?</AlertDialogTitle><AlertDialogDescription className="font-bold">Esta acción eliminará todos los ítems cargados.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2"><AlertDialogCancel className="font-bold uppercase text-[10px] rounded-xl h-11 flex-1 border-2">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { form.reset({ items: [], customerName: 'Consumidor Final' }); }} className="bg-red-600 font-black uppercase text-[10px] rounded-xl h-11 flex-1">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
