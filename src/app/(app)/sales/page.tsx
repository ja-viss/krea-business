
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle } from 'lucide-react';
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
      if (!storeId) {
          throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
      }
      const response = await fetch(`/api/sales?storeId=${storeId}`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener las ventas.');
      }
      const data = await response.json();
      setSales(data);
    } catch (err: any) {
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
      const response = await fetch(`/api/sales/${saleToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar la venta.');
      }

      toast({
        title: 'Venta Eliminada',
        description: `La venta con factura Nº ${saleToDelete.invoiceNumber} ha sido eliminada y el stock ha sido restaurado.`,
      });
      
      fetchSales(); // Re-fetch sales to update the list

    } catch (err: any) {
       toast({
        variant: 'destructive',
        title: 'Error al Eliminar',
        description: err.message,
      });
    } finally {
        setSaleToDelete(null);
    }
  };

  const handleEdit = (saleId: string) => {
    // router.push(`/sales/${saleId}/edit`);
    toast({
      title: "Función no implementada",
      description: "La edición de ventas estará disponible próximamente."
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(value);
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Ventas"
          description="Registra y gestiona tus ventas."
          actions={
            <>
              <Button variant="outline">
                <FileDown />
                Exportar
              </Button>
              <Button asChild>
                <Link href="/sales/new">
                  <PlusCircle />
                  Nueva Venta
                </Link>
              </Button>
            </>
          }
        />

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell className="font-medium">Nº {String(sale.invoiceNumber).padStart(8, '0')}</TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{formatDate(String(sale.createdAt))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === 'Pagado'
                            ? 'secondary'
                            : sale.status === 'Pendiente'
                            ? 'outline'
                            : 'destructive'
                        }
                        className={sale.status === 'Pagado' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => router.push(`/sales/${sale._id}/invoice`)}>
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleEdit(sale._id)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onSelect={() => setSaleToDelete(sale)}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron ventas.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta venta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará la factura Nº {String(saleToDelete?.invoiceNumber).padStart(8, '0')} y el stock de los productos asociados será restaurado.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSale}>Eliminar Venta</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}
