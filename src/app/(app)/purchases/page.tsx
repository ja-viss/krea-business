
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, PlusCircle, FileText, Search, Loader2, Calendar, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export default function PurchasesPage() {
    const { toast } = useToast();
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            // Nota: Se asume que existe un endpoint /api/purchases. 
            // Si no, devolveremos un array vacío para evitar que la página se rompa.
            const res = await fetch(`/api/purchases?storeId=${storeId}`);
            if (res.ok) {
                const data = await res.json();
                setPurchases(data);
            } else {
                setPurchases([]);
            }
        } catch (e) {
            setPurchases([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const filtered = purchases.filter(p => 
        p.vendor?.toLowerCase().includes(search.toLowerCase()) || 
        p.documentNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Compras y Recepción" 
                    description="Registra la entrada de mercancía de proveedores para alimentar tu stock."
                    actions={
                        <Button disabled className="font-black uppercase shadow-lg shadow-primary/20">
                            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Factura
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Inversión del Mes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">Bs. 0.00</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-primary">Proveedores Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-primary">0</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Pendientes de Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">0</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por proveedor o factura..." 
                            className="pl-9 h-11 font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic">
                            <Truck className="h-5 w-5 text-primary" /> Historial de Compras
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Fecha</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Proveedor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Nº Documento</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Monto Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="pr-6"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filtered.length > 0 ? (
                                    filtered.map((p) => (
                                        <TableRow key={p._id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6 text-xs font-medium">{format(new Date(p.createdAt), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-black uppercase text-[10px] truncate max-w-[150px]">{p.vendor}</TableCell>
                                            <TableCell className="font-mono text-xs font-bold"># {p.documentNumber}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-green-100 text-green-800 border-green-200 uppercase font-black text-[8px]">Recibido</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-sm pr-6">
                                                Bs. {p.totalAmount.toLocaleString('es-VE')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                            No hay registros de compras recientes.
                                        </TableCell>
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
