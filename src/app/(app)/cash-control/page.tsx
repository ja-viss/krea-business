
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
    XCircle,
    Store,
    LayoutGrid,
    EyeOff,
    FileText,
    Receipt
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const USD_DENOMINATIONS = [100, 50, 20, 10, 5, 1];
const VES_DENOMINATIONS = [100, 50, 20, 10, 5];
const COP_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000];

export default function CashControlPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [viewResults, setViewResults] = useState<any>(null);
    const [storeConfig, setStoreConfig] = useState<any>(null);
    
    // Configuración de Cierre
    const [closureMode, setClosureMode] = useState<'blind' | 'manual' | 'fiscal'>('blind');

    // Estados de Apertura
    const [openingUsd, setOpeningUsd] = useState('0');
    const [openingVes, setOpeningVes] = useState('0');
    const [openingCop, setOpeningCop] = useState('0');
    const [terminalName, setTerminalName] = useState('Caja 1');

    // Estados de Arqueo (Blindado)
    const [cashUsdCount, setCashUsdCount] = useState<Record<number, number>>({});
    const [cashVesCount, setCashVesCount] = useState<Record<number, number>>({});
    const [cashCopCount, setCashCopCount] = useState<Record<number, number>>({});

    // Estados de Cierre Manual / Fiscal
    const [manualDeclarations, setManualDeclarations] = useState({
        efectivoUsd: '0',
        efectivoVes: '0',
        efectivoCop: '0',
        puntoVes: '0',
        pagoMovilVes: '0',
        zelleUsd: '0',
        binanceUsd: '0'
    });
    const [closingNotes, setClosingNotes] = useState('');

    useEffect(() => {
        fetchSessionAndConfig();
    }, []);

    const fetchSessionAndConfig = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            
            const [sessionRes, configRes] = await Promise.all([
                fetch(`/api/cash-control?storeId=${storeId}`),
                fetch(`/api/settings/store?storeId=${storeId}`)
            ]);

            if (sessionRes.ok) {
                const data = await sessionRes.json();
                setSession(data.activeSession);
            }
            
            if (configRes.ok) {
                const configData = await configRes.json();
                setStoreConfig(configData);
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
                { currency: 'VES', amount: parseFloat(openingVes) || 0 },
                { currency: 'COP', amount: parseFloat(openingCop) || 0 }
            ];

            const res = await fetch('/api/cash-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storeId, 
                    userId, 
                    userName, 
                    terminalName,
                    openingBalances: balances, 
                    action: 'OPEN' 
                })
            });
            if (!res.ok) throw new Error('Error al abrir caja');
            
            toast({ title: "Turno Iniciado", description: `Caja "${terminalName}" lista para facturar.` });
            fetchSessionAndConfig();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseBox = async () => {
        setIsProcessing(true);
        try {
            let declared = [];

            if (closureMode === 'blind') {
                const totalCashUsd = Object.entries(cashUsdCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);
                const totalCashVes = Object.entries(cashVesCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);
                const totalCashCop = Object.entries(cashCopCount).reduce((acc, [den, qty]) => acc + (parseInt(den) * qty), 0);

                declared = [
                    { currency: 'USD', method: 'Efectivo', amount: totalCashUsd, denominations: cashUsdCount },
                    { currency: 'VES', method: 'Efectivo', amount: totalCashVes, denominations: cashVesCount },
                    { currency: 'COP', method: 'Efectivo', amount: totalCashCop, denominations: cashCopCount },
                    { currency: 'VES', method: 'Tarjeta', amount: parseFloat(manualDeclarations.puntoVes) || 0 },
                    { currency: 'VES', method: 'Pago Móvil', amount: parseFloat(manualDeclarations.pagoMovilVes) || 0 },
                    { currency: 'USD', method: 'Zelle', amount: parseFloat(manualDeclarations.zelleUsd) || 0 },
                ];
            } else {
                // Modo Manual o Fiscal
                declared = [
                    { currency: 'USD', method: 'Efectivo', amount: parseFloat(manualDeclarations.efectivoUsd) || 0 },
                    { currency: 'VES', method: 'Efectivo', amount: parseFloat(manualDeclarations.efectivoVes) || 0 },
                    { currency: 'COP', method: 'Efectivo', amount: parseFloat(manualDeclarations.efectivoCop) || 0 },
                    { currency: 'VES', method: 'Tarjeta', amount: parseFloat(manualDeclarations.puntoVes) || 0 },
                    { currency: 'VES', method: 'Pago Móvil', amount: parseFloat(manualDeclarations.pagoMovilVes) || 0 },
                    { currency: 'USD', method: 'Zelle', amount: parseFloat(manualDeclarations.zelleUsd) || 0 },
                ];
            }

            const res = await fetch('/api/cash-control', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sessionId: session._id, 
                    declaredBalances: declared, 
                    action: 'CLOSE', 
                    notes: closingNotes,
                    closureMode 
                })
            });
            
            const resultData = await res.json();
            if (!res.ok) throw new Error(resultData.message);

            setViewResults(resultData);
            toast({ title: "Cierre Procesado", description: `Jornada finalizada en modo ${closureMode}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error crítico", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const updateCount = (currency: 'USD' | 'VES' | 'COP', denomination: number, value: string) => {
        const qty = parseInt(value) || 0;
        if (currency === 'USD') setCashUsdCount(prev => ({ ...prev, [denomination]: qty }));
        else if (currency === 'VES') setCashVesCount(prev => ({ ...prev, [denomination]: qty }));
        else setCashCopCount(prev => ({ ...prev, [denomination]: qty }));
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    if (viewResults) {
        return (
            <div className="flex flex-1 flex-col p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
                <Card className="border-4 border-primary shadow-2xl">
                    <CardHeader className="bg-primary/5 text-center">
                        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                        <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Resumen de {viewResults.closureMode === 'fiscal' ? 'Corte Fiscal' : 'Cierre de Turno'}</CardTitle>
                        <CardDescription className="font-bold">Taquilla: {viewResults.terminalName} • Cajero: {viewResults.userName}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase">Método / Moneda</TableHead>
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
                                            <TableCell className={cn("text-right font-black text-sm", Math.abs(d.difference) < 0.01 ? "text-green-600" : "text-red-600")}>
                                                {d.difference > 0 ? '+' : ''}{d.difference.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {viewResults.closureMode === 'fiscal' && (
                            <div className="mt-8 p-4 bg-muted/20 border-2 border-dashed rounded-xl">
                                <h4 className="text-xs font-black uppercase mb-4 flex items-center gap-2"><Receipt className="h-4 w-4" /> Consolidado Fiscal del Turno</h4>
                                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold">
                                    <div className="flex justify-between"><span>Base Imponible (16%):</span><span>{viewResults.theoreticalBalances.reduce((a:any, b:any) => a + (b.amount * 0.84), 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>IVA Recaudado:</span><span className="text-primary">{viewResults.theoreticalBalances.reduce((a:any, b:any) => a + (b.amount * 0.16), 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-2 col-span-2"><span>TOTAL FISCAL:</span><span className="text-lg font-black">Bs. {viewResults.theoreticalBalances.reduce((a:any, b:any) => a + b.amount, 0).toLocaleString()}</span></div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-14 font-black uppercase shadow-xl" onClick={() => { setViewResults(null); setSession(null); fetchSessionAndConfig(); }}>
                            Finalizar y Archivar
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full">
                <PageHeader 
                    title="Control de Caja" 
                    description="Gestión de jornadas, arqueos ciegos y cumplimiento fiscal."
                />

                {!session ? (
                    <Card className="border-4 border-primary/10 shadow-2xl animate-in zoom-in-95">
                        <CardHeader className="text-center bg-primary/5 pb-8">
                            <Unlock className="h-12 w-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">Apertura de Jornada</CardTitle>
                            <CardDescription className="font-bold">Define el fondo de sencillo para iniciar el turno.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-10 space-y-8 max-w-4xl mx-auto">
                            <div className="grid gap-8 md:grid-cols-3">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-green-600" /> Fondo Dólares ($)
                                    </Label>
                                    <Input type="number" className="text-3xl font-black h-16 text-center bg-green-50/30 border-2" value={openingUsd} onChange={e => setOpeningUsd(e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-primary" /> Fondo Bolívares (Bs)
                                    </Label>
                                    <Input type="number" className="text-3xl font-black h-16 text-center bg-primary/5 border-2" value={openingVes} onChange={e => setOpeningVes(e.target.value)} />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
                                        <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Fondo Pesos (COP)
                                    </Label>
                                    <Input type="number" className="text-3xl font-black h-16 text-center bg-amber-50/30 border-2" value={openingCop} onChange={e => setOpeningCop(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-3 max-w-md mx-auto">
                                <Label className="text-xs font-black uppercase text-muted-foreground text-center block">Nombre / Nº de Caja</Label>
                                <Input className="text-xl font-black h-14 text-center border-2 uppercase" value={terminalName} onChange={e => setTerminalName(e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter className="pb-10 flex justify-center">
                            <Button onClick={handleOpenBox} disabled={isProcessing} className="w-full max-w-md h-16 text-xl font-black uppercase shadow-2xl">
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Unlock className="mr-3 h-6 w-6" />}
                                Abrir Taquilla e Iniciar Turno
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* PANEL IZQUIERDO: SELECCIÓN DE MODO */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="border-2 shadow-sm bg-muted/10">
                                <CardHeader className="pb-3 border-b">
                                    <CardTitle className="text-xs font-black uppercase">Protocolo de Cierre</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <button 
                                        className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", closureMode === 'blind' ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-muted")}
                                        onClick={() => setClosureMode('blind')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <EyeOff className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase leading-none">Arqueo a Ciegas</p>
                                                <p className="text-[9px] font-bold opacity-70">Control de billetes (Seguro)</p>
                                            </div>
                                        </div>
                                        {closureMode === 'blind' && <CheckCircle2 className="h-4 w-4" />}
                                    </button>

                                    <button 
                                        className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", closureMode === 'manual' ? "bg-amber-500 text-white border-amber-600 shadow-lg" : "bg-white border-muted")}
                                        onClick={() => setClosureMode('manual')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase leading-none">Cierre Manual</p>
                                                <p className="text-[9px] font-bold opacity-70">Ingreso de totales directos</p>
                                            </div>
                                        </div>
                                        {closureMode === 'manual' && <CheckCircle2 className="h-4 w-4" />}
                                    </button>

                                    <button 
                                        className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", closureMode === 'fiscal' ? "bg-black text-white border-black shadow-lg" : "bg-white border-muted")}
                                        onClick={() => setClosureMode('fiscal')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Receipt className="h-5 w-5" />
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase leading-none">Corte Fiscal</p>
                                                <p className="text-[9px] font-bold opacity-70">Reporte Z y Auditoría IVA</p>
                                            </div>
                                        </div>
                                        {closureMode === 'fiscal' && <CheckCircle2 className="h-4 w-4" />}
                                    </button>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-primary/20 bg-primary/[0.02]">
                                <CardHeader className="bg-primary/5 border-b pb-4">
                                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Calculator className="h-4 w-4" /> Turno de: {session.userName}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Caja:</span><span>{session.terminalName}</span></div>
                                    <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Apertura:</span><span>{new Date(session.openedAt).toLocaleTimeString()}</span></div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase opacity-40">Fondo Inicial Reportado:</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {session.openingBalances.map((b: any) => (
                                                <div key={b.currency} className="bg-white p-2 rounded border-2 text-center">
                                                    <p className="text-[7px] font-black opacity-40">{b.currency}</p>
                                                    <p className="text-[10px] font-black">{b.amount.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* PANEL DERECHO: FORMULARIO DINÁMICO */}
                        <div className="lg:col-span-8">
                            <Card className="border-4 border-black shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                                <CardHeader className="bg-black text-white py-6">
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                                        <Lock className="h-6 w-6 text-primary" /> 
                                        {closureMode === 'blind' ? 'Arqueo Físico de Efectivo' : closureMode === 'manual' ? 'Resumen de Recaudación' : 'Validación Fiscal'}
                                    </CardTitle>
                                    <CardDescription className="text-white/60 font-bold uppercase text-[10px]">
                                        {closureMode === 'blind' ? 'Ingrese la cantidad de billetes contados.' : 'Ingrese los montos finales según sus comprobantes.'}
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {closureMode === 'blind' ? (
                                        <Tabs defaultValue="cash-ves">
                                            <TabsList className="w-full grid grid-cols-3 rounded-none bg-muted h-14 border-b-2 border-black/10">
                                                <TabsTrigger value="cash-ves" className="font-black uppercase text-[10px]">Efectivo Bs</TabsTrigger>
                                                <TabsTrigger value="cash-usd" className="font-black uppercase text-[10px]">Efectivo $</TabsTrigger>
                                                <TabsTrigger value="cash-cop" className="font-black uppercase text-[10px]">Efectivo Pesos</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="cash-ves" className="p-6 space-y-6">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {VES_DENOMINATIONS.map(den => (
                                                        <div key={den} className="space-y-1">
                                                            <Label className="text-[10px] font-black uppercase opacity-60">Billete {den} Bs</Label>
                                                            <Input type="number" placeholder="Cant." className="font-black text-center h-12" onChange={e => updateCount('VES', den, e.target.value)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="cash-usd" className="p-6 space-y-6">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {USD_DENOMINATIONS.map(den => (
                                                        <div key={den} className="space-y-1">
                                                            <Label className="text-[10px] font-black uppercase opacity-60">Billete ${den}</Label>
                                                            <Input type="number" placeholder="Cant." className="font-black text-center h-12" onChange={e => updateCount('USD', den, e.target.value)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="cash-cop" className="p-6 space-y-6">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {COP_DENOMINATIONS.map(den => (
                                                        <div key={den} className="space-y-1">
                                                            <Label className="text-[10px] font-black uppercase opacity-60">{den.toLocaleString()} Pesos</Label>
                                                            <Input type="number" placeholder="Cant." className="font-black text-center h-12" onChange={e => updateCount('COP', den, e.target.value)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    ) : (
                                        <div className="p-8 grid gap-8 md:grid-cols-2">
                                            <div className="space-y-6">
                                                <h4 className="text-[11px] font-black uppercase text-primary border-l-4 border-primary pl-2 italic">Efectivo en Bóveda</h4>
                                                <div className="space-y-4">
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Total Bolívares (VES)</Label><Input type="number" value={manualDeclarations.efectivoVes} onChange={e => setManualDeclarations({...manualDeclarations, efectivoVes: e.target.value})} className="h-12 font-black border-2" /></div>
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Total Dólares (USD)</Label><Input type="number" value={manualDeclarations.efectivoUsd} onChange={e => setManualDeclarations({...manualDeclarations, efectivoUsd: e.target.value})} className="h-12 font-black border-2" /></div>
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Total Pesos (COP)</Label><Input type="number" value={manualDeclarations.efectivoCop} onChange={e => setManualDeclarations({...manualDeclarations, efectivoCop: e.target.value})} className="h-12 font-black border-2" /></div>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h4 className="text-[11px] font-black uppercase text-blue-700 border-l-4 border-blue-600 pl-2 italic">Medios Electrónicos</h4>
                                                <div className="space-y-4">
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Punto de Venta (Tarjetas)</Label><Input type="number" value={manualDeclarations.puntoVes} onChange={e => setManualDeclarations({...manualDeclarations, puntoVes: e.target.value})} className="h-12 font-black border-2" /></div>
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Pago Móvil (Consolidado)</Label><Input type="number" value={manualDeclarations.pagoMovilVes} onChange={e => setManualDeclarations({...manualDeclarations, pagoMovilVes: e.target.value})} className="h-12 font-black border-2" /></div>
                                                    <div><Label className="text-[9px] font-black uppercase opacity-50">Zelle / Otros ($)</Label><Input type="number" value={manualDeclarations.zelleUsd} onChange={e => setManualDeclarations({...manualDeclarations, zelleUsd: e.target.value})} className="h-12 font-black border-2" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="bg-muted/50 p-8 border-t-2 border-black flex flex-col gap-4">
                                    <div className="w-full space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Observaciones de Cierre (Justificación de faltantes/sobrantes)</Label>
                                        <Input className="bg-white font-medium" placeholder="Ej: No se recibió billete de $1 solicitado..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
                                    </div>
                                    <Button 
                                        variant="destructive" 
                                        onClick={handleCloseBox} 
                                        disabled={isProcessing} 
                                        className="w-full h-16 text-xl font-black uppercase shadow-2xl rounded-2xl"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-3 h-6 w-6" />}
                                        {closureMode === 'fiscal' ? 'Ejecutar Reporte Z y Cerrar' : 'Finalizar Turno'}
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
