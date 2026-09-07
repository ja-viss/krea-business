
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, ChevronLeft, Plus, Save, Truck, Package, Hash, MapPin, Navigation, Globe, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductSearch } from '@/components/sales/product-search';
import { IProduct } from '@/models/Product';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { LogisticsMap } from '@/components/purchases/logistics-map';
import { Separator } from '@/components/ui/separator';

const VENEZUELA_CITIES = [
    { name: 'Caracas (Centro)', lat: 10.4806, lng: -66.9036 },
    { name: 'Valencia (Carabobo)', lat: 10.1620, lng: -68.0077 },
    { name: 'Maracaibo (Zulia)', lat: 10.6427, lng: -71.6125 },
    { name: 'Barquisimeto (Lara)', lat: 10.0678, lng: -69.3473 },
    { name: 'Puerto La Cruz (Anzoátegui)', lat: 10.2167, lng: -64.6333 },
    { name: 'San Cristóbal (Táchira)', lat: 7.7669, lng: -72.2250 },
    { name: 'Mérida (Mérida)', lat: 8.5833, lng: -71.1333 },
    { name: 'Puerto Ordaz (Bolívar)', lat: 8.2970, lng: -62.7111 },
    { name: 'Maturín (Monagas)', lat: 9.7457, lng: -63.1764 },
    { name: 'Punto Fijo (Falcón)', lat: 11.6961, lng: -70.1761 },
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
        destinationLocation: 'Caracas (Centro)',
        destinationCoords: { lat: 10.4806, lng: -66.9036 },
        items: [] as any[]
    });

    useEffect(() => {
        const fetchStoreConfig = async () => {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/settings/store?storeId=${storeId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.locationName && data.locationCoords) {
                    setOrder(prev => ({
                        ...prev,
                        destinationLocation: data.locationName,
                        destinationCoords: data.locationCoords
                    }));
                }
            }
        };
        fetchStoreConfig();
    }, []);

    const handleAddProduct = (product: IProduct) => {
        if (order.items.some(i => i.product === product._id)) {
            toast({ title: "Ya está en la lista" });
            return;
        }
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

    const handleCityChange = (field: 'provider' | 'destination', cityName: string) => {
        const city = VENEZUELA_CITIES.find(c => c.name === cityName);
        if (city) {
            if (field === 'provider') {
                setOrder({ 
                    ...order, 
                    providerLocation: cityName, 
                    providerCoords: { lat: city.lat, lng: city.lng } 
                });
            } else {
                setOrder({ 
                    ...order, 
                    destinationLocation: cityName, 
                    destinationCoords: { lat: city.lat, lng: city.lng } 
                });
            }
        }
    };

    const handleCoordChange = (field: 'provider' | 'destination', coord: 'lat' | 'lng', val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return;

        if (field === 'provider') {
            setOrder({ ...order, providerCoords: { ...order.providerCoords, [coord]: num }, providerLocation: 'Coordenadas Manuales' });
        } else {
            setOrder({ ...order, destinationCoords: { ...order.destinationCoords, [coord]: num }, destinationLocation: 'Coordenadas Manuales' });
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
            toast({ title: "Orden de Lote Emitida", description: "Rastreo individual activado." });
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
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
                <PageHeader 
                    title="Nueva Orden de Lote" 
                    description="Registra un pedido masivo de mercancía para tu inventario."
                    actions={<Button variant="ghost" asChild><Link href="/purchases"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
                />

                <div className="grid gap-6 lg:grid-cols-12 items-start">
                    {/* COLUMNA IZQUIERDA: PRODUCTOS Y MAPA */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b flex flex-row items-center gap-2">
                                <Plus className="h-4 w-4 text-primary" />
                                <CardTitle className="text-xs font-black uppercase tracking-widest">Selección de Mercancía</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                <div className="mt-6 rounded-xl border-2 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black uppercase text-[10px] pl-4 py-4">Producto</TableHead>
                                                <TableHead className="text-center font-black uppercase text-[10px]">Cant.</TableHead>
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
                                            {order.items.length === 0 && <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-30 italic text-sm flex flex-col items-center justify-center gap-2"><Package className="h-10 w-10"/><span>Busca productos para el pedido</span></TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* MAPA DINÁMICO INTEGRADO EN EL FLUJO */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-2">
                                <Globe className="h-4 w-4 text-primary" />
                                <h3 className="text-xs font-black uppercase tracking-tighter">Previsualización de Ruta y Logística</h3>
                            </div>
                            <div className="animate-in fade-in zoom-in-95 duration-700">
                                <LogisticsMap 
                                    status="In Transit"
                                    storeCoords={order.destinationCoords}
                                    providerCoords={order.providerCoords}
                                    vendorName={order.vendor || 'PROVEEDOR'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: LOGÍSTICA Y GPS */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-4">
                        <Card className="border-2 border-primary/10 bg-primary/[0.02] shadow-2xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b py-4">
                                <CardTitle className="text-[11px] font-black uppercase text-primary italic tracking-widest flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Logística del Pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6 px-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Proveedor</Label>
                                    <Input placeholder="EJ: EMPRESAS POLAR" value={order.vendor} onChange={e => setOrder({...order, vendor: e.target.value.toUpperCase()})} className="font-black uppercase h-12 border-2" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60"># Ref. Lote / Carga</Label>
                                    <Input placeholder="Ej: LOTE-ABC-001" value={order.lotReference} onChange={e => setOrder({...order, lotReference: e.target.value.toUpperCase()})} className="font-mono font-bold h-12 border-2" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Fecha de Entrega Estimada</Label>
                                    <Input type="date" value={order.expectedDeliveryDate} onChange={e => setOrder({...order, expectedDeliveryDate: e.target.value})} className="h-12 font-bold border-2" />
                                </div>

                                <Separator className="my-2" />

                                <div className="space-y-4 bg-white p-4 rounded-xl border-2 shadow-inner">
                                    <Label className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1"><MapPin className="h-3 w-3"/> Origen (Fábrica)</Label>
                                    <Select value={order.providerLocation} onValueChange={(v) => handleCityChange('provider', v)}>
                                        <SelectTrigger className="h-11 font-bold border-2">
                                            <SelectValue placeholder="Elegir ciudad de origen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENEZUELA_CITIES.map(city => (
                                                <SelectItem key={city.name} value={city.name} className='font-bold uppercase text-[10px]'>{city.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input type="number" className="h-8 text-[9px] font-mono text-center" value={order.providerCoords.lat} onChange={e => handleCoordChange('provider', 'lat', e.target.value)} />
                                        <Input type="number" className="h-8 text-[9px] font-mono text-center" value={order.providerCoords.lng} onChange={e => handleCoordChange('provider', 'lng', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-4 bg-white p-4 rounded-xl border-2 shadow-inner">
                                    <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Navigation className="h-3 w-3"/> Destino (Tu Empresa)</Label>
                                    <Select value={order.destinationLocation} onValueChange={(v) => handleCityChange('destination', v)}>
                                        <SelectTrigger className="h-11 font-bold border-2 border-primary/20">
                                            <SelectValue placeholder="Elegir sede destino" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENEZUELA_CITIES.map(city => (
                                                <SelectItem key={city.name} value={city.name} className='font-bold uppercase text-[10px]'>{city.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input type="number" className="h-8 text-[9px] font-mono text-center" value={order.destinationCoords.lat} onChange={e => handleCoordChange('destination', 'lat', e.target.value)} />
                                        <Input type="number" className="h-8 text-[9px] font-mono text-center" value={order.destinationCoords.lng} onChange={e => handleCoordChange('destination', 'lng', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase opacity-60">Notas Internas</Label>
                                    <Input placeholder="Instrucciones para el almacén..." value={order.notes} onChange={e => setOrder({...order, notes: e.target.value})} className="h-12 border-2" />
                                </div>

                                <div className="pt-4 border-t-2 border-dashed border-primary/10 flex justify-between items-baseline">
                                    <span className="text-[10px] font-black uppercase opacity-60">Inversión Lote</span>
                                    <div className="text-right">
                                        <span className="text-3xl font-black text-primary tracking-tighter">Bs. {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-6 pt-0">
                                <Button className="w-full h-16 text-lg font-black uppercase shadow-2xl rounded-2xl" onClick={handleSave} disabled={loading || order.items.length === 0}>
                                    {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-6 w-6"/>}
                                    Emitir Orden y Activar GPS
                                </Button>
                            </CardFooter>
                        </Card>

                        <div className="p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-start gap-3">
                             <div className="bg-amber-100 p-2 rounded-lg"><Truck className="h-5 w-5 text-amber-600" /></div>
                             <p className="text-[9px] font-bold text-amber-800 leading-tight">
                                CONFIGURACIÓN DINÁMICA: Puedes ajustar los puntos en el mapa seleccionando las ciudades o ingresando coordenadas exactas. El sistema recalculará la ruta automáticamente.
                             </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
