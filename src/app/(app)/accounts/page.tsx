'use client';

import { PageHeader } from '@/components/page-header';
import { MobileHeader } from '../layout';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const accountsReceivableData = [
  {
    id: 'AR001',
    customer: 'Cliente A',
    dueDate: '2024-06-15',
    amount: '$1200.00',
    status: 'Pendiente',
  },
  {
    id: 'AR002',
    customer: 'Cliente B',
    dueDate: '2024-05-20',
    amount: '$800.00',
    status: 'Atrasado',
  },
];

const accountsPayableData = [
  {
    id: 'AP001',
    vendor: 'Proveedor X',
    dueDate: '2024-06-10',
    amount: '$500.00',
    status: 'Pendiente',
  },
  {
    id: 'AP002',
    vendor: 'Proveedor Y',
    dueDate: '2024-05-25',
    amount: '$300.00',
    status: 'Pagado',
  },
];

export default function AccountsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Cuentas"
          description="Gestiona tus cuentas por cobrar y pagar."
          actions={
            <Button>
              <PlusCircle />
              Nueva Transacción
            </Button>
          }
        />
        <Tabs defaultValue="receivable">
          <TabsList>
            <TabsTrigger value="receivable">Cuentas por Cobrar</TabsTrigger>
            <TabsTrigger value="payable">Cuentas por Pagar</TabsTrigger>
          </TabsList>
          <TabsContent value="receivable">
            <div className="mt-4 rounded-lg border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsReceivableData.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.id}</TableCell>
                      <TableCell>{account.customer}</TableCell>
                      <TableCell>{account.dueDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            account.status === 'Pendiente'
                              ? 'outline'
                              : 'destructive'
                          }
                        >
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {account.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="payable">
            <div className="mt-4 rounded-lg border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsPayableData.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{account.id}</TableCell>
                      <TableCell>{account.vendor}</TableCell>
                      <TableCell>{account.dueDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            account.status === 'Pagado'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={account.status === 'Pagado' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {account.amount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
