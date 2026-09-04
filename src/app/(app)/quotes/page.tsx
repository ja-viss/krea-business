
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, ArrowRight, Clock, CheckCircle2, AlertCircle, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function QuotesPage() {
    const router = useRouter();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/quotes?storeId=${storeId}`);
            const data = await res.json();
            setQuotes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Convertida': return <Badge className='bg-green-100 text-green-800 border-green-200'><CheckCircle2 className='mr-1 h-3 w-3'/> FACTURADA</Badge>;
            case 'Vencida': return <Badge variant="destructive"><Clock className='mr-1 h-3 w-3'/> VENCIDA</Badge>;
            default: return <Badge variant="outline" className='bg-blue-50 text-blue-700 border-blue-200'><FileText className='mr-1 h-3 w-3'/> PENDIENTE</Badge>;
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Cotizaciones" 
                    description="Propuestas comerciales y presupuestos temporales."
                    actions={
                        <Button asChild className='font-black uppercase'>
                            <Link href="/quotes/new"><PlusCircle className='mr-2 h-4 w-4'/> Nuevo Presupuesto</Link>
                        </Button>
                    }
                />

                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className='bg-muted/50'>
                            <TableRow>
                                <TableHead className='font-black text-[10px] uppercase pl-6'>Nº Presupuesto</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Cliente</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Vencimiento</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Estado</TableHead>
                                <TableHead className='text-right font-black text-[10px] uppercase'>Total (Bs.)</TableHead>
                                <TableHead className='w-[50px] pr-6'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className='pl-6'><Skeleton className='h-4 w-16'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-32'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-24'/></TableCell>
                                        <TableCell><Skeleton className='h-6 w-20 rounded-full'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-20 ml-auto'/></TableCell>
                                        <TableCell className='pr-6'><Skeleton className='h-8 w-8 ml-auto'/></TableCell>
                                    </TableRow>
                                ))
                            ) : quotes.length > 0 ? (
                                quotes.map((q) => (
                                    <TableRow key={q._id} className='hover:bg-muted/30 group'>
                                        <TableCell className='pl-6 font-mono font-bold text-xs'>
                                            COT-{String(q.quotationNumber).padStart(6, '0')}
                                        </TableCell>
                                        <TableCell className='font-black uppercase text-xs truncate max-w-[200px]'>
                                            {q.customerName}
                                        </TableCell>
                                        <TableCell className='text-xs font-medium'>
                                            {format(new Date(q.expiryDate), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(q.status)}</TableCell>
                                        <TableCell className='text-right font-black text-sm text-primary'>
                                            {new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(q.totalAmount)}
                                        </TableCell>
                                        <TableCell className='text-right pr-6'>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className='h-8 w-8'><MoreHorizontal className='h-4 w-4'/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className='w-48'>
                                                    <DropdownMenuItem onClick={() => router.push(`/quotes/${q._id}`)} className='font-bold text-xs uppercase'>
                                                        <FileText className='mr-2 h-4 w-4'/> Ver Detalle
                                                    </DropdownMenuItem>
                                                    {q.status === 'Pendiente' && (
                                                        <DropdownMenuItem onClick={() => router.push(`/quotes/${q._id}?action=convert`)} className='text-green-600 font-bold text-xs uppercase'>
                                                            <ArrowRight className='mr-2 h-4 w-4'/> Facturar
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className='h-40 text-center text-muted-foreground italic'>
                                        No hay presupuestos registrados.
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
