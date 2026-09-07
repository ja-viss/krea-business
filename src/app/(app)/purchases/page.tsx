
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, PlusCircle, Search, Loader2, Calendar, ShoppingBag, Clock, CheckCircle2, Package, Hash, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function PurchasesPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/purchases?storeId=${storeId}`);
            if (res.ok) {
                const data = await res.json();
                setPurchases(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const filtered = purchases.filter(p => 
        p.vendor?.toLowerCase().includes(search.toLowerCase()) || 
        p.lotReference?.toLowerCase().includes(search.toLowerCase()) ||
        String(p.orderNumber).includes(search)
    );

    const getStatusBadge = (status: string, deliveryDate: string) => {
        const isLate = status !== 'Recibido' && isAfter(new Date(), new Date(deliveryDate));
        
        switch(status) {
            case 'Recibido': return <Badge className='bg-green-100 text-green-800 border-green-200 uppercase font-black text-[8px]'><CheckCircle2 className='mr-1 h-3 w-3'/> Recibido</Badge>;
            case 'En camino': return <Badge variant="outline" className={cn('uppercase font-black text-[8px]', isLate ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-600 border-blue-200')}><Truck className='mr-1 h-3 w-3'/> {isLate ? 'Retrasado' : 'En Tránsito'}</Badge>;
            default: return <Badge variant="secondary" className='uppercase font-black text-[8px]'>{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control de Pedidos" 
                    description="Monitorea las órdenes de lote y mercancía en tránsito de tus proveedores."
                    actions={
                        <Button asChild className="font-black uppercase shadow-lg shadow-primary/20 h-12 px-8 rounded-2xl">
                            <Link href="/purchases/new">
                                <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Pedido
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card className="border-2 shadow-sm bg-blue-50/10 border-blue-100 rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Lotes en Camino
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">{purchases.filter(p => p.status === 'En camino').length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20 border-2 rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" /> Capital en Tránsito
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-primary">
                                Bs. {purchases.filter(p => p.status !== 'Recibido').reduce((acc, p) => acc + p.totalAmount, 0).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-dashed bg-muted/20 rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase opacity-60">Próximas Entregas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[9px] font-bold text-muted-foreground italic leading-tight">
                                Tienes {purchases.filter(p => p.status === 'En camino').length} lotes programados para llegar esta semana.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar REQ, Lote o Proveedor..." 
                            className="pl-9 h-12 font-bold border-2 rounded-xl"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic tracking-tight">
                            <Package className="h-5 w-5 text-primary" /> Historial de Carga y Lotes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Orden / Lote</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Proveedor</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Contenido Carga</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Entrega Prometida</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase pr-6">Inversión</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={6}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                        ))
                                    ) : filtered.length > 0 ? (
                                        filtered.map((p) => {
                                            const daysLeft = differenceInDays(new Date(p.expectedDeliveryDate), new Date());
                                            return (
                                                <TableRow key={p._id} className="hover:bg-primary/[0.02] cursor-pointer transition-colors group" onClick={() => router.push(`/purchases/${p._id}`)}>
                                                    <TableCell className="pl-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-xs font-bold text-primary">REQ-{String(p.orderNumber).padStart(4, '0')}</span>
                                                            <span className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
                                                                <Hash className="h-2 w-2"/> {p.lotReference || 'SIN REF.'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-black uppercase text-[11px] truncate max-w-[150px]">{p.vendor}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold truncate max-w-[150px] uppercase">{p.items[0]?.name}</span>
                                                            {p.items.length > 1 && <span className="text-[8px] opacity-60">Y {p.items.length - 1} productos más...</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold">{format(new Date(p.expectedDeliveryDate), 'dd/MM/yy')}</span>
                                                            {p.status === 'En camino' && (
                                                                <span className={cn("text-[8px] font-black uppercase", daysLeft < 0 ? "text-red-500" : "text-blue-500")}>
                                                                    {daysLeft === 0 ? "Llega hoy" : daysLeft < 0 ? `Atrasado ${Math.abs(daysLeft)}d` : `Faltan ${daysLeft}d`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(p.status, p.expectedDeliveryDate)}</TableCell>
                                                    <TableCell className="text-right font-black text-sm pr-6">
                                                        Bs. {p.totalAmount.toLocaleString('es-VE')}
                                                        <ArrowRight className="inline-block ml-2 h-3 w-3 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all text-primary"/>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic font-medium">
                                                No se encontraron pedidos con esos criterios.
                                            </TableCell>
                                        </TableRow>
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
