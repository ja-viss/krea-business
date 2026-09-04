
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Calculator, 
    Lock, 
    Unlock, 
    TrendingUp, 
    AlertCircle, 
    Loader2, 
    Save, 
    Coins, 
    Banknote, 
    CreditCard, 
    Plus,
    History,
    FileText,
    ArrowRightLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const USD_DENOMINATIONS = [100, 50, 20, 10, 5, 1];
const VES_DENOMINATIONS = [100, 50, 20, 10, 5];

export default function CashControlPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [session, setSession] = useState<any>(null);
    
    // Estados de Apertura
    const [openingUsd, setOpeningUsd] = useState('0');
    const [openingVes, setOpeningVes] = useState('0');

    // Estados de Cierre (Arqueo a Ciegas)
    const [cashUsdCount, setCashUsdCount] = useState<Record<number, number>>({});
    const [cashVesCount, setCashVesCount] = useState<Record<number, number>>({});
    const [otherBalances, setOtherBalances] = useState({
        punto: '0',
        pagoMovil: '0',
        zelle: '0',
        binance: '0'
    });

    useEffect(() => {
        fetchSession();
    }, []);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/cash-control?storeId=${storeId}`);
            if (res.ok) {
                const data = await res.json();
                setSession(data.activeSession);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBox = async () => {
        setIsProcessing(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const userId = localStorage.getItem('userId');
            const balances = [
                { currency: 'USD', amount: parseFloat(openingUsd) || 0 },
                { currency: 'VES', amount: parseFloat(openingVes) || 0 }
            ];

            const res = await fetch('/api/cash-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, userId, openingBalances: balances, action: 'OPEN' })
            });
            if (!res.ok) throw new Error('Error al abrir');
            
            toast({ title: "Turno Iniciado", description: "Fondo de caja registrado con éxito." });
            fetchSession();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseBox = async () => {
        setIsProcessing(true);
        try {
            // Consolidar conteo físico
            const totalCashUsd = Object.entries(cashUsdCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);
            const totalCashVes = Object.entries(cashVesCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);

            const declared = [
                { currency: 'USD', method: 'Efectivo', amount: totalCashUsd, denominations: cashUsdCount },
                { currency: 'VES', method: 'Efectivo', amount: totalCashVes, denominations: cashVesCount },
                { currency: 'VES', method: 'Tarjeta', amount: parseFloat(otherBalances.punto) || 0 },
                { currency: 'VES', method: 'Pago Móvil', amount: parseFloat(otherBalances.pagoMovil) || 0 },
                { currency: 'USD', method: 'Transferencia', amount: parseFloat(otherBalances.zelle) || 0 },
                { currency: 'USD', method: 'Binance', amount: parseFloat(otherBalances.binance) || 0 },
            ];

            const res = await fetch('/api/cash-control', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session._id, declaredBalances: declared, action: 'CLOSE' })
            });
            if (!res.ok) throw new Error('Error al procesar el arqueo');

            toast({ title: "Caja Cerrada", description: "El reporte de arqueo ha sido enviado al administrador." });
            setSession(null);
            fetchSession();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error crítico", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const updateCount = (currency: 'USD' | 'VES', denomination: number, value: string) => {
        const qty = parseInt(value) || 0;
        if (currency === 'USD') setCashUsdCount(prev => ({ ...prev, [denomination]: qty }));
        else setCashVesCount(prev => ({ ...prev, [denomination]: qty }));
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
                <PageHeader 
                    title="Control de Caja y Arqueo" 
                    description="Conciliación multimoneda de efectivo, bancos y apps digitales."
                />

                {!session ? (
                    <Card className="border-4 border-primary/10 shadow-2xl animate-in zoom-in-95">
                        <CardHeader className="text-center bg-primary/5 pb-8">
                            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                                <Unlock className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Apertura de Turno</CardTitle>
                            <CardDescription className="font-bold">Indica el fondo base disponible para dar cambio (Vueltos).</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-10 grid gap-8 md:grid-cols-2">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-green-600" /> Fondo en Dólares ($)
                                </Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="text-4xl font-black h-20 text-center bg-green-50/30 border-green-200"
                                    value={openingUsd}
                                    onChange={(e) => setOpeningUsd(e.target.value)}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-primary" /> Fondo en Bolívares (Bs.)
                                </Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="text-4xl font-black h-20 text-center bg-primary/5"
                                    value={openingVes}
                                    onChange={(e) => setOpeningVes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="pb-10 px-10">
                            <Button onClick={handleOpenBox} disabled={isProcessing} className="w-full h-16 text-xl font-black uppercase shadow-xl hover:scale-[1.01] transition-transform">
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Unlock className="mr-3 h-6 w-6" />}
                                Iniciar Operaciones de Caja
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* RESUMEN DE SESIÓN ACTIVA */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardHeader className="bg-primary/5 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Turno Activo</CardTitle>
                                        <Badge className="bg-green-100 text-green-800 border-green-200 font-black animate-pulse uppercase text-[9px]">EN CURSO</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                        <Calculator className="h-10 w-10 text-primary/40" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Inicio de Jornada</p>
                                            <p className="text-sm font-black">{new Date(session.openedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground px-1">Fondo Inicial Reportado</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {session.openingBalances.map((b: any) => (
                                                <div key={b.currency} className="bg-white p-3 rounded-lg border-2 shadow-sm text-center">
                                                    <p className="text-[9px] font-black uppercase opacity-50">{b.currency}</p>
                                                    <p className="text-lg font-black">{b.amount.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full font-black uppercase text-[10px] h-10">
                                        <FileText className="mr-2 h-4 w-4" /> Ver Vales de Egreso
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-amber-50 border-amber-200 border-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-2">
                                        <ArrowRightLeft className="h-3 w-3" /> Movimientos Manuales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                        Registra cualquier retiro de efectivo para gastos menores o pagos a proveedores durante el turno.
                                    </p>
                                    <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 font-black uppercase text-[9px]">
                                        <Plus className="mr-1 h-3 w-3" /> Registrar Vale
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* PANEL DE ARQUEO A CIEGAS */}
                        <div className="lg:col-span-8">
                            <Card className="border-4 border-black shadow-2xl overflow-hidden">
                                <CardHeader className="bg-black text-white py-6">
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                                        <Lock className="h-6 w-6 text-primary" /> Protocolo de Cierre (Arqueo a Ciegas)
                                    </CardTitle>
                                    <CardDescription className="text-white/60 font-bold uppercase text-[10px]">
                                        Cuenta físicamente el dinero antes de cerrar. Los saldos teóricos se validarán tras el envío.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Tabs defaultValue="cash-usd">
                                        <TabsList className="w-full grid grid-cols-3 rounded-none bg-muted h-14 border-b-2 border-black/10">
                                            <TabsTrigger value="cash-usd" className="font-black uppercase text-[10px] h-full data-[state=active]:bg-white">
                                                <Banknote className="mr-2 h-4 w-4 text-green-600" /> Efectivo $
                                            </TabsTrigger>
                                            <TabsTrigger value="cash-ves" className="font-black uppercase text-[10px] h-full data-[state=active]:bg-white">
                                                <Coins className="mr-2 h-4 w-4 text-primary" /> Efectivo Bs
                                            </TabsTrigger>
                                            <TabsTrigger value="electronic" className="font-black uppercase text-[10px] h-full data-[state=active]:bg-white">
                                                <CreditCard className="mr-2 h-4 w-4 text-blue-600" /> Bancos/Apps
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="cash-usd" className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {USD_DENOMINATIONS.map(den => (
                                                    <div key={den} className="flex flex-col gap-1">
                                                        <Label className="text-[10px] font-black uppercase opacity-60">Billete de ${den}</Label>
                                                        <div className="relative">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Cant." 
                                                                className="pl-8 font-black text-lg h-12"
                                                                onChange={(e) => updateCount('USD', den, e.target.value)}
                                                            />
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">x</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-right text-green-700">
                                                            Subtotal: ${(cashUsdCount[den] || 0) * den}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-200 border-dashed text-center">
                                                <p className="text-[11px] font-black uppercase text-green-800 opacity-60 mb-1">Total Efectivo Dólares</p>
                                                <p className="text-4xl font-black text-green-900">
                                                    ${Object.entries(cashUsdCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0)}
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="cash-ves" className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {VES_DENOMINATIONS.map(den => (
                                                    <div key={den} className="flex flex-col gap-1">
                                                        <Label className="text-[10px] font-black uppercase opacity-60">Billete de {den} Bs</Label>
                                                        <div className="relative">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Cant." 
                                                                className="pl-8 font-black text-lg h-12"
                                                                onChange={(e) => updateCount('VES', den, e.target.value)}
                                                            />
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">x</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-right text-primary">
                                                            Subtotal: {(cashVesCount[den] || 0) * den} Bs
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 border-dashed text-center">
                                                <p className="text-[11px] font-black uppercase text-primary opacity-60 mb-1">Total Efectivo Bolívares</p>
                                                <p className="text-4xl font-black text-primary">
                                                    {Object.entries(cashVesCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0)} Bs
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="electronic" className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h4 className="text-[11px] font-black uppercase text-blue-800 bg-blue-50 p-2 rounded border-l-4 border-blue-600">Banca Nacional (Lotes)</h4>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase">Punto de Venta (Total Lote)</Label>
                                                        <Input className="font-black text-lg h-12 border-2" value={otherBalances.punto} onChange={e => setOtherBalances({...otherBalances, punto: e.target.value})} />
                                                        <Label className="text-[10px] font-black uppercase">Pago Móvil (Suma Reportada)</Label>
                                                        <Input className="font-black text-lg h-12 border-2" value={otherBalances.pagoMovil} onChange={e => setOtherBalances({...otherBalances, pagoMovil: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[11px] font-black uppercase text-amber-800 bg-amber-50 p-2 rounded border-l-4 border-amber-600">Canales Digitales Divisas</h4>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase">Zelle / Banesco Panamá ($)</Label>
                                                        <Input className="font-black text-lg h-12 border-2" value={otherBalances.zelle} onChange={e => setOtherBalances({...otherBalances, zelle: e.target.value})} />
                                                        <Label className="text-[10px] font-black uppercase">Binance Pay (USDT)</Label>
                                                        <Input className="font-black text-lg h-12 border-2" value={otherBalances.binance} onChange={e => setOtherBalances({...otherBalances, binance: e.target.value})} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-8 border-t-2 border-black flex flex-col gap-4">
                                    <div className="w-full flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-red-800 leading-relaxed italic">
                                            ALERTA: Al finalizar este proceso, se enviará una notificación inmediata al administrador con los resultados del arqueo. Los descuadres serán registrados bajo su usuario.
                                        </p>
                                    </div>
                                    <Button variant="destructive" onClick={handleCloseBox} disabled={isProcessing} className="w-full h-16 text-xl font-black uppercase shadow-2xl">
                                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-3 h-6 w-6" />}
                                        Finalizar Jornada y Enviar Arqueo
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
            </main>

            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
