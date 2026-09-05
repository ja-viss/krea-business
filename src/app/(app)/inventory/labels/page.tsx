
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Tag, 
    Printer, 
    Search, 
    Plus, 
    Trash2, 
    ChevronLeft, 
    Loader2, 
    LayoutGrid,
    AlertCircle
} from 'lucide-react';
import { ProductSearch } from '@/components/sales/product-search';
import { IProduct } from '@/models/Product';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';

interface LabelItem extends IProduct {
    quantityToPrint: number;
}

export default function LabelsPage() {
    const { toast } = useToast();
    const { rates } = useExchangeRates();
    const [labelQueue, setLabelQueue] = useState<LabelItem[]>([]);
    const [isPrinting, setIsPrinting] = useState(false);

    const handleAddProduct = (product: IProduct) => {
        const existing = labelQueue.find(item => String(item._id) === String(product._id));
        if (existing) {
            setLabelQueue(labelQueue.map(item => 
                String(item._id) === String(product._id) 
                ? { ...item, quantityToPrint: item.quantityToPrint + 1 } 
                : item
            ));
        } else {
            setLabelQueue([...labelQueue, { ...product, quantityToPrint: 1 }]);
        }
        toast({ title: "Producto Añadido", description: `Se añadió ${product.name} a la cola.` });
    };

    const handleRemove = (id: string) => {
        setLabelQueue(labelQueue.filter(item => String(item._id) !== id));
    };

    const handleQtyChange = (id: string, qty: string) => {
        const val = parseInt(qty) || 0;
        setLabelQueue(labelQueue.map(item => 
            String(item._id) === id ? { ...item, quantityToPrint: val } : item
        ));
    };

    const handlePrint = () => {
        if (labelQueue.length === 0) return;
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    const totalLabels = labelQueue.reduce((acc, curr) => acc + curr.quantityToPrint, 0);

    return (
        <div className="flex flex-1 flex-col bg-background">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full print:hidden">
                <PageHeader 
                    title="Generador de Etiquetas" 
                    description="Diseña e imprime etiquetas de estantería con precios multimoneda."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href="/inventory"><ChevronLeft className="mr-2 h-4 w-4" /> Volver</Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* BUSCADOR Y COLA */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="bg-muted/5 border-b">
                                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                    <Search className="h-4 w-4 text-primary" /> Selector de Mercancía
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                
                                <div className="mt-6 rounded-xl border-2 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black text-[10px] uppercase pl-4">Producto</TableHead>
                                                <TableHead className="text-right font-black text-[10px] uppercase">Precio (Bs)</TableHead>
                                                <TableHead className="text-center font-black text-[10px] uppercase">Etiquetas</TableHead>
                                                <TableHead className="w-[50px] pr-4"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {labelQueue.length > 0 ? labelQueue.map((item) => (
                                                <TableRow key={String(item._id)} className="hover:bg-primary/5">
                                                    <TableCell className="pl-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-black uppercase text-xs truncate max-w-[200px]">{item.name}</span>
                                                            <span className="text-[9px] font-mono opacity-60">SKU: {item.sku || 'N/A'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-sm text-primary">
                                                        {formatCurrency(item.price)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number" 
                                                            className="w-16 h-8 mx-auto text-center font-bold" 
                                                            value={item.quantityToPrint}
                                                            onChange={(e) => handleQtyChange(String(item._id), e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemove(String(item._id))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                                                        Cola de etiquetas vacía. Escanea o busca productos.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* PANEL DE IMPRESIÓN */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-2 border-primary/20 bg-primary/[0.02] shadow-xl">
                            <CardHeader className="bg-primary/5 border-b">
                                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" /> Resumen de Lote
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="opacity-60 uppercase text-[10px]">Total Etiquetas:</span>
                                    <span className="text-xl font-black text-primary">{totalLabels}</span>
                                </div>
                                <div className="p-3 bg-blue-50 border-2 border-blue-100 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[9px] font-bold text-blue-800 leading-tight">
                                        Formato optimizado para etiquetas térmicas de 50x25mm. Asegúrate de configurar tu impresora en "Sin bordes".
                                    </p>
                                </div>
                                <Button 
                                    className="w-full h-14 text-lg font-black uppercase shadow-2xl" 
                                    disabled={labelQueue.length === 0 || isPrinting}
                                    onClick={handlePrint}
                                >
                                    {isPrinting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-5 w-5" />}
                                    Imprimir Lote
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="rounded-xl border-2 border-dashed p-4 bg-muted/20 text-center">
                            <p className="text-[10px] font-black uppercase opacity-40 mb-2">Previsualización de Estilo</p>
                            <div className="bg-white border-2 rounded-lg p-3 mx-auto w-full max-w-[200px] shadow-sm pointer-events-none">
                                <p className="text-[8px] font-black uppercase text-left truncate">Producto de Ejemplo</p>
                                <p className="text-lg font-black text-primary text-left">Bs. 450.00</p>
                                <div className="flex justify-between items-end border-t border-dotted mt-1 pt-1">
                                    <span className="text-[7px] font-mono">SKU-EXAMPLE</span>
                                    <span className="text-[7px] font-black">REF: $10.50</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* VISTA DE IMPRESIÓN (SOLO VISIBLE AL IMPRIMIR) */}
            <div className="hidden print:block print:bg-white print:p-0">
                {labelQueue.flatMap((product) => 
                    Array.from({ length: product.quantityToPrint }).map((_, idx) => (
                        <div key={`${product._id}-${idx}`} className="label-container">
                            <div className="label-content">
                                <h2 className="label-title">{product.name}</h2>
                                <div className="label-price-container">
                                    <span className="label-currency">Bs.</span>
                                    <span className="label-price-main">{formatCurrency(product.price)}</span>
                                </div>
                                <div className="label-footer">
                                    <div className="label-barcode-text">
                                        {product.barcode || product.sku || 'SIN-CODE'}
                                    </div>
                                    <div className="label-usd-ref">
                                        REF: ${rates.usd?.usd ? (product.price / rates.usd.usd).toFixed(2) : '0.00'}
                                    </div>
                                </div>
                                <div className="label-store-tag">KREA BUSINESS</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 50mm 25mm;
                    }
                    body {
                        background: white !important;
                        margin: 0;
                        padding: 0;
                    }
                    header, nav, aside, main, .print\\:hidden {
                        display: none !important;
                    }
                    .label-container {
                        width: 50mm;
                        height: 25mm;
                        padding: 1mm 2mm;
                        page-break-after: always;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        background: white;
                        font-family: sans-serif;
                        box-sizing: border-box;
                    }
                    .label-content {
                        border: 0.5pt solid #000;
                        height: 100%;
                        padding: 1mm;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        overflow: hidden;
                    }
                    .label-title {
                        font-size: 8pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        margin: 0;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        border-bottom: 0.2pt solid #000;
                        padding-bottom: 0.5mm;
                    }
                    .label-price-container {
                        display: flex;
                        align-items: baseline;
                        gap: 1mm;
                        margin: 0.5mm 0;
                    }
                    .label-currency {
                        font-size: 6pt;
                        font-weight: 700;
                    }
                    .label-price-main {
                        font-size: 14pt;
                        font-weight: 900;
                        letter-spacing: -0.5pt;
                    }
                    .label-footer {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        border-top: 0.2pt dashed #000;
                        padding-top: 0.5mm;
                    }
                    .label-barcode-text {
                        font-family: monospace;
                        font-size: 5pt;
                        font-weight: bold;
                    }
                    .label-usd-ref {
                        font-size: 6pt;
                        font-weight: 800;
                        background: #eee;
                        padding: 0 1mm;
                    }
                    .label-store-tag {
                        position: absolute;
                        top: 50%;
                        right: -10mm;
                        transform: rotate(-90deg) translateY(-50%);
                        font-size: 4pt;
                        font-weight: 900;
                        opacity: 0.3;
                    }
                }
            `}</style>
        </div>
    );
}
