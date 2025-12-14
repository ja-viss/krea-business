
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Printer, ArrowLeft } from 'lucide-react';
import { ISale } from '@/models/Sale';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';

export default function InvoicePage() {
    const params = useParams();
    const router = useRouter();
    const saleId = params.saleId as string;

    const [sale, setSale] = useState<ISale | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { rates } = useExchangeRates();

    useEffect(() => {
        if (saleId) {
            const fetchSale = async () => {
                try {
                    setLoading(true);
                    // Suponiendo que hay un endpoint para obtener una venta específica
                    const response = await fetch(`/api/sales/${saleId}`);
                    if (!response.ok) {
                        throw new Error('No se pudo encontrar la factura.');
                    }
                    const data: ISale = await response.json();
                    setSale(data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchSale();
        }
    }, [saleId]);

    const formatCurrency = (value: number, currency: 'VES' | 'USD' = 'VES') => {
        const options: Intl.NumberFormatOptions = { style: 'currency', currency, minimumFractionDigits: 2 };
        if (currency === 'VES') return new Intl.NumberFormat('es-VE', options).format(value);
        return new Intl.NumberFormat('en-US', options).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center p-4 md:p-8">
                <Skeleton className="w-full max-w-4xl h-[800px]" />
            </div>
        );
    }

    if (error) {
        return (
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button variant="outline" asChild>
                    <Link href="/sales">
                        <ArrowLeft />
                        Volver a Ventas
                    </Link>
                </Button>
            </main>
        );
    }
    
    if (!sale) return null;

    const totalInUSD = rates.usd?.usd ? sale.totalAmount / rates.usd.usd : 0;


    return (
        <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 flex justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-4xl space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <Button variant="outline" asChild>
                        <Link href="/sales">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Ventas
                        </Link>
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir
                    </Button>
                </div>
                <Card className="p-6 md:p-10 shadow-lg print:shadow-none print:border-none">
                    <CardHeader className="p-0">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">NOMBRE DE LA EMPRESA</h1>
                                <p className="text-muted-foreground">RIF: J-12345678-9</p>
                                <p className="text-muted-foreground text-sm">Dirección Fiscal de la Empresa, Ciudad, Estado.</p>
                                <p className="text-muted-foreground text-sm">Teléfono: (0212) 123-4567</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-3xl font-bold text-primary">FACTURA</h2>
                                <p className="font-semibold">Nº: <span className="font-normal">{`00-${String(sale._id).slice(-6)}`}</span></p>
                                <p className="font-semibold">Nº de Control: <span className="font-normal">{`00-${String(sale._id).slice(-8)}`}</span></p>
                                <p className="font-semibold">Fecha: <span className="font-normal">{formatDate(String(sale.createdAt))}</span></p>
                            </div>
                        </div>
                    </CardHeader>
                    <Separator className="my-6" />
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <h3 className="font-semibold">CLIENTE:</h3>
                            <p>{sale.customerName}</p>
                            <p>CI/RIF: {sale.customer || 'N/A'}</p>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">CÓDIGO</TableHead>
                                <TableHead>DESCRIPCIÓN</TableHead>
                                <TableHead className="text-center">CANT.</TableHead>
                                <TableHead className="text-right">P. UNIT (VES)</TableHead>
                                <TableHead className="text-right">TOTAL (VES)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item: any) => (
                                <TableRow key={item.product}>
                                    <TableCell>{String(item.product).slice(-6)}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    
                    <Separator className="my-4"/>

                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2">
                             <div className="flex justify-between">
                                <span className="font-semibold">SUBTOTAL:</span>
                                <span>{formatCurrency(sale.amount)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="font-semibold">IVA (16%):</span>
                                <span>{formatCurrency(sale.taxAmount)}</span>
                            </div>
                            <Separator />
                             <div className="flex justify-between text-lg font-bold">
                                <span>TOTAL A PAGAR (VES):</span>
                                <span>{formatCurrency(sale.totalAmount)}</span>
                            </div>
                             <div className="flex justify-between text-sm text-muted-foreground">
                                <span>TOTAL A PAGAR (USD):</span>
                                <span>{formatCurrency(totalInUSD, 'USD')}</span>
                            </div>
                        </div>
                    </div>

                     <Separator className="my-6" />

                     <footer className="text-center text-xs text-muted-foreground">
                        <p>Factura emitida por Krea Business Suite. Válida sin enmiendas ni tachaduras.</p>
                        <p>Gracias por su compra.</p>
                     </footer>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    body {
                        background-color: white !important;
                    }
                    main {
                         padding: 0 !important;
                    }
                    .print\:shadow-none {
                        box-shadow: none !important;
                    }
                     .print\:border-none {
                        border: none !important;
                    }
                    .print\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </main>
    );
}

    