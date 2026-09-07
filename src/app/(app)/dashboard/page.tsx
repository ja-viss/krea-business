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
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        const role = localStorage.getItem('userRole') || '';
        setUserRole(role);

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

  const isAdmin = userRole === 'Administrador Principal';
  const isAccountant = userRole === 'Contador';
  const isSeller = userRole === 'Vendedor';
  const canSeeMoney = isAdmin || isAccountant;

  if (error) return <div className="p-8"><Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title={data?.isSystemMaster ? "Panel Maestro" : "Resumen de Negocio"}
          description={`Bienvenido, perfil de ${userRole}.`}
          actions={
            isAdmin ? (
              <Button asChild className="font-black uppercase shadow-lg shadow-primary/20 h-11">
                <Link href="/sales/new"><PlusCircle className="mr-2 h-4 w-4" /> Nueva Venta</Link>
              </Button>
            ) : isSeller ? (
                <Button asChild className="font-black uppercase h-11 bg-green-600">
                    <Link href="/sales/new"><DollarSign className="mr-2 h-4 w-4" /> Abrir Caja</Link>
                </Button>
            ) : null
          }
        />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />) : (
                <>
                    <KpiCard
                        title={canSeeMoney ? "Facturación Total" : "Ventas del Turno"}
                        value={canSeeMoney ? formatCurrency(data?.totalSales || 0) : String(data?.recentSales.length || 0)}
                        change="Métricas acumuladas"
                        iconName="dollar-sign"
                        className="border-2"
                    />
                    <KpiCard
                        title="Insumos / Productos"
                        value={String(data?.productCount || 0)}
                        change="En catálogo"
                        iconName="boxes"
                        className="border-2"
                    />
                    <KpiCard
                        title="Cartera Clientes"
                        value={String(data?.customerCount || 0)}
                        change="Registros únicos"
                        iconName="users"
                        className="border-2"
                    />
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">Estado</CardTitle>
                            <Activity className="h-4 w-4 opacity-70" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl md:text-2xl font-black">OPERATIVO</div>
                            <p className="text-[9px] font-bold opacity-60 uppercase">Nodos Cloud activos</p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>

        {canSeeMoney && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                <div className="lg:col-span-4">
                    {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : <MonthlyProfitChart data={data?.monthlyProfit} />}
                </div>
                <div className="lg:col-span-3">
                    {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : <RecentSales data={data?.recentSales} />}
                </div>
            </div>
        )}

        {isSeller && (
            <Card className="border-4 border-dashed border-primary/20 bg-muted/10 h-60 flex items-center justify-center">
                <div className="text-center space-y-2">
                    <ShoppingCart className="h-10 w-10 mx-auto text-primary opacity-20" />
                    <p className="text-sm font-black uppercase opacity-60">Acceso Rápido POS Habilitado</p>
                    <Button asChild variant="outline" className="font-bold uppercase text-[10px]"><Link href="/sales/new">Ir a Facturación</Link></Button>
                </div>
            </Card>
        )}
      </main>
    </div>
  );
}
