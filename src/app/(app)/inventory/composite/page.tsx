
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Layers, Package, Trash2, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import Link from 'next/link';

export default function CompositeProductsPage() {
    const { toast } = useToast();
    const [combos, setCombos] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchCombos = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/products?storeId=${storeId}`);
            const data = await res.json();
            // Filtrar solo productos de tipo 'Compuesto'
            setCombos(data.filter((p: any) => p.productType === 'Compuesto' || p.category?.toLowerCase().includes('combo')));
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los combos." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCombos();
    }, []);

    const filtered = combos.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Kits y Combos" 
                    description="Agrupa múltiples productos en un solo SKU para promociones o paquetes."
                    actions={
                        <Button asChild className="font-black uppercase shadow-lg shadow-primary/20">
                            <Link href="/inventory/new-product?type=Compuesto">
                                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Combo
                            </Link>
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                                <Layers className="h-4 w-4" /> Combos Activos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">{combos.length}</div>
                        </CardContent>
                    </Card>
                    <div className="md:col-span-2">
                        <Card className="border-2 border-dashed bg-muted/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase opacity-60">Información Técnica</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-[10px] font-medium leading-relaxed italic">
                                    Los productos compuestos descuentan automáticamente el stock de sus componentes individuales al ser facturados. Asegúrate de definir correctamente la "receta" en la edición del producto.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar kit por nombre..." 
                            className="pl-9 h-11 font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic">
                            <Package className="h-5 w-5 text-primary" /> Catálogo de Paquetes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Nombre del Kit</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">SKU / Identificador</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Componentes</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase">Precio Combo (Bs)</TableHead>
                                    <TableHead className="w-[50px] pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="pl-6"><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                            <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filtered.length > 0 ? (
                                    filtered.map((c) => (
                                        <TableRow key={c._id} className="hover:bg-primary/[0.02]">
                                            <TableCell className="pl-6 py-4">
                                                <div className="font-black uppercase text-xs">{c.name}</div>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase mt-1 border-primary/20 text-primary">PAQUETE</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{c.sku || String(c._id).slice(-6)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(c as any).recipe?.length > 0 ? (c as any).recipe.map((r: any, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="text-[9px] font-medium">{r.quantity}x {r.productName || 'Item'}</Badge>
                                                    )) : <span className="text-[10px] italic opacity-40">Sin definir receta</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-sm text-primary">
                                                Bs. {c.price.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-primary">
                                                    <Link href={`/inventory/${c._id}/edit`}><PlusCircle className="h-4 w-4" /></Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                            No se han creado kits o combos todavía.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
