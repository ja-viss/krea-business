
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Printer, Eye, Truck } from 'lucide-react';
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
        throw new Error(data.message || 'No se pudo anular el despacho.');
      }
      toast({ title: 'Nota de Entrega Anulada', description: 'Mercancía reincorporada al stock.' });
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
          title="Registro de Salidas"
          description="Control de notas de entrega y despacho de mercancía."
          actions={
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-none shadow-sm h-11" onClick={() => window.print()}>
                <FileDown className="mr-2 h-4 w-4" />
                <span className="sm:inline">Libro Control</span>
              </Button>
              <Button asChild className="flex-1 sm:flex-none font-black uppercase shadow-lg shadow-primary/20 h-11">
                <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="whitespace-nowrap">Nuevo Despacho</span>
                </Link>
              </Button>
            </div>
          }
        />

        {error && (
          <Alert variant="destructive" className="border-4 shadow-xl">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-black">Error de Conexión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 font-black text-[10px] uppercase">Cod. Despacho</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Receptor / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell font-black text-[10px] uppercase">Fecha</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Estado Despacho</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase">Monto Ref.</TableHead>
                    <TableHead className="w-[50px] pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                ) : sales.length > 0 ? (
                    sales.map((sale) => (
                    <TableRow key={sale._id} className="hover:bg-primary/[0.02] transition-colors group">
                        <TableCell className="font-mono text-[11px] font-bold pl-6 text-primary">NE-{String(sale.invoiceNumber).padStart(6, '0')}</TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] md:text-sm font-black uppercase truncate max-w-[120px] md:max-w-[250px]">
                              {sale.customerName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-medium">{formatDate(String(sale.createdAt))}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className="text-[8px] md:text-[9px] font-black uppercase bg-green-50 text-green-700 border-green-200"
                          >
                            <Truck className="h-3 w-3 mr-1"/> ENTREGADO
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black text-xs md:text-sm whitespace-nowrap">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 ml-auto rounded-full hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 border-2 shadow-2xl">
                              <DropdownMenuItem className="font-bold text-xs uppercase cursor-pointer p-3" onClick={() => router.push(`/sales/${sale._id}/invoice`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver Comprobante
                              </DropdownMenuItem>
                              <DropdownMenuItem className="font-bold text-xs uppercase cursor-pointer p-3" onClick={() => window.open(`/sales/${sale._id}/invoice`, '_blank')}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir NE
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 font-black text-xs uppercase cursor-pointer p-3" onSelect={() => setSaleToDelete(sale)}>
                                Anular Despacho
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic font-medium">
                        No hay registros de despacho.
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </div>
        
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
            <AlertDialogContent className="border-4 mx-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase italic">¿Anular despacho de mercancía?</AlertDialogTitle>
                <AlertDialogDescription className="font-bold">
                  La Nota de Entrega NE-{String(saleToDelete?.invoiceNumber).padStart(6, '0')} será eliminada y los productos reingresarán automáticamente al inventario.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="font-bold rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSale} className="bg-red-600 font-black uppercase shadow-lg h-11">
                  Confirmar Anulación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
