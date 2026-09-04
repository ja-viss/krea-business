
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, ChevronLeft, Plus, Save, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductSearch } from '@/components/sales/product-search';
import { CustomerSearch } from '@/components/sales/customer-search';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';

const quoteSchema = z.object({
  customerName: z.string().min(1, 'Cliente requerido'),
  customerId: z.string().optional(),
  expiryDays: z.coerce.number().min(1).max(30).default(7),
  notes: z.string().optional(),
  items: z.array(z.object({
    product: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.coerce.number().min(1),
    taxRate: z.number()
  })).min(1, 'Añada al menos un producto')
});

export default function NewQuotePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof quoteSchema>>({
        resolver: zodResolver(quoteSchema),
        defaultValues: { customerName: 'Cliente Contado', expiryDays: 7, items: [] }
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    const watchItems = form.watch('items');

    const total = watchItems.reduce((acc, i) => acc + (i.price * i.quantity * (1 + i.taxRate)), 0);

    const handleProductSelect = (product: any, qty: number = 1) => {
        const existing = fields.findIndex(f => f.product === String(product._id));
        if (existing > -1) {
            update(existing, { ...fields[existing], quantity: fields[existing].quantity + qty });
        } else {
            append({
                product: String(product._id),
                name: product.name,
                price: product.price,
                quantity: qty,
                taxRate: product.taxRate
            });
        }
    };

    const onSubmit = async (values: z.infer<typeof quoteSchema>) => {
        setIsSubmitting(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, storeId })
            });
            if (!res.ok) throw new Error("Error al guardar");
            toast({ title: "Presupuesto Generado", description: "La cotización ha sido guardada con éxito." });
            router.push('/quotes');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Nuevo Presupuesto" 
                    description="Genera una propuesta formal para tu cliente."
                    actions={<Button variant="ghost" asChild><Link href="/quotes"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
                />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8 space-y-6">
                                <Card className='border-2 shadow-lg'>
                                    <CardHeader className='bg-muted/10'>
                                        <CardTitle className='text-sm font-black uppercase flex items-center gap-2'><Plus className='h-4 w-4'/> Añadir Productos</CardTitle>
                                    </CardHeader>
                                    <CardContent className='pt-6'>
                                        <ProductSearch onProductSelect={handleProductSelect} />
                                        <div className="mt-6 rounded-xl border-2 overflow-hidden">
                                            <Table>
                                                <TableHeader className='bg-muted/50'>
                                                    <TableRow>
                                                        <TableHead className='font-bold uppercase text-[10px]'>Descripción</TableHead>
                                                        <TableHead className='text-right font-bold uppercase text-[10px]'>Precio</TableHead>
                                                        <TableHead className='text-center font-bold uppercase text-[10px]'>Cant.</TableHead>
                                                        <TableHead className='text-right font-bold uppercase text-[10px]'>Subtotal</TableHead>
                                                        <TableHead className='w-[40px]'></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {fields.length > 0 ? fields.map((item, idx) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className='font-bold text-xs uppercase'>{item.name}</TableCell>
                                                            <TableCell className='text-right font-mono text-xs'>{item.price.toLocaleString('es-VE')}</TableCell>
                                                            <TableCell className='text-center'>
                                                                <Input type="number" className='w-16 h-8 mx-auto text-center font-bold' {...form.register(`items.${idx}.quantity`)} />
                                                            </TableCell>
                                                            <TableCell className='text-right font-black text-xs text-primary'>
                                                                {(item.price * item.quantity).toLocaleString('es-VE')}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" className='h-8 w-8 text-red-500' onClick={() => remove(idx)}><Trash2 className='h-4 w-4'/></Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className='h-32 text-center text-muted-foreground italic'>Cargue productos para cotizar</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className='text-xs uppercase font-black'>Notas / Condiciones</CardTitle></CardHeader>
                                    <CardContent>
                                        <Textarea placeholder="Ej: Entrega inmediata, pago 50% anticipo..." {...form.register('notes')} />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <Card className='border-2 border-primary/20 bg-primary/[0.02]'>
                                    <CardHeader><CardTitle className='text-xs font-black uppercase text-primary'>Datos Comerciales</CardTitle></CardHeader>
                                    <CardContent className='space-y-4'>
                                        <div className='space-y-2'>
                                            <label className='text-[10px] font-black uppercase opacity-60'>Cliente</label>
                                            <CustomerSearch onCustomerSelect={(c) => {
                                                form.setValue('customerId', c._id);
                                                form.setValue('customerName', c.name);
                                            }} />
                                        </div>
                                        <FormField 
                                            control={form.control}
                                            name="expiryDays"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='text-[10px] font-black uppercase opacity-60'>Días de Validez</FormLabel>
                                                    <FormControl><Input type="number" className='font-bold' {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                    <CardFooter className='flex flex-col items-stretch border-t-2 border-primary/10 pt-6 bg-primary/5'>
                                        <div className='flex justify-between items-baseline mb-6'>
                                            <span className='font-black uppercase text-[10px] opacity-60'>Total Presupuesto</span>
                                            <span className='text-3xl font-black text-primary tracking-tighter'>
                                                {total.toLocaleString('es-VE')} <span className='text-xs'>BS</span>
                                            </span>
                                        </div>
                                        <Button type="submit" disabled={isSubmitting || fields.length === 0} className='w-full h-14 font-black uppercase shadow-xl'>
                                            {isSubmitting ? <Loader2 className='animate-spin h-5 w-5 mr-2'/> : <FileText className='mr-2 h-5 w-5'/>}
                                            Guardar Cotización
                                        </Button>
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
