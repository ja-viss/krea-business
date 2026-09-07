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
        toast({ title: "Añadido a cola", description: `${product.name}` });
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
            {/* VISTA WEB INTERACTIVA */}
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full print:hidden">
                <PageHeader 
                    title="Etiquetas Profesionales" 
                    description="Genera identificadores de estantería con precios y códigos de barras."
                    actions={
                        <Button variant="outline" asChild className="font-bold border-2">
                            <Link href="/inventory"><ChevronLeft className="mr-2 h-4 w-4" /> Volver</Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="bg-muted/5 border-b py-3">
                                <CardTitle className="text-[11px] font-black uppercase flex items-center gap-2 text-slate-600">
                                    <Search className="h-4 w-4 text-primary" /> Selector de Productos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                
                                <div className="mt-6 rounded-xl border-2 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black text-[10px] uppercase pl-4">Descripción</TableHead>
                                                <TableHead className="text-center font-black text-[10px] uppercase">Cant.</TableHead>
                                                <TableHead className="w-[50px] pr-4"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {labelQueue.length > 0 ? labelQueue.map((item) => (
                                                <TableRow key={String(item._id)} className="hover:bg-primary/5">
                                                    <TableCell className="pl-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-black uppercase text-xs truncate max-w-[200px]">{item.name}</span>
                                                            <span className="text-[10px] font-black text-primary">Bs. {formatCurrency(item.price)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number" 
                                                            className="w-16 h-9 mx-auto text-center font-black border-2" 
                                                            value={item.quantityToPrint}
                                                            onChange={(e) => handleQtyChange(String(item._id), e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleRemove(String(item._id))}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-40 text-center text-muted-foreground italic">
                                                        <Tag className="h-10 w-10 mx-auto mb-2 opacity-10" />
                                                        <p className="text-xs font-bold uppercase opacity-40">Busca productos para empezar</p>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
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
                                        RECOMENDACIÓN: Para un acabado profesional, desactiva "Encabezados y pies de página" en las opciones de impresión del navegador.
                                    </p>
                                </div>
                                <Button 
                                    className="w-full h-16 text-lg font-black uppercase shadow-2xl" 
                                    disabled={labelQueue.length === 0 || isPrinting}
                                    onClick={handlePrint}
                                >
                                    {isPrinting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 h-6 w-6" />}
                                    Imprimir Lote
                                </Button>
                            </CardContent>
                        </Card>

                        {/* PREVIEW EN VIVO */}
                        <div className="p-4 border-2 border-dashed rounded-2xl bg-muted/20">
                             <p className="text-[9px] font-black uppercase text-center opacity-40 mb-4 tracking-widest italic">Previsualización Industrial</p>
                             <div className="bg-white border-[1px] border-black rounded-sm p-3 mx-auto w-[180px] h-[95px] shadow-2xl flex flex-col justify-between pointer-events-none text-left">
                                <p className="text-[10px] font-black uppercase leading-tight line-clamp-1 border-b pb-1">PRODUCTO DE MUESTRA</p>
                                <div className="flex items-center justify-between my-1">
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-[7px] font-bold">Bs.</span>
                                        <span className="text-xl font-black">1.450,00</span>
                                    </div>
                                    <div className="bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded">REF: $40.20</div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="h-4 w-full flex items-end gap-[1px]">
                                        {[1,2,1,3,1,2,1,1,2,3,1,2,1].map((w,i) => <div key={i} className="bg-black h-full" style={{width: `${w}px`}}></div>)}
                                    </div>
                                    <span className="text-[7px] font-mono font-bold mt-0.5">759123456789</span>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MOTOR DE IMPRESIÓN (SOLO VISIBLE EN PAPEL) */}
            <div className="hidden print:block bg-white">
                {labelQueue.flatMap((product) => 
                    Array.from({ length: product.quantityToPrint }).map((_, idx) => (
                        <div key={`${product._id}-${idx}`} className="p-print-label">
                            <div className="label-wrapper">
                                {/* Cabecera: Nombre */}
                                <div className="label-header">
                                    <h2 className="label-title">{product.name}</h2>
                                </div>
                                
                                {/* Cuerpo: Precios */}
                                <div className="label-body">
                                    <div className="label-price-main">
                                        <span className="label-symbol">Bs.</span>
                                        <span className="label-amount">{formatCurrency(product.price)}</span>
                                    </div>
                                    <div className="label-price-ref">
                                        REF: ${rates.usd?.usd ? (product.price / rates.usd.usd).toFixed(2) : '0.00'}
                                    </div>
                                </div>

                                {/* Pie: Código de Barras */}
                                <div className="label-footer">
                                    <div className="barcode-box">
                                        <div className="barcode-bars">
                                            {/* Patrón EAN-13 Simulado */}
                                            {[2,1,3,1,1,2,4,1,2,1,3,1,2,2,1,3,1,1,2,4,1].map((w, i) => (
                                                <div key={i} className="bar" style={{ flex: w, backgroundColor: 'black' }}></div>
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
                    html, body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 50mm;
                        height: 25mm;
                        overflow: hidden;
                    }
                    header, nav, aside, main, button, .print\\:hidden {
                        display: none !important;
                    }
                    .p-print-label {
                        width: 50mm;
                        height: 25mm;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        page-break-after: always;
                        background: white;
                        padding: 1.5mm;
                        box-sizing: border-box;
                    }
                    .label-wrapper {
                        width: 100%;
                        height: 100%;
                        border: 0.5pt solid black;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 1mm;
                        box-sizing: border-box;
                    }
                    .label-header {
                        border-bottom: 0.3pt solid black;
                        padding-bottom: 0.5mm;
                    }
                    .label-title {
                        font-family: 'Inter', sans-serif;
                        font-size: 8pt;
                        font-weight: 900;
                        text-transform: uppercase;
                        margin: 0;
                        line-height: 1;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .label-body {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin: 1mm 0;
                    }
                    .label-price-main {
                        display: flex;
                        align-items: baseline;
                        gap: 0.3mm;
                    }
                    .label-symbol {
                        font-size: 6pt;
                        font-weight: 700;
                    }
                    .label-amount {
                        font-size: 15pt;
                        font-weight: 900;
                        letter-spacing: -0.5pt;
                    }
                    .label-price-ref {
                        font-size: 7pt;
                        font-weight: 900;
                        background: black;
                        color: white;
                        padding: 0.4mm 1.5mm;
                        border-radius: 0.5mm;
                    }
                    .label-footer {
                        display: flex;
                        justify-content: center;
                        padding-top: 0.5mm;
                    }
                    .barcode-box {
                        width: 85%;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .barcode-bars {
                        height: 4.5mm;
                        width: 100%;
                        display: flex;
                        align-items: stretch;
                        gap: 0.4mm;
                    }
                    .bar {
                        height: 100%;
                    }
                    .barcode-text {
                        font-family: 'Courier New', monospace;
                        font-size: 6pt;
                        font-weight: bold;
                        margin-top: 0.5mm;
                        letter-spacing: 0.8pt;
                    }
                }
            `}</style>
        </div>
    );
}
