
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Store, Users, DollarSign, Globe, PlusCircle, ShieldAlert, Activity, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { KpiCard } from '@/components/kpi-card';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

interface DashboardData {
  totalSales: number;
  totalExpenses: number;
  customerCount: number;
  productCount: number;
  salesChange: number;
  recentSales: any[];
  monthlyProfit: { month: string; profit: number }[];
  isSystemMaster: boolean;
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
        const response = await fetch(`/api/dashboard?storeId=${storeId}`);
        if (!response.ok) throw new Error('Error al cargar datos del dashboard.');
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
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(value);
  };

  if (error) return (
    <div className="p-8">
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title={data?.isSystemMaster ? "Panel Maestro" : "Resumen de Negocio"}
          description={data?.isSystemMaster ? "Supervisión global de infraestructura." : "Bienvenido a tu centro de control."}
          actions={
            data?.isSystemMaster ? (
              <Button asChild className="w-full sm:w-auto font-black uppercase tracking-tight shadow-lg shadow-primary/20">
                  <Link href="/admin/stores">
                    <PlusCircle className="mr-2 h-4 w-4" /> Alta de Cliente
                  </Link>
              </Button>
            ) : (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/sales/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nueva Venta
                </Link>
              </Button>
            )
          }
        />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)
          ) : (
            <>
                <KpiCard
                    title={data?.isSystemMaster ? "Facturación Global" : "Ventas Totales"}
                    value={formatCurrency(data?.totalSales || 0)}
                    change={data?.isSystemMaster ? "Bruto plataforma" : "Métricas actuales"}
                    iconName="dollar-sign"
                    className={data?.isSystemMaster ? "border-primary/20 bg-primary/5" : ""}
                />
                <KpiCard
                    title={data?.isSystemMaster ? "Empresas Activas" : "Gastos Totales"}
                    value={data?.isSystemMaster ? String(data.totalExpenses) : formatCurrency(data?.totalExpenses || 0)}
                    change="Estado actual"
                    iconName={data?.isSystemMaster ? "boxes" : "receipt"}
                />
                <KpiCard
                    title={data?.isSystemMaster ? "Usuarios Totales" : "Clientes"}
                    value={String(data?.customerCount || 0)}
                    change="Base de datos"
                    iconName="users"
                />
                <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider">Estado Sistema</CardTitle>
                        <Globe className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-black">ONLINE</div>
                        <p className="text-[10px] opacity-80">Nodos Cloud operativos</p>
                    </CardContent>
                </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
            <div className="lg:col-span-4">
                {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : <MonthlyProfitChart data={data?.monthlyProfit} />}
            </div>
            <div className="lg:col-span-3">
                {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : <RecentSales data={data?.recentSales} />}
            </div>
        </div>
      </main>
    </div>
  );
}
