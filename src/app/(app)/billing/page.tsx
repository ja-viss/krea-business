'use client';

import { PageHeader } from '@/components/page-header';
import { MobileHeader } from '../layout';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle } from 'lucide-react';
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
import { MoreHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// NOTE: This component still uses static data.
// It will be connected to the database in a future step.

const invoicesData = [
  {
    invoiceId: 'FAC-001',
    customer: 'Empresa ABC',
    issueDate: '2024-05-01',
    dueDate: '2024-05-31',
    amount: '$1,250.00',
    status: 'Pagada',
  },
  {
    invoiceId: 'FAC-002',
    customer: 'Negocios XYZ',
    issueDate: '2024-05-10',
    dueDate: '2024-06-10',
    amount: '$800.50',
    status: 'Pendiente',
  },
  {
    invoiceId: 'FAC-003',
    customer: 'Servicios Rápidos',
    issueDate: '2024-04-15',
    dueDate: '2024-05-15',
    amount: '$2,500.00',
    status: 'Atrasada',
  },
];

export default function BillingPage() {
    const loading = false; // Placeholder for future state
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
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
              <Button>
                <PlusCircle />
                Crear Factura
              </Button>
            </>
          }
        />
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Fecha Vencimiento</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                ))
              ) : invoicesData.length > 0 ? (
                invoicesData.map((invoice) => (
                  <TableRow key={invoice.invoiceId}>
                    <TableCell className="font-medium">
                      {invoice.invoiceId}
                    </TableCell>
                    <TableCell>{invoice.customer}</TableCell>
                    <TableCell>{invoice.issueDate}</TableCell>
                    <TableCell>{invoice.dueDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'Pagada'
                            ? 'secondary'
                            : invoice.status === 'Pendiente'
                            ? 'outline'
                            : 'destructive'
                        }
                        className={invoice.status === 'Pagada' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{invoice.amount}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver</DropdownMenuItem>
                          <DropdownMenuItem>Descargar PDF</DropdownMenuItem>
                          <DropdownMenuItem>Enviar por correo</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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
