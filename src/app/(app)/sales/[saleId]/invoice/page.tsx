'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    AlertTriangle, 
    Printer, 
    ArrowLeft, 
    Share2, 
    Loader2 
} from 'lucide-react';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { format, parseISO } from 'date-fns';
import { Logo } from '@/components/logo';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function InvoicePage({ params }: { params: Promise<{ saleId: string }> }) {
    const router = useRouter();
    const { saleId } = use(params);
    const searchParams = useSearchParams();
    const autoPrint = searchParams.get('print') === 'true';
    const { toast } = useToast();
    const ticketRef = useRef<HTMLDivElement>(null);

    const [sale, setSale] = useState<any>(null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { rates } = useExchangeRates();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const storeId = localStorage.getItem('storeId');
                
                const [saleRes, storeRes] = await Promise.all([
                    fetch(`/api/sales/${saleId}?storeId=${storeId}`),
                    fetch(`/api/settings/store?storeId=${storeId}`)
                ]);

                if (!saleRes.ok) {
                    const errData = await saleRes.json();
                    throw new Error(errData.message || 'No se pudo encontrar el documento.');
                }
                
                setSale(await saleRes.json());
                if (storeRes.ok) setStore(await storeRes.json());

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [saleId]);

    useEffect(() => {
        if (!loading && sale && autoPrint) {
            const timer = setTimeout(() => window.print(), 500);
            return () => clearTimeout(timer);
        }
    }, [loading, sale, autoPrint]);
    
    const handleShare = async () => {
        if (!ticketRef.current || !sale) return;
        setIsSharing(true);
        try {
            // Captura optimizada para WhatsApp: calidad máxima y sin CORS issues
            const dataUrl = await toPng(ticketRef.current, { 
                quality: 1.0,
                backgroundColor: '#ffffff',
                fontEmbedCSS: '', 
                pixelRatio: 2, // Mejora la nitidez en pantallas retina
                style: {
                    transform: 'scale(1)',
                    margin: '0',
                    padding: '0'
                }
            });
            
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `comprobante-${sale.invoiceNumber}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Nota de Entrega ${sale.invoiceNumber}`,
                    text: `Hola, adjunto comprobante de tu compra en ${store?.name || 'Krea Business'}.`,
                });
            } else {
                const link = document.createElement('a');
                link.download = `nota-entrega-${sale.invoiceNumber}.png`;
                link.href = dataUrl;
                link.click();
                toast({ title: "Imagen lista", description: "Descargada para envío manual." });
            }
        } catch (err: any) {
            console.error('Error sharing invoice:', err);
            toast({ 
                variant: 'destructive', 
                title: "Error de captura", 
                description: "No se pudo generar la imagen. Intenta imprimir." 
            });
        } finally {
            setIsSharing(false);
        }
    };

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Validando Documento...</p>
        </div>
    );

    if (error) return (
        <div className="fixed inset-0 z-[100] bg-white p-8 space-y-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Error de Localización</h2>
            <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
            <Button onClick={() => router.push('/sales')} className="rounded-xl font-black uppercase mt-4">
                <ArrowLeft className='mr-2 h-4 w-4' />Volver a Ventas
            </Button>
        </div>
    );
    
    if (!sale) return null;
    const tasaBcv = rates.usd?.usd || 0;
    
    return (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto print:bg-white print:static print:inset-auto scrollbar-hide">
            
            {/* ACCIONES SUPERIORES */}
            <div className="w-full bg-white border-b px-6 h-16 flex items-center justify-between shrink-0 print:hidden sticky top-0 z-50 shadow-md">
                <Button variant="ghost" onClick={() => router.push('/sales')} className="font-black text-[10px] uppercase text-slate-400">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Panel de Ventas
                </Button>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-10 px-5 font-black uppercase text-[10px] rounded-xl border-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button 
                        onClick={handleShare}
                        disabled={isSharing}
                        className="h-10 px-6 font-black uppercase text-[10px] rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                    >
                        {isSharing ? <Loader2 className="animate-spin h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />} 
                        Enviar WhatsApp
                    </Button>
                </div>
            </div>

            <main className="flex-1 p-4 md:p-8 flex justify-center items-start print:p-0 print:block bg-slate-100 print:bg-white">
                {/* TICKET DIGITAL/IMPRESO OPTIMIZADO PARA 58mm */}
                <Card 
                    ref={ticketRef}
                    className="w-full max-w-[320px] p-4 pt-1 pb-4 shadow-2xl border-none print:shadow-none print:p-0 print:w-[58mm] print:max-w-none bg-white text-slate-900 rounded-[2rem] print:rounded-none mx-auto overflow-hidden flex flex-col"
                >
                    
                    {/* CABECERA: LOGO PEGADO AL TOPE */}
                    <div className="flex flex-col items-center text-center mb-2 pt-0 border-b-2 border-slate-900 pb-2">
                        <div className="scale-75 print:scale-50 origin-top -mb-2">
                            <Logo />
                        </div>
                        <h1 className="text-[14px] font-black uppercase leading-tight print:text-[11pt] tracking-tight">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="text-[10px] font-bold print:text-[8pt] leading-none opacity-80">RIF: {store?.rif || 'J-00000000-0'}</p>
                    </div>

                    {/* DATOS DE LA NOTA */}
                    <div className="mb-3">
                        <div className="bg-slate-900 text-white text-center py-1 rounded-lg print:bg-transparent print:text-slate-900 print:border-b-2 print:border-slate-900 print:rounded-none">
                            <p className="text-[11px] font-black uppercase print:text-[9pt] leading-none tracking-wider">NOTA DE ENTREGA: {String(sale.invoiceNumber).padStart(6, '0')}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1 text-[10px] font-black uppercase print:text-[8pt]">
                            <span className="opacity-60">{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span>
                            <span className="opacity-60">{format(parseISO(String(sale.createdAt)), "HH:mm")}</span>
                        </div>
                    </div>

                    {/* CLIENTE */}
                    <div className="border-b border-dashed border-slate-300 pb-2 mb-3 px-1">
                        <span className="text-[11px] font-black uppercase block print:text-[9pt] truncate text-primary">{sale.customerName}</span>
                        <span className="text-[10px] font-bold font-mono print:text-[8pt] opacity-50 tracking-tighter">ID: {sale.customer?.idNumber || 'V-00000000'}</span>
                    </div>

                    <div className="text-center py-1 border-b border-slate-900 mb-3 bg-slate-50">
                        <p className="text-[9px] font-black uppercase print:text-[7pt] tracking-[0.2em] opacity-60">MONEDA: BOLÍVARES (VES)</p>
                    </div>

                    {/* LISTADO DE ITEMS - ALTA DENSIDAD */}
                    <div className="flex-1 mb-4">
                        <div className="flex justify-between border-b border-slate-900 pb-1 mb-2 px-1 text-[9px] font-black uppercase print:text-[7pt] opacity-40">
                            <span>DESCRIPCIÓN</span>
                            <span>SUBTOTAL</span>
                        </div>
                        <div className="space-y-2 print:space-y-1">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col px-1 border-b border-slate-50 last:border-0 pb-1.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-[11px] font-black uppercase leading-tight flex-1 print:text-[9pt]">{item.name}</span>
                                        <span className="text-[11px] font-black print:text-[10pt] shrink-0">Bs. {formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 print:text-[8pt] mt-0.5">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded-md text-[9px] font-black text-slate-900">CANT: {item.quantity}</span>
                                        <span>@ {formatCurrency(item.price)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALES DE IMPACTO */}
                    <div className="pt-2 border-t-2 border-slate-900 px-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-60 print:text-[8pt]">
                            <span>SUBTOTAL GENERAL</span>
                            <span>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.exempt || 0))}</span>
                        </div>
                        <div className="flex justify-between items-baseline mt-1">
                            <span className="text-[12px] font-black uppercase print:text-[10pt]">TOTAL A PAGAR</span>
                            <div className="text-right">
                                <span className="text-3xl font-black tracking-tighter leading-none print:text-[18pt] text-primary">{formatCurrency(sale.totalAmount)}</span>
                                <span className="text-[10px] font-black ml-1 uppercase">Bs.</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-dashed border-slate-300">
                            <span className="text-[10px] font-black uppercase text-slate-400 print:text-[8pt]">VALOR REF. USD</span>
                            <span className="text-[14px] font-black text-slate-900 print:text-[11pt]">$ {(sale.totalAmount / (tasaBcv || 1)).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* DESGLOSE DE PAGO */}
                    <div className="mt-4 p-2 bg-slate-50 rounded-xl border border-slate-200 print:bg-transparent print:border-x-0 print:border-y-2 print:border-slate-900 print:rounded-none">
                        <p className="text-[9px] font-black uppercase text-center mb-1.5 print:text-[7pt] opacity-40">MÉTODO DE LIQUIDACIÓN</p>
                        <div className="space-y-1">
                            {sale.payments && sale.payments.length > 0 ? sale.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center font-black text-[10px] uppercase print:text-[8pt]">
                                    <span className="text-slate-500">{p.method}</span>
                                    <span>{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="flex justify-between items-center font-black text-[10px] uppercase print:text-[8pt]">
                                    <span className="text-slate-500">{sale.paymentMethod || 'EFECTIVO'}</span>
                                    <span>Bs. {sale.totalAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PIE DE PÁGINA LEGAL */}
                    <div className="mt-6 text-center">
                        <div className="px-6 mb-3">
                            <div className="border-t border-slate-300 w-full"></div>
                            <p className="text-[9px] font-black uppercase print:text-[8pt] mt-1 opacity-50">RECIBIDO CONFORME</p>
                        </div>
                        <div className="border-2 border-slate-900 p-2 mx-1 bg-slate-50 print:bg-transparent rounded-xl">
                            <p className="text-[10px] font-black text-slate-900 uppercase leading-tight print:text-[8pt]">
                                ESTE DOCUMENTO NO ES VÁLIDO<br/>COMO FACTURA FISCAL.
                            </p>
                        </div>
                        <p className="text-[8px] font-black uppercase print:text-[6pt] mt-3 opacity-40 italic tracking-widest">
                            SISTEMA DE GESTIÓN KREA v2.0
                        </p>
                    </div>
                </Card>
            </main>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 0; 
                        size: 58mm auto; 
                    }
                    body { 
                        background: white !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 58mm;
                        -webkit-print-color-adjust: exact;
                        color: black !important;
                    }
                    header, nav, aside, button, .print\\:hidden, .bottom-nav { 
                        display: none !important; 
                    }
                    main { 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 58mm !important; 
                        display: block !important;
                    }
                    * {
                        font-family: 'Inter', sans-serif !important;
                        color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
