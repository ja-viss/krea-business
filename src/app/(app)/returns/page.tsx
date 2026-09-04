
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    RotateCcw, 
    FileText, 
    UserCheck, 
    AlertTriangle,
    Loader2,
    ArrowRight,
    Search
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ReturnsPage() {
    const router = useRouter();
    const [returns, setReturns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchReturns = async () => {
            try {
                setLoading(true);
                const storeId = localStorage.getItem('storeId');
                const res = await fetch(`/api/returns?storeId=${storeId}`);
                const data = await res.json();
                setReturns(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchReturns();
    }, []);

    const filtered = returns.filter(r => 
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        String(r.invoiceNumber).includes(search)
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Devoluciones y Cambios" 
                    description="Gestión de retornos de mercancía y notas de crédito fiscales."
                    actions={
                        <Button asChild className='font-black uppercase shadow-lg shadow-primary/20'>
                            <Link href="/returns/new"><PlusCircle className='mr-2 h-4 w-4'/> Nueva Devolución</Link>
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className='border-2'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground'>Total Devoluciones (Mes)</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black'>{returns.length}</div>
                            <p className='text-[10px] font-bold text-red-600 uppercase mt-1'>Merma y reingresos</p>
                        </CardContent>
                    </Card>
                    <Card className='bg-primary/5 border-primary/20'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase text-primary'>Saldo en Notas de Crédito</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black text-primary'>Bs. 0.00</div>
                            <p className='text-[10px] font-bold text-muted-foreground uppercase mt-1'>Pendiente por canje</p>
                        </CardContent>
                    </Card>
                    <Card className='border-2 border-dashed'>
                        <CardHeader className='pb-2'><CardTitle className='text-[10px] font-black uppercase text-muted-foreground'>Efectivo Reembolsado</CardTitle></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black'>Bs. 0.00</div>
                            <p className='text-[10px] font-bold text-amber-600 uppercase mt-1'>Salida directa de caja</p>
                        </CardContent>
                    </Card>
                </div>

                <div className='flex items-center gap-4'>
                    <div className='relative flex-1 max-w-sm'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input 
                            placeholder="Buscar por cliente o factura..." 
                            className='pl-9 h-11'
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-xl border-2 bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className='bg-muted/50'>
                            <TableRow>
                                <TableHead className='font-black text-[10px] uppercase pl-6'>Fecha</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Origen (Factura)</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Cliente</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Método</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>Monto Anulado</TableHead>
                                <TableHead className='w-[50px] pr-6'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className='pl-6'><Skeleton className='h-4 w-20'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-24'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-32'/></TableCell>
                                        <TableCell><Skeleton className='h-6 w-20 rounded-full'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-20 ml-auto'/></TableCell>
                                        <TableCell className='pr-6'><Skeleton className='h-8 w-8 ml-auto'/></TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((r) => (
                                    <TableRow key={r._id} className='hover:bg-muted/30'>
                                        <TableCell className='pl-6 text-xs font-medium'>{format(new Date(r.createdAt), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className='font-mono text-xs font-bold'># {String(r.invoiceNumber).padStart(8, '0')}</TableCell>
                                        <TableCell className='font-black uppercase text-[10px] truncate max-w-[150px]'>{r.customerName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className='text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20'>
                                                {r.compensationMethod}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className='text-right font-black text-sm text-red-600'>
                                            - {new Intl.NumberFormat('es-VE').format(r.totalRefund)}
                                        </TableCell>
                                        <TableCell className='text-right pr-6'>
                                            <Button variant="ghost" size="icon" className='h-8 w-8'><ArrowRight className='h-4 w-4'/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">
                                        No hay registros de devoluciones.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}
