
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft } from 'lucide-react';
import { ISalePopulated } from '@/models/Sale';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
    const saleId = params.saleId as string;

    const [sale, setSale] = useState<ISalePopulated | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { rates } = useExchangeRates();

    useEffect(() => {
        if (saleId) {
            const fetchSale = async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/sales/${saleId}`);
                    if (!response.ok) {
                        throw new Error('No se pudo encontrar la factura.');
                    }
                    const data: ISalePopulated = await response.json();
                    setSale(data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchSale();
        }
    }, [saleId]);
    
    const formatCurrency = (value: number, currency: 'VES' | 'USD' = 'VES') => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency, minimumFractionDigits: 2 };
        if (currency === 'VES') return new Intl.NumberFormat('es-VE', options).format(value);
        return new Intl.NumberFormat('en-US', options).format(value);
    };

    const formatShortDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(parseISO(dateString), "dd / MM / yyyy");
        } catch (e) {
            return "Fecha inválida";
        }
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(parseISO(dateString), "hh:mm:ss a");
        } catch(e) {
            return "Hora inválida";
        }
    };

    const getTaxCondition = (rate: number): string => {
        if (rate === 0) return 'Exento (E) 0%';
        return `Gravado ${rate * 100}%`;
    }

    if (loading) {
        return (
            <div className="flex justify-center p-4 md:p-8 bg-gray-100 dark:bg-gray-900">
                <Skeleton className="w-full max-w-4xl h-[1000px]" />
            </div>
        );
    }

    if (error) {
        return (
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" asChild>
                    <Link href="/billing">
                        <ArrowLeft />
                        Volver a Facturación
                    </Link>
                </Button>
            </main>
        );
    }
    
    if (!sale || !rates.usd?.usd) return null;
    
    const tasaBcv = rates.usd.usd;
    const totalInUSD = sale.totalAmount / tasaBcv;
    const totalExentoVES = sale.subtotals?.exempt || 0;
    const totalExentoUSD = totalExentoVES / tasaBcv;
    
    return (
        <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 flex justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-4xl space-y-4 print:space-y-2">
                 <div className="flex justify-between items-center gap-4 print:hidden">
                    <Button variant="outline" asChild>
                        <Link href="/billing">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Facturación
                        </Link>
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
                <Card className="p-6 md:p-8 shadow-lg print:shadow-none print:border-none">
                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div>
                            <h1 className="text-xl font-bold">SOLUCIONES INTEGRALES, C.A.</h1>
                            <p className="text-sm font-semibold">RIF: J-40123456-7</p>
                            <p className="text-xs text-muted-foreground">CONTRIBUYENTE ORDINARIO DEL IVA</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-primary">FACTURA</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b py-2 text-sm">
                         <div className='space-y-1'>
                             <p><span className="font-semibold">Fecha de Emisión:</span> {formatShortDate(String(sale.createdAt))}</p>
                             <p><span className="font-semibold">Hora de Emisión:</span> {formatTime(String(sale.createdAt))}</p>
                         </div>
                         <div className='space-y-1 text-right'>
                            <p><span className="font-semibold">Nº de Factura:</span> {`00-${String(sale.invoiceNumber).padStart(8, '0')}`}</p>
                            <p><span className="font-semibold">Nº de Control:</span> {`01-${String(sale.invoiceNumber).padStart(8, '0')}`}</p>
                         </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-b py-2 text-sm">
                        <div>
                            <p className="font-semibold">DATOS DEL CLIENTE:</p>
                            <p>Cliente: {sale.customerName}</p>
                            <p>CI/RIF: {sale.customer?.idNumber || 'N/A'}</p>
                        </div>
                        <div className='text-right'>
                            <p className='font-semibold'>TASA DE CONVERSIÓN:</p>
                            <p>TASA BCV APLICADA: {tasaBcv.toFixed(2)} VES/USD</p>
                        </div>
                    </div>
                    
                    <Table className='mt-4 text-xs'>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px] text-center">Cant.</TableHead>
                                <TableHead className="w-[60px]">Unidad</TableHead>
                                <TableHead>Descripción del Producto/Servicio</TableHead>
                                <TableHead>Condición Fiscal</TableHead>
                                <TableHead className="text-right">P. Unit (USD)</TableHead>
                                <TableHead className="text-right">Total Línea (USD)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item: any) => (
                                <TableRow key={item._id}>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell>UND</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{getTaxCondition(item.taxRate)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price / tasaBcv, 'USD')}</TableCell>
                                    <TableCell className="text-right">{formatCurrency((item.price * item.quantity) / tasaBcv, 'USD')}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className='text-xs text-muted-foreground'>
                            <p className='font-bold'>MÉTODO DE PAGO:</p>
                            <p>PAGO RECIBIDO EN {sale.paymentMethod.toUpperCase()}</p>
                        </div>

                         <div className="w-full space-y-1 text-sm">
                             <div className="flex justify-between">
                                <span className='font-semibold'>Total Monto Exento (E):</span>
                                <span>{formatCurrency(totalExentoUSD, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency(totalExentoVES, 'VES')}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className='font-semibold'>Base Imponible al 16%:</span>
                                <span>{formatCurrency((sale.subtotals?.general || 0) / tasaBcv, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency(sale.subtotals?.general || 0, 'VES')}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className='font-semibold'>Base Imponible al 8%:</span>
                                <span>{formatCurrency((sale.subtotals?.reduced || 0) / tasaBcv, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency(sale.subtotals?.reduced || 0, 'VES')}</span>
                            </div>
                            <Separator className='my-1'/>
                             <div className="flex justify-between">
                                <span className='font-semibold'>SUBTOTAL BASE IMPONIBLE:</span>
                                <span>{formatCurrency(((sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0)) / tasaBcv, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.reduced || 0), 'VES')}</span>
                            </div>
                            <Separator className='my-1'/>
                             <div className="flex justify-between">
                                <span className='font-semibold'>IVA Alícuota General (16%):</span>
                                <span>{formatCurrency((sale.taxDetails?.general || 0) / tasaBcv, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency(sale.taxDetails?.general || 0, 'VES')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className='font-semibold'>IVA Alícuota Reducida (8%):</span>
                                <span>{formatCurrency((sale.taxDetails?.reduced || 0) / tasaBcv, 'USD')}</span>
                                <span className='font-bold'>{formatCurrency(sale.taxDetails?.reduced || 0, 'VES')}</span>
                            </div>
                             <Separator className='my-1 bg-foreground'/>
                             <div className="flex justify-between text-base font-bold">
                                <span>TOTAL GENERAL:</span>
                                <span>{formatCurrency(totalInUSD, 'USD')}</span>
                                <span>{formatCurrency(sale.totalAmount, 'VES')}</span>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />
                     
                    <footer className="mt-4 text-center text-xs text-muted-foreground print:mt-2">
                        <p className='font-bold'>TOTAL A PAGAR: {formatCurrency(totalInUSD, 'USD')} ó {formatCurrency(sale.totalAmount, 'VES')} (según el método de pago).</p>
                        <p className='italic mt-2'>ESTA FACTURA NO ES VÁLIDA SIN LA INSCRIPCIÓN DE LAS CIFRAS EN EL DISPOSITIVO DE SEGURIDAD. VA SIN TACHADURAS NI ENMIENDAS.</p>
                    </footer>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                    }
                    main {
                         padding: 0 !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                     .print\\:border-none {
                        border: none !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:space-y-2 > :not([hidden]) ~ :not([hidden]) {
                        --tw-space-y-reverse: 0;
                        margin-top: calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));
                        margin-bottom: calc(0.5rem * var(--tw-space-y-reverse));
                    }
                    .print\\:mt-2 {
                        margin-top: 0.5rem !important;
                    }
                }
            `}</style>
        </main>
    );
}
