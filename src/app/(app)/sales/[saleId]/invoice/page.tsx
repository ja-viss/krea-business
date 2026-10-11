'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft, Share2, Download, CheckCircle2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
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

                    if (!saleRes.ok) throw new Error('No se pudo encontrar el documento.');
                    setSale(await saleRes.json());
                    if (storeRes.ok) setStore(await storeRes.json());

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

    if (loading) return <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    if (error) return (
        <div className="fixed inset-0 z-[100] bg-white p-8 space-y-4 flex flex-col items-center justify-center">
            <Alert variant="destructive" className="max-w-md border-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            <Button onClick={() => router.push('/sales')} className="rounded-xl font-black uppercase"><ArrowLeft className='mr-2 h-4 w-4' />Volver al Listado</Button>
        </div>
    );
    
    if (!sale) return null;
    const tasaBcv = rates.usd?.usd || 0;
    const totalUSD = tasaBcv > 0 ? sale.totalAmount / tasaBcv : 0;
    
    return (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto print:bg-white print:static print:inset-auto">
            
            {/* CABECERA DE CONTROL (No se imprime) */}
            <div className="w-full bg-white border-b px-6 h-16 flex items-center justify-between shrink-0 print:hidden sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/sales')} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Salir de Facturación
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Documento Transmitido</span>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="h-10 px-6 font-black uppercase text-[10px] rounded-xl border-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                    </Button>
                    <Button className="h-10 px-6 font-black uppercase text-[10px] rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700">
                        <Share2 className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                    </Button>
                </div>
            </div>

            <main className="flex-1 p-6 md:p-12 flex justify-center items-start print:p-0 print:bg-white">
                <Card className="w-full max-w-[450px] p-8 shadow-2xl border-none print:shadow-none print:p-4 print:max-w-none print:w-full bg-white text-slate-900 rounded-[2rem] print:rounded-none">
                    
                    {/* ENCABEZADO FISCAL PROFESIONAL */}
                    <div className="flex flex-col items-center text-center gap-2 mb-8 border-b pb-8 border-dashed border-slate-200">
                        <div className="mb-4 scale-125"><Logo /></div>
                        <h1 className="text-lg font-black uppercase tracking-tighter leading-none">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="text-[11px] font-black uppercase text-slate-400">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase max-w-[280px] leading-relaxed italic">{store?.address || 'Dirección de Despacho Principal'}</p>
                        <div className="flex gap-4 mt-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 px-3">{store?.phone || '04xx-0000000'}</Badge>
                            <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 px-3">VALORIZACIÓN: BCV</Badge>
                        </div>
                    </div>

                    {/* METADATOS DEL DOCUMENTO */}
                    <div className="bg-slate-900 rounded-2xl p-4 text-white flex justify-between items-center mb-8 shadow-xl">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-emerald-400 tracking-[0.2em] mb-0.5">Nota de Entrega</span>
                            <span className="text-xl font-black font-mono">NE-{String(sale.invoiceNumber).padStart(8, '0')}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[8px] font-black uppercase text-white/30 tracking-[0.2em] block">Emisión</span>
                            <span className="text-xs font-bold">{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy • hh:mm a")}</span>
                        </div>
                    </div>

                    {/* DATOS DEL CLIENTE */}
                    <div className="space-y-4 mb-10 px-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1.5">
                                <User className="h-3 w-3" /> Receptor del Despacho
                            </span>
                            <span className="text-sm font-black uppercase text-slate-800">{sale.customerName}</span>
                            <span className="text-[10px] font-bold font-mono text-slate-400">{sale.customer?.idNumber || 'V-00000000'}</span>
                        </div>
                    </div>

                    {/* CUERPO DEL COMPROBANTE - TABLA DE ALTA DENSIDAD */}
                    <div className="mb-10">
                        <div className="grid grid-cols-12 gap-2 border-b-2 border-slate-950 pb-2 mb-4">
                            <div className="col-span-8 text-[9px] font-black uppercase tracking-widest">Descripción / Cant</div>
                            <div className="col-span-4 text-right text-[9px] font-black uppercase tracking-widest">Total (Bs.)</div>
                        </div>
                        <div className="space-y-4">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 border-b border-slate-100 pb-3 last:border-0 group">
                                    <div className="col-span-8 flex flex-col gap-0.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[10px] font-black text-slate-900 uppercase leading-none">{item.name}</span>
                                            <span className="text-[10px] font-black text-primary">x{item.quantity}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 italic">
                                            <span>Unit: {item.price.toLocaleString('es-VE')}</span>
                                            <span>•</span>
                                            <span>$ { (item.price / (tasaBcv || 1)).toFixed(2) }</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4 text-right flex flex-col">
                                        <span className="text-[11px] font-black text-slate-900">{(item.price * item.quantity).toLocaleString('es-VE')}</span>
                                        <span className="text-[8px] font-black text-emerald-500">$ { ((item.price * item.quantity) / (tasaBcv || 1)).toFixed(2) }</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALIZACIÓN PREMIUM */}
                    <div className="space-y-6 pt-6 border-t-2 border-slate-900">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Imponible</span>
                            <span className="text-xs font-bold font-mono">Bs. {sale.subtotals.general.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">I.V.A (16%)</span>
                            <span className="text-xs font-bold font-mono text-primary">Bs. {sale.taxDetails.general.toLocaleString()}</span>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-950 flex flex-col gap-4 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-3 opacity-[0.03]"><ShoppingBag className="h-16 w-16" /></div>
                             <div className="flex justify-between items-baseline relative z-10">
                                <span className="text-xs font-black uppercase text-slate-900 tracking-tighter">Total Liquidación</span>
                                <div className="text-right">
                                    <span className="text-xs font-black mr-1.5 text-primary italic uppercase">Bs</span>
                                    <span className="text-3xl font-black tracking-tighter text-slate-950">{formatCurrency(sale.totalAmount)}</span>
                                </div>
                             </div>
                             <div className="pt-4 border-t border-slate-950/10 flex justify-between items-center relative z-10">
                                <span className="text-[9px] font-black uppercase text-slate-400 italic">Equiv. Divisa</span>
                                <span className="text-lg font-black text-emerald-600 tracking-tighter">$ {totalUSD.toFixed(2)} USD</span>
                             </div>
                        </div>
                    </div>

                    {/* DESGLOSE DE PAGO */}
                    <div className="mt-10 px-4 py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <h4 className="text-[9px] font-black uppercase text-slate-400 mb-4 text-center tracking-[0.3em]">Detalle de Liquidación</h4>
                        <div className="space-y-2">
                            {sale.payments?.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center font-bold text-[10px] uppercase italic">
                                    <span className="flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-emerald-500" /> {p.method}</span>
                                    <span className="text-slate-900">{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Tasa Operativa: {formatCurrency(tasaBcv)} Bs/$</p>
                        </div>
                    </div>

                    {/* LEYENDAS REGLAMENTARIAS Y FIRMAS */}
                    <div className="mt-12 space-y-10">
                        <div className="text-center space-y-4 px-8">
                            <div className="pt-4 border-t-2 border-slate-900 w-full"></div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">Firma Autorizada y Sello</p>
                            <p className="text-[8px] font-bold text-slate-400 italic">Recibí conforme la mercancía anteriormente descrita.</p>
                        </div>

                        <div className="bg-slate-100 p-6 rounded-3xl text-center space-y-3 border-2 border-slate-200">
                            <p className="text-[10px] font-black uppercase text-slate-900 flex items-center justify-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-primary" /> Aviso Legal Importante
                            </p>
                            <p className="text-[8px] font-bold text-slate-600 uppercase leading-relaxed px-4">
                                Este documento es una <span className="underline font-black">NOTA DE ENTREGA</span> para el amparo del despacho de bienes. No representa una factura fiscal (Providencia 00071).
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase text-slate-300 italic tracking-[0.2em]">Krea Suite Business • v98.0 Industrial</p>
                        </div>
                    </div>
                </Card>
            </main>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 80mm auto; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; width: 80mm; }
                    header, aside, button, .print\\:hidden { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; width: 80mm !important; }
                    .card-pos-thermal { width: 80mm !important; border: none !important; box-shadow: none !important; padding: 4mm !important; }
                }
            `}</style>
        </div>
    );
}

