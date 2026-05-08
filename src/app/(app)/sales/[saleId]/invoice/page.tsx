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

    const getTaxCondition = (rate: number): string => {
        if (rate === 0) return 'E';
        return `G ${rate * 100}%`;
    }

    if (loading) return <div className="flex justify-center p-8"><Skeleton className="w-full max-w-2xl h-[800px]" /></div>;

    if (error) return (
        <main className="p-8 space-y-4">
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <Button variant="outline" asChild><Link href="/billing"><ArrowLeft className='mr-2 h-4 w-4' />Volver</Link></Button>
        </main>
    );
    
    if (!sale || !rates.usd?.usd) return null;
    
    const tasaBcv = rates.usd.usd;
    const totalInUSD = sale.totalAmount / tasaBcv;
    
    return (
        <main className="flex-1 p-4 md:p-8 flex flex-col items-center bg-gray-100 dark:bg-gray-900 min-h-screen">
            <div className="w-full max-w-2xl space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden">
                    <Button variant="outline" asChild><Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" />Ventas</Link></Button>
                    <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
                </div>
                
                <Card className="p-6 md:p-8 shadow-lg print:shadow-none print:border-none print:p-0 bg-white">
                    {/* ENCABEZADO FISCAL - MUCHO MÁS OSCURO */}
                    <div className="flex flex-col gap-1 border-b-2 border-black pb-4 text-black text-center">
                        <h1 className="text-2xl font-black uppercase tracking-tight leading-none">
                            {store?.name || 'KREA BUSINESS'}
                        </h1>
                        <p className="text-base font-black">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-sm font-bold uppercase">{store?.seniatCondition || 'Contribuyente Ordinario'}</p>
                        <p className="text-xs font-bold leading-tight">{store?.address || 'Dirección de la empresa'}</p>
                        <p className="text-sm font-black">TEL: {store?.phone || ''}</p>
                        <div className="mt-4 text-3xl font-black border-2 border-black py-1">FACTURA</div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b-2 border-black py-4 text-sm font-black text-black">
                         <div className='flex justify-between'><span>FECHA:</span> <span>{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span></div>
                         <div className='flex justify-between'><span>HORA:</span> <span>{format(parseISO(String(sale.createdAt)), "hh:mm:ss a")}</span></div>
                         <div className='flex justify-between text-lg'><span>FACTURA Nº:</span> <span>{String(sale.invoiceNumber).padStart(8, '0')}</span></div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b-2 border-black py-4 text-sm font-black text-black">
                        <div className="text-[10px] opacity-70 mb-1">DATOS DEL CLIENTE</div>
                        <div className='flex justify-between'><span>CLIENTE:</span> <span className='uppercase'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>CI/RIF:</span> <span className='uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                        <div className='flex justify-between mt-2 pt-2 border-t border-dotted border-black'>
                            <span>TASA BCV:</span> <span>{tasaBcv.toFixed(2)} VES/USD</span>
                        </div>
                    </div>
                    
                    <div className='mt-4'>
                        <div className='grid grid-cols-6 text-xs font-black uppercase border-b-2 border-black pb-1 mb-2'>
                            <div className='col-span-3'>DESCRIPCIÓN</div>
                            <div className='text-center'>CANT</div>
                            <div className='text-right'>P.UNIT</div>
                            <div className='text-right'>TOTAL</div>
                        </div>
                        <div className='space-y-2'>
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className='grid grid-cols-6 text-[13px] font-black text-black items-start gap-1 leading-tight'>
                                    <div className='col-span-3 flex flex-col'>
                                        <span className='uppercase'>{item.name}</span>
                                        <span className='text-[9px]'>IVA: {getTaxCondition(item.taxRate)}</span>
                                    </div>
                                    <div className='text-center'>{item.quantity}</div>
                                    <div className='text-right'>{(item.price / tasaBcv).toFixed(2)}</div>
                                    <div className='text-right'>{(item.price * item.quantity / tasaBcv).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator className="my-6 h-[2px] bg-black" />

                    <div className="flex flex-col gap-1 text-sm font-black text-black ml-auto w-full md:w-2/3">
                         <div className="flex justify-between"><span>MONTO EXENTO:</span><span>{formatCurrency(sale.subtotals?.exempt || 0, 'VES')}</span></div>
                         <div className="flex justify-between"><span>BASE IMPONIBLE:</span><span>{formatCurrency(sale.subtotals?.general || 0, 'VES')}</span></div>
                         <div className="flex justify-between"><span>IVA (16%):</span><span>{formatCurrency(sale.taxDetails?.general || 0, 'VES')}</span></div>
                         <div className="flex justify-between text-2xl font-black mt-2 border-t-2 border-black pt-2">
                            <span>TOTAL VES:</span>
                            <span>{formatCurrency(sale.totalAmount, 'VES')}</span>
                        </div>
                        <div className="flex justify-between text-base italic mt-1 border-t border-black border-dotted">
                            <span>REF. USD:</span>
                            <span>{formatCurrency(totalInUSD, 'USD')}</span>
                        </div>
                    </div>

                    <div className="mt-8 border-t-2 border-black pt-4 text-center text-[12px] font-black uppercase space-y-2">
                        <p>MÉTODO: {sale.paymentMethod}</p>
                        <p className="text-sm">{store?.footerMessage || '¡GRACIAS POR SU COMPRA!'}</p>
                        <p className='italic text-[10px] leading-tight opacity-80'>FACTURA SIN VALOR FISCAL PARA EFECTOS DE PRUEBA</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white !important; color: black !important; }
                    header, footer, nav, aside, button { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
                    * { color: #000 !important; text-shadow: none !important; box-shadow: none !important; font-weight: 900 !important; }
                    .print-thermal { width: 100%; max-width: 58mm; margin: 0 auto; }
                }
            `}</style>
        </main>
    );
}
