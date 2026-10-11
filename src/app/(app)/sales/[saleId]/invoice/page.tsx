
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft, ShieldCheck, Download, Share2 } from 'lucide-react';
import { ISalePopulated } from '@/models/Sale';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function InvoicePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const saleId = params.saleId as string;
    const autoPrint = searchParams.get('print') === 'true';

    const [sale, setSale] = useState<any>(null);
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

                    if (!saleRes.ok) throw new Error('No se pudo encontrar el documento de despacho.');
                    
                    const saleData = await saleRes.json();
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

    if (loading) return <div className="flex justify-center p-8 bg-slate-100 min-h-screen"><Skeleton className="w-full max-w-sm h-[600px] rounded-3xl" /></div>;

    if (error) return (
        <main className="p-8 space-y-4">
            <Alert variant="destructive" className="border-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error de Sistema</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <Button variant="outline" asChild className="rounded-xl"><Link href="/sales"><ArrowLeft className='mr-2 h-4 w-4' />Volver al Listado</Link></Button>
        </main>
    );
    
    if (!sale || !rates.usd?.usd) return null;
    
    const tasaBcv = rates.usd.usd;
    const totalUSD = sale.totalAmount / tasaBcv;
    
    return (
        <main className="flex-1 p-2 md:p-8 flex flex-col items-center bg-slate-200 min-h-screen">
            <div className="w-full max-w-sm space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden bg-white p-3 rounded-2xl shadow-xl border-2">
                    <Button variant="ghost" size="sm" asChild className="font-bold"><Link href="/sales"><ArrowLeft className="mr-1 h-4 w-4" /> Volver</Link></Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl border-2"><Printer className="h-4 w-4" /></Button>
                        <Button variant="default" size="sm" className="font-black uppercase text-[10px] rounded-xl"><Share2 className="mr-1 h-3.5 w-3.5"/> WhatsApp</Button>
                    </div>
                </div>
                
                <Card className="p-6 shadow-2xl print:shadow-none print:border-none print:p-0 bg-white text-black card-pos-thermal font-mono text-[12px] leading-tight border-4 border-white">
                    {/* CABECERA: IDENTIDAD FISCAL */}
                    <div className="flex flex-col text-center uppercase mb-4">
                        <h1 className="text-base font-black leading-none mb-1">{store?.name || 'KREA BUSINESS SUITE'}</h1>
                        <p className="font-bold">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-[10px] leading-[1.2] px-4 opacity-80">{store?.address || 'Dirección de Despacho'}</p>
                        {store?.phone && <p className="text-[10px] mt-1">TELF: {store.phone}</p>}
                    </div>

                    <div className="bg-black text-white text-center font-black text-sm py-1.5 my-3 tracking-widest">
                        NOTA DE ENTREGA
                    </div>

                    <div className="space-y-1.5 mb-4 border-b-2 border-black border-dotted pb-3">
                        <div className="flex justify-between font-black"><span>NRO CONTROL:</span> <span>NE-{String(sale.invoiceNumber).padStart(8, '0')}</span></div>
                        <div className="flex justify-between"><span>FECHA: {format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span> <span>HORA: {format(parseISO(String(sale.createdAt)), "hh:mm a")}</span></div>
                        <div className="flex justify-between uppercase truncate font-bold"><span>CLIENTE:</span> <span>{sale.customerName}</span></div>
                        <div className="flex justify-between font-bold uppercase"><span>C.I./RIF:</span> <span>{sale.customer?.idNumber || 'V-00000000'}</span></div>
                    </div>
                    
                    {/* CUERPO DEL COMPROBANTE */}
                    <div className='mb-4'>
                        <div className='flex justify-between font-black text-[10px] uppercase border-b-2 border-black pb-1 mb-2'>
                            <span>DESCRIPCION / CANT</span>
                            <span>TOTAL BS.</span>
                        </div>
                        <div className="space-y-3">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className='flex flex-col'>
                                    <div className='flex justify-between font-bold uppercase'>
                                        <span className='truncate max-w-[75%]'>{item.quantity} x {item.name}</span>
                                        <span>{(item.price * item.quantity).toLocaleString('es-VE')}</span>
                                    </div>
                                    <div className='flex justify-between text-[10px] opacity-60 italic'>
                                        <span>Precio Unit: {item.price.toLocaleString('es-VE')}</span>
                                        <span>$ {((item.price * item.quantity) / tasaBcv).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* RESUMEN FINANCIERO */}
                    <div className="mt-4 border-t-2 border-black pt-3 flex flex-col gap-2 font-black uppercase">
                         <div className="flex justify-between text-base"><span>TOTAL A PAGAR:</span><span>Bs. {formatCurrency(sale.totalAmount)}</span></div>
                         <div className="flex justify-between text-[11px] border-t border-dotted border-black/40 pt-1.5">
                            <span className="opacity-60">EQUIV. DOLARES ($):</span>
                            <span>$ {totalUSD.toFixed(2)}</span>
                         </div>
                         <div className="bg-slate-100 p-2 text-center border border-black/10 rounded">
                            <p className="text-[9px] font-bold">Tasa BCV del Día: {formatCurrency(tasaBcv)} Bs/$</p>
                         </div>
                    </div>

                    {/* DESGLOSE DE PAGO MIXTO */}
                    <div className="mt-4 border-t-2 border-black border-dashed pt-3 text-[10px]">
                        <p className="font-black uppercase mb-2 text-center bg-slate-100 py-1">Detalle de Liquidación</p>
                        {sale.payments && sale.payments.length > 0 ? (
                            <div className="space-y-1">
                                {sale.payments.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between font-bold uppercase italic">
                                        <span>- {p.method} {p.bank ? `(${p.bank})` : ''}</span>
                                        <span>{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex justify-between font-bold uppercase italic">
                                <span>- {sale.paymentMethod}</span>
                                <span>{formatCurrency(sale.totalAmount)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t-2 border-black border-dashed space-y-4">
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-[9px] font-black uppercase">UNIDADES DESPACHADAS: {sale.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}</p>
                            <p className="text-[9px] font-black uppercase">ESTADO: <span className="bg-black text-white px-2 ml-1">ENTREGADO CONFORME</span></p>
                        </div>
                        
                        <div className="mt-8 border-t border-black pt-2 text-[9px] space-y-4">
                            <p className="italic">He recibido la mercancía anteriormente descrita a mi entera satisfacción y conformidad.</p>
                            <div className="pt-6 border-b border-black w-full"></div>
                            <p className="font-black text-center">FIRMA DEL CLIENTE / RECEPTOR</p>
                        </div>
                    </div>

                    {/* AVISO LEGAL REGLAMENTARIO */}
                    <div className="mt-8 p-3 border-2 border-black text-center space-y-2 bg-slate-50">
                        <p className="text-[10px] font-black uppercase tracking-tighter">*** AVISO IMPORTANTE ***</p>
                        <p className="text-[9px] font-bold uppercase leading-tight">
                            ESTE DOCUMENTO ES UNA NOTA DE ENTREGA PARA EL AMPARO DEL TRASLADO Y DESPACHO INTERNO DE BIENES.
                        </p>
                        <p className="text-[9px] font-black underline uppercase">
                            NO REPRESENTA UNA FACTURA FISCAL Y NO ES VÁLIDO COMO CRÉDITO FISCAL (PROVIDENCIA SENIAT 00071).
                        </p>
                    </div>

                    <div className="mt-6 text-center text-[10px] font-black uppercase italic opacity-60">
                        ¡Gracias por su preferencia!
                        <p className="text-[8px] mt-2">NÚCLEO OPERATIVO: KREA SUITE BUSINESS v91.0</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { background: white !important; color: black !important; font-family: 'Courier New', Courier, monospace !important; margin: 0; padding: 0; width: 80mm; -webkit-print-color-adjust: exact; }
                    header, nav, aside, button, .print\\:hidden, .bottom-nav { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 80mm !important; background: white !important; }
                    .card-pos-thermal { border: none !important; width: 80mm !important; padding: 2mm 4mm !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
                }
            `}</style>
        </main>
    );
}
