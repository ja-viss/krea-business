import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { kpiData } from '@/lib/placeholder-data';
import { KpiCard } from '@/components/kpi-card';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';
import { MobileHeader } from '../layout';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
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
          {kpiData.map((kpi) => (
            <KpiCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              iconName={kpi.icon as any}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <MonthlyProfitChart />
          </div>
          <div className="lg:col-span-3">
            <RecentSales />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ExpenseDistributionChart />
          {/* Placeholder for another chart or component */}
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
