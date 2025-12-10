'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { IProduct } from '@/models/Product';
import { useMemo } from 'react';

const chartConfig = {
  stock: {
    label: 'Stock',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

interface TopStockChartProps {
  data: IProduct[];
}

export function TopStockChart({ data = [] }: TopStockChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10) // Get top 10 products by stock
      .map(product => ({
        name: product.name.length > 15 ? `${product.name.slice(0,12)}...` : product.name,
        stock: product.stock
      }));
  }, [data]);

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Top 10 Productos por Stock</CardTitle>
        <CardDescription>Productos con mayor cantidad en inventario</CardDescription>
      </CardHeader>
      <CardContent>
         {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                />
                <XAxis dataKey="stock" type="number" hide />
                <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
                />
                <Bar
                dataKey="stock"
                fill="var(--color-stock)"
                radius={4}
                layout="vertical"
                />
            </BarChart>
            </ChartContainer>
         ) : (
            <div className="flex h-[280px] w-full items-center justify-center text-muted-foreground">
                No hay datos suficientes.
            </div>
         )}
      </CardContent>
    </Card>
  );
}

    