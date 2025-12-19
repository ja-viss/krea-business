
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
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ISale } from '@/models/Sale';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


export default function BillingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<ISale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const storeId = localStorage.getItem('storeId');
                if (!storeId) {
                    throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
                }
                const response = await fetch(`/api/sales?storeId=${storeId}`);
                if (!response.ok) {
                    throw new Error('No se pudieron obtener las facturas.');
                }
                const data = await response.json();
                setInvoices(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const handleAction = (action: 'view' | 'pdf' | 'email', invoiceId: string) => {
        switch (action) {
            case 'view':
                router.push(`/sales/${invoiceId}/invoice`);
                break;
            case 'pdf':
                toast({ title: "Próximamente", description: "La descarga de PDF estará disponible pronto." });
                break;
            case 'email':
                toast({ title: "Próximamente", description: "El envío por correo estará disponible pronto." });
                break;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
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
          title="Facturación"
          description="Consulta y exporta tus facturas."
          actions={
            <>
              <Button variant="outline">
                <FileDown />
                Exportar Todo
              </Button>
              <Button asChild>
                <Link href="/sales/new">
                    <PlusCircle />
                    Crear Factura
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
                <TableHead>Nº Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">
                      INV{String(invoice.invoiceNumber).padStart(6, '0')}
                    </TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{formatDate(String(invoice.createdAt))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'Pagado'
                            ? 'secondary'
                            : invoice.status === 'Pendiente'
                            ? 'outline'
                            : 'destructive'
                        }
                        className={invoice.status === 'Pagado' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleAction('view', invoice._id)}>Ver</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleAction('pdf', invoice._id)}>Descargar PDF</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleAction('email', invoice._id)}>Enviar por correo</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron facturas.
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
