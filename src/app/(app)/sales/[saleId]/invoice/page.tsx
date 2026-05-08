
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

                    if (!saleRes.ok) {
                        const errData = await saleRes.json();
                        throw new Error(errData.message || 'No se pudo encontrar la factura.');
                    }
                    
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
            <Button variant="outline" asChild><Link href="/sales"><ArrowLeft className='mr-2 h-4 w-4' />Volver</Link></Button>
        </main>
    );
    
    if (!sale || !rates.usd?.usd) return null;
    
    const tasaBcv = rates.usd.usd;
    const totalInUSD = sale.totalAmount / tasaBcv;
    
    return (
        <main className="flex-1 p-4 md:p-8 flex flex-col items-center bg-gray-100 dark:bg-gray-900 min-h-screen">
            <div className="w-full max-w-md space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden">
                    <Button variant="outline" asChild><Link href="/sales"><ArrowLeft className="mr-2 h-4 w-4" />Ventas</Link></Button>
                    <Button onClick={() => window.print()} className="font-bold"><Printer className="mr-2 h-4 w-4" />Imprimir Factura</Button>
                </div>
                
                <Card className="p-4 md:p-6 shadow-lg print:shadow-none print:border-none print:p-0 bg-white text-black font-black card-fiscal">
                    <div className="flex flex-col gap-1 border-b-2 border-black pb-4 text-center">
                        <h1 className="text-xl font-black uppercase leading-tight">
                            {store?.name || 'KREA BUSINESS'}
                        </h1>
                        <p className="text-sm font-black">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-xs font-black uppercase">{store?.seniatCondition || 'Contribuyente Ordinario'}</p>
                        <p className="text-[10px] font-black leading-tight">{store?.address || 'Dirección de la empresa'}</p>
                        <p className="text-xs font-black">TEL: {store?.phone || ''}</p>
                        <div className="mt-2 text-2xl font-black border-2 border-black py-1">FACTURA</div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b-2 border-black py-2 text-xs font-black">
                         <div className='flex justify-between'><span>FECHA:</span> <span>{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span></div>
                         <div className='flex justify-between'><span>HORA:</span> <span>{format(parseISO(String(sale.createdAt)), "hh:mm:ss a")}</span></div>
                         <div className='flex justify-between text-base'><span>FACTURA Nº:</span> <span>{String(sale.invoiceNumber).padStart(8, '0')}</span></div>
                    </div>

                    <div className="grid grid-cols-1 gap-1 border-b-2 border-black py-2 text-xs font-black">
                        <div className="text-[9px] uppercase mb-1 underline">Datos del Cliente</div>
                        <div className='flex justify-between'><span>CLIENTE:</span> <span className='uppercase truncate max-w-[180px]'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>CI/RIF:</span> <span className='uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                    </div>
                    
                    <div className='mt-2'>
                        <div className='grid grid-cols-6 text-[10px] font-black uppercase border-b border-black pb-1 mb-1'>
                            <div className='col-span-3'>DESCRIPCIÓN</div>
                            <div className='text-center'>CANT</div>
                            <div className='text-right'>TOTAL</div>
                        </div>
                        <div className='space-y-1'>
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className='grid grid-cols-6 text-[11px] font-black items-start gap-1 leading-tight'>
                                    <div className='col-span-3 flex flex-col'>
                                        <span className='uppercase'>{item.name}</span>
                                        <span className='text-[8px]'>IVA: {getTaxCondition(item.taxRate)}</span>
                                    </div>
                                    <div className='text-center'>{item.quantity}</div>
                                    <div className='text-right col-span-2'>{(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <Separator className="my-2 h-[1px] bg-black" />

                    <div className="flex flex-col gap-1 text-[11px] font-black ml-auto w-full">
                         <div className="flex justify-between"><span>BASE IMPONIBLE:</span><span>{formatCurrency(sale.subtotals?.general || 0, 'VES')}</span></div>
                         <div className="flex justify-between"><span>IVA (16%):</span><span>{formatCurrency(sale.taxDetails?.general || 0, 'VES')}</span></div>
                         <div className="flex justify-between"><span>MONTO EXENTO:</span><span>{formatCurrency(sale.subtotals?.exempt || 0, 'VES')}</span></div>
                         <div className="flex justify-between text-xl font-black mt-1 border-t-2 border-black pt-1">
                            <span>TOTAL VES:</span>
                            <span>{formatCurrency(sale.totalAmount, 'VES')}</span>
                        </div>
                        <div className="flex justify-between text-sm italic mt-1 border-t border-black border-dotted">
                            <span>REF. USD:</span>
                            <span>{formatCurrency(totalInUSD, 'USD')}</span>
                        </div>
                        <div className="text-[9px] text-right italic">TASA BCV: {tasaBcv.toFixed(2)}</div>
                    </div>

                    <div className="mt-4 border-t-2 border-black pt-2 text-center text-[11px] font-black uppercase space-y-1">
                        <p>PAGO: {sale.paymentMethod}</p>
                        <p className="text-xs">{store?.footerMessage || '¡GRACIAS POR SU COMPRA!'}</p>
                        <div className="bg-black text-white py-1 px-2 text-[8px] mt-2 font-bold">
                            FACTURA SIN VALOR FISCAL - SOLO PRUEBAS
                        </div>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { background: white !important; color: black !important; font-family: 'Courier New', Courier, monospace !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    header, footer, nav, aside, button { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
                    * { color: #000 !important; text-shadow: none !important; box-shadow: none !important; font-weight: 900 !important; -webkit-text-stroke: 0.5px black; }
                    .card-fiscal { border: none !important; width: 100% !important; max-width: 58mm !important; padding: 2mm !important; }
                    hr, .border-black { border-color: black !important; border-width: 1.5pt !important; }
                }
                .card-fiscal * {
                    text-rendering: optimizeLegibility;
                    -webkit-font-smoothing: antialiased;
                }
            `}</style>
        </main>
    );
}
