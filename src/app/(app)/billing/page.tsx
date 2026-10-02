
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, AlertTriangle, Truck } from 'lucide-react';
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
                    throw new Error('No se pudieron obtener las notas de entrega.');
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
          title="Historial de Despacho"
          description="Control administrativo de mercancía entregada y traslados internos."
          actions={
            <>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Libro
              </Button>
              <Button asChild>
                <Link href="/sales/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Despacho
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
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Cod. Control</TableHead>
                <TableHead>Receptor</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto Ref.</TableHead>
                <TableHead className="w-[50px] pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell className="pr-6"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-mono text-[11px] font-bold pl-6 text-primary">
                      NE-{String(invoice.invoiceNumber).padStart(6, '0')}
                    </TableCell>
                    <TableCell className="font-black uppercase text-xs">{invoice.customerName}</TableCell>
                    <TableCell className="text-xs font-medium">{formatDate(String(invoice.createdAt))}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black uppercase"
                      >
                        <Truck className="h-2.5 w-2.5 mr-1"/> ENTREGADO
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-xs">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleAction('view', invoice._id)}>Ver Comprobante</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleAction('pdf', invoice._id)}>Descargar Log</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic font-medium">
                    No se han registrado notas de entrega.
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
