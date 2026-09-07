'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Tag, 
    Printer, 
    Search, 
    Trash2, 
    ChevronLeft, 
    Loader2, 
    LayoutGrid,
    AlertCircle,
    Barcode
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
        // Pequeño delay para asegurar que el DOM de impresión esté listo
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 800);
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    const totalLabels = labelQueue.reduce((acc, curr) => acc + curr.quantityToPrint, 0);

    return (
        <div className="flex flex-1 flex-col bg-background">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full print:hidden">
                <PageHeader 
                    title="Etiquetado de Productos" 
                    description="Imprime etiquetas con precios y códigos de barras para estantería."
                    actions={
                        <Button variant="outline" asChild className="font-bold border-2">
                            <Link href="/inventory"><ChevronLeft className="mr-2 h-4 w-4" /> Volver</Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* BUSCADOR Y COLA */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="bg-muted/5 border-b py-3">
                                <CardTitle className="text-[11px] font-black uppercase flex items-center gap-2 text-slate-600">
                                    <Search className="h-4 w-4 text-primary" /> Selector de Mercancía
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                
                                <div className="mt-6 rounded-xl border-2 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black text-[10px] uppercase pl-4">Producto / Identificador</TableHead>
                                                <TableHead className="text-right font-black text-[10px] uppercase">Precio (Bs)</TableHead>
                                                <TableHead className="text-center font-black text-[10px] uppercase">Cantidad</TableHead>
                                                <TableHead className="w-[50px] pr-4"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {labelQueue.length > 0 ? labelQueue.map((item) => (
                                                <TableRow key={String(item._id)} className="hover:bg-primary/5">
                                                    <TableCell className="pl-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-black uppercase text-xs truncate max-w-[220px]">{item.name}</span>
                                                            <span className="text-[9px] font-mono font-bold text-primary flex items-center gap-1">
                                                                <Barcode className="h-3 w-3" /> {item.barcode || item.sku || String(item._id).slice(-8).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-sm text-slate-700">
                                                        {formatCurrency(item.price)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number" 
                                                            className="w-16 h-8 mx-auto text-center font-black border-2" 
                                                            value={item.quantityToPrint}
                                                            onChange={(e) => handleQtyChange(String(item._id), e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleRemove(String(item._id))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                                                        <Tag className="h-10 w-10 mx-auto mb-2 opacity-10" />
                                                        <p className="text-xs font-bold uppercase opacity-40">La cola de impresión está vacía</p>
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
                        <Card className="border-2 border-primary/20 bg-primary/[0.02] shadow-xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b py-3">
                                <CardTitle className="text-[11px] font-black uppercase text-primary flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" /> Resumen de Lote
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex justify-between items-center bg-white p-4 rounded-xl border-2 border-dashed">
                                    <span className="opacity-60 uppercase text-[10px] font-black">Total Etiquetas:</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">{totalLabels}</span>
                                </div>
                                <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold text-amber-800 leading-tight">
                                        RECOMENDACIÓN: Use rollos de etiquetas térmicas 50x25mm. Ajuste la escala de impresión al 100% en el diálogo del navegador.
                                    </p>
                                </div>
                                <Button 
                                    className="w-full h-16 text-lg font-black uppercase shadow-2xl shadow-primary/20 transition-transform active:scale-95" 
                                    disabled={labelQueue.length === 0 || isPrinting}
                                    onClick={handlePrint}
                                >
                                    {isPrinting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-6 w-6" />}
                                    Imprimir Ahora
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="rounded-xl border-2 border-dashed p-6 bg-muted/20 text-center">
                            <p className="text-[9px] font-black uppercase opacity-40 mb-4 tracking-widest italic">Previsualización Real</p>
                            <div className="bg-white border-2 border-black rounded-sm p-2 mx-auto w-[180px] h-[90px] shadow-lg flex flex-col justify-between pointer-events-none text-left">
                                <p className="text-[10px] font-black uppercase leading-tight line-clamp-2">Arroz Primor Tradicional 1Kg</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[8px] font-bold">Bs.</span>
                                    <span className="text-xl font-black">450.00</span>
                                </div>
                                <div className="border-t border-black pt-1 flex justify-between items-end">
                                    <div className="font-mono text-[8px] font-bold tracking-tighter">759123456789</div>
                                    <div className="bg-black text-white text-[7px] font-black px-1">REF: $10.50</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* VISTA DE IMPRESIÓN (OCULTA EN WEB, VISIBLE AL IMPRIMIR) */}
            <div className="hidden print:block print:bg-white print:p-0">
                {labelQueue.flatMap((product) => 
                    Array.from({ length: product.quantityToPrint }).map((_, idx) => (
                        <div key={`${product._id}-${idx}`} className="label-container">
                            <div className="label-wrapper">
                                <div className="label-header">
                                    <h2 className="label-title">{product.name}</h2>
                                </div>
                                
                                <div className="label-body">
                                    <div className="label-price">
                                        <span className="label-currency">Bs.</span>
                                        <span className="label-amount">{formatCurrency(product.price)}</span>
                                    </div>
                                    <div className="label-usd">
                                        REF: ${rates.usd?.usd ? (product.price / rates.usd.usd).toFixed(2) : '0.00'}
                                    </div>
                                </div>

                                <div className="label-footer">
                                    <div className="barcode-placeholder">
                                        {/* Representación visual de código de barras */}
                                        <div className="barcode-bars">
                                            {Array.from({ length: 25 }).map((_, b) => (
                                                <div key={b} className={`bar ${Math.random() > 0.5 ? 'w-0.5' : 'w-[1px]'} ${Math.random() > 0.3 ? 'bg-black' : 'bg-transparent'}`} />
                                            ))}
                                        </div>
                                        <div className="barcode-text">
                                            {product.barcode || product.sku || String(product._id).slice(-10).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
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
                        -webkit-print-color-adjust: exact;
                    }
                    header, nav, aside, main, .print\\:hidden {
                        display: none !important;
                    }
                    .label-container {
                        width: 50mm;
                        height: 25mm;
                        padding: 1.5mm;
                        page-break-after: always;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: white;
                        font-family: 'Inter', sans-serif;
                    }
                    .label-wrapper {
                        border: 0.5pt solid black;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 1mm;
                        box-sizing: border-box;
                    }
                    .label-title {
                        font-size: 8pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        margin: 0;
                        line-height: 1.1;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .label-body {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                        margin: 1mm 0;
                    }
                    .label-price {
                        display: flex;
                        align-items: baseline;
                        gap: 0.5mm;
                    }
                    .label-currency {
                        font-size: 6pt;
                        font-weight: 700;
                    }
                    .label-amount {
                        font-size: 16pt;
                        font-weight: 900;
                        letter-spacing: -0.5pt;
                    }
                    .label-usd {
                        font-size: 7pt;
                        font-weight: 900;
                        background: black;
                        color: white;
                        padding: 0.2mm 1mm;
                        border-radius: 0.5mm;
                    }
                    .label-footer {
                        border-top: 0.5pt solid black;
                        padding-top: 0.5mm;
                        display: flex;
                        justify-content: center;
                    }
                    .barcode-placeholder {
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .barcode-bars {
                        height: 4mm;
                        width: 90%;
                        display: flex;
                        align-items: stretch;
                        justify-content: center;
                        overflow: hidden;
                    }
                    .bar {
                        height: 100%;
                    }
                    .barcode-text {
                        font-family: 'Courier New', monospace;
                        font-size: 6pt;
                        font-weight: bold;
                        margin-top: 0.2mm;
                        letter-spacing: 0.5pt;
                    }
                }
            `}</style>
        </div>
    );
}
