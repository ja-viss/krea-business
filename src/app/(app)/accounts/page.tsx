
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IAccountPayable } from '@/models/AccountPayable';
import { IAccountReceivable } from '@/models/AccountReceivable';
import { NewTransactionDialog } from '@/components/accounts/new-transaction-dialog';

export default function AccountsPage() {
  const [receivable, setReceivable] = useState<IAccountReceivable[]>([]);
  const [payable, setPayable] = useState<IAccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
        }

        const [receivableRes, payableRes] = await Promise.all([
          fetch(`/api/accounts/receivable?storeId=${storeId}`),
          fetch(`/api/accounts/payable?storeId=${storeId}`),
        ]);

        if (!receivableRes.ok || !payableRes.ok) {
          throw new Error('No se pudieron obtener los datos de las cuentas.');
        }

        const receivableData = await receivableRes.json();
        const payableData = await payableRes.json();

        setReceivable(receivableData);
        setPayable(payableData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionAdded = () => {
    fetchData(); // Re-fetch data after a new transaction is added
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
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
  };

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Cuentas"
          description="Gestiona tus cuentas por cobrar y pagar."
          actions={
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle />
              Nueva Transacción
            </Button>
          }
        />
        
        <NewTransactionDialog 
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            onTransactionAdded={handleTransactionAdded}
        />

        {error && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
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
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : receivable.length > 0 ? (
                    receivable.map((account) => (
                      <TableRow key={account._id}>
                        <TableCell>AR{String(account._id).slice(-5)}</TableCell>
                        <TableCell>{account.customer}</TableCell>
                        <TableCell>{formatDate(String(account.dueDate))}</TableCell>
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
                          {formatCurrency(account.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          No se encontraron cuentas por cobrar.
                      </TableCell>
                    </TableRow>
                  )}
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
                  {loading ? (
                     Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : payable.length > 0 ? (
                    payable.map((account) => (
                      <TableRow key={account._id}>
                        <TableCell>AP{String(account._id).slice(-5)}</TableCell>
                        <TableCell>{account.vendor}</TableCell>
                        <TableCell>{formatDate(String(account.dueDate))}</TableCell>
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
                          {formatCurrency(account.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                   ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                          No se encontraron cuentas por pagar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
