
'use client';

import { useState, useEffect, KeyboardEvent, useMemo } from 'react';
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
  TableFooter,
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


const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(), // Precio en VES
    quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1'),
    stock: z.number(),
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

  const totalAmountVES = useMemo(() => {
      return watchItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [watchItems]);

  const totalAmountUSD = useMemo(() => {
    if (!rates.usd || !rates.usd.usd) return 0;
    return totalAmountVES / rates.usd.usd;
  }, [totalAmountVES, rates.usd]);

  const totalAmountCOP = useMemo(() => {
    if (!rates.cop || !rates.cop.rate) return 0;
    return totalAmountUSD * rates.cop.rate;
  }, [totalAmountUSD, rates.cop]);


  const getAmountInSelectedCurrency = useMemo(() => {
    switch(watchPaymentCurrency) {
        case 'VES': return totalAmountVES;
        case 'COP': return totalAmountCOP;
        case 'USD':
        default: return totalAmountUSD;
    }
  }, [watchPaymentCurrency, totalAmountUSD, totalAmountVES, totalAmountCOP]);

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
      form.setValue('customerName', customer.name);
  };


  const onSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se encontró la tienda. Por favor, inicia sesión de nuevo.');
        }

        const payload = {
            ...data,
            customerName: data.customerName || 'Cliente General',
            storeId,
            amount: totalAmountVES, // La BD almacena el total en VES para consistencia
        }

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
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <PageHeader
                    title="Nueva Venta"
                    description="Busca productos, añade clientes y registra una nueva transacción."
                    actions={
                        <div className="flex gap-2">
                           <Button variant="outline" asChild>
                             <Link href="/sales">
                                <ChevronLeft />
                                Cancelar
                             </Link>
                           </Button>
                            <Button type="submit" disabled={isSubmitting || watchItems.length === 0}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Procesando...' : 'Completar Venta'}
                            </Button>
                        </div>
                    }
                />

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
                                    {fields.length > 0 && (
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-bold text-lg">Total (VES)</TableCell>
                                                <TableCell className="text-right font-bold text-lg">{formatCurrency(totalAmountVES, 'VES')}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    )}
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
                                 <CustomerSearch
                                    onCustomerSelect={handleCustomerSelect}
                                    selectedCustomerName={form.watch('customerName') || ''}
                                />
                                <FormField
                                    control={form.control}
                                    name="customerName"
                                    render={({ field }) => (
                                        <FormItem className='hidden'>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
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
                            <CardFooter className='flex flex-col items-stretch bg-muted/50 p-4 border-t gap-2'>
                                <div className='flex justify-between items-center text-xl font-bold'>
                                    <span>TOTAL A PAGAR:</span>
                                </div>
                                <div className='flex justify-between items-center text-lg font-semibold'>
                                    <span>En Bolívares (VES):</span>
                                    <span>{ratesLoading.usd ? '...' : formatCurrency(totalAmountVES, 'VES')}</span>
                                </div>
                                 <div className='flex justify-between items-center text-sm text-muted-foreground'>
                                    <span>En Dólares (USD):</span>
                                    <span>{ratesLoading.usd ? '...' : formatCurrency(totalAmountUSD, 'USD')}</span>
                                 </div>
                                 <div className='flex justify-between items-center text-sm text-muted-foreground'>
                                    <span>En Pesos (COP):</span>
                                    <span>{ratesLoading.cop ? '...' : formatCurrency(totalAmountCOP, 'COP')}</span>
                                 </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </form>
         </Form>
       </main>
    </div>
  );
}

    