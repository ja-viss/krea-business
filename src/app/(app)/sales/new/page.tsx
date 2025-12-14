
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
import { Loader2, Trash2, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CustomerSearch } from '@/components/sales/customer-search';
import { ICustomer } from '@/models/Customer';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { Separator } from '@/components/ui/separator';


const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Debe seleccionar o registrar un cliente.'),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), // Precio en VES
    quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
    stock: z.number(),
    taxRate: z.number(),
  })).min(1, 'Debes añadir al menos un producto a la venta.'),
  paymentMethod: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Móvil'], {
    required_error: 'Debes seleccionar un método de pago.',
  }),
  paymentReference: z.string().optional(),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).optional(),
  amountReceived: z.coerce.number().optional(),
}).refine(data => {
    if ((data.paymentMethod === 'Transferencia' || data.paymentMethod === 'Pago Móvil') && !data.paymentReference) {
        return false;
    }
    return true;
}, {
    message: 'La referencia es obligatoria para este método de pago.',
    path: ['paymentReference'],
});


type SaleFormValues = z.infer<typeof saleSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates, loading: ratesLoading } = useExchangeRates();

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
        } else { // Default to 16%
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
            description: `No puedes añadir más de ${product.stock} unidades de ${product.name}.`,
        });
      }
    } else {
       if (product.stock > 0) {
            append({
                productId: String(product._id),
                name: product.name,
                price: product.price, // Precio en VES
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
            description: `Solo hay ${item.stock} unidades disponibles de ${item.name}.`,
        });
        update(index, { ...item, quantity: item.stock });
    } else if (newQuantity < 1) {
      update(index, { ...item, quantity: 1 });
    }
  };

  const handleIncreaseQuantity = (index: number) => {
    const item = fields[index];
    handleQuantityChange(index, item.quantity + 1);
  }

  const handleDecreaseQuantity = (index: number) => {
    const item = fields[index];
    handleQuantityChange(index, item.quantity - 1);
  }

  const handleQuantityKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    const item = fields[index];
    let newQuantity = item.quantity;

    if (e.key === '+' || e.key === 'ArrowUp') {
        e.preventDefault();
        newQuantity = Math.min(item.stock, item.quantity + 1);
    } else if (e.key === '-' || e.key === 'ArrowDown') {
        e.preventDefault();
        newQuantity = Math.max(1, item.quantity - 1);
    }

    if (newQuantity !== item.quantity) {
        handleQuantityChange(index, newQuantity);
    }
  };

  const handleCustomerSelect = (customer: ICustomer) => {
      form.setValue('customerId', customer._id);
      form.setValue('customerName', customer.name, { shouldValidate: true });
      setSelectedCustomer(customer);
  };

  const onInvalid = (errors: FieldErrors<SaleFormValues>) => {
    // Find the first error message and display it
    const firstErrorKey = Object.keys(errors)[0] as keyof SaleFormValues;
     if (firstErrorKey && errors[firstErrorKey]) {
        let message = errors[firstErrorKey]?.message;
        if (firstErrorKey === 'items' && typeof errors.items === 'object' && !Array.isArray(errors.items)) {
             // Handle root error on items array
             message = errors.items.root?.message || errors.items.message || "Error en los artículos de la venta.";
        }
        
        toast({
            variant: 'destructive',
            title: 'Error de Validación',
            description: message,
        });
    }
  };

  const onSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se encontró la tienda. Por favor, inicia sesión de nuevo.');
        }

        const payload = { ...data, storeId, };

        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error al crear la venta.');
        }

        toast({
            title: '¡Venta Creada!',
            description: `La venta se ha registrado correctamente.`,
        });
        router.push(`/sales/${result._id}/invoice`);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al Procesar la Venta',
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
                description="Busca productos, añade clientes y registra una nueva transacción."
                actions={
                    <Button variant="outline" asChild>
                        <Link href="/sales">
                        <ChevronLeft />
                        Cancelar
                        </Link>
                    </Button>
                }
            />
        <div className="border rounded-lg p-4 flex justify-between items-center text-sm bg-muted/50 mb-6">
            <div className='flex items-center gap-4'>
                <div className='font-semibold'>Tipo de Documento:</div>
                 <Select defaultValue="factura">
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="factura">Factura</SelectItem>
                        <SelectItem value="nota_credito" disabled>Nota de Crédito</SelectItem>
                        <SelectItem value="nota_debito" disabled>Nota de Débito</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className='flex items-center gap-2'>
                <div className='font-semibold'>Tasa BCV (USD/VES):</div>
                 <div className='font-mono p-2 bg-background rounded-md'>
                    {ratesLoading.usd ? 'Cargando...' : rates.usd?.usd.toFixed(2) || 'N/A'}
                </div>
            </div>
        </div>

         <Form {...form}>
            <form id="sale-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 mt-6">
                    {/* Columna Izquierda (Productos y Tabla) */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Buscar Productos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProductSearch onProductSelect={handleProductSelect} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Artículos de la Venta</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-right">P. Unit (VES)</TableHead>
                                            <TableHead className="text-center w-[150px]">Cantidad</TableHead>
                                            <TableHead className="text-right">Subtotal (VES)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? (
                                            fields.map((item, index) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.price, 'VES')}</TableCell>
                                                    <TableCell>
                                                      <div className='flex items-center justify-center gap-1'>
                                                        <Button type="button" variant="outline" size="icon" className='h-8 w-8' onClick={() => handleDecreaseQuantity(index)} disabled={item.quantity <= 1}>
                                                          <Minus className='h-4 w-4'/>
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            className="text-center h-8 w-14"
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                                            onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                                                            max={item.stock}
                                                            min={1}
                                                        />
                                                         <Button type="button" variant="outline" size="icon" className='h-8 w-8' onClick={() => handleIncreaseQuantity(index)} disabled={item.quantity >= item.stock}>
                                                          <Plus className='h-4 w-4'/>
                                                        </Button>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(item.price * item.quantity, 'VES')}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    Añade productos para comenzar la venta.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
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
                                    <>
                                        <CustomerSearch onCustomerSelect={handleCustomerSelect} />
                                        <FormField
                                            control={form.control}
                                            name="customerName"
                                            render={({ field }) => (
                                                <FormItem className='mt-2'>
                                                    <FormControl>
                                                        <Input {...field} readOnly className="hidden"/>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                ) : (
                                    <div className='border rounded-lg p-4 space-y-2 bg-muted/50'>
                                        <div className='flex justify-between items-start'>
                                            <div>
                                                <p className='font-semibold'>{selectedCustomer.name}</p>
                                                <p className='text-sm text-muted-foreground'>{selectedCustomer.idNumber}</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => { setSelectedCustomer(null); form.setValue('customerName', ''); }}>Cambiar</Button>
                                        </div>
                                        {selectedCustomer.phone && <p className='text-sm'><span className='font-medium'>Teléfono:</span> {selectedCustomer.phone}</p>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                <CardTitle>Información de Pago</CardTitle>
                                <CardDescription>Selecciona el método y registra los detalles del pago.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="paymentMethod"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Método de Pago</FormLabel>
                                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione un método" />
                                                    </SelectTrigger>
                                                </FormControl>
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
                                {(watchPaymentMethod === 'Transferencia' || watchPaymentMethod === 'Pago Móvil') && (
                                     <FormField
                                        control={form.control}
                                        name="paymentReference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nº de Referencia</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Introduce el número de referencia" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                 {watchPaymentMethod === 'Efectivo' && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="paymentCurrency"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Moneda de Pago</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="USD">Dólares (USD)</SelectItem>
                                                            <SelectItem value="VES">Bolívares (VES)</SelectItem>
                                                            <SelectItem value="COP">Pesos (COP)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <div className='grid grid-cols-2 gap-4'>
                                            <FormField
                                                control={form.control}
                                                name="amountReceived"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Monto Recibido</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormItem>
                                                <FormLabel>Vuelto</FormLabel>
                                                <Input
                                                    type="text"
                                                    readOnly
                                                    value={formatCurrency(changeAmount, watchPaymentCurrency || 'USD')}
                                                    className="font-bold text-lg bg-muted border-none"
                                                />
                                            </FormItem>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                             <CardFooter className='flex flex-col items-stretch bg-muted/50 p-4 border-t gap-2 text-sm'>
                                {/* Fiscal Breakdown */}
                                <div className='flex justify-between'><span className='text-muted-foreground'>Base Imponible (Exento):</span> <span className='font-medium'>{formatCurrency(subtotalExempt, 'VES')}</span></div>
                                <div className='flex justify-between'><span className='text-muted-foreground'>Base Imponible (16%):</span> <span className='font-medium'>{formatCurrency(subtotalGeneral, 'VES')}</span></div>
                                <div className='flex justify-between'><span className='text-muted-foreground'>Base Imponible (8%):</span> <span className='font-medium'>{formatCurrency(subtotalReduced, 'VES')}</span></div>
                                <Separator className='my-1' />
                                <div className='flex justify-between'><span className='text-muted-foreground'>IVA (16%):</span> <span className='font-medium'>{formatCurrency(taxGeneralAmount, 'VES')}</span></div>
                                <div className='flex justify-between'><span className='text-muted-foreground'>IVA (8%):</span> <span className='font-medium'>{formatCurrency(taxReducedAmount, 'VES')}</span></div>
                                <Separator className='my-2 bg-foreground' />

                                {/* Totals */}
                                <div className='flex justify-between items-center text-lg font-bold text-primary'>
                                    <span>TOTAL (VES):</span>
                                    <span>{ratesLoading.usd ? '...' : formatCurrency(totalVES, 'VES')}</span>
                                </div>
                                <Separator className='my-1' />
                                 <div className='flex justify-between items-center text-muted-foreground'>
                                    <span>Total (USD):</span>
                                    <span>{ratesLoading.usd ? '...' : formatCurrency(totalUSD, 'USD')}</span>
                                 </div>
                                 <div className='flex justify-between items-center text-muted-foreground'>
                                    <span>Total (COP):</span>
                                    <span>{ratesLoading.cop ? '...' : formatCurrency(totalCOP, 'COP')}</span>
                                 </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </form>
         </Form>
        <div className="mt-8 flex justify-end">
            <Button 
                type="submit" 
                form="sale-form"
                size="lg"
                disabled={isSubmitting || watchItems.length === 0}
                className="min-w-[200px]"
            >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Procesando...' : 'Completar Venta'}
            </Button>
        </div>
       </main>
    </div>
  );
}

    