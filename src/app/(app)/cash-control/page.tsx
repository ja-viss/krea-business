
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
    ShieldCheck,
    ArrowRightLeft,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const USD_DENOMINATIONS = [100, 50, 20, 10, 5, 1];
const VES_DENOMINATIONS = [100, 50, 20, 10, 5];

export default function CashControlPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [viewResults, setViewResults] = useState<any>(null);
    
    // Estados de Apertura
    const [openingUsd, setOpeningUsd] = useState('0');
    const [openingVes, setOpeningVes] = useState('0');

    // Estados de Cierre (Arqueo a Ciegas)
    const [cashUsdCount, setCashUsdCount] = useState<Record<number, number>>({});
    const [cashVesCount, setCashVesCount] = useState<Record<number, number>>({});
    const [electronicDeclarations, setElectronicDeclarations] = useState({
        puntoVes: { amount: '0', batch: '' },
        pagoMovilVes: { amount: '0', batch: '' },
        zelleUsd: { amount: '0', batch: '' },
        binanceUsd: { amount: '0', batch: '' }
    });
    const [closingNotes, setClosingNotes] = useState('');

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
            const userName = localStorage.getItem('userName');
            const balances = [
                { currency: 'USD', amount: parseFloat(openingUsd) || 0 },
                { currency: 'VES', amount: parseFloat(openingVes) || 0 }
            ];

            const res = await fetch('/api/cash-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, userId, userName, openingBalances: balances, action: 'OPEN' })
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
            const totalCashUsd = Object.entries(cashUsdCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);
            const totalCashVes = Object.entries(cashVesCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);

            const declared = [
                { currency: 'USD', method: 'Efectivo', amount: totalCashUsd, denominations: cashUsdCount },
                { currency: 'VES', method: 'Efectivo', amount: totalCashVes, denominations: cashVesCount },
                { currency: 'VES', method: 'Tarjeta', amount: parseFloat(electronicDeclarations.puntoVes.amount) || 0, batchNumber: electronicDeclarations.puntoVes.batch },
                { currency: 'VES', method: 'Pago Móvil', amount: parseFloat(electronicDeclarations.pagoMovilVes.amount) || 0 },
                { currency: 'USD', method: 'Transferencia', amount: parseFloat(electronicDeclarations.zelleUsd.amount) || 0, batchNumber: electronicDeclarations.zelleUsd.batch },
                { currency: 'USD', method: 'Binance', amount: parseFloat(electronicDeclarations.binanceUsd.amount) || 0 },
            ];

            const res = await fetch('/api/cash-control', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session._id, declaredBalances: declared, action: 'CLOSE', notes: closingNotes })
            });
            
            const resultData = await res.json();
            if (!res.ok) throw new Error(resultData.message);

            setViewResults(resultData);
            toast({ title: "Arqueo Procesado", description: "La jornada ha sido cerrada digitalmente." });
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

    // Si acabamos de cerrar, mostrar pantalla de resultados
    if (viewResults) {
        return (
            <div className="flex flex-1 flex-col p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
                <Card className="border-4 border-primary shadow-2xl">
                    <CardHeader className="bg-primary/5 text-center">
                        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Resumen de Cierre</CardTitle>
                        <CardDescription className="font-bold">Turno finalizado: {new Date(viewResults.closedAt).toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase">Método</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase">Declarado</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase">Diferencia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewResults.discrepancies.map((d: any, idx: number) => {
                                    const decl = viewResults.declaredBalances[idx]?.amount || 0;
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <span className="font-bold text-xs uppercase">{d.method} ({d.currency})</span>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-sm">{decl.toLocaleString()}</TableCell>
                                            <TableCell className={cn("text-right font-black text-sm", d.difference === 0 ? "text-green-600" : "text-red-600")}>
                                                {d.difference > 0 ? '+' : ''}{d.difference.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-14 font-black uppercase" onClick={() => { setViewResults(null); setSession(null); fetchSession(); }}>
                            Finalizar y Volver
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
                <PageHeader 
                    title="Control de Caja Digital" 
                    description="Protocolo de Arqueo a Ciegas para cierre de turno administrativo."
                />

                {!session ? (
                    <Card className="border-4 border-primary/10 shadow-2xl animate-in zoom-in-95">
                        <CardHeader className="text-center bg-primary/5 pb-8">
                            <Unlock className="h-12 w-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Apertura de Turno</CardTitle>
                            <CardDescription className="font-bold">Declara el fondo inicial disponible para dar vueltos.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-10 grid gap-8 md:grid-cols-2 max-w-2xl mx-auto">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-green-600" /> Fondo en Dólares ($)
                                </Label>
                                <Input type="number" className="text-3xl font-black h-16 text-center bg-green-50/30 border-2" value={openingUsd} onChange={e => setOpeningUsd(e.target.value)} />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-primary" /> Fondo en Bolívares (Bs.)
                                </Label>
                                <Input type="number" className="text-3xl font-black h-16 text-center bg-primary/5 border-2" value={openingVes} onChange={e => setOpeningVes(e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter className="pb-10 flex justify-center">
                            <Button onClick={handleOpenBox} disabled={isProcessing} className="w-full max-w-md h-16 text-xl font-black uppercase shadow-xl">
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Unlock className="mr-3 h-6 w-6" />}
                                Abrir Caja Registradora
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* PANEL IZQUIERDO: ESTADO ACTUAL */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="border-2 border-primary/20 bg-primary/[0.02]">
                                <CardHeader className="bg-primary/5 border-b pb-4">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Calculator className="h-4 w-4" /> Turno de: {session.userName}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-dashed">
                                        <span className="text-[10px] font-black uppercase opacity-50">Iniciado:</span>
                                        <span className="font-bold text-xs">{new Date(session.openedAt).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase opacity-50">Fondo Inicial:</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {session.openingBalances.map((b: any) => (
                                                <div key={b.currency} className="bg-white p-2 rounded border-2 text-center">
                                                    <span className="text-[11px] font-black">{b.amount.toLocaleString()} {b.currency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* PANEL DERECHO: ARQUEO A CIEGAS */}
                        <div className="lg:col-span-8">
                            <Card className="border-4 border-black shadow-2xl overflow-hidden">
                                <CardHeader className="bg-black text-white py-6">
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                                        <Lock className="h-6 w-6 text-primary" /> Arqueo a Ciegas (Paso Final)
                                    </CardTitle>
                                    <CardDescription className="text-white/60 font-bold uppercase text-[10px]">
                                        Cuenta el dinero físico y transcribe totales de puntos de venta.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Tabs defaultValue="cash-usd">
                                        <TabsList className="w-full grid grid-cols-3 rounded-none bg-muted h-14 border-b-2 border-black/10">
                                            <TabsTrigger value="cash-usd" className="font-black uppercase text-[10px] h-full">Efectivo $</TabsTrigger>
                                            <TabsTrigger value="cash-ves" className="font-black uppercase text-[10px] h-full">Efectivo Bs</TabsTrigger>
                                            <TabsTrigger value="electronic" className="font-black uppercase text-[10px] h-full">Banca/Apps</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="cash-usd" className="p-6 space-y-6">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {USD_DENOMINATIONS.map(den => (
                                                    <div key={den} className="space-y-1">
                                                        <Label className="text-[10px] font-black uppercase opacity-60">${den}</Label>
                                                        <Input type="number" placeholder="Cant." className="font-black text-center h-12" onChange={e => updateCount('USD', den, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200 border-dashed text-center">
                                                <p className="text-[11px] font-black uppercase text-green-800 opacity-60">Total Contado ($)</p>
                                                <p className="text-3xl font-black text-green-900">
                                                    ${Object.entries(cashUsdCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0)}
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="cash-ves" className="p-6 space-y-6">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {VES_DENOMINATIONS.map(den => (
                                                    <div key={den} className="space-y-1">
                                                        <Label className="text-[10px] font-black uppercase opacity-60">{den} Bs</Label>
                                                        <Input type="number" placeholder="Cant." className="font-black text-center h-12" onChange={e => updateCount('VES', den, e.target.value)} />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/20 border-dashed text-center">
                                                <p className="text-[11px] font-black uppercase text-primary opacity-60">Total Contado (Bs)</p>
                                                <p className="text-3xl font-black text-primary">
                                                    {Object.entries(cashVesCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0)} Bs
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="electronic" className="p-6 space-y-6">
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h4 className="text-[11px] font-black uppercase text-blue-800 border-l-4 border-blue-600 pl-2">Banca Nacional (Cierres POS)</h4>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase">Punto de Venta (Total Lote)</Label>
                                                        <Input type="number" className="font-black border-2" value={electronicDeclarations.puntoVes.amount} onChange={e => setElectronicDeclarations({...electronicDeclarations, puntoVes: {...electronicDeclarations.puntoVes, amount: e.target.value}})} />
                                                        <Label className="text-[10px] font-black uppercase">Nº de Lote / Turno POS</Label>
                                                        <Input className="font-mono text-xs" placeholder="Ej: 0145" value={electronicDeclarations.puntoVes.batch} onChange={e => setElectronicDeclarations({...electronicDeclarations, puntoVes: {...electronicDeclarations.puntoVes, batch: e.target.value}})} />
                                                        <Separator />
                                                        <Label className="text-[10px] font-black uppercase">Pago Móvil (Suma Total)</Label>
                                                        <Input type="number" className="font-black border-2" value={electronicDeclarations.pagoMovilVes.amount} onChange={e => setElectronicDeclarations({...electronicDeclarations, pagoMovilVes: {...electronicDeclarations.pagoMovilVes, amount: e.target.value}})} />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[11px] font-black uppercase text-amber-800 border-l-4 border-amber-600 pl-2">Apps Digitales ($)</h4>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black uppercase">Zelle / Banesco Pan ($)</Label>
                                                        <Input type="number" className="font-black border-2" value={electronicDeclarations.zelleUsd.amount} onChange={e => setElectronicDeclarations({...electronicDeclarations, zelleUsd: {...electronicDeclarations.zelleUsd, amount: e.target.value}})} />
                                                        <Label className="text-[10px] font-black uppercase">Binance Pay (Total USDT)</Label>
                                                        <Input type="number" className="font-black border-2" value={electronicDeclarations.binanceUsd.amount} onChange={e => setElectronicDeclarations({...electronicDeclarations, binanceUsd: {...electronicDeclarations.binanceUsd, amount: e.target.value}})} />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-8 border-t-2 border-black flex flex-col gap-4">
                                    <div className="w-full space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Observaciones / Comentarios de Cierre</Label>
                                        <Input className="bg-white" placeholder="Ej: Faltó un billete de $5, se retuvo para revisión..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
                                    </div>
                                    <Button variant="destructive" onClick={handleCloseBox} disabled={isProcessing} className="w-full h-16 text-xl font-black uppercase shadow-2xl">
                                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-3 h-6 w-6" />}
                                        Finalizar Turno y Procesar Cuadre
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
