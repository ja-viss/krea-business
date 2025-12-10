'use client';

import { Pie, PieChart, Cell, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ExpenseDistributionChartProps {
    data?: { name: string; value: number; fill: string }[];
}

export function ExpenseDistributionChart({ data = [] }: ExpenseDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Gastos</CardTitle>
        <CardDescription>Categorías principales de gastos</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        {data.length > 0 ? (
          <ChartContainer
            config={{}}
            className="mx-auto aspect-square min-h-[250px] w-full max-w-[250px]"
          >
            <PieChart>
              <Tooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
            <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
                No hay datos de gastos.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
