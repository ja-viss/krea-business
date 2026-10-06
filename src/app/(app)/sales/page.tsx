'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Printer, Eye, Truck, ArrowRight, Calendar, User, Hash } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { ISale } from '@/models/Sale';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SalesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sales, setSales] = useState<ISale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<ISale | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const storeId = localStorage.getItem('storeId');
      if (!storeId) throw new Error('No se ha iniciado sesión.');
      
      const response = await fetch(`/api/sales?storeId=${storeId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error desconocido al obtener ventas.');
      }
      
      setSales(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSales();
  }, []);

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      const response = await fetch(`/api/sales/${saleToDelete._id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo anular el despacho.');
      toast({ title: 'Nota de Entrega Anulada' });
      fetchSales();
    } catch (err: any) {
       toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
        setSaleToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  return (
    <div className="flex flex-1 flex-col pb-safe">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
        <PageHeader
          title="Historial de Salidas"
          description="Control administrativo de mercancía entregada."
          actions={
            <Button asChild className="w-full sm:w-auto font-black uppercase shadow-lg shadow-primary/20 h-12 rounded-xl">
              <Link href="/sales/new"><PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho</Link>
            </Button>
          }
        />

        {error && (
          <Alert variant="destructive" className="border-4 shadow-xl">
            <AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4">
            {/* VISTA MÓVIL: CARDS */}
            <div className="grid grid-cols-1 md:hidden gap-3">
                {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-3xl" />) :
                sales.map(sale => (
                    <Card key={sale._id} className="border-2 p-5 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden" onClick={() => router.push(`/sales/${sale._id}/invoice`)}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase opacity-40">Cod. Control</span>
                                <span className="font-mono text-xs font-bold text-primary">NE-{String(sale.invoiceNumber).padStart(6, '0')}</span>
                            </div>
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-[9px] font-black uppercase">
                                <Truck className="h-3 w-3 mr-1"/> ENTREGADO
                            </Badge>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center border"><User className="h-4 w-4 text-primary" /></div>
                                <span className="font-black uppercase text-xs truncate max-w-[200px]">{sale.customerName}</span>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-dashed">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                    <Calendar className="h-3 w-3" /> {formatDate(String(sale.createdAt))}
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-black text-primary">{formatCurrency(sale.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                        <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 opacity-20" />
                    </Card>
                ))}
            </div>

            {/* VISTA DESKTOP: TABLA */}
            <Card className="hidden md:block rounded-2xl border-2 shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="pl-6 font-black text-[10px] uppercase tracking-widest">Cod. Despacho</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Receptor / Cliente</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest">Fecha</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Monto Ref.</TableHead>
                            <TableHead className="w-[50px] pr-6"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}><TableCell className="pl-6 py-4"><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-40" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell><TableCell className="pr-6"><Skeleton className="h-10 w-10 ml-auto" /></TableCell></TableRow>
                        )) : sales.map((sale) => (
                            <TableRow key={sale._id} className="hover:bg-primary/[0.02] cursor-pointer group" onClick={() => router.push(`/sales/${sale._id}/invoice`)}>
                                <TableCell className="font-mono text-xs font-bold pl-6 text-primary">NE-{String(sale.invoiceNumber).padStart(6, '0')}</TableCell>
                                <TableCell className="font-black uppercase text-xs">{sale.customerName}</TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">{formatDate(String(sale.createdAt))}</TableCell>
                                <TableCell className="text-right font-black text-sm">{formatCurrency(sale.totalAmount)}</TableCell>
                                <TableCell className="pr-6 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-2 shadow-2xl">
                                            <DropdownMenuItem onSelect={() => router.push(`/sales/${sale._id}/invoice`)} className="p-3 font-bold uppercase text-xs"><Eye className="mr-2 h-4 w-4"/> Ver Nota</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600 font-black text-xs uppercase p-3" onSelect={() => setSaleToDelete(sale)}>Anular Despacho</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
        
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
            <AlertDialogContent className="border-4 mx-4 rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase italic">¿Anular despacho de mercancía?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold">Esta acción devolverá los productos al inventario y eliminará el rastro de salida.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                <AlertDialogCancel className="font-bold rounded-xl h-12">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 font-black uppercase shadow-lg h-12 rounded-xl">Confirmar Anulación</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
