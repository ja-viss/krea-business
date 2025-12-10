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
import { expenseDistributionData } from '@/lib/placeholder-data';

export function ExpenseDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Gastos</CardTitle>
        <CardDescription>Categorías principales de gastos</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ChartContainer
          config={{}}
          className="mx-auto aspect-square min-h-[250px] w-full max-w-[250px]"
        >
          <PieChart>
            <Tooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={expenseDistributionData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {expenseDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
