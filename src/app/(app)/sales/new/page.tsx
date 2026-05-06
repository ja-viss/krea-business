
'use client';

import { useState, useEffect, KeyboardEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Loader2, Trash2, ChevronLeft, Minus, Plus, DollarSign } from 'lucide-react';
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
    message: 'La referencia es obligatoria.',
    path: ['paymentReference'],
});


type SaleFormValues = z.infer<typeof saleSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: '',
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

  const {
    subtotalExempt,
    subtotalGeneral,
    subtotalReduced,
    taxGeneralAmount,
    taxReducedAmount,
    totalVES,
  } = useMemo(() => {
    const subtotals = { exempt: 0, general: 0, reduced: 0 };
    
    watchItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        if (item.taxRate === 0) {
            subtotals.exempt += itemTotal;
        } else if (item.taxRate === 0.08) {
            subtotals.reduced += itemTotal;
        } else { 
            subtotals.general += itemTotal;
        }
    });

    const taxes = {
        general: subtotals.general * 0.16,
        reduced: subtotals.reduced * 0.08,
    };

    const grandTotal = subtotals.exempt + subtotals.general + subtotals.reduced + taxes.general + taxes.reduced;

    return {
      subtotalExempt: subtotals.exempt,
      subtotalGeneral: subtotals.general,
      subtotalReduced: subtotals.reduced,
      taxGeneralAmount: taxes.general,
      taxReducedAmount: taxes.reduced,
      totalVES: grandTotal
    };
  }, [watchItems]);

  const totalUSD = useMemo(() => {
    if (!rates.usd || !rates.usd.usd) return 0;
    return totalVES / rates.usd.usd;
  }, [totalVES, rates.usd]);
  
  const totalCOP = useMemo(() => {
    if (!rates.usd?.usd || !rates.cop?.rate) return 0;
    const totalInUSD = totalVES / rates.usd.usd;
    return totalInUSD * rates.cop.rate;
  }, [totalVES, rates.usd, rates.cop]);


  const getAmountInSelectedCurrency = useMemo(() => {
    switch(watchPaymentCurrency) {
        case 'VES': return totalVES;
        case 'COP': return totalCOP;
        case 'USD':
        default: return totalUSD;
    }
  }, [watchPaymentCurrency, totalUSD, totalVES, totalCOP]);

  const changeAmount = useMemo(() => {
    const totalInCurrency = getAmountInSelectedCurrency;
    const received = watchAmountReceived || 0;
    return received > totalInCurrency ? received - totalInCurrency : 0;
  }, [watchAmountReceived, getAmountInSelectedCurrency]);


  const formatCurrency = (value: number, currency: 'USD' | 'VES' | 'COP') => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    if (currency === 'VES') return new Intl.NumberFormat('es-VE', options).format(value);
    if (currency === 'COP') return new Intl.NumberFormat('es-CO', options).format(value);
    return new Intl.NumberFormat('en-US', options).format(value);
  }

  const handleProductSelect = (product: IProduct) => {
    const existingItemIndex = fields.findIndex(item => item.productId === String(product._id));

    if (existingItemIndex > -1) {
      const existingItem = fields[existingItemIndex];
      if (existingItem.quantity < product.stock) {
        update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + 1 });
      } else {
        toast({
            variant: 'destructive',
            title: 'Stock Insuficiente',
            description: `No puedes añadir más de ${product.stock} unidades.`,
        });
      }
    } else {
       if (product.stock > 0) {
            append({
                productId: String(product._id),
                name: product.name,
                price: product.price, 
                quantity: 1,
                stock: product.stock,
                taxRate: product.taxRate,
            });
       } else {
            toast({
                variant: 'destructive',
                title: 'Sin Stock',
                description: `El producto ${product.name} está agotado.`,
            });
       }
    }
  };
  
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const item = fields[index];
    if (newQuantity > 0 && newQuantity <= item.stock) {
      update(index, { ...item, quantity: newQuantity });
    } else if (newQuantity > item.stock) {
       toast({
            variant: 'destructive',
            title: 'Stock Insuficiente',
            description: `Límite alcanzado (${item.stock} disponibles).`,
        });
        update(index, { ...item, quantity: item.stock });
    } else if (newQuantity < 1) {
      update(index, { ...item, quantity: 1 });
    }
  };

  const handleCustomerSelect = (customer: ICustomer) => {
      form.setValue('customerId', customer._id);
      form.setValue('customerName', customer.name, { shouldValidate: true });
      setSelectedCustomer(customer);
  };

  const onSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) throw new Error('Sesión expirada.');

        const payload = { ...data, storeId };
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error al procesar.');

        toast({ title: 'Venta Completada' });
        router.push(`/sales/${result._id}/invoice`);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
       <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <PageHeader
                title="Nueva Venta"
                description="Registro rápido de transacciones."
                actions={
                    <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href="/sales">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Cancelar
                        </Link>
                    </Button>
                }
            />
        
        <div className="flex flex-col sm:flex-row gap-4 border rounded-lg p-4 bg-muted/30 mb-6">
            <div className='flex items-center gap-3 flex-1'>
                <span className='font-semibold text-sm whitespace-nowrap'>Factura Oficial</span>
                <div className='h-2 w-2 rounded-full bg-green-500 animate-pulse' />
            </div>
            <div className='flex items-center gap-2 text-sm'>
                <span className='text-muted-foreground'>BCV:</span>
                <span className='font-mono font-bold bg-background px-2 py-1 rounded border'>
                    {ratesLoading.usd ? '...' : rates.usd?.usd.toFixed(2) || '0.00'}
                </span>
                <span className='text-[10px] text-muted-foreground'>VES/USD</span>
            </div>
        </div>

        {!isClient ? <Skeleton className="h-96 w-full" /> : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                      {/* Columna Izquierda (Productos) */}
                      <div className="lg:col-span-3 space-y-6">
                          <Card>
                              <CardHeader>
                                  <CardTitle>Productos</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <ProductSearch onProductSelect={handleProductSelect} />
                              </CardContent>
                          </Card>
                          <Card className="overflow-hidden">
                              <CardHeader>
                                  <CardTitle>Detalle</CardTitle>
                              </CardHeader>
                              <CardContent className="p-0">
                                  <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="pl-4">Item</TableHead>
                                                <TableHead className="text-right">P. Unit</TableHead>
                                                <TableHead className="text-center w-[120px]">Cant</TableHead>
                                                <TableHead className="text-right pr-4">Total</TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.length > 0 ? (
                                                fields.map((item, index) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="pl-4 max-w-[150px] truncate uppercase font-medium text-xs sm:text-sm">
                                                            {item.name}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            {item.price.toLocaleString('es-VE')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className='flex items-center justify-center gap-1'>
                                                                <Button type="button" variant="ghost" size="icon" className='h-7 w-7' onClick={() => handleQuantityChange(index, item.quantity - 1)}>
                                                                    <Minus className='h-3 w-3'/>
                                                                </Button>
                                                                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                                                <Button type="button" variant="ghost" size="icon" className='h-7 w-7' onClick={() => handleQuantityChange(index, item.quantity + 1)}>
                                                                    <Plus className='h-3 w-3'/>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4 font-bold text-xs sm:text-sm">
                                                            {(item.price * item.quantity).toLocaleString('es-VE')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm italic">
                                                        Escanea o busca productos para vender.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>

                      {/* Columna Derecha (Cliente y Pago) */}
                      <div className="lg:col-span-2 space-y-6">
                          <Card>
                              <CardHeader>
                                  <CardTitle>Cliente</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  { !selectedCustomer ? (
                                      <CustomerSearch onCustomerSelect={handleCustomerSelect} />
                                  ) : (
                                      <div className='border rounded-lg p-3 space-y-1 bg-muted/40 flex justify-between items-center'>
                                          <div>
                                              <p className='font-bold uppercase text-sm'>{selectedCustomer.name}</p>
                                              <p className='text-xs text-muted-foreground'>{selectedCustomer.idNumber}</p>
                                          </div>
                                          <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Cambiar</Button>
                                      </div>
                                  )}
                                  <FormField control={form.control} name="customerName" render={({ field }) => (
                                      <FormItem><FormControl><Input {...field} className="hidden"/></FormControl><FormMessage /></FormItem>
                                  )} />
                              </CardContent>
                          </Card>
                          
                          <Card>
                              <CardHeader>
                                  <CardTitle>Pago</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                  <FormField
                                      control={form.control}
                                      name="paymentMethod"
                                      render={({ field }) => (
                                          <FormItem>
                                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger></FormControl>
                                                  <SelectContent>
                                                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                                                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                                                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                                                      <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  
                                  {watchPaymentMethod === 'Efectivo' && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border">
                                          <FormField
                                              control={form.control}
                                              name="paymentCurrency"
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormLabel className="text-[10px] uppercase">Moneda</FormLabel>
                                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                          <FormControl><SelectTrigger className="h-8"><SelectValue /></SelectTrigger></FormControl>
                                                          <SelectContent>
                                                              <SelectItem value="USD">USD ($)</SelectItem>
                                                              <SelectItem value="VES">VES (Bs)</SelectItem>
                                                              <SelectItem value="COP">COP (P)</SelectItem>
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
                                                      <FormLabel className="text-[10px] uppercase">Recibido</FormLabel>
                                                      <FormControl><Input type="number" step="0.01" className="h-8 font-bold" {...field} /></FormControl>
                                                  </FormItem>
                                              )}
                                          />
                                          <div className="sm:col-span-2 pt-2 border-t flex justify-between items-center">
                                              <span className="text-xs font-semibold">Cambio:</span>
                                              <span className="font-bold text-green-600 underline">
                                                {formatCurrency(changeAmount, watchPaymentCurrency || 'USD')}
                                              </span>
                                          </div>
                                      </div>
                                  )}

                                  {(watchPaymentMethod === 'Transferencia' || watchPaymentMethod === 'Pago Móvil') && (
                                      <FormField
                                          control={form.control}
                                          name="paymentReference"
                                          render={({ field }) => (
                                              <FormItem>
                                                  <FormControl><Input placeholder="Ref / Nº Transacción" {...field} /></FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                  )}
                              </CardContent>
                              
                              <CardFooter className='flex flex-col items-stretch bg-muted/50 p-4 border-t gap-2'>
                                  <div className='flex justify-between text-[11px] text-muted-foreground uppercase'>
                                      <span>Subtotal General (IVA 16%):</span> 
                                      <span>{formatCurrency(subtotalGeneral, 'VES')}</span>
                                  </div>
                                  <div className='flex justify-between text-[11px] text-muted-foreground uppercase'>
                                      <span>Total IVA:</span> 
                                      <span>{formatCurrency(taxGeneralAmount, 'VES')}</span>
                                  </div>
                                  <Separator className='my-1' />
                                  <div className='flex justify-between items-center py-2'>
                                      <span className='font-bold text-sm uppercase'>Total a Pagar:</span>
                                      <span className='text-2xl font-black text-primary'>{formatCurrency(totalVES, 'VES')}</span>
                                  </div>
                                  <div className='flex flex-col gap-1 pt-2 border-t border-dotted'>
                                      <div className='flex justify-between text-xs font-medium'>
                                          <span className='text-muted-foreground italic'>Ref. USD:</span>
                                          <span className='font-mono'>{formatCurrency(totalUSD, 'USD')}</span>
                                      </div>
                                      <div className='flex justify-between text-xs font-medium'>
                                          <span className='text-muted-foreground italic'>Ref. COP:</span>
                                          <span className='font-mono'>{formatCurrency(totalCOP, 'COP')}</span>
                                      </div>
                                  </div>
                                  
                                  <Button 
                                    type="submit" 
                                    size="lg"
                                    disabled={isSubmitting || watchItems.length === 0}
                                    className="w-full mt-4 font-bold shadow-lg shadow-primary/20"
                                  >
                                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                                      Finalizar Venta
                                  </Button>
                              </CardFooter>
                          </Card>
                      </div>
                  </div>
              </form>
            </Form>
        )}
       </main>
    </div>
  );
}
