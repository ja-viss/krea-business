
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
    const searchParams = useSearchParams();
    const saleId = params.saleId as string;
    const autoPrint = searchParams.get('print') === 'true';

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

    useEffect(() => {
        if (!loading && sale && autoPrint) {
            const timer = setTimeout(() => window.print(), 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, sale, autoPrint]);
    
    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    if (loading) return <div className="flex justify-center p-8"><Skeleton className="w-full max-w-md h-[400px] rounded-xl" /></div>;

    if (error) return (
        <main className="p-8 space-y-4">
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <Button variant="outline" asChild><Link href="/sales"><ArrowLeft className='mr-2 h-4 w-4' />Volver</Link></Button>
        </main>
    );
    
    if (!sale || !rates.usd?.usd) return null;
    
    const tasaBcv = rates.usd.usd;
    const totalUSD = sale.totalAmount / tasaBcv;
    
    return (
        <main className="flex-1 p-2 md:p-8 flex flex-col items-center bg-gray-100 min-h-screen">
            <div className="w-full max-w-md space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden bg-white/80 backdrop-blur p-2 rounded-xl shadow-sm border">
                    <Button variant="ghost" size="sm" asChild><Link href="/sales"><ArrowLeft className="mr-1 h-4 w-4" />Ventas</Link></Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold"><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
                </div>
                
                <Card className="p-3 shadow-xl print:shadow-none print:border-none print:p-0 bg-white text-black card-pos-thermal font-mono">
                    {/* CABECERA POS REDUCIDA */}
                    <div className="flex flex-col border-b border-black pb-1 text-center uppercase">
                        <h1 className="text-lg font-black leading-none">{store?.name || 'KREA BUSINESS'}</h1>
                        <div className="text-[9px] font-bold mt-0.5">
                            <p>RIF: {store?.rif || 'J-00000000-0'}</p>
                            <p className="truncate">{store?.address || 'Dirección de la empresa'}</p>
                        </div>
                    </div>

                    {/* DATOS CONTROL COMPACTOS */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1 text-[9px] font-bold">
                         <div className='flex justify-between'><span>{format(parseISO(String(sale.createdAt)), "dd/MM/yy")}</span> <span>{format(parseISO(String(sale.createdAt)), "hh:mm a")}</span></div>
                         <div className='flex justify-between font-black'><span>ORDEN Nº:</span> <span>{String(sale.invoiceNumber).padStart(6, '0')}</span></div>
                    </div>

                    {/* CLIENTE COMPACTO */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1 text-[9px] font-bold">
                        <div className='flex justify-between uppercase'><span>CTE:</span> <span className='truncate pl-1'>{sale.customerName}</span></div>
                    </div>
                    
                    {/* ITEMS REDUCIDOS */}
                    <div className='mt-1'>
                        <div className='grid grid-cols-12 text-[8px] font-black uppercase border-b border-black pb-0.5 mb-1'>
                            <div className='col-span-8'>DESC.</div>
                            <div className='col-span-1 text-center'>C</div>
                            <div className='col-span-3 text-right'>TOTAL</div>
                        </div>
                        {sale.items.map((item: any, idx: number) => (
                            <div key={idx} className='grid grid-cols-12 text-[9px] font-bold mb-0.5 leading-tight'>
                                <div className='col-span-8 uppercase truncate pr-1'>{item.name}</div>
                                <div className='col-span-1 text-center'>{item.quantity}</div>
                                <div className='col-span-3 text-right'>{formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        ))}
                    </div>
                    
                    {/* TOTALES DESTACADOS */}
                    <div className="mt-2 border-t border-black pt-1 flex flex-col gap-0.5 text-[10px] font-black uppercase">
                         <div className="flex justify-between"><span>TOTAL BS:</span><span className="text-sm">{formatCurrency(sale.totalAmount)}</span></div>
                         <div className="flex justify-between text-[9px] mt-0.5 border-t border-dotted border-black pt-0.5">
                            <span>REF. USD:</span>
                            <span>${totalUSD.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="mt-2 border-t border-black pt-1 text-center text-[8px] font-bold uppercase space-y-0.5">
                        <p>PAGO: {sale.paymentMethod}</p>
                        <p className="font-black leading-tight mt-1">{store?.footerMessage || '¡GRACIAS POR SU COMPRA!'}</p>
                        <div className="bg-black text-white py-0.5 px-1 text-[7px] mt-1 font-black inline-block">SIN VALOR FISCAL</div>
                        <p className="text-[6px] opacity-40 mt-1 italic">Krea Business Suite</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { background: white !important; font-family: monospace !important; margin: 0; padding: 0; width: 58mm; }
                    header, nav, aside, button, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 58mm !important; background: white !important; }
                    .card-pos-thermal { border: none !important; width: 58mm !important; padding: 1mm !important; margin: 0 !important; border-radius: 0 !important; font-size: 9px; line-height: 1.1; }
                }
            `}</style>
        </main>
    );
}
