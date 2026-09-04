
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Search, 
    RotateCcw, 
    ChevronLeft, 
    CheckCircle2, 
    AlertTriangle, 
    Loader2, 
    ShieldCheck, 
    CreditCard, 
    Coins, 
    ArrowRightLeft 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export default function NewReturnPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [invoiceQuery, setInvoiceNumber] = useState('');
    const [sale, setSale] = useState<any>(null);
    
    // Items seleccionados para devolver
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [reason, setReason] = useState('');
    const [method, setMethod] = useState<'Nota de Credito' | 'Reembolso' | 'Cambio'>('Nota de Credito');

    const handleSearchInvoice = async () => {
        setLoading(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/sales?storeId=${storeId}`);
            const sales = await res.json();
            const found = sales.find((s: any) => String(s.invoiceNumber) === invoiceQuery);
            
            if (!found) throw new Error("Factura no encontrada en el sistema.");
            
            setSale(found);
            setStep(2);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Fallo de Búsqueda", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (productId: string, maxQty: number) => {
        if (selectedItems[productId]) {
            const { [productId]: _, ...rest } = selectedItems;
            setSelectedItems(rest);
        } else {
            setSelectedItems({ ...selectedItems, [productId]: maxQty });
        }
    };

    const updateItemQty = (productId: string, val: string, maxQty: number) => {
        const qty = parseInt(val) || 0;
        if (qty > maxQty) return;
        setSelectedItems({ ...selectedItems, [productId]: qty });
    };

    const totalToRefund = sale ? sale.items.reduce((acc: number, item: any) => {
        const qty = selectedItems[String(item.product?._id || item.product)] || 0;
        return acc + (item.price * qty * (1 + item.taxRate));
    }, 0) : 0;

    const handleSubmit = async () => {
        if (Object.keys(selectedItems).length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "Selecciona al menos un producto." });
            return;
        }
        if (!reason.trim()) {
            toast({ variant: 'destructive', title: "Justificación Requerida", description: "Indica el motivo de la devolución." });
            return;
        }

        setLoading(true);
        try {
            const itemsToReturn = sale.items
                .filter((i: any) => selectedItems[String(i.product?._id || i.product)])
                .map((i: any) => ({
                    product: i.product?._id || i.product,
                    name: i.name,
                    quantity: selectedItems[String(i.product?._id || i.product)],
                    price: i.price,
                    taxRate: i.taxRate
                }));

            const res = await fetch('/api/returns/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storeId: localStorage.getItem('storeId'),
                    userId: localStorage.getItem('userId'),
                    saleId: sale._id,
                    itemsToReturn,
                    compensationMethod: method,
                    reason
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast({ title: "Proceso Finalizado", description: "La devolución ha sido registrada y el inventario actualizado." });
            router.push('/returns');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Fallo de Servidor", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-4xl mx-auto w-full">
                <PageHeader 
                    title="Registrar Devolución" 
                    description="Secuencia de seguridad para anulación de facturas y reingreso de stock."
                    actions={<Button variant="ghost" onClick={() => router.back()}><ChevronLeft className='mr-1 h-4 w-4'/> Volver</Button>}
                />

                {/* STEP 1: BÚSQUEDA */}
                {step === 1 && (
                    <Card className='border-4 border-primary/20 shadow-2xl animate-in zoom-in-95'>
                        <CardHeader className='text-center bg-primary/5 pb-8'>
                            <div className='mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4'>
                                <Search className='h-8 w-8 text-primary' />
                            </div>
                            <CardTitle className='text-2xl font-black uppercase italic'>Localizar Factura Origen</CardTitle>
                            <CardDescription className='font-bold'>Ingresa el número correlativo de la venta que deseas procesar.</CardDescription>
                        </CardHeader>
                        <CardContent className='pt-10 max-w-md mx-auto space-y-4'>
                            <div className='space-y-2'>
                                <Label className='text-[10px] font-black uppercase opacity-60'>Número de Factura (Ej: 125)</Label>
                                <Input 
                                    className='text-3xl font-black h-16 text-center bg-muted/30 border-2' 
                                    placeholder="000000"
                                    value={invoiceQuery}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchInvoice()}
                                />
                            </div>
                            <Button className='w-full h-12 font-black uppercase shadow-xl' onClick={handleSearchInvoice} disabled={loading}>
                                {loading ? <Loader2 className='animate-spin' /> : "Validar Documento"}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* STEP 2: SELECCIÓN Y COMPENSACIÓN */}
                {step === 2 && sale && (
                    <div className='grid gap-6 lg:grid-cols-12 animate-in slide-in-from-right-4'>
                        <div className='lg:col-span-8 space-y-6'>
                            <Card className='border-2 shadow-lg'>
                                <CardHeader className='bg-muted/10 border-b flex flex-row justify-between items-center'>
                                    <div>
                                        <CardTitle className='text-xs font-black uppercase text-primary'>Factura Origen: #{String(sale.invoiceNumber).padStart(8, '0')}</CardTitle>
                                        <CardDescription className='text-[10px] font-bold uppercase'>Cliente: {sale.customerName}</CardDescription>
                                    </div>
                                    <Badge className='bg-green-100 text-green-800 border-green-200 uppercase font-black text-[9px]'>Validada</Badge>
                                </CardHeader>
                                <CardContent className='p-0'>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='pl-6 font-bold uppercase text-[10px]'>Producto</TableHead>
                                                <TableHead className='text-center font-bold uppercase text-[10px]'>Original</TableHead>
                                                <TableHead className='text-center font-bold uppercase text-[10px]'>Devolver</TableHead>
                                                <TableHead className='text-right pr-6 font-bold uppercase text-[10px]'>Anular</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sale.items.map((item: any, idx: number) => {
                                                const pId = String(item.product?._id || item.product);
                                                const isSelected = !!selectedItems[pId];
                                                return (
                                                    <TableRow key={idx} className={isSelected ? 'bg-red-50/50' : ''}>
                                                        <TableCell className='pl-6'>
                                                            <div className='flex items-center gap-3'>
                                                                <Checkbox 
                                                                    checked={isSelected} 
                                                                    onCheckedChange={() => toggleItem(pId, item.quantity)}
                                                                />
                                                                <div className='flex flex-col'>
                                                                    <span className='font-black uppercase text-[11px]'>{item.name}</span>
                                                                    <span className='text-[9px] opacity-60'>Ref: {item.price.toLocaleString('es-VE')} Bs</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='text-center font-bold opacity-40'>{item.quantity}</TableCell>
                                                        <TableCell className='text-center'>
                                                            <Input 
                                                                disabled={!isSelected}
                                                                type="number"
                                                                className='w-14 h-8 mx-auto text-center font-black p-1'
                                                                value={selectedItems[pId] || ''}
                                                                onChange={e => updateItemQty(pId, e.target.value, item.quantity)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className='text-right pr-6 font-black text-xs text-red-600'>
                                                            {isSelected ? (item.price * selectedItems[pId] * (1 + item.taxRate)).toLocaleString('es-VE') : '0.00'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                                <CardFooter className='bg-muted/10 border-t p-4'>
                                    <div className='w-full space-y-2'>
                                        <Label className='text-[10px] font-black uppercase text-muted-foreground'>Justificación del Retorno</Label>
                                        <Textarea 
                                            placeholder="Ej: Producto con defecto de fábrica / El cliente se confundió de talla..." 
                                            className='bg-white'
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                        />
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className='lg:col-span-4 space-y-6'>
                            <Card className='border-2 border-primary/20 bg-primary/[0.02] shadow-xl'>
                                <CardHeader className='bg-primary/5 pb-2'>
                                    <CardTitle className='text-[10px] font-black uppercase text-primary'>Compensación Sugerida</CardTitle>
                                </CardHeader>
                                <CardContent className='pt-6'>
                                    <RadioGroup value={method} onValueChange={(v: any) => setMethod(v)} className='space-y-3'>
                                        <div className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", method === 'Nota de Credito' ? "bg-white border-primary shadow-md" : "bg-muted/20 border-transparent")}>
                                            <div className='flex items-center gap-3'>
                                                <CreditCard className='h-4 w-4 text-primary' />
                                                <Label className='text-[11px] font-black uppercase cursor-pointer'>Nota de Crédito</Label>
                                            </div>
                                            <RadioGroupItem value="Nota de Credito" />
                                        </div>
                                        <div className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", method === 'Reembolso' ? "bg-white border-red-500 shadow-md" : "bg-muted/20 border-transparent")}>
                                            <div className='flex items-center gap-3'>
                                                <Coins className='h-4 w-4 text-red-500' />
                                                <Label className='text-[11px] font-black uppercase cursor-pointer'>Reembolso (Cash)</Label>
                                            </div>
                                            <RadioGroupItem value="Reembolso" />
                                        </div>
                                        <div className={cn("flex items-center justify-between p-3 rounded-xl border-2 transition-all", method === 'Cambio' ? "bg-white border-blue-500 shadow-md" : "bg-muted/20 border-transparent")}>
                                            <div className='flex items-center gap-3'>
                                                <ArrowRightLeft className='h-4 w-4 text-blue-500' />
                                                <Label className='text-[11px] font-black uppercase cursor-pointer'>Cambio Directo</Label>
                                            </div>
                                            <RadioGroupItem value="Cambio" />
                                        </div>
                                    </RadioGroup>

                                    <div className='mt-8 pt-6 border-t-2 border-dashed border-primary/10 flex justify-between items-baseline'>
                                        <span className='text-[10px] font-black uppercase opacity-60'>Total a Devolver</span>
                                        <div className='text-right'>
                                            <span className='text-2xl font-black text-red-600 tracking-tighter'>{totalToRefund.toLocaleString('es-VE')}</span>
                                            <span className='ml-1 text-xs font-black text-red-600 uppercase italic'>Bs</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className='p-6 pt-0'>
                                    <div className='w-full flex flex-col gap-4'>
                                        <div className='p-3 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-2'>
                                            <ShieldCheck className='h-4 w-4 text-amber-600 shrink-0 mt-0.5' />
                                            <p className='text-[9px] font-bold text-amber-800 leading-tight'>
                                                ALERTA: Al procesar, el stock se sumará al inventario y se anulará el débito fiscal proporcional.
                                            </p>
                                        </div>
                                        <Button 
                                            className='w-full h-16 text-lg font-black uppercase shadow-2xl bg-red-600 hover:bg-red-700' 
                                            disabled={loading || totalToRefund <= 0}
                                            onClick={handleSubmit}
                                        >
                                            {loading ? <Loader2 className='animate-spin' /> : <RotateCcw className='mr-2 h-6 w-6'/>}
                                            Ejecutar Devolución
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
