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
import { recentSalesData } from '@/lib/placeholder-data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function RecentSales() {
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );

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
            {recentSalesData.map((sale, index) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={`https://picsum.photos/seed/avatar-${index}/40/40`}
                        alt="Avatar"
                        data-ai-hint="person portrait"
                      />
                      <AvatarFallback>
                        {sale.customer
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {sale.customer}
                      <div className="text-sm text-muted-foreground">
                        {sale.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">{sale.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
