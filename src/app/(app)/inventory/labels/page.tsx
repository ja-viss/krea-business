'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    Barcode,
    ShoppingBag
} from 'lucide-react';
import { ProductSearch } from '@/components/sales/product-search';
import type { IProduct } from '@/models/Product';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
            setLabelQueue([...labelQueue, { ...product, quantityToPrint: 1 } as LabelItem]);
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
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full print:hidden">
                <PageHeader 
                    title="Etiquetas de Estantería" 
                    description="Optimizado para impresión térmica 58mm (Basic 230)."
                    actions={
                        <Button variant="outline" asChild className="font-bold border-2">
                            <Link href="/inventory"><ChevronLeft className="mr-2 h-4 w-4" /> Volver</Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-12 items-start">
                    <div className="lg:col-span-7 space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="bg-muted/5 border-b py-3">
                                <CardTitle className="text-[11px] font-black uppercase flex items-center gap-2 text-slate-600">
                                    <Search className="h-4 w-4 text-primary" /> Selección de Artículos
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
                                                        <Input type="number" className="w-16 h-9 mx-auto text-center font-black border-2" value={item.quantityToPrint} onChange={(e) => handleQtyChange(String(item._id), e.target.value)} />
                                                    </TableCell>
                                                    <TableCell className="pr-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleRemove(String(item._id))}><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow><TableCell colSpan={3} className="h-40 text-center text-muted-foreground italic"><Tag className="h-10 w-10 mx-auto mb-2 opacity-10" /><p className="text-xs font-bold uppercase opacity-40">Busca productos para el lote</p></TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="p-6 border-4 border-dashed rounded-[2.5rem] bg-slate-50 flex flex-col items-center">
                             <div className="bg-white border-2 border-black rounded-sm p-4 w-[210px] h-[115px] shadow-2xl flex flex-col justify-between pointer-events-none text-left relative overflow-hidden">
                                <p className="text-[12px] font-black uppercase leading-tight line-clamp-1 border-b-2 border-black pb-1">MUESTRA DE PRODUCTO</p>
                                <div className="flex items-center justify-between my-2">
                                    <div className="flex items-baseline gap-1"><span className="text-[9px] font-black">Bs.</span><span className="text-2xl font-black tracking-tighter">1.450,00</span></div>
                                    <div className="bg-black text-white text-[10px] font-black px-2 py-1.5 rounded">REF: $27.60</div>
                                </div>
                                <div className="h-6 w-full flex items-end gap-[1px]">{[2,1,4,1,1,3,1,2].map((w,i) => <div key={i} className="bg-black h-full" style={{width: `${w}px`}}></div>)}</div>
                             </div>
                        </div>

                        <Card className="border-2 border-primary shadow-xl overflow-hidden rounded-3xl">
                            <CardHeader className="bg-primary p-4 text-white"><CardTitle className="text-[10px] font-black uppercase flex items-center gap-2">Parámetros</CardTitle></CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-2xl border-2 border-dashed">
                                    <span className="opacity-60 uppercase text-[10px] font-black">Total Etiquetas:</span>
                                    <span className="text-3xl font-black text-primary">{totalLabels}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="p-6 pt-0">
                                <Button className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl" disabled={labelQueue.length === 0 || isPrinting} onClick={handlePrint}>
                                    {isPrinting ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Printer className="mr-3 h-8 w-8" />} Imprimir Lote
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>

            <div className="hidden print:block bg-white w-[58mm]">
                {labelQueue.flatMap((product) => 
                    Array.from({ length: product.quantityToPrint }).map((_, idx) => (
                        <div key={`${product._id}-${idx}`} className="p-print-label">
                            <div className="label-wrapper">
                                <div className="label-header"><h2 className="label-title">{product.name}</h2></div>
                                <div className="label-body">
                                    <div className="label-price-main"><span className="label-symbol">Bs.</span><span className="label-amount">{formatCurrency(product.price)}</span></div>
                                    <div className="label-price-ref">REF: ${rates.usd?.usd ? (product.price / rates.usd.usd).toFixed(2) : '0.00'}</div>
                                </div>
                                <div className="label-footer"><div className="barcode-box"><div className="barcode-bars">{[4,1,2,4,1,2,3,2,1,4].map((w, i) => (<div key={i} className="bar" style={{ flex: w, backgroundColor: 'black' }}></div>))}</div><div className="barcode-text">{product.barcode || product.sku}</div></div></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 58mm auto; }
                    html, body { background: white !important; margin: 0; width: 58mm; overflow: visible; color: black !important; }
                    .p-print-label { width: 58mm; display: flex; align-items: center; justify-content: center; page-break-after: always; padding: 2.5mm; box-sizing: border-box; }
                    .label-wrapper { width: 100%; border: 1.5pt solid black; display: flex; flex-direction: column; padding: 2mm; box-sizing: border-box; background: white; }
                    .label-title { font-size: 9.5pt; font-weight: 950; text-transform: uppercase; text-align: center; text-shadow: 0.2pt 0.2pt 0 black; margin: 0; }
                    .label-amount { font-size: 21pt; font-weight: 950; text-shadow: 0.3pt 0.3pt 0 black; }
                    .label-price-ref { font-size: 9pt; font-weight: 950; background: black !important; color: white !important; width: 100%; text-align: center; -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}