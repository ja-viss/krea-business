
'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Layers, Package, Trash2, Search, Loader2, Save, X, Plus, Coins, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { IProduct } from '@/models/Product';
import { ProductSearch } from '@/components/sales/product-search';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CompositeProductsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { rates } = useExchangeRates();
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

    // Referencias Multimoneda para el precio ingresado
    const priceReferences = useMemo(() => {
        const ves = newCombo.price || 0;
        const usd = rates.usd?.usd ? ves / rates.usd.usd : 0;
        const cop = rates.cop?.rate ? (usd * rates.cop.rate) : 0;
        return { usd, cop };
    }, [newCombo.price, rates]);

    const handleAddComponent = (product: IProduct) => {
        if (newCombo.recipe.some(r => String(r.product) === String(product._id))) {
            toast({ title: "Ya está en el kit", description: product.name });
            return;
        }
        setNewCombo({
            ...newCombo,
            recipe: [...newCombo.recipe, { 
                product: product._id, 
                productName: product.name, 
                quantity: 1, 
                price: product.price 
            }]
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
                    name: newCombo.name,
                    productType: 'Compuesto',
                    price: newCombo.price,
                    recipe: newCombo.recipe.map(r => ({
                        product: r.product,
                        quantity: r.quantity,
                        productName: r.productName
                    })),
                    stock: 999999, // Los compuestos no tienen stock propio, dependen de la receta
                    minStock: 0,
                    cost: newCombo.recipe.reduce((acc, r) => acc + (r.price * r.quantity), 0),
                    storeId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Fallo al crear combo");
            
            toast({ title: "Kit Activado", description: "El producto compuesto ya está en el catálogo." });
            setIsCreating(false);
            setNewCombo({ name: '', price: 0, recipe: [] });
            fetchCombos();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Guardado", description: e.message });
        } finally {
            setSaving(false);
        }
    };

    const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

    if (isCreating) {
        return (
            <div className="flex flex-1 flex-col">
                <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-5xl mx-auto w-full">
                    <PageHeader 
                        title="Constructor de Kits" 
                        description="Agrupa productos y define un precio de paquete atractivo."
                        actions={<Button variant="ghost" onClick={() => setIsCreating(false)} className='font-bold'><X className='mr-2 h-4 w-4'/> Cancelar</Button>}
                    />

                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7 space-y-6">
                            <Card className='border-2 shadow-lg'>
                                <CardHeader className='bg-muted/10 border-b py-3'>
                                    <CardTitle className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>1. Selección de Componentes</CardTitle>
                                </CardHeader>
                                <CardContent className='pt-6'>
                                    <ProductSearch onProductSelect={handleAddComponent} />
                                    <div className="mt-6 rounded-xl border-2 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className='bg-muted/50'>
                                                <TableRow>
                                                    <TableHead className='font-black uppercase text-[9px] pl-4 py-3'>Descripción</TableHead>
                                                    <TableHead className='text-center font-black uppercase text-[9px]'>Cant.</TableHead>
                                                    <TableHead className='w-[40px] pr-4'></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {newCombo.recipe.map((r, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className='pl-4'>
                                                            <div className='flex flex-col'>
                                                                <span className='font-black uppercase text-[10px] md:text-[11px]'>{r.productName}</span>
                                                                <span className='text-[9px] opacity-60'>Precio Indiv: {r.price.toLocaleString()} Bs</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='text-center'>
                                                            <Input 
                                                                type="number" 
                                                                className='w-16 h-9 mx-auto text-center font-black border-2' 
                                                                value={r.quantity}
                                                                onFocus={selectOnFocus}
                                                                onChange={(e) => {
                                                                    const n = [...newCombo.recipe];
                                                                    n[idx].quantity = parseFloat(e.target.value) || 0;
                                                                    setNewCombo({ ...newCombo, recipe: n });
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell className='pr-4'>
                                                            <Button variant="ghost" size="icon" className='h-8 w-8 text-red-400' onClick={() => {
                                                                setNewCombo({ ...newCombo, recipe: newCombo.recipe.filter((_, i) => i !== idx) });
                                                            }}><Trash2 className='h-4 w-4'/></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {newCombo.recipe.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className='h-40 text-center opacity-30 italic flex flex-col items-center justify-center gap-2'>
                                                            <Package className='h-10 w-10 mb-2' />
                                                            <span className='text-xs uppercase font-black'>Añade productos de la lista superior</span>
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
                            <Card className='border-2 border-primary/20 bg-primary/[0.02] shadow-xl overflow-hidden'>
                                <CardHeader className='bg-primary/5 border-b py-3'><CardTitle className='text-[10px] font-black uppercase text-primary italic'>2. Definir Oferta</CardTitle></CardHeader>
                                <CardContent className='pt-6 space-y-6'>
                                    <div className='space-y-2'>
                                        <label className='text-[10px] font-black uppercase opacity-60 ml-1'>Nombre del Combo / Kit</label>
                                        <Input placeholder="Ej: COMBO FAMILIAR" value={newCombo.name} onChange={e => setNewCombo({...newCombo, name: e.target.value.toUpperCase()})} className='font-black h-12 uppercase border-2 focus:border-primary' />
                                    </div>
                                    
                                    <div className='space-y-3'>
                                        <div className='flex justify-between items-end'>
                                            <label className='text-[10px] font-black uppercase text-primary ml-1'>Precio de Venta (BS)</label>
                                            <Badge variant="outline" className='bg-green-50 text-green-700 border-green-200 text-[9px] font-black'>VALORIZADO</Badge>
                                        </div>
                                        <Input 
                                            type="number" 
                                            className='text-3xl font-black h-20 border-2 border-primary/40 text-center shadow-inner' 
                                            value={newCombo.price} 
                                            onFocus={selectOnFocus}
                                            onChange={e => setNewCombo({...newCombo, price: parseFloat(e.target.value) || 0})} 
                                        />
                                        
                                        {/* REFERENCIAS MULTIMONEDA */}
                                        <div className='grid grid-cols-2 gap-2 mt-4'>
                                            <div className='p-3 rounded-xl bg-white border-2 border-dashed flex flex-col items-center justify-center shadow-sm'>
                                                <span className='text-[8px] font-black uppercase opacity-50'>Ref. USD</span>
                                                <span className='text-lg font-black text-slate-700'>${priceReferences.usd.toFixed(2)}</span>
                                            </div>
                                            <div className='p-3 rounded-xl bg-white border-2 border-dashed flex flex-col items-center justify-center shadow-sm'>
                                                <span className='text-[8px] font-black uppercase opacity-50'>Ref. COP</span>
                                                <span className='text-lg font-black text-slate-700'>{priceReferences.cop.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='p-4 bg-amber-50 border-2 border-amber-100 rounded-xl flex items-start gap-3'>
                                        <TrendingUp className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
                                        <p className='text-[9px] font-bold text-amber-800 leading-tight'>
                                            TIP: El precio del combo debería ser menor a la suma individual de sus partes para incentivar la compra.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className='p-6 pt-0'>
                                    <Button className='w-full h-16 font-black uppercase shadow-2xl rounded-2xl text-lg' onClick={handleSaveCombo} disabled={saving || newCombo.recipe.length === 0}>
                                        {saving ? <Loader2 className='animate-spin mr-2 h-5 w-5'/> : <Save className='mr-2 h-6 w-6'/>}
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
                        <Button onClick={() => setIsCreating(true)} className="font-black uppercase shadow-lg shadow-primary/20 h-12 px-6 rounded-2xl">
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
                                <p className="text-[10px] font-medium leading-relaxed italic opacity-70">
                                    Los productos compuestos descuentan automáticamente el stock de sus componentes individuales al ser facturados. 
                                    Asegúrate de que tus productos base tengan stock disponible para que el combo sea válido.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="bg-muted/10 border-b flex flex-row justify-between items-center">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic">
                            <Package className="h-5 w-5 text-primary" /> Catálogo de Paquetes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Nombre del Kit</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Contenido / Receta</TableHead>
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
                                            <TableCell className="pl-6 py-5">
                                                <div className="font-black uppercase text-xs">{c.name}</div>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase mt-1 border-primary/20 text-primary">KIT DINÁMICO</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {c.recipe?.map((r: any, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="text-[9px] font-bold py-1">
                                                            {r.quantity}x {r.productName || 'Item'}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-sm text-primary pr-6">
                                                Bs. {c.price.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                                <span className='block text-[8px] text-muted-foreground font-bold opacity-60'>Ref: ${rates.usd?.usd ? (c.price / rates.usd.usd).toFixed(2) : '0.00'}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {combos.length === 0 && !loading && (
                                        <TableRow><TableCell colSpan={3} className='h-48 text-center text-muted-foreground italic flex flex-col items-center justify-center gap-2'>
                                            <Coins className='h-12 w-12 opacity-10' />
                                            <span className='uppercase font-black text-xs opacity-40'>No hay combos registrados.</span>
                                        </TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
