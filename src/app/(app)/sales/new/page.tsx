
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
import { Label } from '@/components/ui/label';
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
    X,
    Scale,
    Monitor,
    UserCheck,
    WifiOff,
    Usb
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
    quantity: z.coerce.number().min(0.001, 'Cantidad inválida'),
    stock: z.number(),
    taxRate: z.number(),
    isWeightable: z.boolean().optional()
  })).min(1, 'Debes añadir al menos un producto.'),
  paymentMethod: z.enum(['Efectivo', 'Tarjeta', 'Transferencia', 'Pago Móvil'], {
    required_error: 'Selecciona un método de pago.',
  }),
  paymentReference: z.string().optional(),
  paymentCurrency: z.enum(['USD', 'VES', 'COP']).optional(),
  amountReceived: z.coerce.number().default(0),
});

type SaleFormValues = z.infer<typeof saleSchema>;

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const { rates, loading: ratesLoading } = useExchangeRates();
  const [isClient, setIsClient] = useState(false);
  const [readingScale, setReadingScale] = useState<string | null>(null);
  
  // Estados de Hardware
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    // Simulación de detección de hardware (en prod verificaría puertos vinculados)
    const scaleConfig = localStorage.getItem('hardware_scale');
    const printerConfig = localStorage.getItem('hardware_printer');
    if (scaleConfig) setIsScaleConnected(true);
    if (printerConfig) setIsPrinterConnected(true);
  }, []);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerName: 'Cliente Contado',
      items: [],
      paymentMethod: 'Efectivo',
      paymentCurrency: 'USD',
      amountReceived: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchPaymentCurrency = form.watch('paymentCurrency');
  const watchAmountReceived = form.watch('amountReceived');

  const handleProductSelect = (product: IProduct, quantity: number = 1) => {
    const existingItemIndex = fields.findIndex(item => item.productId === String(product._id));

    if (existingItemIndex > -1) {
      const existingItem = fields[existingItemIndex];
      update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + quantity });
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

  const handleWeightCapture = (index: number) => {
      if (!isScaleConnected) {
          toast({ variant: 'destructive', title: "Hardware no listo", description: "Vincule la balanza en Configuración > Hardware." });
          return;
      }
      setReadingScale(fields[index].productId);
      setTimeout(() => {
          const simulatedWeight = (Math.random() * 2 + 0.5).toFixed(3);
          update(index, { ...fields[index], quantity: parseFloat(simulatedWeight) });
          setReadingScale(null);
          toast({ title: "Peso Capturado", description: `${simulatedWeight} Kg recibidos de balanza.` });
      }, 800);
  };

  const { totalVES, totalUSD } = useMemo(() => {
    let general = 0;
    let exempt = 0;
    watchItems.forEach(i => {
        const sub = i.price * i.quantity;
        if (i.taxRate === 0) exempt += sub; else general += sub;
    });
    const ves = (general * 1.16) + exempt;
    const usd = rates.usd?.usd ? ves / rates.usd.usd : 0;
    return { totalVES: ves, totalUSD: usd };
  }, [watchItems, rates]);

  const onSubmit = async (data: SaleFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/sales/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error en servidor");
        }
        const result = await response.json();
        router.push(`/sales/${result._id}/invoice?print=true`);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error POS', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen overflow-hidden">
       <main className="flex-1 space-y-4 p-4 md:px-8 pt-6 pb-24 overflow-y-auto">
            <PageHeader
                title="POS Industrial"
                description="Terminal de alta velocidad orientada a teclado."
                actions={
                    <div className='flex gap-2'>
                        <Button variant="outline" className='bg-primary/5 text-primary border-primary/20'>
                            <Monitor className='mr-2 h-4 w-4' /> Visor de Cliente
                        </Button>
                        <Button variant="ghost" asChild><Link href="/sales"><ChevronLeft className="mr-1 h-4 w-4" /> Salir</Link></Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-4">
                    <Card className='shadow-lg border-2 overflow-visible z-[50]'>
                        <CardContent className="pt-6">
                            <ProductSearch inputRef={productSearchRef} onProductSelect={handleProductSelect} />
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-2 shadow-xl">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className='bg-muted/50'>
                                    <TableRow>
                                        <TableHead className="pl-4 font-black uppercase text-[10px]">Producto</TableHead>
                                        <TableHead className="text-center font-black uppercase text-[10px]">Peso/Cant</TableHead>
                                        <TableHead className="text-right pr-4 font-black uppercase text-[10px]">Total</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.length > 0 ? fields.map((item, index) => (
                                        <TableRow key={item.id} className='group'>
                                            <TableCell className="pl-4">
                                                <div className='flex flex-col'>
                                                    <span className='font-black uppercase text-xs'>{item.name}</span>
                                                    <span className='text-[9px] opacity-60'>Ref: {item.price.toLocaleString('es-VE')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex items-center justify-center gap-2'>
                                                    <Input 
                                                        type="number" 
                                                        className='w-20 h-9 text-center font-black text-sm border-2' 
                                                        {...form.register(`items.${index}.quantity`)} 
                                                    />
                                                    {item.isWeightable && (
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className={cn("h-9 w-9 border-2", readingScale === item.productId ? "animate-pulse border-primary text-primary" : "")}
                                                            onClick={() => handleWeightCapture(index)}
                                                        >
                                                            <Scale className='h-4 w-4'/>
                                                        </Button>
                                                    )}
                                                </div>
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
                                                Presione F1 o empiece a escribir para buscar productos...
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-4">
                    {/* MODULO DE CLIENTE REINCORPORADO */}
                    <Card className='shadow-lg border-2 border-dashed overflow-visible z-[40]'>
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
                                        <span className='text-[10px] font-black uppercase text-primary leading-tight'>{selectedCustomer.name}</span>
                                        <span className='text-[8px] font-mono opacity-60'>{selectedCustomer.idNumber}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className='h-5 w-5 text-red-500' onClick={() => {
                                        form.setValue('customerId', undefined);
                                        form.setValue('customerName', 'Cliente Contado');
                                        setSelectedCustomer(null);
                                    }}>
                                        <X className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className='shadow-2xl border-4 border-primary/30 bg-primary/[0.02]'>
                        <CardHeader className='pb-2 bg-primary/10 border-b border-primary/20'>
                            <CardTitle className='text-lg font-black uppercase italic text-primary'>Total Cobro (F4)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="p-4 bg-white rounded-xl border-2 shadow-inner space-y-4">
                                <div className='flex justify-between items-center'>
                                    <span className='text-[10px] font-black uppercase opacity-40 italic'>Subtotal Neto</span>
                                    <span className='font-bold'>{totalVES.toLocaleString('es-VE')} Bs</span>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <span className='text-[10px] font-black uppercase opacity-40 italic'>Impuestos (IVA)</span>
                                    <span className='font-bold text-green-600'>Incluido</span>
                                </div>
                                <Separator />
                                <div className='flex justify-between items-end'>
                                    <span className='text-xs font-black uppercase text-primary'>Total a Pagar</span>
                                    <div className='text-right'>
                                        <p className='text-4xl font-black text-primary tracking-tighter leading-none'>
                                            {totalVES.toLocaleString('es-VE')} <span className='text-sm'>BS</span>
                                        </p>
                                        <p className='text-sm font-bold text-muted-foreground mt-1'>
                                            ≈ ${totalUSD.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-2'>
                                <div className='space-y-1'>
                                    <Label className='text-[9px] font-black uppercase opacity-60'>Método de Pago</Label>
                                    <Select 
                                        defaultValue="Efectivo" 
                                        onValueChange={(val: any) => form.setValue('paymentMethod', val)}
                                    >
                                        <SelectTrigger className='font-bold'><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Efectivo" className='font-bold'>EFECTIVO</SelectItem>
                                            <SelectItem value="Tarjeta" className='font-bold'>TARJETA POS</SelectItem>
                                            <SelectItem value="Pago Móvil" className='font-bold'>PAGO MÓVIL</SelectItem>
                                            <SelectItem value="Transferencia" className='font-bold'>TRANSFERENCIA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-[9px] font-black uppercase opacity-60'>Moneda Pago</Label>
                                    <Select 
                                        defaultValue="VES" 
                                        onValueChange={(val: any) => form.setValue('paymentCurrency', val)}
                                    >
                                        <SelectTrigger className='font-bold'><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VES" className='font-bold'>BOLÍVARES</SelectItem>
                                            <SelectItem value="USD" className='font-bold'>DÓLARES</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <Button 
                                type="button"
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={isSubmitting || watchItems.length === 0}
                                className="w-full h-20 font-black uppercase text-xl shadow-2xl rounded-2xl bg-primary hover:bg-primary/90"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Printer className="mr-2 h-8 w-8" />}
                                FACTURAR VENTA
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
       </main>
       
       <footer className="fixed bottom-0 w-full bg-black text-white py-2 px-6 flex items-center justify-between z-50 border-t-4 border-primary">
            <div className='flex gap-8'>
                <div className='flex gap-2 items-center'>
                    <Badge className={cn("font-black", isScaleConnected ? "bg-primary" : "bg-red-600")}>
                        {isScaleConnected ? "USB" : "OFF"}
                    </Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>
                        {isScaleConnected ? "Balanza Conectada" : "Balanza Desconectada"}
                    </span>
                </div>
                <div className='flex gap-2 items-center'>
                    <Badge className={cn("font-black", isPrinterConnected ? "bg-green-600" : "bg-red-600")}>
                        {isPrinterConnected ? "NET" : "OFF"}
                    </Badge>
                    <span className='text-[10px] font-bold uppercase tracking-tighter opacity-80'>
                        {isPrinterConnected ? "Impresora Red OK" : "Impresora Desconectada"}
                    </span>
                </div>
            </div>
            <div className='hidden sm:flex gap-4'>
                <div className='flex items-center gap-1.5 opacity-60'>
                    <Badge variant="outline" className='text-white border-white/20 text-[9px]'>F1</Badge>
                    <span className='text-[9px] font-black uppercase'>PRODUCTO</span>
                </div>
                <div className='flex items-center gap-1.5 opacity-60'>
                    <Badge variant="outline" className='text-white border-white/20 text-[9px]'>F2</Badge>
                    <span className='text-[9px] font-black uppercase'>CLIENTE</span>
                </div>
                <div className='flex items-center gap-1.5 opacity-60'>
                    <Badge variant="outline" className='text-white border-white/20 text-[9px]'>F4</Badge>
                    <span className='text-[9px] font-black uppercase'>COBRAR</span>
                </div>
            </div>
            <div className='bg-white/10 px-4 py-1 rounded font-mono text-xs font-black'>
                TASA BCV: {rates.usd?.usd.toFixed(2)}
            </div>
       </footer>
    </div>
  );
}
