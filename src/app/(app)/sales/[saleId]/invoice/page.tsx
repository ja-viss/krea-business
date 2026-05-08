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
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function InvoicePage() {
    const params = useParams();
    const saleId = params.saleId as string;

    const [sale, setSale] = useState<ISalePopulated | null>(null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { rates } = useExchangeRates();

    useEffect(() => {
        if (saleId) {
            const fetchData = async () => {
                try {
                    setLoading(true);
                    const storeId = localStorage.getItem('storeId');
                    
                    const [saleRes, storeRes] = await Promise.all([
                        fetch(`/api/sales/${saleId}`),
                        fetch(`/api/settings/store?storeId=${storeId}`)
                    ]);

                    if (!saleRes.ok) throw new Error('No se pudo encontrar la factura.');
                    
                    const saleData: ISalePopulated = await saleRes.json();
                    setSale(saleData);

                    if (storeRes.ok) {
                        const storeData = await storeRes.json();
                        setStore(storeData);
                    }
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
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
                <Skeleton className="w-full max-w-2xl h-[1000px]" />
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
                        <ArrowLeft className='mr-2 h-4 w-4' />
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
                    {/* ENCABEZADO FISCAL */}
                    <div className="flex flex-col gap-1 border-b pb-4 print:text-center print:border-solid print:border-black">
                        <h1 className="text-xl font-black uppercase text-black print:text-black">
                            {store?.name || 'SU EMPRESA'}
                        </h1>
                        <p className="text-sm font-bold text-black">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-xs font-bold text-black uppercase">{store?.seniatCondition || 'Contribuyente Ordinario'}</p>
                        <p className="text-xs font-bold text-black">{store?.address || 'Dirección de la empresa'}</p>
                        <p className="text-xs font-bold text-black">TEL: {store?.phone || ''}</p>
                        <div className="mt-2 text-2xl font-black text-primary print:text-black">FACTURA</div>
                    </div>

                    {/* DATOS DE LA FACTURA */}
                    <div className="grid grid-cols-1 gap-1 border-b py-4 text-sm font-bold text-black print:border-solid print:border-black">
                         <div className='flex justify-between'>
                             <span>Fecha:</span> <span>{formatShortDate(String(sale.createdAt))}</span>
                         </div>
                         <div className='flex justify-between'>
                             <span>Hora:</span> <span>{formatTime(String(sale.createdAt))}</span>
                         </div>
                         <div className='flex justify-between'>
                            <span>Factura Nº:</span> <span className='font-black'>{`00-${String(sale.invoiceNumber).padStart(8, '0')}`}</span>
                         </div>
                         <div className='flex justify-between'>
                            <span>Control Nº:</span> <span>{`01-${String(sale.invoiceNumber).padStart(8, '0')}`}</span>
                         </div>
                    </div>

                    {/* DATOS DEL CLIENTE */}
                    <div className="grid grid-cols-1 gap-1 border-b py-4 text-sm font-bold text-black print:border-solid print:border-black">
                        <div className="uppercase text-[10px] text-black/70 mb-1">Datos del Cliente</div>
                        <div className='flex justify-between'><span>Cliente:</span> <span className='font-black uppercase'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>CI/RIF:</span> <span className='font-black uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                        <div className='flex justify-between mt-2 pt-2 border-t border-dotted border-black/30'>
                            <span>Tasa BCV:</span> <span className='font-mono'>{tasaBcv.toFixed(2)} VES/USD</span>
                        </div>
                    </div>
                    
                    {/* ITEMS */}
                    <div className='mt-4'>
                        <div className='hidden md:grid grid-cols-6 text-xs font-black uppercase border-b border-black pb-2 mb-2 print:grid'>
                            <div className='col-span-3'>Descripción</div>
                            <div className='text-center'>Cant</div>
                            <div className='text-right'>P.Unit</div>
                            <div className='text-right'>Total</div>
                        </div>
                        <div className='space-y-3 print:space-y-2'>
                            {sale.items.map((item: any) => (
                                <div key={item._id} className='grid grid-cols-6 text-sm font-bold text-black items-start gap-1 print:text-[11px]'>
                                    <div className='col-span-3 flex flex-col'>
                                        <span className='font-black uppercase leading-tight'>{item.name}</span>
                                        <span className='text-[9px] uppercase'>IVA: {getTaxCondition(item.taxRate)}</span>
                                    </div>
                                    <div className='text-center'>{item.quantity}</div>
                                    <div className='text-right'>{formatCurrency(item.price / tasaBcv, 'USD').replace('$', '')}</div>
                                    <div className='text-right font-black'>{formatCurrency((item.price * item.quantity) / tasaBcv, 'USD').replace('$', '')}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator className="my-6 border-black/30 print:my-4 print:border-solid print:border-black" />

                    {/* TOTALES */}
                    <div className="flex flex-col gap-2 text-sm font-bold text-black ml-auto w-full md:w-1/2 print:w-full print:text-[12px]">
                         <div className="flex justify-between">
                            <span>Monto Exento:</span>
                            <span className='font-black'>{formatCurrency(totalExentoVES, 'VES')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Base Imponible (16%):</span>
                            <span className='font-black'>{formatCurrency(sale.subtotals?.general || 0, 'VES')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>IVA (16%):</span>
                            <span className='font-black'>{formatCurrency(sale.taxDetails?.general || 0, 'VES')}</span>
                        </div>
                        <Separator className='my-1 border-black'/>
                         <div className="flex justify-between text-xl font-black">
                            <span>TOTAL VES:</span>
                            <span>{formatCurrency(sale.totalAmount, 'VES')}</span>
                        </div>
                        <div className="flex justify-between text-black/70 font-mono text-[11px] italic">
                            <span>REF. USD:</span>
                            <span>{formatCurrency(totalInUSD, 'USD')}</span>
                        </div>
                    </div>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-8 border-t border-black pt-4 text-center text-[11px] font-black uppercase space-y-1 print:border-solid print:border-black">
                        <p>Pago: {sale.paymentMethod}</p>
                        <p>{store?.footerMessage || 'Gracias por su compra'}</p>
                        <p className='italic text-[9px] leading-tight'>Esta factura no es válida sin la inscripción de las cifras en el dispositivo de seguridad.</p>
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
                        color: #000 !important;
                        -webkit-print-color-adjust: exact;
                    }
                    header, footer, nav, aside, button {
                        display: none !important;
                    }
                    main {
                         padding: 0 !important;
                         margin: 0 !important;
                         width: 100% !important;
                         background: white !important;
                    }
                    
                    /* Fuerza el color negro para impresoras térmicas */
                    * {
                        color: #000 !important;
                        text-shadow: none !important;
                        box-shadow: none !important;
                    }

                    /* Optimización para POS 58mm / 80mm */
                    .print-thermal {
                        width: 100%;
                        max-width: 80mm;
                        margin: 0 auto;
                    }
                }
            `}</style>
        </main>
    );
}
