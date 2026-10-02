
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
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

                    if (!saleRes.ok) throw new Error('No se pudo encontrar el documento de despacho.');
                    
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
    const totalCOP = totalUSD * (rates.cop?.rate || 0);
    
    return (
        <main className="flex-1 p-2 md:p-8 flex flex-col items-center bg-gray-100 min-h-screen">
            <div className="w-full max-w-sm space-y-4 print:max-w-none print:w-full print:m-0 print:p-0">
                 <div className="flex justify-between items-center print:hidden bg-white/80 backdrop-blur p-2 rounded-xl shadow-sm border">
                    <Button variant="ghost" size="sm" asChild><Link href="/sales"><ArrowLeft className="mr-1 h-4 w-4" />Volver</Link></Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="font-bold"><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
                    </div>
                </div>
                
                <Card className="p-4 shadow-xl print:shadow-none print:border-none print:p-0 bg-white text-black card-pos-thermal font-mono text-[11px] leading-tight">
                    {/* CABECERA: IDENTIDAD DEL NEGOCIO */}
                    <div className="flex flex-col text-center uppercase mb-2">
                        <h1 className="text-sm font-black leading-tight">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="font-bold">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-[10px] leading-none line-clamp-2">{store?.address || 'Dirección de Despacho'}</p>
                        {store?.phone && <p className="text-[10px]">TELF: {store.phone}</p>}
                    </div>

                    <div className="border-y border-black border-dashed py-1 text-center font-black text-sm my-2">
                        NOTA DE ENTREGA
                    </div>

                    <div className="space-y-1 mb-2">
                        <div className="flex justify-between font-bold"><span>Nro: NE-{new Date(sale.createdAt).getFullYear()}-{String(sale.invoiceNumber).padStart(6, '0')}</span></div>
                        <div className="flex justify-between"><span>FECHA: {format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span> <span>HORA: {format(parseISO(String(sale.createdAt)), "hh:mm a")}</span></div>
                        <div className="flex justify-between uppercase truncate"><span>CLIENTE: {sale.customerName}</span></div>
                        {sale.customer?.idNumber && <div className="flex justify-between font-bold uppercase"><span>C.I./RIF: {sale.customer.idNumber}</span></div>}
                    </div>
                    
                    {/* TABLA DE PRODUCTOS */}
                    <div className='border-t border-black border-dashed pt-1'>
                        <div className='flex justify-between font-black text-[10px] uppercase border-b border-black pb-0.5 mb-1'>
                            <span>CANT / DESCRIPCION</span>
                            <span>TOTAL (USD)</span>
                        </div>
                        <div className="space-y-1">
                            {sale.items.map((item: any, idx: number) => {
                                const itemUsd = (item.price * item.quantity) / tasaBcv;
                                return (
                                    <div key={idx} className='flex flex-col'>
                                        <div className='flex justify-between font-bold uppercase'>
                                            <span className='truncate max-w-[70%]'>{item.quantity}  {item.name}</span>
                                            <span>$ {itemUsd.toFixed(2)}</span>
                                        </div>
                                        {(item.price / tasaBcv) > 0 && (
                                            <span className='text-[9px] opacity-60 italic'>($ {(item.price / tasaBcv).toFixed(2)} c/u)</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* TOTALES */}
                    <div className="mt-2 border-t border-black pt-1 flex flex-col gap-1 font-black uppercase">
                         <div className="flex justify-between text-[1.1em]"><span>TOTAL A PAGAR:</span><span>$ {totalUSD.toFixed(2)}</span></div>
                         <div className="flex justify-between text-[10px] border-t border-dotted border-black/30 pt-1">
                            <span>EQUIV. BOLIVARES:</span>
                            <span>Bs. {formatCurrency(sale.totalAmount)}</span>
                         </div>
                         <div className="text-[8px] text-center italic font-medium lowercase">
                            Tasa Ref. BCV: {formatCurrency(tasaBcv)} Bs/$
                         </div>
                    </div>

                    {/* FORMAS DE PAGO */}
                    <div className="mt-2 border-t border-black border-dotted pt-1 text-[10px]">
                        <p className="font-black uppercase mb-1">Pagos Recibidos:</p>
                        <div className="flex justify-between font-bold uppercase">
                            <span>- {sale.paymentMethod}</span>
                            <span>{sale.paymentReference ? `(Ref: ${sale.paymentReference})` : ''}</span>
                        </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-black border-dashed">
                         <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <p className="text-[8px] font-black uppercase">ITEMS ENTREGADOS: {sale.items.reduce((acc, i) => acc + i.quantity, 0)}</p>
                                <p className="text-[8px] font-black uppercase">ESTADO: <span className="bg-black text-white px-1 ml-1">ENTREGADO CONFORME</span></p>
                            </div>
                            
                            <div className="mt-6 border-t border-black pt-1 text-[8px] flex flex-col gap-4">
                                <p>Firma Cliente: _________________________________</p>
                                <p>C.I. / RIF: ___________________________________</p>
                            </div>
                         </div>
                    </div>

                    {/* AVISO LEGAL CRÍTICO */}
                    <div className="mt-6 p-2 border border-black text-center space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-tighter">* AVISO IMPORTANTE *</p>
                        <p className="text-[8px] font-bold uppercase leading-[1.1]">
                            ESTE DOCUMENTO ES UNA NOTA DE ENTREGA PARA CONTROL INTERNO Y DESPACHO DE MERCANCÍA.
                            NO REPRESENTA UNA FACTURA FISCAL NI POSEE VALIDEZ TRIBUTARIA (PROVIDENCIA SENIAT 00071).
                        </p>
                    </div>

                    <div className="mt-4 text-center text-[9px] font-black uppercase italic">
                        ¡Gracias por su preferencia!
                        <p className="text-[7px] mt-1 opacity-60">PROCESADO POR KREA BUSINESS SUITE v2.8</p>
                    </div>
                </Card>
            </div>
            
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { background: white !important; color: black !important; font-family: 'Courier New', Courier, monospace !important; margin: 0; padding: 0; width: 80mm; -webkit-print-color-adjust: exact; }
                    header, nav, aside, button, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 80mm !important; background: white !important; }
                    .card-pos-thermal { border: none !important; width: 80mm !important; padding: 1mm 2mm !important; margin: 0 !important; border-radius: 0 !important; line-height: 1.1; box-shadow: none !important; }
                }
            `}</style>
        </main>
    );
}
