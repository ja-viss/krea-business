import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface RecentSalesProps {
  data?: {
    _id: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
  }[];
}

export function RecentSales({ data = [] }: RecentSalesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas Recientes</CardTitle>
        <CardDescription>Las últimas 5 ventas realizadas.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((sale) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                        {sale.customerName
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {sale.customerName}
                      <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {sale.customerEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat('es-VE', {
                    style: 'currency',
                    currency: 'VES',
                  }).format(sale.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
             {data.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground italic">
                        No hay ventas recientes.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
