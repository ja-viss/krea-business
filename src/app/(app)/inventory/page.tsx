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

const inventoryData = [
  {
    id: 'PROD001',
    name: 'Laptop Pro',
    stock: 25,
    status: 'En Stock',
    price: '$1200.00',
  },
  {
    id: 'PROD002',
    name: 'Mouse Inalámbrico',
    stock: 150,
    status: 'En Stock',
    price: '$25.00',
  },
  {
    id: 'PROD003',
    name: 'Teclado Mecánico',
    stock: 5,
    status: 'Stock Bajo',
    price: '$80.00',
  },
  {
    id: 'PROD004',
    name: 'Monitor 4K',
    stock: 0,
    status: 'Sin Stock',
    price: '$450.00',
  },
  {
    id: 'PROD005',
    name: 'Webcam HD',
    stock: 45,
    status: 'En Stock',
    price: '$55.00',
  },
];

export default function InventoryPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Inventario"
          description="Gestiona tus productos y stock."
          actions={
            <>
              <Button variant="outline">
                <FileDown />
                Exportar
              </Button>
              <Button>
                <PlusCircle />
                Añadir Producto
              </Button>
            </>
          }
        />
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Producto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryData.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === 'En Stock'
                          ? 'secondary'
                          : product.status === 'Stock Bajo'
                          ? 'outline'
                          : 'destructive'
                      }
                      className={
                        product.status === 'En Stock' ? 'bg-green-100 text-green-800'
                        : product.status === 'Stock Bajo' ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{product.price}</TableCell>
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
