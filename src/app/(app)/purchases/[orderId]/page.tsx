
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, CheckCircle2, Loader2, Truck, Calendar, Box, PackageCheck, ShieldCheck, MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { LogisticsMap } from '@/components/purchases/logistics-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PurchaseDetail() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/purchases?storeId=${storeId}`);
            const ordersData = await res.json();
            const found = ordersData.find((o: any) => o._id === params.orderId);
            setOrder(found);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
            toast({ title: "Mercancía Recibida", description: "Stock disponible actualizado." });
            fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setReceiving(false);
        }
    };

    if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin h-10 w-10 text-primary'/></div>;
    if (!order) return <div className='p-12 text-center font-black'>Orden no encontrada.</div>;

    // Usar coordenadas exclusivas de este pedido (SNAPSHOT)
    const providerCoords = order.providerCoords;
    const destinationCoords = order.destinationCoords;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1300px] mx-auto w-full">
                <PageHeader 
                    title={`Orden REQ-${String(order.orderNumber).padStart(4, '0')}`} 
                    description={`Proveedor: ${order.vendor}`}
                    actions={<Button variant="outline" onClick={() => router.back()} className="font-bold border-2 h-11 px-6"><ChevronLeft className='mr-1 h-4 w-4'/> Volver</Button>}
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-6">
                        <Tabs defaultValue="items" className="space-y-6">
                            <TabsList className="bg-muted/50 p-1 border-2 w-full lg:w-fit h-12">
                                <TabsTrigger value="items" className="font-black text-xs uppercase px-8">
                                    <Box className="mr-2 h-4 w-4" /> Mercancía
                                </TabsTrigger>
                                <TabsTrigger value="logistics" className="font-black text-xs uppercase px-8">
                                    <Navigation className="mr-2 h-4 w-4" /> Rastreo Único
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="items" className="animate-in fade-in duration-500">
                                <Card className="border-2 shadow-sm overflow-hidden rounded-2xl">
                                    <CardHeader className="bg-muted/10 border-b">
                                        <CardTitle className="text-[11px] font-black uppercase flex items-center gap-2">
                                            <Box className="h-4 w-4 text-primary" /> Inventario en Lote
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="pl-6 font-black uppercase text-[10px] py-4">Producto</TableHead>
                                                    <TableHead className="text-center font-black uppercase text-[10px]">Cantidad</TableHead>
                                                    <TableHead className="text-right pr-6 font-black uppercase text-[10px]">Costo</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {order.items.map((item: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="pl-6 py-4">
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
                            </TabsContent>

                            <TabsContent value="logistics" className="animate-in zoom-in-95 duration-500">
                                <LogisticsMap 
                                    status={order.status === 'Recibido' ? 'Delivered' : 'In Transit'} 
                                    storeCoords={destinationCoords}
                                    providerCoords={providerCoords}
                                    vendorName={order.vendor}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-2 shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-[10px] font-black uppercase italic tracking-widest text-primary">Telemetría de la Carga</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-5 px-6">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                    <span className="opacity-50">Estado:</span>
                                    <Badge className="font-black uppercase text-[9px] bg-green-50 text-green-700 border-green-200">{order.status}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                    <span className="opacity-50">Lote:</span>
                                    <span className='font-mono font-bold'>{order.lotReference || 'N/A'}</span>
                                </div>
                                <div className="pt-4 border-t-2 border-dashed border-primary/10 flex justify-between items-baseline">
                                    <span className="text-[10px] font-black uppercase opacity-60">Costo Lote:</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">Bs. {order.totalAmount.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 p-6">
                                {order.status !== 'Recibido' ? (
                                    <Button onClick={handleReceive} disabled={receiving} className="w-full h-16 text-lg font-black uppercase shadow-2xl bg-green-600 hover:bg-green-700 rounded-2xl">
                                        {receiving ? <Loader2 className="animate-spin mr-2 h-6 w-6"/> : <PackageCheck className="mr-2 h-7 w-7"/>}
                                        Recibir Lote
                                    </Button>
                                ) : (
                                    <div className="text-center py-6 border-2 border-dashed border-green-200 rounded-2xl bg-green-50/50 w-full">
                                        <ShieldCheck className="h-10 w-10 text-green-600 mx-auto mb-2" />
                                        <p className="text-sm font-black text-green-800 uppercase italic">Ingresado al Sistema</p>
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
