
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Printer, Eye } from 'lucide-react';
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
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'No se pudo eliminar la venta.');
      }
      toast({ title: 'Venta Eliminada', description: 'Stock restaurado correctamente.' });
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
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return 'N/A';
    }
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Ventas"
          description="Historial de facturación y movimientos POS."
          actions={
            <>
              <Button variant="outline" className='shadow-sm' onClick={() => window.print()}>
                <FileDown className="mr-2 h-4 w-4" />
                Listado PDF
              </Button>
              <Button asChild className="font-black uppercase shadow-lg shadow-primary/20">
                <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Operación
                </Link>
              </Button>
            </>
          }
        />

        {error && (
          <Alert variant="destructive" className="border-4 shadow-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-black">Error de Conectividad</AlertTitle>
            <AlertDescription className="font-bold">
              {error}
              <Button variant="link" className="p-0 h-auto ml-2 text-destructive underline font-black" onClick={fetchSales}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 font-black text-[10px] uppercase">Nº Documento</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Titular / Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell font-black text-[10px] uppercase">Fecha</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Estado</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase">Importe Total</TableHead>
                    <TableHead className="w-[50px] pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                ) : sales.length > 0 ? (
                    sales.map((sale) => (
                    <TableRow key={sale._id} className="hover:bg-primary/[0.02]">
                        <TableCell className="font-mono text-xs font-bold pl-6 text-primary"># {String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                        <TableCell className="text-xs md:text-sm font-black uppercase truncate max-w-[150px]">
                          {sale.customerName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs font-medium">{formatDate(String(sale.createdAt))}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={sale.status === 'Pagado' ? 'secondary' : 'outline'} 
                            className={cn("text-[9px] font-black uppercase", sale.status === 'Pagado' ? 'bg-green-100 text-green-800' : '')}
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 ml-auto rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="font-bold text-xs uppercase" onSelect={() => router.push(`/sales/${sale._id}/invoice`)}>
                                <Eye className="mr-2 h-4 w-4" /> Visualizar Ticket
                              </DropdownMenuItem>
                              <DropdownMenuItem className="font-bold text-xs uppercase" onSelect={() => window.open(`/sales/${sale._id}/invoice`, '_blank')}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir POS
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 font-black text-xs uppercase" onSelect={() => setSaleToDelete(sale)}>
                                Anular Operación
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic font-medium">
                        No se detectaron movimientos en el historial.
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </div>
        
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
            <AlertDialogContent className="border-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase italic">¿Anular transacción?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold">
                  La factura Nº {String(saleToDelete?.invoiceNumber).padStart(8, '0')} será eliminada. El inventario se restaurará automáticamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 font-black uppercase shadow-lg shadow-red-200">
                  Confirmar Anulación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
