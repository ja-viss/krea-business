
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    AlertTriangle, 
    Printer, 
    ArrowLeft, 
    Share2, 
    CheckCircle2, 
    ShieldCheck, 
    Loader2, 
    User,
    Smartphone
} from 'lucide-react';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function InvoicePage({ params }: { params: Promise<{ saleId: string }> }) {
    const router = useRouter();
    const { saleId } = use(params);
    const searchParams = useSearchParams();
    const autoPrint = searchParams.get('print') === 'true';

    const [sale, setSale] = useState<any>(null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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
            const timer = setTimeout(() => window.print(), 1200);
            return () => clearTimeout(timer);
        }
    }, [loading, sale, autoPrint]);
    
    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Validando Nota de Entrega...</p>
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
                <ArrowLeft className='mr-2 h-4 w-4' />Volver al Listado
            </Button>
        </div>
    );
    
    if (!sale) return null;
    const tasaBcv = rates.usd?.usd || 0;
    const totalUSD = tasaBcv > 0 ? sale.totalAmount / tasaBcv : 0;
    
    return (
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col overflow-y-auto print:bg-white print:static print:inset-auto">
            
            {/* CABECERA DE CONTROL (No se imprime) */}
            <div className="w-full bg-white border-b px-6 h-16 flex items-center justify-between shrink-0 print:hidden sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push('/sales')} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-primary transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Salir
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verificado</span>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="h-10 px-6 font-black uppercase text-[10px] rounded-xl border-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir 58mm
                    </Button>
                    <Button className="h-10 px-6 font-black uppercase text-[10px] rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700">
                        <Share2 className="mr-2 h-4 w-4" /> WhatsApp
                    </Button>
                </div>
            </div>

            <main className="flex-1 p-4 md:p-8 flex justify-center items-start print:p-0 print:block">
                {/* CONTENEDOR DE LA FACTURA: Optimizado para 58mm (aprox 220px) */}
                <Card className="w-full max-w-[380px] p-6 shadow-2xl border-none print:shadow-none print:p-0 print:w-[58mm] print:max-w-none bg-white text-slate-900 rounded-[2rem] print:rounded-none mx-auto overflow-hidden">
                    
                    {/* ENCABEZADO FISCAL */}
                    <div className="flex flex-col items-center text-center gap-1 mb-6 border-b border-dashed border-slate-200 pb-6">
                        <div className="mb-2 scale-90 print:scale-75"><Logo /></div>
                        <h1 className="text-sm font-black uppercase tracking-tighter leading-tight print:text-[10pt]">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="text-[9px] font-black uppercase text-slate-500 print:text-[7pt]">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight print:text-[6pt] px-4">{store?.address || 'Dirección de Despacho Principal'}</p>
                        <p className="text-[8px] font-black text-slate-500 mt-1 print:text-[7pt]">{store?.phone || 'S/N'}</p>
                    </div>

                    {/* DATOS DE VENTA */}
                    <div className="space-y-1 mb-4 text-center print:text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white py-1 px-2 rounded-lg print:rounded-none print:bg-transparent print:text-black print:border-y print:border-black print:text-[8pt]">
                            Nota de Entrega: NE-{String(sale.invoiceNumber).padStart(6, '0')}
                        </p>
                        <div className="flex justify-between items-center px-1 pt-1 text-[8px] font-bold uppercase print:text-[7pt]">
                            <span>Emisión:</span>
                            <span>{format(parseISO(String(sale.createdAt)), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                    </div>

                    {/* CLIENTE */}
                    <div className="border-b border-dashed border-slate-200 pb-3 mb-4 px-1">
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest block mb-0.5 print:text-[6pt]">Receptor:</span>
                        <span className="text-[10px] font-black uppercase block leading-none print:text-[8pt]">{sale.customerName}</span>
                        <span className="text-[8px] font-bold font-mono text-slate-500 print:text-[7pt]">{sale.customer?.idNumber || 'V-00000000'}</span>
                    </div>

                    {/* PRODUCTOS - ALTA DENSIDAD */}
                    <div className="mb-6">
                        <div className="flex justify-between border-b-2 border-slate-950 pb-1 mb-2 px-1 text-[8px] font-black uppercase print:text-[7pt]">
                            <span>Item / Cant</span>
                            <span>Total (Bs)</span>
                        </div>
                        <div className="space-y-3 print:space-y-1">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col gap-0.5 px-1 border-b border-slate-50 pb-2 last:border-0 print:border-b-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[9px] font-black uppercase leading-tight max-w-[70%] print:text-[8pt]">{item.name}</span>
                                        <span className="text-[9px] font-black print:text-[8pt]">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] font-bold text-slate-400 italic print:text-[6pt]">
                                        <span>{item.quantity} Unid. @ {formatCurrency(item.price)}</span>
                                        <span>$ { ((item.price * item.quantity) / (tasaBcv || 1)).toFixed(2) }</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALES */}
                    <div className="space-y-2 pt-3 border-t-2 border-slate-950 px-1">
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase print:text-[7pt]">
                            <span>Subtotal</span>
                            <span>{formatCurrency(sale.subtotals?.general + sale.subtotals?.exempt)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase print:text-[7pt]">
                            <span>I.V.A (16%)</span>
                            <span>{formatCurrency(sale.taxDetails?.general || 0)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1">
                            <span className="text-[10px] font-black uppercase print:text-[9pt]">Total a Pagar</span>
                            <div className="text-right">
                                <span className="text-[7px] font-black mr-1 italic print:text-[6pt]">BS.</span>
                                <span className="text-xl font-black tracking-tighter leading-none print:text-[14pt]">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                            <span className="text-[8px] font-black uppercase text-slate-400 italic print:text-[7pt]">Referencia USD</span>
                            <span className="text-sm font-black text-emerald-600 print:text-[10pt]">$ {totalUSD.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* PAGOS */}
                    <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 print:bg-transparent print:border-x-0 print:rounded-none">
                        <h4 className="text-[7px] font-black uppercase text-slate-400 mb-2 text-center tracking-[0.2em] print:text-[6pt]">Liquidación</h4>
                        <div className="space-y-1">
                            {sale.payments?.length > 0 ? sale.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center font-bold text-[8px] uppercase italic print:text-[7pt]">
                                    <span className="flex items-center gap-1"><ShieldCheck className="h-2 w-2 text-emerald-500" /> {p.method}</span>
                                    <span>{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="flex justify-between items-center font-bold text-[8px] uppercase italic print:text-[7pt]">
                                    <span className="flex items-center gap-1"><ShieldCheck className="h-2 w-2 text-emerald-500" /> {sale.paymentMethod || 'Efectivo'}</span>
                                    <span>Bs. {sale.totalAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 text-center">
                             <p className="text-[7px] font-black text-slate-400 uppercase print:text-[6pt]">Tasa: {formatCurrency(tasaBcv)} Bs/$</p>
                        </div>
                    </div>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-8 text-center space-y-4">
                        <div className="px-6">
                            <div className="border-t border-slate-950 w-full mb-1"></div>
                            <p className="text-[8px] font-black uppercase print:text-[7pt]">Firma y Sello</p>
                        </div>
                        <p className="text-[7px] font-bold text-slate-500 uppercase leading-tight print:text-[6pt] px-2">
                            NOTA DE ENTREGA - AMBIENTE DE PRUEBAS.<br/>NO REPRESENTA FACTURA FISCAL.
                        </p>
                        <p className="text-[7px] font-black text-slate-300 italic print:text-[6pt]">Krea Suite POS v58.1</p>
                    </div>

                    {/* Espaciado para el corte físico */}
                    <div className="h-12 print:h-20"></div>
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
                    }
                    header, nav, aside, button, .print\\:hidden { 
                        display: none !important; 
                    }
                    main { 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 58mm !important; 
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    );
}
