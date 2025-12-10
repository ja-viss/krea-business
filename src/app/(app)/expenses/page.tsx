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

const expensesData = [
  {
    id: 'EXP001',
    category: 'Alquiler',
    date: '2024-05-01',
    description: 'Renta de oficina',
    amount: '$1500.00',
  },
  {
    id: 'EXP002',
    category: 'Salarios',
    date: '2024-05-01',
    description: 'Nómina de empleados',
    amount: '$5000.00',
  },
  {
    id: 'EXP003',
    category: 'Marketing',
    date: '2024-05-05',
    description: 'Campaña en redes sociales',
    amount: '$350.00',
  },
  {
    id: 'EXP004',
    category: 'Servicios',
    date: '2024-05-10',
    description: 'Factura de electricidad',
    amount: '$120.50',
  },
  {
    id: 'EXP005',
    category: 'Otros',
    date: '2024-05-12',
    description: 'Material de oficina',
    amount: '$75.20',
  },
];

export default function ExpensesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Gastos"
          description="Registra y categoriza tus gastos."
          actions={
            <>
              <Button variant="outline">
                <FileDown />
                Exportar
              </Button>
              <Button>
                <PlusCircle />
                Añadir Gasto
              </Button>
            </>
          }
        />
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expensesData.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell className="text-right">{expense.amount}</TableCell>
                   <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
