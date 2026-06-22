'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft } from 'lucide-react';
import { ISalePopulated } from '@/models/Sale';
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
        const options: Intl.NumberFormatOptions = { 
            style: 'decimal', 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        };
        const formatted = new Intl.NumberFormat('es-VE', options).format(value);
        return currency === 'VES' ? `${formatted}` : `$${formatted}`;
    };

    const getTaxCondition = (rate: number): string => {
        if (rate === 0) return '(E)';
        return `(G ${rate * 100}%)`;
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
                    <Button onClick={() => window.print()} className="font-black bg-primary text-primary-foreground"><Printer className="mr-2 h-4 w-4" />Imprimir Factura</Button>
                </div>
                
                <Card className="p-4 shadow-lg print:shadow-none print:border-none print:p-0 bg-white text-black card-fiscal">
                    {/* ENCABEZADO COMPACTO */}
                    <div className="flex flex-col border-b-[2px] border-black pb-2 text-center">
                        <h1 className="text-xl font-black uppercase leading-tight tracking-tighter">
                            {store?.name || 'KREA BUSINESS'}
                        </h1>
                        <div className="text-[10px] font-bold leading-tight">
                            <p>RIF: {store?.rif || 'J-00000000-0'}</p>
                            <p className="uppercase">{store?.seniatCondition || 'Contribuyente Ordinario'}</p>
                            <p className="truncate px-4">{store?.address || 'Dirección de la empresa'}</p>
                            {store?.phone && <p>TEL: {store.phone}</p>}
                        </div>
                        <div className="mt-2 text-xl font-black border-y-2 border-black py-0.5">FACTURA</div>
                    </div>

                    {/* DATOS DE FACTURA */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1.5 text-[10px] font-bold">
                         <div className='flex justify-between'><span>FECHA: {format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span> <span>HORA: {format(parseISO(String(sale.createdAt)), "hh:mm a")}</span></div>
                         <div className='flex justify-between text-base font-black pt-0.5'><span>Nº CONTROL:</span> <span>{String(sale.invoiceNumber).padStart(8, '0')}</span></div>
                    </div>

                    {/* DATOS DEL CLIENTE */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1.5 text-[10px] font-bold">
                        <div className='flex justify-between'><span>CLIENTE:</span> <span className='uppercase truncate pl-2'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>CI/RIF:</span> <span className='uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                    </div>
                    
                    {/* LISTA DE ITEMS OPTIMIZADA */}
                    <div className='mt-2'>
                        <div className='grid grid-cols-12 text-[9px] font-black uppercase border-b border-black pb-0.5 mb-1'>
                            <div className='col-span-7'>DESCRIPCIÓN</div>
                            <div className='col-span-2 text-center'>CANT</div>
                            <div className='col-span-3 text-right'>TOTAL</div>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className='grid grid-cols-12 text-[11px] font-bold leading-none items-start'>
                                    <div className='col-span-7 flex flex-col'>
                                        <span className='uppercase break-words leading-tight'>{item.name}</span>
                                        <span className='text-[8px] opacity-70'>{getTaxCondition(item.taxRate)} @ {formatCurrency(item.price)}</span>
                                    </div>
                                    <div className='col-span-2 text-center pt-0.5 font-black'>{item.quantity}</div>
                                    <div className='col-span-3 text-right pt-0.5 font-black tabular-nums'>
                                        {formatCurrency(item.price * item.quantity)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* TOTALES COMPACTOS */}
                    <div className="mt-3 border-t-2 border-black pt-2 flex flex-col gap-1 text-[11px] font-bold">
                         <div className="flex justify-between"><span>SUBTOTAL:</span><span>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.exempt || 0))}</span></div>
                         {sale.taxDetails?.general > 0 && (
                            <div className="flex justify-between"><span>IVA (16%):</span><span>{formatCurrency(sale.taxDetails.general)}</span></div>
                         )}
                         
                         <div className="flex justify-between text-xl font-black mt-1 border-t border-black pt-1">
                            <span>TOTAL BS:</span>
                            <span className="tabular-nums">{formatCurrency(sale.totalAmount)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm font-black mt-0.5 border-t border-dotted border-black pt-1">
                            <span>REF. USD:</span>
                            <span className="tabular-nums">{formatCurrency(totalInUSD, 'USD')}</span>
                        </div>
                        <div className="text-[9px] text-right italic font-bold">TASA BCV: {tasaBcv.toFixed(2)} Bs/$</div>
                    </div>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-4 border-t border-black pt-2 text-center text-[9px] font-bold uppercase space-y-1">
                        <p>PAGO: {sale.paymentMethod}</p>
                        <p className="text-[10px] font-black tracking-tight">{store?.footerMessage || '¡GRACIAS POR SU PREFERENCIA!'}</p>
                        <div className="bg-black text-white py-1 px-2 text-[8px] mt-2 font-black">
                            SIN VALOR FISCAL - DOCUMENTO DE PRUEBA
                        </div>
                        <p className="text-[7px] opacity-50 mt-1 italic">Generado por Krea Business Suite v2.0</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { 
                        background: white !important; 
                        color: black !important; 
                        font-family: 'Courier New', Courier, monospace !important; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                        margin: 0;
                        padding: 0;
                    }
                    header, footer, nav, aside, button, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
                    
                    /* Forzar contraste máximo */
                    * { 
                        color: #000 !important; 
                        text-shadow: none !important; 
                        box-shadow: none !important; 
                        -webkit-text-stroke: 0.2px black;
                    }
                    
                    .card-fiscal { 
                        border: none !important; 
                        width: 100% !important; 
                        max-width: 58mm !important; 
                        padding: 2mm !important; 
                        margin: 0 auto !important;
                    }
                    
                    .border-black { border-color: black !important; border-width: 1pt !important; }
                    .border-b-2 { border-bottom-width: 1.5pt !important; }
                    .tabular-nums { font-variant-numeric: tabular-nums; }
                }
                
                .card-fiscal {
                    font-smooth: never;
                    -webkit-font-smoothing: none;
                }
            `}</style>
        </main>
    );
}
