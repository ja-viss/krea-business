
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ChevronLeft, Plus, Save, Truck, Package, Hash, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductSearch } from '@/components/sales/product-search';
import { IProduct } from '@/models/Product';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const VENEZUELA_CITIES = [
    { name: 'Caracas (Centro)', lat: 10.4806, lng: -66.9036 },
    { name: 'Valencia (Carabobo)', lat: 10.1620, lng: -68.0077 },
    { name: 'Maracaibo (Zulia)', lat: 10.6427, lng: -71.6125 },
    { name: 'Barquisimeto (Lara)', lat: 10.0678, lng: -69.3473 },
    { name: 'Puerto La Cruz (Anzoátegui)', lat: 10.2167, lng: -64.6333 },
    { name: 'San Cristóbal (Táchira)', lat: 7.7669, lng: -72.2250 },
    { name: 'Mérida (Mérida)', lat: 8.5833, lng: -71.1333 },
];

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const [order, setOrder] = useState({
        vendor: '',
        lotReference: '',
        expectedDeliveryDate: new Date().toISOString().split('T')[0],
        notes: '',
        providerLocation: 'Caracas (Centro)',
        providerCoords: { lat: 10.4806, lng: -66.9036 },
        items: [] as any[]
    });

    const handleAddProduct = (product: IProduct) => {
        if (order.items.some(i => i.product === product._id)) return;
        setOrder({
            ...order,
            items: [...order.items, {
                product: product._id,
                name: product.name,
                quantity: 1,
                cost: product.cost || 0
            }]
        });
    };

    const handleCityChange = (cityName: string) => {
        const city = VENEZUELA_CITIES.find(c => c.name === cityName);
        if (city) {
            setOrder({ 
                ...order, 
                providerLocation: cityName, 
                providerCoords: { lat: city.lat, lng: city.lng } 
            });
        }
    };

    const updateItem = (index: number, field: string, val: string) => {
        const newItems = [...order.items];
        newItems[index] = { ...newItems[index], [field]: parseFloat(val) || 0 };
        setOrder({ ...order, items: newItems });
    };

    const handleSave = async () => {
        if (!order.vendor || order.items.length === 0) {
            toast({ variant: 'destructive', title: "Faltan datos", description: "Indique un proveedor y añada productos." });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...order, storeId: localStorage.getItem('storeId') })
            });
            if (!res.ok) throw new Error("Fallo al guardar pedido");
            toast({ title: "Orden de Lote Emitida", description: "El stock en tránsito ha sido actualizado." });
            router.push('/purchases');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const total = order.items.reduce((acc, i) => acc + (i.cost * i.quantity), 0);

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto w-full">
                <PageHeader 
                    title="Nueva Orden de Lote" 
                    description="Planificación de carga y logística de entrada."
                    actions={<Button variant="ghost" asChild><Link href="/purchases"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
                />

                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-primary" /> Selección de Mercancía
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                <div className="mt-6 rounded-xl border-2 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black uppercase text-[10px] pl-4 py-4">Descripción del Ítem</TableHead>
                                                <TableHead className="text-center font-black uppercase text-[10px]">Cantidad</TableHead>
                                                <TableHead className="text-right font-black uppercase text-[10px]">Costo (Bs)</TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items.map((item, idx) => (
                                                <TableRow key={idx} className="hover:bg-primary/5">
                                                    <TableCell className="pl-4 py-3">
                                                        <span className='font-black uppercase text-xs'>{item.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input type="number" className="w-20 h-10 mx-auto text-center font-black border-2" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} onFocus={(e) => e.target.select()} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input type="number" className="w-28 h-10 ml-auto text-right font-bold border-2" value={item.cost} onChange={e => updateItem(idx, 'cost', e.target.value)} onFocus={(e) => e.target.select()} />
                                                    </TableCell>
                                                    <TableCell className="pr-4">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setOrder({...order, items: order.items.filter((_, i) => i !== idx)})}><Trash2 className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {order.items.length === 0 && <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm flex flex-col items-center justify-center gap-2"><Package className="h-10 w-10"/><span>Agrega productos al pedido</span></TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-2 border-primary/20 bg-primary/[0.02] shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs font-black uppercase text-primary italic tracking-widest">Logística y Despacho</CardTitle></CardHeader>
                            <CardContent className="pt-6 space-y-5 px-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1"><Truck className="h-3 w-3"/> Proveedor Principal</Label>
                                    <Input placeholder="Nombre de la empresa" value={order.vendor} onChange={e => setOrder({...order, vendor: e.target.value.toUpperCase()})} className="font-black uppercase h-12 border-2" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1"><MapPin className="h-3 w-3"/> Ubicación de Origen (Fábrica)</Label>
                                    <Select value={order.providerLocation} onValueChange={handleCityChange}>
                                        <SelectTrigger className="h-12 font-bold border-2 bg-white">
                                            <SelectValue placeholder="Seleccionar origen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENEZUELA_CITIES.map(city => (
                                                <SelectItem key={city.name} value={city.name} className='font-bold uppercase text-[10px]'>{city.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1"><Hash className="h-3 w-3"/> Referencia de Carga (Lote)</Label>
                                    <Input placeholder="Ej: CARGA-VEN-01" value={order.lotReference} onChange={e => setOrder({...order, lotReference: e.target.value.toUpperCase()})} className="font-mono font-bold h-12 border-2" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Entrega Estimada</Label>
                                    <Input type="date" value={order.expectedDeliveryDate} onChange={e => setOrder({...order, expectedDeliveryDate: e.target.value})} className="font-bold h-12 border-2" />
                                </div>

                                <div className="pt-4 border-t-2 border-dashed border-primary/10 flex justify-between items-baseline">
                                    <span className="text-[10px] font-black uppercase opacity-60">Inversión Total</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">Bs. {total.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="p-6 pt-0">
                                <Button className="w-full h-16 font-black uppercase shadow-2xl rounded-2xl text-lg" onClick={handleSave} disabled={loading || order.items.length === 0}>
                                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-6 w-6"/>}
                                    Emitir Orden
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
