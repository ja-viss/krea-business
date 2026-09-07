
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, CheckCircle2, Loader2, Truck, Calendar, Box, PackageCheck, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PurchaseDetail() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/purchases?storeId=${localStorage.getItem('storeId')}`);
            const data = await res.json();
            const found = data.find((o: any) => o._id === params.orderId);
            setOrder(found);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [params.orderId]);

    const handleReceive = async () => {
        setReceiving(true);
        try {
            const res = await fetch(`/api/purchases/${params.orderId}/receive`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: localStorage.getItem('userId'),
                    userName: localStorage.getItem('userName')
                })
            });
            if (!res.ok) throw new Error("Fallo en recepción");
            toast({ title: "Mercancía Recibida", description: "El stock disponible ha sido incrementado." });
            fetchOrder();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setReceiving(false);
        }
    };

    if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin h-10 w-10 text-primary'/></div>;
    if (!order) return <div className='p-12 text-center font-black'>Orden no encontrada.</div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full">
                <PageHeader 
                    title={`Orden REQ-${String(order.orderNumber).padStart(4, '0')}`} 
                    description={`Proveedor: ${order.vendor}`}
                    actions={<Button variant="outline" onClick={() => router.back()}><ChevronLeft className='mr-1 h-4 w-4'/> Volver</Button>}
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <Box className="h-4 w-4 text-primary" /> Desglose del Pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6 font-bold uppercase text-[10px]">Producto</TableHead>
                                            <TableHead className="text-center font-bold uppercase text-[10px]">Cant. Pedida</TableHead>
                                            <TableHead className="text-right pr-6 font-bold uppercase text-[10px]">Costo Unit.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="pl-6">
                                                    <div className="font-black uppercase text-xs">{item.name}</div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-sm text-primary">{item.quantity}</TableCell>
                                                <TableCell className="text-right pr-6 font-mono text-xs">Bs. {item.cost.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {order.notes && (
                            <Card className="border-2 border-dashed bg-amber-50/20">
                                <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase opacity-60">Notas de la Orden</CardTitle></CardHeader>
                                <CardContent><p className="text-xs italic font-medium">"{order.notes}"</p></CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-2 shadow-md">
                            <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-xs font-black uppercase">Resumen Logístico</CardTitle></CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                    <span className="opacity-50">Estado:</span>
                                    <Badge variant="outline" className="font-black uppercase text-[9px]">{order.status}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                    <span className="opacity-50">Emisión:</span>
                                    <span>{format(new Date(order.issuedDate), 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                    <span className="opacity-50">Entrega Estimada:</span>
                                    <span>{format(new Date(order.expectedDeliveryDate), 'dd/MM/yyyy')}</span>
                                </div>
                                <div className="pt-4 border-t flex justify-between items-baseline">
                                    <span className="text-[10px] font-black uppercase opacity-60">Total Orden:</span>
                                    <span className="text-xl font-black text-primary">Bs. {order.totalAmount.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-primary/5 p-4 flex flex-col gap-3">
                                {order.status !== 'Recibido' ? (
                                    <>
                                        <div className="flex items-start gap-2 p-2 bg-white border border-primary/20 rounded-lg">
                                            <PackageCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <p className="text-[8px] font-bold text-primary leading-tight">
                                                Al recibir, el stock pasará de "En Tránsito" a "Disponible" automáticamente.
                                            </p>
                                        </div>
                                        <Button onClick={handleReceive} disabled={receiving} className="w-full h-14 font-black uppercase shadow-xl bg-green-600 hover:bg-green-700">
                                            {receiving ? <Loader2 className="animate-spin mr-2"/> : <Truck className="mr-2 h-5 w-5"/>}
                                            Recibir Mercancía
                                        </Button>
                                    </>
                                ) : (
                                    <div className="text-center py-4 space-y-2">
                                        <ShieldCheck className="h-10 w-10 text-green-600 mx-auto" />
                                        <p className="text-sm font-black text-green-800 uppercase">Orden Completada</p>
                                        <p className="text-[10px] font-bold opacity-60 uppercase">Recibido: {format(new Date(order.receivedAt), 'dd/MM/yy HH:mm')}</p>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
