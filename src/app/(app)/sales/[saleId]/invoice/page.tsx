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
            // Capturamos el ticket como imagen PNG
            // Se añade fontEmbedCSS: '' para evitar SecurityError con fuentes externas
            const dataUrl = await toPng(ticketRef.current, { 
                quality: 1.0,
                backgroundColor: '#ffffff',
                fontEmbedCSS: '', 
                style: {
                    transform: 'scale(1)',
                    margin: '0',
                    padding: '0'
                }
            });
            
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `nota-entrega-${sale.invoiceNumber}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Nota de Entrega ${sale.invoiceNumber}`,
                    text: `Comprobante de despacho - ${store?.name || 'Krea Business'}.`,
                });
            } else {
                // Fallback: Descarga directa
                const link = document.createElement('a');
                link.download = `nota-entrega-${sale.invoiceNumber}.png`;
                link.href = dataUrl;
                link.click();
                toast({ title: "Imagen preparada", description: "Se ha descargado el ticket para compartir manualmente." });
            }
        } catch (err: any) {
            console.error('Error sharing invoice:', err);
            toast({ 
                variant: 'destructive', 
                title: "Error de captura", 
                description: "No se pudo generar la imagen. Intenta imprimir o tomar una captura de pantalla." 
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
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Generando Ticket...</p>
        </div>
    );

    if (error) return (
        <div className="fixed inset-0 z-[100] bg-white p-8 space-y-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Error de Documento</h2>
            <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
            <Button onClick={() => router.push('/sales')} className="rounded-xl font-black uppercase mt-4">
                <ArrowLeft className='mr-2 h-4 w-4' />Volver a Ventas
            </Button>
        </div>
    );
    
    if (!sale) return null;
    const tasaBcv = rates.usd?.usd || 0;
    
    return (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto print:bg-white print:static print:inset-auto">
            
            {/* BARRA DE ACCIONES */}
            <div className="w-full bg-white border-b px-6 h-14 flex items-center justify-between shrink-0 print:hidden sticky top-0 z-50 shadow-sm">
                <Button variant="ghost" onClick={() => router.push('/sales')} className="font-black text-[10px] uppercase text-slate-400">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9 px-4 font-black uppercase text-[10px] rounded-lg border-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button 
                        onClick={handleShare}
                        disabled={isSharing}
                        className="h-9 px-4 font-black uppercase text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isSharing ? <Loader2 className="animate-spin h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />} 
                        Enviar
                    </Button>
                </div>
            </div>

            <main className="flex-1 p-2 md:p-4 flex justify-center items-start print:p-0 print:block">
                {/* TICKET 58mm ULTRA-COMPACTO */}
                <Card 
                    ref={ticketRef}
                    className="w-full max-w-[300px] p-2 pt-0 shadow-2xl border-none print:shadow-none print:p-0 print:w-[58mm] print:max-w-none bg-white text-slate-950 rounded-xl print:rounded-none mx-auto overflow-hidden"
                >
                    
                    {/* CABECERA SIN MÁRGENES - PEGADA AL TOPE */}
                    <div className="flex flex-col items-center text-center mb-1 border-b-2 border-slate-950 pb-1 pt-0 mt-0">
                        <div className="mb-0 scale-50 print:scale-40 origin-top pt-0 h-auto overflow-hidden -mt-2"><Logo /></div>
                        <h1 className="text-[11px] font-black uppercase leading-none print:text-[11pt] mb-0.5 -mt-1">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="text-[9px] font-black print:text-[8pt] leading-none">RIF: {store?.rif || 'J-00000000-0'}</p>
                    </div>

                    {/* CONTROL DE VENTA */}
                    <div className="mb-1">
                        <div className="bg-slate-950 text-white text-center py-0.5 print:bg-transparent print:text-slate-950 print:border-b-2 print:border-slate-950">
                            <p className="text-[10px] font-black uppercase print:text-[9pt] leading-none">NOTA ENTREGA: {String(sale.invoiceNumber).padStart(6, '0')}</p>
                        </div>
                        <div className="flex justify-between items-center mt-1 px-0.5 text-[9px] font-black uppercase print:text-[8pt] leading-none">
                            <span>{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span>
                            <span>{format(parseISO(String(sale.createdAt)), "HH:mm")}</span>
                        </div>
                    </div>

                    {/* RECEPTOR */}
                    <div className="border-b border-dashed border-slate-300 pb-1 mb-1 px-0.5 leading-none">
                        <span className="text-[10px] font-black uppercase block print:text-[9pt] truncate">{sale.customerName}</span>
                        <span className="text-[9px] font-black font-mono print:text-[8pt] opacity-70">{sale.customer?.idNumber || 'V-00000000'}</span>
                    </div>

                    <div className="text-center py-0.5 border-b border-slate-950 mb-1">
                        <p className="text-[8px] font-black uppercase print:text-[7pt] tracking-widest">MONEDA: BOLIVARES (VES)</p>
                    </div>

                    {/* ITEMS */}
                    <div className="mb-1">
                        <div className="flex justify-between border-b border-slate-950 pb-0.5 mb-0.5 px-0.5 text-[8px] font-black uppercase print:text-[7pt]">
                            <span>DESCRIPCIÓN</span>
                            <span>TOTAL</span>
                        </div>
                        <div className="space-y-1 print:space-y-0.5">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col px-0.5 border-b border-slate-100 last:border-0 pb-0.5">
                                    <div className="flex justify-between items-start gap-1">
                                        <span className="text-[10px] font-black uppercase leading-tight flex-1 print:text-[9pt] line-clamp-2">{item.name}</span>
                                        <span className="text-[11px] font-black print:text-[10pt] shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] font-black text-slate-950 print:text-[9pt] leading-none mt-0.5">
                                        <span className="bg-slate-100 px-1 rounded">CANT: {item.quantity}</span>
                                        <span className="opacity-50">@ {formatCurrency(item.price)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALES */}
                    <div className="pt-1 border-t-2 border-slate-950 px-0.5 leading-tight">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase print:text-[8pt]">
                            <span>SUBTOTAL</span>
                            <span>{formatCurrency((sale.subtotals?.general || 0) + (sale.subtotals?.exempt || 0))}</span>
                        </div>
                        <div className="flex justify-between items-end mt-0.5">
                            <span className="text-[11px] font-black uppercase print:text-[10pt]">TOTAL Bs.</span>
                            <div className="text-right">
                                <span className="text-2xl font-black tracking-tighter leading-none print:text-[16pt]">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-0.5 mt-0.5 border-t border-dashed border-slate-400">
                            <span className="text-[9px] font-black uppercase text-slate-500 print:text-[8pt]">REF. USD</span>
                            <span className="text-[12px] font-black text-slate-950 print:text-[11pt]">$ {(sale.totalAmount / (tasaBcv || 1)).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* LIQUIDACIÓN */}
                    <div className="mt-1 p-1 bg-slate-50 border-y border-slate-950 print:bg-transparent print:border-x-0">
                        <p className="text-[8px] font-black uppercase text-center mb-0.5 print:text-[7pt]">PAGO / LIQUIDACIÓN</p>
                        <div className="space-y-0.5">
                            {sale.payments && sale.payments.length > 0 ? sale.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center font-black text-[9px] uppercase print:text-[8pt] leading-none">
                                    <span>{p.method} ({p.currency})</span>
                                    <span>{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="flex justify-between items-center font-black text-[9px] uppercase print:text-[8pt] leading-none">
                                    <span>{sale.paymentMethod || 'EFECTIVO'}</span>
                                    <span>Bs. {sale.totalAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-2 text-center pb-1">
                        <div className="px-4 mb-1">
                            <div className="border-t border-slate-950 w-full"></div>
                            <p className="text-[8px] font-black uppercase print:text-[8pt] mt-0.5">RECIBIDO CONFORME</p>
                        </div>
                        <div className="border-2 border-slate-950 p-1 mx-0.5 bg-slate-100 print:bg-transparent">
                            <p className="text-[9px] font-black text-slate-950 uppercase leading-tight print:text-[8pt]">
                                ESTE DOCUMENTO NO ES VÁLIDO<br/>COMO FACTURA FISCAL.
                            </p>
                        </div>
                        <p className="text-[7px] font-black uppercase print:text-[6pt] mt-1 opacity-60 italic">
                            CONTROL ADMINISTRATIVO KREA
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
                        letter-spacing: -0.2px;
                    }
                }
            `}</style>
        </div>
    );
}
