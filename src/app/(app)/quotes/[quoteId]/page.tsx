
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ArrowRight, Printer, Loader2, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);

    const fetchQuote = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/quotes?storeId=${localStorage.getItem('storeId')}`);
            const data = await res.json();
            const found = data.find((q: any) => q._id === params.quoteId);
            setQuote(found);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, [params.quoteId]);

    const handleConvert = async () => {
        setConverting(true);
        try {
            const res = await fetch(`/api/quotes/${params.quoteId}/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethod: 'Efectivo' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast({ title: "Conversión Exitosa", description: "La cotización ha sido facturada." });
            router.push(`/sales/${data.saleId}/invoice?print=true`);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Stock", description: e.message });
        } finally {
            setConverting(false);
        }
    };

    if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin h-10 w-10 text-primary'/></div>;
    if (!quote) return <div className='p-12 text-center font-black'>Cotización no encontrada.</div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-4xl mx-auto w-full">
                <PageHeader 
                    title={`Cotización COT-${String(quote.quotationNumber).padStart(6, '0')}`} 
                    description={`Para: ${quote.customerName}`}
                    actions={<Button variant="outline" onClick={() => router.back()}><ChevronLeft className='mr-1 h-4 w-4'/> Volver</Button>}
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className='md:col-span-2 border-2 shadow-sm'>
                        <CardHeader className='border-b bg-muted/5'>
                            <CardTitle className='text-xs font-black uppercase opacity-60'>Detalle de Productos</CardTitle>
                        </CardHeader>
                        <CardContent className='p-0'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='pl-6 font-bold uppercase text-[10px]'>Item</TableHead>
                                        <TableHead className='text-center font-bold uppercase text-[10px]'>Cant</TableHead>
                                        <TableHead className='text-right pr-6 font-bold uppercase text-[10px]'>Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quote.items.map((item: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell className='pl-6'>
                                                <div className='flex flex-col'>
                                                    <span className='font-black uppercase text-xs'>{item.name}</span>
                                                    <span className='text-[10px] opacity-60'>@ {item.price.toLocaleString('es-VE')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center font-bold'>{item.quantity}</TableCell>
                                            <TableCell className='text-right pr-6 font-black text-sm text-primary'>
                                                {(item.price * item.quantity).toLocaleString('es-VE')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {quote.notes && (
                            <CardFooter className='border-t p-4 bg-amber-50/30'>
                                <div className='flex gap-2 text-[10px] font-bold text-amber-800 italic'>
                                    <FileText className='h-3 w-3 mt-0.5'/>
                                    <p>{quote.notes}</p>
                                </div>
                            </CardFooter>
                        )}
                    </Card>

                    <div className='space-y-6'>
                        <Card className='border-2 border-primary/20 bg-primary/[0.02] overflow-hidden'>
                            <CardHeader className='bg-primary/5 pb-2'>
                                <CardTitle className='text-[10px] font-black uppercase text-primary'>Resumen Fiscal</CardTitle>
                            </CardHeader>
                            <CardContent className='pt-4 space-y-3'>
                                <div className='flex justify-between text-xs font-bold'><span>Base Imponible</span><span>{quote.subtotals.general.toLocaleString()}</span></div>
                                <div className='flex justify-between text-xs font-bold'><span>IVA (16%)</span><span>{quote.taxDetails.general.toLocaleString()}</span></div>
                                <div className='flex justify-between text-xs font-bold text-muted-foreground'><span>Exento</span><span>{quote.subtotals.exempt.toLocaleString()}</span></div>
                                <div className='pt-3 border-t-2 border-primary/10 flex justify-between items-baseline'>
                                    <span className='text-xs font-black uppercase'>Total</span>
                                    <span className='text-2xl font-black text-primary tracking-tighter'>{quote.totalAmount.toLocaleString('es-VE')} Bs</span>
                                </div>
                            </CardContent>
                            <CardFooter className='p-4 bg-primary/5 flex flex-col gap-2'>
                                <div className='w-full flex items-center justify-between text-[10px] font-black uppercase opacity-60'>
                                    <span>Válido hasta:</span>
                                    <span>{format(new Date(quote.expiryDate), 'dd/MM/yyyy')}</span>
                                </div>
                            </CardFooter>
                        </Card>

                        {quote.status === 'Pendiente' ? (
                            <Button onClick={handleConvert} disabled={converting} className='w-full h-16 text-lg font-black uppercase shadow-2xl bg-green-600 hover:bg-green-700'>
                                {converting ? <Loader2 className='animate-spin mr-2'/> : <ArrowRight className='mr-2 h-6 w-6'/>}
                                Convertir a Factura
                            </Button>
                        ) : quote.status === 'Convertida' ? (
                            <div className='bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center space-y-2'>
                                <CheckCircle2 className='h-10 w-10 text-green-600 mx-auto'/>
                                <p className='text-sm font-black text-green-800 uppercase'>Cotización Facturada</p>
                                <p className='text-[10px] font-bold text-green-600 italic'>El stock fue descontado y la operación está cerrada.</p>
                            </div>
                        ) : (
                            <div className='bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center space-y-2'>
                                <AlertTriangle className='h-10 w-10 text-red-600 mx-auto'/>
                                <p className='text-sm font-black text-red-800 uppercase'>Presupuesto Vencido</p>
                            </div>
                        )}
                        
                        <Button variant="outline" className='w-full h-12 font-bold' onClick={() => window.print()}>
                            <Printer className='mr-2 h-4 w-4'/> Imprimir Propuesta
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
