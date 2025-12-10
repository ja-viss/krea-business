import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Boxes,
  DollarSign,
  LucideIcon,
  Receipt,
  Users,
} from 'lucide-react';

type KpiCardProps = {
  title: string;
  value: string;
  change: string;
  iconName: 'dollar-sign' | 'receipt' | 'users' | 'boxes';
  className?: string;
};

const iconMap: Record<KpiCardProps['iconName'], LucideIcon> = {
  'dollar-sign': DollarSign,
  receipt: Receipt,
  users: Users,
  boxes: Boxes,
};

export function KpiCard({
  title,
  value,
  change,
  iconName,
  className,
}: KpiCardProps) {
  const Icon = iconMap[iconName];

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{change}</p>
      </CardContent>
    </Card>
  );
}
