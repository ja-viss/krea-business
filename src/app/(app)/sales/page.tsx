
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
      return 'Fecha inválida';
    }
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Ventas"
          description="Gestión de transacciones y facturación."
          actions={
            <div className='flex flex-wrap gap-2 w-full sm:w-auto'>
              <Button variant="outline" className='flex-1 sm:flex-none' onClick={() => window.print()}>
                <FileDown className="mr-2 h-4 w-4" />
                Imprimir Lista
              </Button>
              <Button asChild className='flex-1 sm:flex-none'>
                <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nueva Venta
                </Link>
              </Button>
            </div>
          }
        />

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de Datos</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant="link" className="p-0 h-auto ml-2 text-destructive underline" onClick={fetchSales}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total (Bs.)</TableHead>
                    <TableHead className="w-[50px] pr-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4"><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell className="pr-4"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                ) : sales.length > 0 ? (
                    sales.map((sale) => (
                    <TableRow key={sale._id}>
                        <TableCell className="font-mono text-xs pl-4">Nº {String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                        <TableCell className="text-sm font-bold uppercase truncate max-w-[150px]">
                          {sale.customerName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{formatDate(String(sale.createdAt))}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={sale.status === 'Pagado' ? 'secondary' : 'outline'} 
                            className={sale.status === 'Pagado' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {sale.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 ml-auto">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => router.push(`/sales/${sale._id}/invoice`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Factura
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => window.open(`/sales/${sale._id}/invoice`, '_blank')}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 font-bold" onSelect={() => setSaleToDelete(sale)}>
                                Anular Venta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                        No se encontraron registros de ventas.
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </div>
        
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Deseas anular esta venta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará permanentemente la factura Nº {String(saleToDelete?.invoiceNumber).padStart(8, '0')} y el stock de los productos será restaurado al inventario.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 text-white hover:bg-red-700">
                  Confirmar Anulación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
