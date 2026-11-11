'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    AlertTriangle, 
    Printer, 
    ArrowLeft, 
    Share2, 
    CheckCircle2, 
    ShieldCheck, 
    Loader2 
} from 'lucide-react';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { format, parseISO } from 'date-fns';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';

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
            const timer = setTimeout(() => window.print(), 800);
            return () => clearTimeout(timer);
        }
    }, [loading, sale, autoPrint]);
    
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
            
            {/* BARRA DE ACCIONES (OCULTA AL IMPRIMIR) */}
            <div className="w-full bg-white border-b px-6 h-14 flex items-center justify-between shrink-0 print:hidden sticky top-0 z-50 shadow-sm">
                <Button variant="ghost" onClick={() => router.push('/sales')} className="font-black text-[10px] uppercase text-slate-400">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" className="h-9 px-4 font-black uppercase text-[10px] rounded-lg border-2" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button className="h-9 px-4 font-black uppercase text-[10px] rounded-lg bg-emerald-600 hover:bg-emerald-700">
                        <Share2 className="mr-2 h-4 w-4" /> Enviar
                    </Button>
                </div>
            </div>

            <main className="flex-1 p-2 md:p-8 flex justify-center items-start print:p-0 print:block">
                {/* TICKET 58mm */}
                <Card className="w-full max-w-[340px] p-4 shadow-2xl border-none print:shadow-none print:p-0 print:w-[58mm] print:max-w-none bg-white text-slate-950 rounded-2xl print:rounded-none mx-auto overflow-hidden">
                    
                    {/* CABECERA COMPACTA */}
                    <div className="flex flex-col items-center text-center mb-4 border-b-2 border-slate-950 pb-4">
                        <div className="mb-1 scale-75 print:scale-50"><Logo /></div>
                        <h1 className="text-[12px] font-black uppercase leading-none print:text-[10pt] mb-1">{store?.name || 'KREA BUSINESS'}</h1>
                        <p className="text-[9px] font-black print:text-[7pt]">RIF: {store?.rif || 'J-00000000-0'}</p>
                        <p className="text-[8px] font-bold uppercase leading-tight print:text-[6pt] px-2">{store?.address || 'Dirección de Despacho'}</p>
                    </div>

                    {/* CONTROL DE VENTA */}
                    <div className="mb-4">
                        <div className="bg-slate-950 text-white text-center py-1 print:bg-transparent print:text-slate-950 print:border-y-2 print:border-slate-950">
                            <p className="text-[10px] font-black uppercase print:text-[9pt]">NOTA DE ENTREGA: {String(sale.invoiceNumber).padStart(6, '0')}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1 text-[8px] font-black uppercase print:text-[7pt]">
                            <span>FECHA: {format(parseISO(String(sale.createdAt)), "dd/MM/yyyy")}</span>
                            <span>HORA: {format(parseISO(String(sale.createdAt)), "HH:mm")}</span>
                        </div>
                    </div>

                    {/* RECEPTOR */}
                    <div className="border-b border-dashed border-slate-300 pb-2 mb-4 px-1">
                        <span className="text-[7px] font-black uppercase text-slate-400 block print:text-[6pt]">CLIENTE:</span>
                        <span className="text-[10px] font-black uppercase block leading-tight print:text-[8pt]">{sale.customerName}</span>
                        <span className="text-[8px] font-bold font-mono print:text-[7pt]">{sale.customer?.idNumber || 'V-00000000'}</span>
                    </div>

                    {/* ITEMS - ALTA DENSIDAD */}
                    <div className="mb-4">
                        <div className="flex justify-between border-b-2 border-slate-950 pb-0.5 mb-1 px-1 text-[8px] font-black uppercase print:text-[7pt]">
                            <span>DESCRIPCIÓN</span>
                            <span>TOTAL</span>
                        </div>
                        <div className="space-y-2 print:space-y-1">
                            {sale.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex flex-col px-1 border-b border-slate-100 pb-1 last:border-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-[9px] font-black uppercase leading-none flex-1 print:text-[8pt]">{item.name}</span>
                                        <span className="text-[9px] font-black print:text-[8pt]">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] font-bold text-slate-500 italic print:text-[6pt]">
                                        <span>{item.quantity} X {formatCurrency(item.price)}</span>
                                        <span>{item.taxRate > 0 ? '(G)' : '(E)'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TOTALES REFORZADOS */}
                    <div className="space-y-1 pt-2 border-t-2 border-slate-950 px-1">
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase print:text-[7pt]">
                            <span>SUBTOTAL</span>
                            <span>{formatCurrency(sale.subtotals?.general + sale.subtotals?.exempt)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase print:text-[7pt]">
                            <span>IVA (16%)</span>
                            <span>{formatCurrency(sale.taxDetails?.general || 0)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-1">
                            <span className="text-[11px] font-black uppercase print:text-[10pt]">TOTAL A PAGAR</span>
                            <div className="text-right">
                                <span className="text-[8px] font-black mr-1 print:text-[7pt]">Bs.</span>
                                <span className="text-2xl font-black tracking-tighter leading-none print:text-[16pt]">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-300">
                            <span className="text-[8px] font-black uppercase text-slate-500 print:text-[7pt]">REF. USD (BCV)</span>
                            <span className="text-[11px] font-black text-slate-950 print:text-[10pt]">$ {(sale.totalAmount / (tasaBcv || 1)).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* MÉTODOS DE PAGO (LIQUIDACIÓN) */}
                    <div className="mt-4 p-2 bg-slate-50 border-2 border-slate-950 print:bg-transparent print:border-x-0 print:border-y-2 print:border-dashed">
                        <h4 className="text-[8px] font-black uppercase mb-1 text-center print:text-[7pt]">DETALLE DE PAGO</h4>
                        <div className="space-y-1">
                            {sale.payments && sale.payments.length > 0 ? sale.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between items-center font-black text-[8px] uppercase print:text-[7pt]">
                                    <span>{p.method} ({p.currency})</span>
                                    <span>{p.currency === 'USD' ? '$' : 'Bs.'} {p.amount.toLocaleString()}</span>
                                </div>
                            )) : (
                                <div className="flex justify-between items-center font-black text-[8px] uppercase print:text-[7pt]">
                                    <span>{sale.paymentMethod || 'EFECTIVO'}</span>
                                    <span>Bs. {sale.totalAmount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        {sale.payments?.[0]?.changeGiven > 0 && (
                            <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200 text-[8px] font-black text-emerald-600 print:text-[7pt]">
                                <span>VUELTO ENTREGADO:</span>
                                <span>{sale.payments[0].currency === 'USD' ? '$' : 'Bs.'} {sale.payments[0].changeGiven.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* PIE DE PÁGINA */}
                    <div className="mt-6 text-center space-y-4">
                        <div className="px-4">
                            <div className="border-t-2 border-slate-950 w-full mb-1"></div>
                            <p className="text-[8px] font-black uppercase print:text-[7pt]">RECEPTOR CONFORME</p>
                        </div>
                        <p className="text-[7px] font-black text-slate-950 uppercase leading-none print:text-[6pt] px-2">
                            ESTE DOCUMENTO NO ES UNA FACTURA FISCAL.<br/>SU USO ES PARA CONTROL INTERNO Y DESPACHO.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-[7px] font-black text-slate-400 italic print:text-[6pt]">
                            <ShieldCheck className="h-2 w-2" /> <span>KREA SUITE POS v2.0</span>
                        </div>
                    </div>

                    {/* Espaciado para el corte físico */}
                    <div className="h-10 print:h-16"></div>
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
                    header, nav, aside, button, .print\\:hidden { 
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
