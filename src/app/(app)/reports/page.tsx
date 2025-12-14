'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, MoreVertical, AlertTriangle } from 'lucide-react';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { IProduct } from '@/models/Product';
import { TopStockChart } from '@/components/inventory/top-stock-chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportData {
  monthlyProfit: { month: string; profit: number }[];
  expenseDistribution: { name: string; value: number; fill: string }[];
  inventoryProducts: IProduct[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se ha iniciado sesión o no se encontró la tienda.');
        }
        
        const [dashboardRes, productsRes] = await Promise.all([
             fetch(`/api/dashboard?storeId=${storeId}`),
             fetch(`/api/products?storeId=${storeId}`)
        ]);

        if (!dashboardRes.ok || !productsRes.ok) {
          throw new Error('No se pudieron cargar los datos para los reportes.');
        }

        const dashboardData = await dashboardRes.json();
        const productsData = await productsRes.json();

        setData({
          monthlyProfit: dashboardData.monthlyProfit,
          expenseDistribution: dashboardData.expenseDistribution,
          inventoryProducts: productsData,
        });

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  const reports = [
    {
      title: 'Reporte de Ventas Mensuales',
      description: 'Análisis detallado de las ventas del último mes.',
      component: loading ? <Skeleton className="h-[250px] w-full" /> : <MonthlyProfitChart data={data?.monthlyProfit} />,
    },
    {
      title: 'Distribución de Gastos',
      description: 'Desglose de los gastos por categoría.',
      component: loading ? <Skeleton className="h-[250px] w-full" /> : <ExpenseDistributionChart data={data?.expenseDistribution} />,
    },
    {
      title: 'Reporte de Inventario',
      description: 'Estado actual del stock y productos más vendidos.',
      component: loading ? <Skeleton className="h-[300px] w-full" /> : <TopStockChart data={data?.inventoryProducts || []} />,
    },
    {
      title: 'Análisis de Clientes',
      description: 'Información sobre la demografía y comportamiento de compra.',
       component: (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Próximamente...
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Reportes"
          description="Visualiza el rendimiento de tu negocio."
        />
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.title} className="flex flex-col">
              <CardHeader className='flex-row items-start justify-between'>
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar a PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                         <Download className="mr-2 h-4 w-4" />
                        Exportar a Excel (XLS)
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                         <Download className="mr-2 h-4 w-4" />
                        Exportar a CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1">
                {report.component}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
