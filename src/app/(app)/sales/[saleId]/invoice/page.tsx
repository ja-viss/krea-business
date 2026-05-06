
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
        if (rate === 0) return 'E';
        return `G ${rate * 100}%`;
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
            <div className="w-full max-w-4xl space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center gap-4 print:hidden">
                    <Button variant="outline" asChild>
                        <Link href="/billing">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Facturación
                        </Link>
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Factura
                    </Button>
                </div>
                <Card className="p-6 md:p-12 shadow-lg print:shadow-none print:border-none print:p-0">
                    <div className="flex flex-col gap-2 border-b pb-4 print:text-center print:border-dashed">
                        <h1 className="text-xl font-bold uppercase">SOLUCIONES INTEGRALES, C.A.</h1>
                        <p className="text-sm font-semibold">RIF: J-40123456-7</p>
                        <p className="text-xs text-muted-foreground uppercase">Contribuyente Ordinario del IVA</p>
                        <p className="text-xs">Av. Las Industrias, Edif. Krea, Caracas.</p>
                        <div className="mt-2 text-2xl font-bold text-primary print:text-black">FACTURA</div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b py-4 text-sm print:border-dashed">
                         <div className='flex justify-between'>
                             <span className="font-semibold">Fecha:</span> <span>{formatShortDate(String(sale.createdAt))}</span>
                         </div>
                         <div className='flex justify-between'>
                             <span className="font-semibold">Hora:</span> <span>{formatTime(String(sale.createdAt))}</span>
                         </div>
                         <div className='flex justify-between'>
                            <span className="font-semibold">Factura Nº:</span> <span>{`00-${String(sale.invoiceNumber).padStart(8, '0')}`}</span>
                         </div>
                         <div className='flex justify-between'>
                            <span className="font-semibold">Control Nº:</span> <span>{`01-${String(sale.invoiceNumber).padStart(8, '0')}`}</span>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b py-4 text-sm print:border-dashed">
                        <div className="font-semibold uppercase text-xs text-muted-foreground mb-1">Datos del Cliente</div>
                        <div className='flex justify-between'><span>Cliente:</span> <span className='font-medium uppercase'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>CI/RIF:</span> <span className='font-medium uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                        <div className='flex justify-between mt-2 pt-2 border-t border-dotted'><span>Tasa BCV:</span> <span className='font-mono'>{tasaBcv.toFixed(2)} VES/USD</span></div>
                    </div>
                    
                    <div className='mt-4'>
                        <div className='hidden md:grid grid-cols-6 text-xs font-bold uppercase border-b pb-2 mb-2 print:grid'>
                            <div className='col-span-3'>Descripción</div>
                            <div className='text-center'>Cant</div>
                            <div className='text-right'>P.Unit</div>
                            <div className='text-right'>Total</div>
                        </div>
                        <div className='space-y-2'>
                            {sale.items.map((item: any) => (
                                <div key={item._id} className='grid grid-cols-6 text-sm items-start gap-1 print:text-xs'>
                                    <div className='col-span-3 flex flex-col'>
                                        <span className='font-medium uppercase'>{item.name}</span>
                                        <span className='text-[10px] text-muted-foreground'>IVA: {getTaxCondition(item.taxRate)}</span>
                                    </div>
                                    <div className='text-center'>{item.quantity}</div>
                                    <div className='text-right'>{formatCurrency(item.price / tasaBcv, 'USD').replace('$', '')}</div>
                                    <div className='text-right font-medium'>{formatCurrency((item.price * item.quantity) / tasaBcv, 'USD').replace('$', '')}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator className="my-6 print:my-4 print:border-dashed" />

                    <div className="flex flex-col gap-2 text-sm ml-auto w-full md:w-1/2 print:w-full">
                         <div className="flex justify-between">
                            <span>Monto Exento:</span>
                            <span className='font-medium'>{formatCurrency(totalExentoVES, 'VES')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Base Imponible (16%):</span>
                            <span className='font-medium'>{formatCurrency(sale.subtotals?.general || 0, 'VES')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>IVA (16%):</span>
                            <span className='font-medium'>{formatCurrency(sale.taxDetails?.general || 0, 'VES')}</span>
                        </div>
                        <Separator className='my-1'/>
                         <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL VES:</span>
                            <span>{formatCurrency(sale.totalAmount, 'VES')}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground font-mono text-xs italic">
                            <span>REF. USD:</span>
                            <span>{formatCurrency(totalInUSD, 'USD')}</span>
                        </div>
                    </div>

                    <div className="mt-8 border-t pt-4 text-center text-[10px] uppercase space-y-1 print:border-dashed">
                        <p className='font-bold'>Pago: {sale.paymentMethod}</p>
                        <p>Gracias por su compra</p>
                        <p className='italic'>Esta factura no es válida sin la inscripción de las cifras en el dispositivo de seguridad.</p>
                    </div>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        background-color: white !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        color: black !important;
                    }
                    header, footer, nav, aside, button {
                        display: none !important;
                    }
                    main {
                         padding: 0 !important;
                         margin: 0 !important;
                         width: 100% !important;
                    }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    .print\\:w-full { width: 100% !important; }
                    .print\\:text-center { text-align: center !important; }
                    .print\\:border-none { border: none !important; }
                    .print\\:border-dashed { border-bottom: 1px dashed black !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:text-black { color: black !important; }
                    
                    /* Optimización Térmica */
                    .print-thermal {
                        width: 80mm;
                        padding: 10px;
                    }
                    
                    /* Asegurar que el contenido no se corte */
                    * {
                        overflow: visible !important;
                    }
                }
            `}</style>
        </main>
    );
}
