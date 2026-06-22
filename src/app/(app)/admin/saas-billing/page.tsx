
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, Search, Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function SaasBillingAdminPage() {
    const { toast } = useToast();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/saas-billing');
            const data = await res.json();
            setPayments(data);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los pagos." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const handleUpdateStatus = async (paymentId: string, status: 'Aprobado' | 'Rechazado') => {
        setProcessingId(paymentId);
        try {
            const res = await fetch('/api/admin/saas-billing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, status, notes: 'Procesado por Super Admin' })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            
            toast({ title: "Acción Completada", description: `El pago ha sido ${status.toLowerCase()} con éxito.` });
            fetchPayments();
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar el pago." });
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Aprobado': return <Badge className="bg-green-100 text-green-800 border-green-200">APROBADO</Badge>;
            case 'Rechazado': return <Badge variant="destructive">RECHAZADO</Badge>;
            default: return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">PENDIENTE</Badge>;
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control de Recaudación SaaS" 
                    description="Supervisa y valida los reportes de pago de tus clientes."
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Pagos Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-primary">
                                {payments.filter(p => p.status === 'Pendiente').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-muted-foreground">Total Recaudado (Mes)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">
                                ${payments.filter(p => p.status === 'Aprobado').reduce((acc, p) => acc + p.amount, 0).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-green-700">Tasa de Conversión</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-green-800">92%</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-primary" /> Historial de Transacciones
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por referencia..." className="pl-8 h-9 text-xs" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Empresa / Cliente</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Referencia</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Monto</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Fecha</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={6}><div className="h-12 w-full bg-muted animate-pulse rounded" /></TableCell></TableRow>
                                    ))
                                ) : payments.length > 0 ? (
                                    payments.map((p) => (
                                        <TableRow key={p._id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6">{getStatusBadge(p.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs uppercase">{p.store?.name || 'S/N'}</span>
                                                    <Badge variant="outline" className="w-fit text-[9px] font-bold mt-1">{p.store?.plan || 'BASIC'}</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{p.reference}</TableCell>
                                            <TableCell className="font-black text-sm text-primary">${p.amount.toFixed(2)}</TableCell>
                                            <TableCell className="text-[10px] font-medium">{format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                                            <TableCell className="text-right pr-6">
                                                {p.status === 'Pendiente' ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 bg-green-600 hover:bg-green-700 font-black text-[9px] uppercase"
                                                            onClick={() => handleUpdateStatus(p._id, 'Aprobado')}
                                                            disabled={processingId === p._id}
                                                        >
                                                            {processingId === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />} APROBAR
                                                        </Button>
                                                        <Button 
                                                            variant="destructive" 
                                                            size="sm" 
                                                            className="h-8 font-black text-[9px] uppercase"
                                                            onClick={() => handleUpdateStatus(p._id, 'Rechazado')}
                                                            disabled={processingId === p._id}
                                                        >
                                                            <XCircle className="mr-1 h-3 w-3" /> RECHAZAR
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase">
                                                        <ExternalLink className="mr-1 h-3 w-3" /> Detalles
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No hay reportes de pago pendientes.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
