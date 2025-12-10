'use client';

import { PageHeader } from '@/components/page-header';
import { MobileHeader } from '../layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { MonthlyProfitChart } from '@/components/dashboard/monthly-profit-chart';
import { ExpenseDistributionChart } from '@/components/dashboard/expense-distribution-chart';

const reports = [
  {
    title: 'Reporte de Ventas Mensuales',
    description: 'Análisis detallado de las ventas del último mes.',
    component: <MonthlyProfitChart />,
  },
  {
    title: 'Distribución de Gastos',
    description: 'Desglose de los gastos por categoría.',
    component: <ExpenseDistributionChart />,
  },
  {
    title: 'Reporte de Inventario',
    description: 'Estado actual del stock y productos más vendidos.',
    component: (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Próximamente...
      </div>
    ),
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

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Reportes"
          description="Visualiza el rendimiento de tu negocio."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.title} className="flex flex-col">
              <CardHeader className='flex-row items-start justify-between'>
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                 <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
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
