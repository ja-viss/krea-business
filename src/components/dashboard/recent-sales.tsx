
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
            {data.map((sale, index) => (
              <TableRow key={sale._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://picsum.photos/seed/avatar-${sale._id}/40/40`}
                        alt="Avatar"
                        data-ai-hint="person portrait"
                      />
                      <AvatarFallback>
                        {sale.customerName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {sale.customerName}
                      <div className="text-sm text-muted-foreground">
                        {sale.customerEmail}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('es-VE', {
                    style: 'currency',
                    currency: 'VES',
                  }).format(sale.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
             {data.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
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
