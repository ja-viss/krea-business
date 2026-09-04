
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Lock, Unlock, TrendingUp, AlertCircle, Loader2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CashControlPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [openingAmount, setOpeningAmount] = useState('');
    const [closingAmount, setClosingAmount] = useState('');

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
        if (!openingAmount || isNaN(parseFloat(openingAmount))) {
            toast({ variant: 'destructive', title: "Error", description: "Ingresa un monto de apertura válido." });
            return;
        }

        setIsProcessing(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const userId = localStorage.getItem('userId');
            const res = await fetch('/api/cash-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, userId, amount: parseFloat(openingAmount), action: 'OPEN' })
            });
            if (!res.ok) throw new Error('Error al abrir');
            
            toast({ title: "Caja Abierta", description: "Ya puedes procesar ventas en este turno." });
            fetchSession();
        } catch (e) {
            toast({ variant: 'destructive', title: "Fallo", description: "No se pudo abrir la caja." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseBox = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/cash-control', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session._id, closingAmount: parseFloat(closingAmount), action: 'CLOSE' })
            });
            if (!res.ok) throw new Error('Error al cerrar');

            toast({ title: "Caja Cerrada", description: "Turno finalizado exitosamente." });
            setSession(null);
            setClosingAmount('');
            fetchSession();
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Fallo al procesar el cierre." });
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-4xl mx-auto w-full">
                <PageHeader 
                    title="Control de Caja (Arqueo)" 
                    description="Supervisa las entradas y salidas de efectivo por turno."
                />

                {!session ? (
                    <Card className="border-2 shadow-xl animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader className="text-center bg-muted/20 pb-8">
                            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Unlock className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl font-black uppercase">Apertura de Turno</CardTitle>
                            <CardDescription>Indica el monto base (fondo de caja) disponible.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase">Saldo Inicial (Bolívares)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    className="text-3xl font-black h-16 text-center"
                                    value={openingAmount}
                                    onChange={(e) => setOpeningAmount(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleOpenBox} disabled={isProcessing} className="w-full h-14 text-lg font-black uppercase shadow-lg">
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Unlock className="mr-2 h-5 w-5" />}
                                Abrir Punto de Venta
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-2 border-primary/20 shadow-md h-fit">
                            <CardHeader className="bg-primary/5">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm font-black uppercase">Estado del Turno</CardTitle>
                                    <Badge className="bg-green-100 text-green-800 border-green-200">ACTIVO</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Apertura:</span>
                                    <span className="font-black text-sm">{session.openedAt ? new Date(session.openedAt).toLocaleTimeString() : '--'}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Saldo Inicial:</span>
                                    <span className="font-black text-sm">Bs. {session.openingAmount.toLocaleString()}</span>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-xl text-center space-y-1">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">Ventas Registradas (Turno)</p>
                                    <p className="text-3xl font-black text-primary">Bs. {session.totalSalesInSession || '0.00'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 shadow-xl border-amber-500/20 bg-amber-50/5">
                            <CardHeader className="bg-amber-500/10">
                                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Conciliación y Cierre
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase">Efectivo Físico en Caja</Label>
                                    <Input 
                                        type="number" 
                                        placeholder="Contabiliza el dinero real" 
                                        className="text-2xl font-black h-14 bg-white"
                                        value={closingAmount}
                                        onChange={(e) => setClosingAmount(e.target.value)}
                                    />
                                    <p className="text-[9px] text-muted-foreground italic">El sistema comparará este monto contra las ventas registradas.</p>
                                </div>

                                <Alert variant="destructive" className="bg-white">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle className="text-xs font-black uppercase">Atención</AlertTitle>
                                    <AlertDescription className="text-[10px] font-medium">
                                        Al cerrar, no podrás editar ventas previas en este turno. Asegúrate de que el monto sea exacto.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                            <CardFooter>
                                <Button variant="destructive" onClick={handleCloseBox} disabled={isProcessing || !closingAmount} className="w-full h-12 font-black uppercase">
                                    {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                                    Finalizar Jornada
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
