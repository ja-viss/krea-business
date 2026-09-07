
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Layers, Package, Trash2, Search, Loader2, Save, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CompositeProductsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [combos, setCombos] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Estado para nuevo Combo
    const [newCombo, setNewCombo] = useState({
        name: '',
        price: 0,
        recipe: [] as any[]
    });

    const fetchCombos = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/products?storeId=${storeId}`);
            const data = await res.json();
            setCombos(data.filter((p: any) => p.productType === 'Compuesto'));
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los combos." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCombos();
    }, []);

    const handleAddComponent = (product: IProduct) => {
        if (newCombo.recipe.some(r => String(r.product) === String(product._id))) return;
        setNewCombo({
            ...newCombo,
            recipe: [...newCombo.recipe, { product: product._id, productName: product.name, quantity: 1, price: product.price }]
        });
    };

    const handleSaveCombo = async () => {
        if (!newCombo.name || newCombo.recipe.length === 0) {
            toast({ variant: 'destructive', title: "Datos Incompletos", description: "Indica un nombre y añade productos al kit." });
            return;
        }

        setSaving(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch('/api/products/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newCombo,
                    productType: 'Compuesto',
                    stock: 999999, // Los compuestos no tienen stock propio, dependen de la receta
                    minStock: 0,
                    cost: newCombo.recipe.reduce((acc, r) => acc + (r.price * r.quantity), 0),
                    storeId
                })
            });

            if (!res.ok) throw new Error("Fallo al crear combo");
            
            toast({ title: "Kit Creado con Éxito" });
            setIsCreating(false);
            setNewCombo({ name: '', price: 0, recipe: [] });
            fetchCombos();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setSaving(false);
        }
    };

    if (isCreating) {
        return (
            <div className="flex flex-1 flex-col">
                <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-4xl mx-auto w-full">
                    <PageHeader 
                        title="Constructor de Kits" 
                        description="Busca artículos en tu stock para formar un nuevo paquete comercial."
                        actions={<Button variant="ghost" onClick={() => setIsCreating(false)}><X className='mr-2 h-4 w-4'/> Cancelar</Button>}
                    />

                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7 space-y-6">
                            <Card className='border-2 shadow-lg'>
                                <CardHeader className='bg-muted/10'><CardTitle className='text-xs font-black uppercase'>1. Seleccionar Componentes</CardTitle></CardHeader>
                                <CardContent className='pt-6'>
                                    <ProductSearch onProductSelect={handleAddComponent} />
                                    <div className="mt-6 rounded-xl border-2 overflow-hidden">
                                        <Table>
                                            <TableHeader className='bg-muted/50'>
                                                <TableRow>
                                                    <TableHead className='font-bold uppercase text-[10px] pl-4'>Producto</TableHead>
                                                    <TableHead className='text-center font-bold uppercase text-[10px]'>Cant.</TableHead>
                                                    <TableHead className='w-[40px] pr-4'></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {newCombo.recipe.map((r, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className='pl-4 font-black uppercase text-[10px]'>{r.productName}</TableCell>
                                                        <TableCell className='text-center'>
                                                            <Input 
                                                                type="number" 
                                                                className='w-14 h-8 mx-auto text-center font-black p-1' 
                                                                value={r.quantity}
                                                                onChange={(e) => {
                                                                    const n = [...newCombo.recipe];
                                                                    n[idx].quantity = parseFloat(e.target.value) || 0;
                                                                    setNewCombo({ ...newCombo, recipe: n });
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className='pr-4'>
                                                            <Button variant="ghost" size="icon" className='h-8 w-8 text-red-500' onClick={() => {
                                                                setNewCombo({ ...newCombo, recipe: newCombo.recipe.filter((_, i) => i !== idx) });
                                                            }}><Trash2 className='h-4 w-4'/></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {newCombo.recipe.length === 0 && <TableRow><TableCell colSpan={3} className='h-32 text-center text-muted-foreground italic text-xs'>Añade productos de la lista superior</TableCell></TableRow>}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-5 space-y-6">
                            <Card className='border-2 border-primary/20 bg-primary/[0.02] shadow-xl'>
                                <CardHeader className='bg-primary/5'><CardTitle className='text-xs font-black uppercase text-primary italic'>2. Definir Kit</CardTitle></CardHeader>
                                <CardContent className='pt-6 space-y-4'>
                                    <div className='space-y-2'>
                                        <label className='text-[10px] font-black uppercase opacity-60'>Nombre del Combo</label>
                                        <Input placeholder="Ej: Combo Desayuno Familiar" value={newCombo.name} onChange={e => setNewCombo({...newCombo, name: e.target.value})} className='font-black uppercase' />
                                    </div>
                                    <div className='space-y-2'>
                                        <label className='text-[10px] font-black uppercase opacity-60'>Precio Oferta (Bs)</label>
                                        <Input type="number" className='text-2xl font-black h-14 border-2 border-primary/40' value={newCombo.price} onChange={e => setNewCombo({...newCombo, price: parseFloat(e.target.value) || 0})} />
                                    </div>
                                </CardContent>
                                <CardFooter className='p-6 pt-0'>
                                    <Button className='w-full h-14 font-black uppercase shadow-2xl' onClick={handleSaveCombo} disabled={saving || newCombo.recipe.length === 0}>
                                        {saving ? <Loader2 className='animate-spin mr-2'/> : <Save className='mr-2 h-5 w-5'/>}
                                        Activar Combo
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Kits y Combos" 
                    description="Agrupa múltiples productos en un solo SKU para promociones o paquetes."
                    actions={
                        <Button onClick={() => setIsCreating(true)} className="font-black uppercase shadow-lg shadow-primary/20 h-12 px-6">
                            <PlusCircle className="mr-2 h-5 w-5" /> Crear Nuevo Combo
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
                        <CardContent><div className="text-3xl font-black">{combos.length}</div></CardContent>
                    </Card>
                    <div className="md:col-span-2">
                        <Card className="border-2 border-dashed bg-muted/20">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase opacity-60">Información Técnica</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-[10px] font-medium leading-relaxed italic">
                                    Los productos compuestos descuentan automáticamente el stock de sus componentes individuales al ser facturados.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b flex flex-row justify-between items-center">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic">
                            <Package className="h-5 w-5 text-primary" /> Catálogo de Paquetes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Nombre del Kit</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Componentes</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Precio Combo (Bs)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={3} className='p-6'><Skeleton className='h-8 w-full'/></TableCell></TableRow>
                                    ))
                                ) : combos.map((c) => (
                                    <TableRow key={c._id} className="hover:bg-primary/[0.02]">
                                        <TableCell className="pl-6 py-4">
                                            <div className="font-black uppercase text-xs">{c.name}</div>
                                            <Badge variant="outline" className="text-[8px] font-black uppercase mt-1 border-primary/20 text-primary">KIT DINÁMICO</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {c.recipe?.map((r: any, idx: number) => (
                                                    <Badge key={idx} variant="secondary" className="text-[9px] font-bold">{r.quantity}x {r.productName || 'Item'}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-sm text-primary pr-6">
                                            Bs. {c.price.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {combos.length === 0 && !loading && (
                                    <TableRow><TableCell colSpan={3} className='h-40 text-center text-muted-foreground italic'>No hay combos registrados.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
