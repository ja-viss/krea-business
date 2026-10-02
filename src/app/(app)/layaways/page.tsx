
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    CalendarClock, 
    PlusCircle, 
    Search, 
    Loader2, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    DollarSign,
    MoreHorizontal,
    ArrowRight,
    Ban,
    User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isBefore } from 'date-fns';
import { Input } from '@/components/ui/input';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export default function LayawaysPage() {
    const { toast } = useToast();
    const [layaways, setLayaways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchLayaways = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/layaways?storeId=${storeId}`);
            const data = await res.json();
            setLayaways(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLayaways();
    }, []);

    const handleAction = async (id: string, action: 'EXPIRE' | 'CANCEL') => {
        if (!confirm(`¿Estás seguro de ${action === 'EXPIRE' ? 'vencer' : 'cancelar'} este apartado? El stock volverá a estar disponible.`)) return;

        try {
            const res = await fetch(`/api/layaways/${id}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action,
                    userId: localStorage.getItem('userId'),
                    userName: localStorage.getItem('userName')
                })
            });
            if (!res.ok) throw new Error("Fallo al procesar acción");
            toast({ title: "Acción Completada" });
            fetchLayaways();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        }
    };

    const getStatusBadge = (layaway: any) => {
        const isExpired = layaway.status === 'ACTIVE' && isBefore(new Date(layaway.dates.expirationDate), new Date());
        
        if (layaway.status === 'COMPLETED') return <Badge className='bg-green-100 text-green-800 border-green-200'>COMPLETADO</Badge>;
        if (layaway.status === 'CANCELLED') return <Badge variant="destructive">ANULADO</Badge>;
        if (layaway.status === 'EXPIRED' || isExpired) return <Badge variant="destructive" className='animate-pulse'>VENCIDO</Badge>;
        
        return <Badge variant="outline" className='bg-blue-50 text-blue-700 border-blue-200'>ACTIVO</Badge>;
    };

    const filtered = layaways.filter(l => 
        l.code.toLowerCase().includes(search.toLowerCase()) || 
        l.customer.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Apartados & Créditos" 
                    description="Control de reservas de mercancía y saldos pendientes por cobrar."
                    actions={
                        <Button asChild className="font-black uppercase shadow-lg shadow-primary/20 h-12 px-6">
                            <Link href="/sales/new">
                                <PlusCircle className="mr-2 h-5 w-5" /> Nueva Reserva
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-2 border-primary/10 bg-primary/[0.02]">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-primary">Saldo por Recaudar</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">
                                ${layaways.filter(l => l.status === 'ACTIVE').reduce((acc, l) => acc + l.financials.remainingBalanceUsd, 0).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase opacity-60">Apartados Activos</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-black">{layaways.filter(l => l.status === 'ACTIVE').length}</div></CardContent>
                    </Card>
                    <Card className="border-2 border-red-100 bg-red-50/10">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-700">Por Vencer (3d)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-800">
                                {layaways.filter(l => l.status === 'ACTIVE' && differenceInDays(new Date(l.dates.expirationDate), new Date()) <= 3).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-dashed">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase opacity-60">Liquidado Hoy</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-green-600">
                                {layaways.filter(l => l.status === 'COMPLETED' && format(new Date(l.dates.deliveredAt!), 'dd') === format(new Date(), 'dd')).length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por código o cliente..." 
                        className="pl-9 h-11 border-2 font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="bg-muted/10 border-b"><CardTitle className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Cartera de Reservas</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Código / Fecha</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Cliente</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Vencimiento</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase">Total ($)</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase pr-6">Saldo Pendiente</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={7} className='p-4'><div className='h-8 bg-muted animate-pulse rounded'/></TableCell></TableRow>
                                        ))
                                    ) : filtered.map((l) => {
                                        const daysLeft = differenceInDays(new Date(l.dates.expirationDate), new Date());
                                        return (
                                            <TableRow key={l._id} className="hover:bg-primary/[0.02]">
                                                <TableCell className="pl-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-xs font-bold text-primary">{l.code}</span>
                                                        <span className="text-[8px] font-black uppercase opacity-40">{format(new Date(l.dates.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className='h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center border'><User className='h-3.5 w-3.5 text-primary' /></div>
                                                        <div className='flex flex-col'>
                                                            <span className="font-black uppercase text-[10px]">{l.customer.name}</span>
                                                            <span className='text-[8px] opacity-60'>{l.customer.idNumber}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold">{format(new Date(l.dates.expirationDate), 'dd/MM/yy')}</span>
                                                        {l.status === 'ACTIVE' && (
                                                            <span className={cn("text-[8px] font-black uppercase", daysLeft < 0 ? "text-red-600" : "text-blue-500")}>
                                                                {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)}d` : `Faltan ${daysLeft}d`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(l)}</TableCell>
                                                <TableCell className="text-right font-bold text-xs opacity-60">${l.financials.totalAmountUsd.toFixed(2)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="font-black text-sm text-red-600">${l.financials.remainingBalanceUsd.toFixed(2)}</div>
                                                    <div className="text-[7px] font-black text-muted-foreground uppercase">Abonado: ${l.financials.paidAmountUsd.toFixed(2)}</div>
                                                </TableCell>
                                                <TableCell className="pr-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-52">
                                                            {l.status === 'ACTIVE' && (
                                                                <>
                                                                    <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer">
                                                                        <DollarSign className="mr-2 h-4 w-4" /> Recibir Abono
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer text-red-600" onSelect={() => handleAction(l._id, 'CANCEL')}>
                                                                        <Ban className="mr-2 h-4 w-4" /> Cancelar Apartado
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            <DropdownMenuItem className="font-bold text-xs uppercase p-3 cursor-pointer">
                                                                <Receipt className="mr-2 h-4 w-4" /> Ver Historial
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filtered.length === 0 && !loading && (
                                        <TableRow><TableCell colSpan={7} className='h-40 text-center text-muted-foreground italic font-black uppercase opacity-20'>No hay registros en el archivo.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
