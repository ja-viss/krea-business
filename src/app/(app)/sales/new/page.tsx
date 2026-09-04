
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
  CardFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
    Loader2, 
    Trash2, 
    ChevronLeft, 
    Minus, 
    Plus, 
    Calculator, 
    Printer, 
    Keyboard, 
    PauseCircle, 
    PlayCircle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Debe seleccionar o registrar un cliente.'),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), 
    quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
    stock: z.number(),
    taxRate: z.number(),
  })).min(1, 'Debes añadir al menos un producto.'),
  paymentMethod: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Móvil'], {
    required_error: 'Selecciona un método de pago.',
  }),
  paymentReference: z.string().optional(),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).optional(),
  amountReceived: z.coerce.number().default(0),
}).refine(data => {
    if ((data.paymentMethod === 'Transferencia' || data.paymentMethod === 'Pago Móvil') && (!data.paymentReference || data.paymentReference.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: 'La referencia es obligatoria para este método de pago.',
    path: ['paymentReference'],
});

type SaleFormValues = z.infer<typeof saleSchema>;

interface HeldSale {
    id: string;
    timestamp: Date;
    customer: ICustomer | null;
    customerName: string;
    items: any[];
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [isClient, setIsClient] = useState(false);
  
  // Estado para Ventas en Espera (Parking)
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  
  // Refs para control de foco
  const productSearchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const paymentMethodRef = useRef<HTMLButtonElement>(null);
  const amountReceivedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentReference: '',
      paymentCurrency: 'USD',
      amountReceived: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchPaymentMethod = form.watch('paymentMethod');
  const watchAmountReceived = form.watch('amountReceived');
  const watchPaymentCurrency = form.watch('paymentCurrency');

  // Atajos de Teclado Globales (F1-F9)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        // F1: Buscar Producto
        if (e.key === 'F1') {
            e.preventDefault();
            productSearchRef.current?.focus();
        }
        // F2: Seleccionar Cliente
        if (e.key === 'F2') {
            e.preventDefault();
            customerSearchRef.current?.focus();
        }
        // F4: Ir a Cobrar
        if (e.key === 'F4') {
            e.preventDefault();
            amountReceivedRef.current?.focus() || paymentMethodRef.current?.focus();
        }
        // F8: Pausar Venta (Hold)
        if (e.key === 'F8') {
            e.preventDefault();
            handleHoldSale();
        }
        // F9: Recuperar Venta
        if (e.key === 'F9') {
            e.preventDefault();
            if (heldSales.length > 0) handleRecoverSale(heldSales[0]);
        }
        // Esc: Limpiar / Salir
        if (e.key === 'Escape') {
            if (watchItems.length > 0) {
                if (confirm('¿Deseas cancelar la venta actual?')) {
                    form.reset();
                    setSelectedCustomer(null);
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [watchItems, heldSales, form]);

  // Manejo de multiplicador y cantidades rápidas (+ / -)
  const handleHoldSale = () => {
      if (watchItems.length === 0) return;
      const newHold: HeldSale = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          customer: selectedCustomer,
          customerName: form.getValues('customerName'),
          items: [...watchItems]
      };
      setHeldSales([newHold, ...heldSales]);
      form.reset();
      setSelectedCustomer(null);
      toast({ title: "Venta Pausada", description: "El carrito ha sido puesto en espera (F9 para recuperar)." });
  };

  const handleRecoverSale = (held: HeldSale) => {
      form.setValue('items', held.items);
      form.setValue('customerName', held.customerName);
      form.setValue('customerId', held.customer?._id);
      setSelectedCustomer(held.customer);
      setHeldSales(heldSales.filter(h => h.id !== held.id));
      toast({ title: "Venta Recuperada", description: "Continuando proceso de facturación." });
  };

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingItemIndex = fields.findIndex(item => item.productId === String(product._id));

    if (existingItemIndex > -1) {
      const existingItem = fields[existingItemIndex];
      const newQty = existingItem.quantity + quantity;
      if (newQty <= product.stock) {
        update(existingItemIndex, { ...existingItem, quantity: newQty });
      } else {
        toast({ variant: 'destructive', title: 'Límite Stock', description: `${product.name}: No hay más existencias.` });
      }
    } else {
       if (product.stock >= quantity) {
            append({
                productId: String(product._id),
                name: product.name,
                price: product.price, 
                quantity: quantity,
                stock: product.stock,
                taxRate: product.taxRate,
            });
       } else {
            toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `${product.name}: Solo quedan ${product.stock} unidades.` });
       }
    }
    // Regresar foco al buscador después de añadir
    productSearchRef.current?.focus();
  };

  const { totalVES, totalUSD, totalCOP } = useMemo(() => {
    let general = 0;
    let exempt = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) exempt += sub; else general += sub;
    });
    const tax = general * 0.16;
    const ves = general + exempt + tax;
    const usd = rates.usd?.usd ? ves / rates.usd.usd : 0;
    const cop = (rates.cop?.rate && rates.usd?.usd) ? (ves / rates.usd.usd) * rates.cop.rate : 0;
    return { totalVES: ves, totalUSD: usd, totalCOP: cop, subtotalExempt: exempt, subtotalGeneral: general, taxGeneral: tax };
  }, [watchItems, rates]);

  const getAmountInSelectedCurrency = () => {
    if (watchPaymentCurrency === 'VES') return totalVES;
    if (watchPaymentCurrency === 'COP') return totalCOP;
    return totalUSD;
  };

  const changeAmount = Math.max(0, (watchAmountReceived || 0) - getAmountInSelectedCurrency());

  const onSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        toast({ title: 'Venta Procesada', description: 'Imprimiendo ticket...' });
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error POS', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden">
       <main className="flex-1 space-y-4 p-4 md:px-8 pt-6 pb-24 overflow-y-auto">
            <PageHeader
                title="Punto de Venta Ultra-Rápido"
                description="Optimizado para teclado numérico y escáner láser."
                actions={
                    <div className='flex gap-2'>
                        {heldSales.length > 0 && (
                            <Button variant="outline" className='bg-amber-50 text-amber-700 border-amber-200' onClick={() => handleRecoverSale(heldSales[0])}>
                                <PlayCircle className='mr-2 h-4 w-4' /> Recuperar (F9)
                                <Badge className='ml-2 bg-amber-500'>{heldSales.length}</Badge>
                            </Button>
                        )}
                        <Button variant="ghost" asChild><Link href="/sales"><ChevronLeft className="mr-1 h-4 w-4" /> Salir</Link></Button>
                    </div>
                }
            />
        
        <div className="flex items-center justify-between border-2 border-primary/20 rounded-xl p-3 bg-primary/5 shadow-sm">
            <div className='flex items-center gap-4'>
                <div className='flex items-center gap-2 px-3 py-1 bg-white rounded-lg border shadow-inner'>
                    <Keyboard className='h-4 w-4 text-primary' />
                    <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>Modo Teclado Activo</span>
                </div>
                {heldSales.length > 0 && (
                    <div className='flex items-center gap-2 animate-pulse'>
                        <PauseCircle className='h-4 w-4 text-amber-600' />
                        <span className='text-[10px] font-bold uppercase text-amber-700'>Ventas en espera</span>
                    </div>
                )}
            </div>
            <div className='flex items-center gap-6'>
                <div className='flex items-baseline gap-2'>
                    <span className='text-[10px] font-black uppercase text-muted-foreground'>Tasa BCV:</span>
                    <span className='font-mono font-black text-primary'>{rates.usd?.usd.toFixed(2) || '0.00'} Bs/$</span>
                </div>
                <div className='h-6 w-px bg-primary/20' />
                <div className='flex items-baseline gap-2'>
                    <span className='text-[10px] font-black uppercase text-muted-foreground'>Total Carrito:</span>
                    <span className='text-xl font-black text-primary'>{totalVES.toLocaleString('es-VE')} BS</span>
                </div>
            </div>
        </div>

        {!isClient ? <Skeleton className="h-[500px] w-full" /> : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                      {/* LADO IZQUIERDO: CARRITO */}
                      <div className="lg:col-span-8 space-y-4">
                          <Card className='shadow-lg border-2'>
                              <CardHeader className='pb-3 bg-muted/10'>
                                  <CardTitle className='text-sm font-black uppercase flex items-center gap-2'>
                                      <Keyboard className='h-4 w-4 text-primary' /> 
                                      Entrada de Productos (F1)
                                  </CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <ProductSearch 
                                    inputRef={productSearchRef}
                                    onProductSelect={handleProductSelect} 
                                  />
                              </CardContent>
                          </Card>

                          <Card className="overflow-hidden border-2 shadow-xl">
                              <CardContent className="p-0">
                                  <div className="max-h-[45vh] overflow-y-auto">
                                    <Table>
                                        <TableHeader className='bg-muted/50 sticky top-0 z-10'>
                                            <TableRow>
                                                <TableHead className="pl-4 font-black uppercase text-[10px]">Item</TableHead>
                                                <TableHead className="text-right font-black uppercase text-[10px]">Precio</TableHead>
                                                <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
                                                <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.length > 0 ? (
                                                fields.map((item, index) => (
                                                    <TableRow key={item.id} className='hover:bg-primary/5 transition-colors group'>
                                                        <TableCell className="pl-4">
                                                            <div className='flex flex-col'>
                                                                <span className='font-black uppercase text-xs truncate max-w-[250px]'>{item.name}</span>
                                                                <span className='text-[9px] font-mono text-muted-foreground'>IVA {item.taxRate*100}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-bold tabular-nums">
                                                            {item.price.toLocaleString('es-VE')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className='flex items-center justify-center gap-2'>
                                                                <Button type="button" variant="outline" size="icon" className='h-6 w-6 rounded-md hover:bg-primary hover:text-white' onClick={() => {
                                                                    const n = Math.max(1, item.quantity - 1);
                                                                    update(index, { ...item, quantity: n });
                                                                }}>
                                                                    <Minus className='h-3 w-3'/>
                                                                </Button>
                                                                <span className="w-8 text-center text-sm font-black tabular-nums">{item.quantity}</span>
                                                                <Button type="button" variant="outline" size="icon" className='h-6 w-6 rounded-md hover:bg-primary hover:text-white' onClick={() => {
                                                                    if (item.quantity < item.stock) update(index, { ...item, quantity: item.quantity + 1 });
                                                                }}>
                                                                    <Plus className='h-3 w-3'/>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4 font-black text-sm tabular-nums text-primary">
                                                            {(item.price * item.quantity).toLocaleString('es-VE')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-64 text-center">
                                                        <div className='flex flex-col items-center justify-center text-muted-foreground gap-2'>
                                                            <Calculator className='h-12 w-12 opacity-20' />
                                                            <p className='text-sm font-bold uppercase opacity-40'>Caja lista para facturar</p>
                                                            <p className='text-[10px] italic'>Presiona F1 para buscar un producto</p>
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

                      {/* LADO DERECHO: TOTALES Y COBRO */}
                      <div className="lg:col-span-4 space-y-4">
                          <Card className='shadow-md border-2 border-primary/20'>
                              <CardHeader className='pb-3'>
                                  <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>Identificación (F2)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  { !selectedCustomer ? (
                                      <CustomerSearch 
                                        inputRef={customerSearchRef}
                                        onCustomerSelect={(c) => {
                                            setSelectedCustomer(c);
                                            form.setValue('customerId', c._id);
                                            form.setValue('customerName', c.name);
                                            productSearchRef.current?.focus();
                                        }} 
                                      />
                                  ) : (
                                      <div className='border-2 border-dashed border-primary/40 rounded-xl p-3 bg-primary/5 flex justify-between items-center animate-in zoom-in-95 duration-200'>
                                          <div className='flex flex-col'>
                                              <span className='font-black uppercase text-xs text-primary'>{selectedCustomer.name}</span>
                                              <span className='text-[10px] font-bold font-mono opacity-60'>{selectedCustomer.idNumber}</span>
                                          </div>
                                          <Button variant="ghost" size="icon" className='h-8 w-8 text-primary' onClick={() => setSelectedCustomer(null)}>
                                              <X className='h-4 w-4' />
                                          </Button>
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                          
                          <Card className='shadow-2xl border-4 border-primary/30 bg-primary/[0.02] flex flex-col'>
                              <CardHeader className='pb-2 bg-primary/10 border-b border-primary/20'>
                                  <CardTitle className='text-lg font-black uppercase italic tracking-tighter text-primary'>Cobro Final (F4)</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4 pt-4 flex-1">
                                  <FormField
                                      control={form.control}
                                      name="paymentMethod"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel className='text-[10px] font-black uppercase'>Forma de Pago</FormLabel>
                                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl><SelectTrigger ref={paymentMethodRef} className='font-black h-12 text-base border-2'><SelectValue /></SelectTrigger></FormControl>
                                                  <SelectContent>
                                                      <SelectItem value="Efectivo" className='font-bold'>EFECTIVO (Cash)</SelectItem>
                                                      <SelectItem value="Tarjeta" className='font-bold'>TARJETA / PUNTO</SelectItem>
                                                      <SelectItem value="Transferencia" className='font-bold'>TRANSFERENCIA</SelectItem>
                                                      <SelectItem value="Pago Móvil" className='font-bold'>PAGO MÓVIL</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          </FormItem>
                                      )}
                                  />
                                  
                                  <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-xl border-2 shadow-inner">
                                      <FormField
                                          control={form.control}
                                          name="paymentCurrency"
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel className="text-[9px] font-black uppercase opacity-50">Moneda</FormLabel>
                                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                      <FormControl><SelectTrigger className="h-10 font-black border-none bg-muted/30"><SelectValue /></SelectTrigger></FormControl>
                                                      <SelectContent>
                                                          <SelectItem value="USD" className='font-bold'>DÓLARES ($)</SelectItem>
                                                          <SelectItem value="VES" className='font-bold'>BOLÍVARES (Bs)</SelectItem>
                                                          <SelectItem value="COP" className='font-bold'>PESOS (COP)</SelectItem>
                                                      </SelectContent>
                                                  </Select>
                                              </FormItem>
                                          )}
                                      />
                                      <FormField
                                          control={form.control}
                                          name="amountReceived"
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel className="text-[9px] font-black uppercase opacity-50">Paga con:</FormLabel>
                                                  <FormControl><Input ref={amountReceivedRef} type="number" step="0.01" className="h-10 font-black text-xl border-none bg-primary/5 text-right tabular-nums" {...field} /></FormControl>
                                              </FormItem>
                                          )}
                                      />
                                      <div className="col-span-2 pt-2 mt-1 border-t flex justify-between items-center">
                                          <span className="text-[10px] font-black uppercase text-muted-foreground italic">Vuelto (Cambio):</span>
                                          <span className={cn("font-black text-2xl tabular-nums", changeAmount > 0 ? "text-green-600" : "text-muted-foreground/30")}>
                                            {changeAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                          </span>
                                      </div>
                                  </div>
                              </CardContent>
                              
                              <CardFooter className='flex flex-col items-stretch bg-primary/5 p-6 border-t-2 border-primary/20 gap-3'>
                                  <div className='flex justify-between items-center'>
                                      <span className='font-black text-xs uppercase text-muted-foreground italic'>Total a Pagar</span>
                                      <div className='text-right'>
                                          <p className='text-4xl font-black text-primary tracking-tighter tabular-nums leading-none'>
                                              {totalVES.toLocaleString('es-VE')} <span className='text-sm italic'>BS</span>
                                          </p>
                                          <p className='text-sm font-bold text-muted-foreground mt-1'>
                                              ≈ {totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                          </p>
                                      </div>
                                  </div>
                                  
                                  <Button 
                                    type="submit" 
                                    size="lg"
                                    disabled={isSubmitting || watchItems.length === 0}
                                    className="w-full mt-2 font-black uppercase text-xl h-20 shadow-2xl shadow-primary/40 rounded-2xl animate-pulse hover:animate-none"
                                  >
                                      {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Printer className="mr-2 h-8 w-8" />}
                                      FACTURAR (ENTER)
                                  </Button>
                              </CardFooter>
                          </Card>
                      </div>
                  </div>
              </form>
            </Form>
        )}
       </main>

       {/* BARRA DE COMANDOS PERSISTENTE (SHORTCUT BAR) */}
       <footer className="fixed bottom-0 w-full bg-black text-white py-2 px-6 flex items-center justify-between z-50 border-t-4 border-primary">
           <div className='flex gap-8'>
                <div className='flex gap-2 items-center'>
                    <Badge className='bg-primary font-black'>F1</Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>Buscar Item</span>
                </div>
                <div className='flex gap-2 items-center'>
                    <Badge className='bg-primary font-black'>F2</Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>Cliente</span>
                </div>
                <div className='flex gap-2 items-center'>
                    <Badge className='bg-primary font-black'>F4</Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>Cobrar</span>
                </div>
                <div className='flex gap-2 items-center border-l border-white/20 pl-8'>
                    <Badge className='bg-amber-600 font-black'>F8</Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>En Espera</span>
                </div>
                <div className='flex gap-2 items-center'>
                    <Badge className='bg-amber-600 font-black'>F9</Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>Recuperar</span>
                </div>
           </div>
           
           <div className='flex gap-8 items-center'>
                <div className='flex gap-2 items-center'>
                    <div className='h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' />
                    <span className='text-[10px] font-black uppercase tracking-widest text-primary'>Terminal POS-01 Online</span>
                </div>
                <div className='bg-white/10 px-4 py-1 rounded font-mono text-xs font-black'>
                    {new Date().toLocaleTimeString()}
                </div>
           </div>
       </footer>

       <style jsx global>{`
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            .tabular-nums { font-variant-numeric: tabular-nums; }
       `}</style>
    </div>
  );
}
