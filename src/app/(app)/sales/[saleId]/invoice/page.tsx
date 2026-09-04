
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
    const [qrUrl, setQrUrl] = useState('');
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

                    // QR de la Factura (Compacto para ticket)
                    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                    const invoiceLink = `${currentOrigin}/sales/${saleId}/invoice`;
                    // ECC Level L para mayor legibilidad en térmico
                    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(invoiceLink)}&ecc=L`);

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

    if (loading) return <div className="flex justify-center p-8"><Skeleton className="w-full max-w-md h-[600px] rounded-xl" /></div>;

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
        <main className="flex-1 p-4 md:p-8 flex flex-col items-center bg-gray-100 min-h-screen">
            <div className="w-full max-w-md space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden bg-white/80 backdrop-blur p-2 rounded-xl shadow-sm border">
                    <Button variant="ghost" size="sm" asChild><Link href="/sales"><ArrowLeft className="mr-1 h-4 w-4" />Ventas</Link></Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold"><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
                    </div>
                </div>
                
                <Card className="p-4 shadow-xl print:shadow-none print:border-none print:p-0 bg-white text-black card-pos-thermal font-mono">
                    {/* CABECERA POS */}
                    <div className="flex flex-col border-b-2 border-black pb-2 text-center uppercase">
                        <h1 className="text-xl font-black leading-none">{store?.name || 'KREA BUSINESS'}</h1>
                        <div className="text-[10px] font-bold mt-1">
                            <p>RIF: {store?.rif || 'J-00000000-0'}</p>
                            <p>{store?.address || 'Dirección de la empresa'}</p>
                        </div>
                        <div className="mt-2 text-lg font-black border-y-2 border-black py-0.5">Factura de Venta</div>
                    </div>

                    {/* DATOS CONTROL */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1.5 text-[10px] font-bold">
                         <div className='flex justify-between'><span>FECHA: {format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span> <span>HORA: {format(parseISO(String(sale.createdAt)), "hh:mm a")}</span></div>
                         <div className='flex justify-between text-base font-black'><span>ORDEN Nº:</span> <span>{String(sale.invoiceNumber).padStart(8, '0')}</span></div>
                    </div>

                    {/* CLIENTE */}
                    <div className="flex flex-col gap-0.5 border-b border-black py-1.5 text-[10px] font-bold">
                        <div className='flex justify-between uppercase'><span>CLIENTE:</span> <span className='truncate pl-2'>{sale.customerName}</span></div>
                        <div className='flex justify-between'><span>ID/RIF:</span> <span className='uppercase'>{sale.customer?.idNumber || 'V-XXXXXXXX'}</span></div>
                    </div>
                    
                    {/* ITEMS */}
                    <div className='mt-2'>
                        <div className='grid grid-cols-12 text-[9px] font-black uppercase border-b border-black pb-0.5 mb-1'>
                            <div className='col-span-7'>DESCRIPCIÓN</div>
                            <div className='col-span-2 text-center'>CANT</div>
                            <div className='col-span-3 text-right'>TOTAL</div>
                        </div>
                        {sale.items.map((item: any, idx: number) => (
                            <div key={idx} className='grid grid-cols-12 text-[10px] font-bold mb-1 leading-tight'>
                                <div className='col-span-7 uppercase'>{item.name}</div>
                                <div className='col-span-2 text-center'>{item.quantity}</div>
                                <div className='col-span-3 text-right'>{formatCurrency(item.price * item.quantity)}</div>
                            </div>
                        ))}
                    </div>
                    
                    {/* TOTALES */}
                    <div className="mt-3 border-t-2 border-black pt-2 flex flex-col gap-1 text-[11px] font-black uppercase">
                         <div className="flex justify-between"><span>TOTAL BS:</span><span className="text-xl tracking-tighter">{formatCurrency(sale.totalAmount)}</span></div>
                         <div className="flex justify-between text-sm mt-1 border-t border-dotted border-black pt-1">
                            <span>REF. USD:</span>
                            <span>${totalUSD.toFixed(2)}</span>
                        </div>
                        <p className="text-[8px] text-right italic opacity-70 mt-1">Tasa BCV: {tasaBcv.toFixed(2)} Bs/$</p>
                    </div>

                    {/* QR COMPACTO (ECC L) */}
                    <div className="mt-6 mb-4 flex flex-col items-center justify-center gap-2 border-t border-dashed border-black pt-4">
                        <div className="bg-white p-1 border border-black">
                             {qrUrl && <img src={qrUrl} alt="QR" width={120} height={120} />}
                        </div>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-center">Escanea para factura digital</p>
                    </div>

                    <div className="mt-2 border-t border-black pt-2 text-center text-[9px] font-bold uppercase space-y-1">
                        <p>PAGO: {sale.paymentMethod}</p>
                        <p className="font-black leading-tight mt-1 px-4">{store?.footerMessage || '¡GRACIAS POR PREFERIRNOS!'}</p>
                        <div className="bg-black text-white py-1 px-2 text-[8px] mt-2 font-black">SIN VALOR FISCAL</div>
                        <p className="text-[7px] opacity-40 mt-2 italic">Krea Business Suite v3.5</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    body { background: white !important; font-family: monospace !important; margin: 0; padding: 0; }
                    header, nav, aside, button, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
                    .card-pos-thermal { border: none !important; width: 58mm !important; padding: 2mm !important; margin: 0 !important; border-radius: 0 !important; }
                }
            `}</style>
        </main>
    );
}
