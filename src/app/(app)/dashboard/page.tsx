
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/kpi-card';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DashboardData {
  totalSales: number;
  totalExpenses: number;
  customerCount: number;
  productCount: number;
  salesChange: number;
  recentSales: {
    _id: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
  }[];
  monthlyProfit: { month: string; profit: number }[];
  expenseDistribution: { name: string; value: number; fill: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
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

        const response = await fetch(`/api/dashboard?storeId=${storeId}`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar los datos del dashboard.');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(value);
  };
  
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}% desde el mes pasado`;
  };

  const kpiData = data ? [
    {
      title: 'Ventas Totales',
      value: formatCurrency(data.totalSales),
      change: formatPercentage(data.salesChange),
      icon: 'dollar-sign' as const,
    },
    {
      title: 'Gastos Totales',
      value: formatCurrency(data.totalExpenses),
      change: '+15.3% desde el mes pasado', // Placeholder
      icon: 'receipt' as const,
    },
    {
      title: 'Nº de Clientes',
      value: `+${data.customerCount}`,
      change: '+30.1% desde el mes pasado', // Placeholder
      icon: 'users' as const,
    },
    {
      title: 'Nº de Productos',
      value: `${data.productCount}`,
      change: '+2.5% desde el mes pasado', // Placeholder
      icon: 'boxes' as const,
    },
  ] : [];

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Dashboard"
          description="Bienvenido a tu centro de control de negocios."
          actions={
            <>
              <Button variant="outline">
                <FileDown />
                Exportar Resumen PDF
              </Button>
              <Button>
                <PlusCircle />
                Añadir Venta
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-[150px] mb-2" />
                        <Skeleton className="h-3 w-full" />
                    </CardContent>
                </Card>
             ))
          ) : (
            kpiData.map((kpi) => (
              <KpiCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                iconName={kpi.icon}
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4">
             {loading ? <Skeleton className="h-[350px] w-full" /> : <MonthlyProfitChart data={data?.monthlyProfit} />}
          </div>
          <div className="lg:col-span-3">
            {loading ? <Skeleton className="h-[350px] w-full" /> : <RecentSales data={data?.recentSales} />}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? <Skeleton className="h-[350px] w-full" /> : <ExpenseDistributionChart data={data?.expenseDistribution} />}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="font-semibold">Más Insights</h3>
            <p className="text-sm text-muted-foreground">
              Próximamente...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
