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

const salesData = [
  {
    id: 'INV001',
    customer: 'Juan Pérez',
    date: '2024-05-01',
    status: 'Pagado',
    total: '$250.00',
  },
  {
    id: 'INV002',
    customer: 'Maria Rodriguez',
    date: '2024-05-02',
    status: 'Pendiente',
    total: '$150.75',
  },
  {
    id: 'INV003',
    customer: 'Carlos Gomez',
    date: '2024-05-03',
    status: 'Pagado',
    total: '$350.00',
  },
  {
    id: 'INV004',
    customer: 'Ana Martinez',
    date: '2024-05-04',
    status: 'Atrasado',
    total: '$450.50',
  },
  {
    id: 'INV005',
    customer: 'Luis Hernandez',
    date: '2024-05-05',
    status: 'Pagado',
    total: '$55.00',
  },
];

export default function SalesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
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
              <Button>
                <PlusCircle />
                Nueva Venta
              </Button>
            </>
          }
        />
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
              {salesData.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{sale.customer}</TableCell>
                  <TableCell>{sale.date}</TableCell>
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
                  <TableCell className="text-right">{sale.total}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
