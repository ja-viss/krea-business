
'use client';

import { useState, useEffect, KeyboardEvent, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    Trash2, 
    ChevronLeft, 
    Printer, 
    Monitor,
    UserCheck,
    Scale,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PaymentDialog } from '@/components/sales/payment-dialog';

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Debe seleccionar o registrar un cliente.'),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), 
    quantity: z.coerce.number().min(0.001, 'Cantidad inválida'),
    stock: z.number(),
    taxRate: z.number(),
    isWeightable: z.boolean().optional()
  })).min(1, 'Debes añadir al menos un producto.'),
});

type SaleFormValues = z.infer<typeof saleSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates } = useExchangeRates();
  const [isClient, setIsClient] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // Hardware States
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    // Detección de atajos de teclado
    const handleGlobalKeys = (e: any) => {
        if (e.key === 'F1') { e.preventDefault(); productSearchRef.current?.focus(); }
        if (e.key === 'F4') { e.preventDefault(); if (form.getValues('items').length > 0) setIsPaymentDialogOpen(true); }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingItemIndex = fields.findIndex(item => item.productId === String(product._id));
    if (existingItemIndex > -1) {
      update(existingItemIndex, { ...fields[existingItemIndex], quantity: fields[existingItemIndex].quantity + quantity });
    } else {
        append({
            productId: String(product._id),
            name: product.name,
            price: product.price, 
            quantity: quantity,
            stock: product.stock,
            taxRate: product.taxRate,
            isWeightable: product.isWeightable
        });
    }
    productSearchRef.current?.focus();
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
    const cop = rates.cop?.rate ? ves / (rates.cop.rate / (rates.usd?.usd || 1)) : 0; // Aproximación si no hay tasa COP directa
    return { ves, usd, cop: rates.cop?.rate ? (usd * rates.cop.rate) : 0 };
  }, [watchItems, rates]);

  const handleFinalizeSale = async (paymentData: any) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...form.getValues(), 
                ...paymentData,
                storeId 
            }),
        });
        if (!response.ok) throw new Error("Error en servidor");
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error POS', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden bg-muted/20">
       <main className="flex-1 space-y-4 p-4 md:px-8 pt-6 pb-24 overflow-y-auto">
            <PageHeader
                title="POS Multimoneda"
                description="Terminal de alta velocidad orientada a teclado."
                actions={
                    <div className='flex gap-2'>
                        <Button variant="outline" className='bg-primary/5 text-primary border-primary/20'>
                            <Monitor className='mr-2 h-4 w-4' /> Visor Cliente
                        </Button>
                        <Button variant="ghost" asChild><Link href="/sales"><ChevronLeft className="mr-1 h-4 w-4" /> Salir</Link></Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-4">
                    <Card className='shadow-lg border-2 z-[50]'>
                        <CardContent className="pt-6">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-2 shadow-xl bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className='bg-muted/50'>
                                    <TableRow>
                                        <TableHead className="pl-4 font-black uppercase text-[10px]">Item</TableHead>
                                        <TableHead className="text-center font-black uppercase text-[10px]">Cant</TableHead>
                                        <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Subtotal</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? fields.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-4">
                                                <div className='flex flex-col'>
                                                    <span className='font-black uppercase text-xs'>{item.name}</span>
                                                    <span className='text-[9px] opacity-60'>@ {item.price.toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center'>
                                                <Input 
                                                    type="number" 
                                                    className='w-16 h-8 text-center font-black mx-auto' 
                                                    {...form.register(`items.${index}.quantity`)} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right pr-4 font-black text-primary">
                                                {(item.price * item.quantity).toLocaleString('es-VE')}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className='h-40 text-center text-muted-foreground italic font-medium'>
                                                Empiece a escribir para buscar (F1)...
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-4">
                    <Card className='shadow-lg border-2 border-dashed'>
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
                                <div className='mt-2 flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20'>
                                    <div className='flex flex-col'>
                                        <span className='text-[10px] font-black uppercase text-primary'>{selectedCustomer.name}</span>
                                        <span className='text-[8px] font-mono'>{selectedCustomer.idNumber}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className='h-5 w-5 text-red-500' onClick={() => {
                                        form.setValue('customerId', undefined);
                                        form.setValue('customerName', 'Cliente Contado');
                                        setSelectedCustomer(null);
                                    }}><X className='h-3 w-3'/></Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className='shadow-2xl border-4 border-primary/30 bg-black text-white'>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-4">
                                <div className='flex justify-between items-end border-b border-white/10 pb-4'>
                                    <span className='text-xs font-black uppercase text-primary'>Total Cobro</span>
                                    <div className='text-right'>
                                        <p className='text-4xl font-black text-primary tracking-tighter leading-none'>
                                            ${totals.usd.toFixed(2)}
                                        </p>
                                        <p className='text-sm font-bold opacity-60 mt-1 uppercase tracking-widest'>
                                            {totals.ves.toLocaleString('es-VE')} Bs
                                        </p>
                                    </div>
                                </div>
                                <div className='flex justify-between text-[10px] font-bold opacity-40'>
                                    <span>PESOS COL:</span>
                                    <span>{totals.cop.toLocaleString('es-CO')} COP</span>
                                </div>
                            </div>
                            
                            <Button 
                                type="button"
                                onClick={() => setIsPaymentDialogOpen(true)}
                                disabled={watchItems.length === 0}
                                className="w-full h-20 font-black uppercase text-xl shadow-2xl rounded-2xl bg-primary hover:bg-primary/90 text-white"
                            >
                                <Printer className="mr-2 h-8 w-8" />
                                COBRAR (F4)
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <PaymentDialog 
                isOpen={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                totals={totals}
                rates={{ usd: rates.usd?.usd || 0, cop: rates.cop?.rate || 0 }}
                pagoMovil={{ bankCode: '0102', phone: '04120000000', idNumber: 'V-12345678' }}
                onConfirm={handleFinalizeSale}
                isSubmitting={isSubmitting}
            />
       </main>
       
       <footer className="fixed bottom-0 w-full bg-black text-white py-2 px-6 flex items-center justify-between z-50 border-t-4 border-primary">
            <div className='flex gap-8'>
                <div className='flex gap-2 items-center'>
                    <Badge className={cn("font-black", isScaleConnected ? "bg-primary" : "bg-red-600")}>OFF</Badge>
                    <span className='text-[10px] font-bold uppercase opacity-80 italic'>Balanza</span>
                </div>
                <div className='flex gap-2 items-center'>
                    <Badge className={cn("font-black", isPrinterConnected ? "bg-green-600" : "bg-red-600")}>OFF</Badge>
                    <span className='text-[10px] font-bold uppercase opacity-80 italic'>Ticketera</span>
                </div>
            </div>
            <div className='flex gap-4'>
                {['F1 BUSCAR', 'F2 CLIENTE', 'F4 COBRAR'].map(key => (
                    <div key={key} className='flex items-center gap-1.5 opacity-60'>
                        <Badge variant="outline" className='text-white border-white/20 text-[9px]'>{key.split(' ')[0]}</Badge>
                        <span className='text-[9px] font-black uppercase'>{key.split(' ')[1]}</span>
                    </div>
                ))}
            </div>
            <div className='bg-white/10 px-4 py-1 rounded font-mono text-xs font-black'>
                BCV: {rates.usd?.usd.toFixed(2)}
            </div>
       </footer>
    </div>
  );
}
