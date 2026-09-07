'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ChevronLeft, Plus, Save, Truck, Package, Hash, MapPin, Navigation, Globe, Calculator, MousePointer2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductSearch } from '@/components/sales/product-search';
import { IProduct } from '@/models/Product';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Importación dinámica del mapa para evitar errores de SSR
const LogisticsMap = dynamic(() => import('@/components/purchases/logistics-map'), { 
    ssr: false,
    loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-muted/20 rounded-2xl border-2 border-dashed"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>
});

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
    const [editingPoint, setEditingPoint] = useState<'provider' | 'destination' | null>(null);
    
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

    const handleMapClick = (latlng: { lat: number, lng: number }) => {
        if (!editingPoint) return;

        if (editingPoint === 'provider') {
            setOrder(prev => ({
                ...prev,
                providerCoords: { lat: Number(latlng.lat.toFixed(6)), lng: Number(latlng.lng.toFixed(6)) },
                providerLocation: 'Punto en Mapa'
            }));
            toast({ title: "Origen Actualizado", description: "Punto de fábrica fijado mediante clic." });
        } else {
            setOrder(prev => ({
                ...prev,
                destinationCoords: { lat: Number(latlng.lat.toFixed(6)), lng: Number(latlng.lng.toFixed(6)) },
                destinationLocation: 'Punto en Mapa'
            }));
            toast({ title: "Destino Actualizado", description: "Punto de empresa fijado mediante clic." });
        }
        setEditingPoint(null);
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
            <main className="flex-1 space-y-4 md:space-y-6 p-4 pt-6 md:p-8 max-w-[1400px] mx-auto w-full">
                <PageHeader 
                    title="Nueva Orden de Lote" 
                    description="Registra un pedido masivo de mercancía con trazabilidad geográfica."
                    actions={<Button variant="ghost" asChild className="h-10 px-3 md:px-4"><Link href="/purchases"><ChevronLeft className='mr-2 h-4 w-4'/> Volver</Link></Button>}
                />

                <div className="grid gap-6 lg:grid-cols-12 items-start">
                    {/* COLUMNA IZQUIERDA: PRODUCTOS Y MAPA */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6 order-2 lg:order-1">
                        <Card className="border-2 shadow-lg rounded-2xl overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b flex flex-row items-center gap-2 py-3 md:py-4">
                                <Plus className="h-4 w-4 text-primary" />
                                <CardTitle className="text-[10px] md:text-xs font-black uppercase tracking-widest">Selección de Mercancía</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 md:pt-6">
                                <ProductSearch onProductSelect={handleAddProduct} />
                                <div className="mt-4 md:mt-6 rounded-xl border-2 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="font-black uppercase text-[9px] md:text-[10px] pl-3 md:pl-4 py-3 md:py-4">Producto</TableHead>
                                                <TableHead className="text-center font-black uppercase text-[9px] md:text-[10px]">Cant.</TableHead>
                                                <TableHead className="text-right font-black uppercase text-[9px] md:text-[10px]">Costo (Bs)</TableHead>
                                                <TableHead className="w-[40px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {order.items.map((item, idx) => (
                                                <TableRow key={idx} className="hover:bg-primary/5">
                                                    <TableCell className="pl-3 md:pl-4 py-2 md:py-3">
                                                        <span className='font-black uppercase text-[10px] md:text-xs block truncate max-w-[120px] md:max-w-none'>{item.name}</span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input type="number" className="w-14 md:w-20 h-8 md:h-10 mx-auto text-center font-black border-2 px-1 text-xs md:text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} onFocus={(e) => e.target.select()} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Input type="number" className="w-20 md:w-28 h-8 md:h-10 ml-auto text-right font-bold border-2 px-1 text-xs md:text-sm" value={item.cost} onChange={e => updateItem(idx, 'cost', e.target.value)} onFocus={(e) => e.target.select()} />
                                                    </TableCell>
                                                    <TableCell className="pr-2 md:pr-4">
                                                        <button className="h-8 w-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors" onClick={() => setOrder({...order, items: order.items.filter((_, i) => i !== idx)})}><Trash2 className="h-4 w-4"/></button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {order.items.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 md:h-40 text-center opacity-30 italic text-xs flex flex-col items-center justify-center gap-2"><Package className="h-8 w-8 md:h-10 md:w-10"/><span>Busca productos para el pedido</span></TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* MAPA DINÁMICO */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-primary" />
                                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-tighter">Previsualización de Ruta y Logística</h3>
                                </div>
                                {editingPoint && (
                                    <Badge className="bg-amber-500 text-white font-black text-[8px] md:text-[9px] uppercase animate-pulse shadow-md">
                                        Clic en mapa para mover {editingPoint === 'provider' ? 'Fábrica' : 'Empresa'}
                                    </Badge>
                                )}
                            </div>
                            <div className="animate-in fade-in zoom-in-95 duration-700">
                                <LogisticsMap 
                                    status="In Transit"
                                    storeCoords={order.destinationCoords}
                                    providerCoords={order.providerCoords}
                                    vendorName={order.vendor || 'PROVEEDOR'}
                                    onMapClick={handleMapClick}
                                    isEditing={!!editingPoint}
                                />
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: LOGÍSTICA Y GPS */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-4 order-1 lg:order-2">
                        <Card className="border-2 border-primary/10 bg-primary/[0.02] shadow-2xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b py-3 md:py-4">
                                <CardTitle className="text-[10px] md:text-[11px] font-black uppercase text-primary italic tracking-widest flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Logística del Pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 md:pt-6 space-y-5 md:space-y-6 px-4 md:px-6">
                                <div className="space-y-2">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase opacity-60">Proveedor</Label>
                                    <Input placeholder="EJ: EMPRESAS POLAR" value={order.vendor} onChange={e => setOrder({...order, vendor: e.target.value.toUpperCase()})} className="font-black uppercase h-10 md:h-12 border-2 text-xs md:text-sm" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase opacity-60"># Ref. Lote / Carga</Label>
                                    <Input placeholder="Ej: LOTE-ABC-001" value={order.lotReference} onChange={e => setOrder({...order, lotReference: e.target.value.toUpperCase()})} className="font-mono font-bold h-10 md:h-12 border-2 text-xs md:text-sm" />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[9px] md:text-[10px] font-black uppercase opacity-60">Fecha de Entrega Estimada</Label>
                                    <Input type="date" value={order.expectedDeliveryDate} onChange={e => setOrder({...order, expectedDeliveryDate: e.target.value})} className="h-10 md:h-12 font-bold border-2 text-xs md:text-sm" />
                                </div>

                                <Separator className="my-1" />

                                <div className={cn("space-y-3 bg-white p-3 md:p-4 rounded-xl border-2 shadow-inner transition-all", editingPoint === 'provider' ? "border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20" : "border-muted-foreground/10")}>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase text-red-600 flex items-center gap-1"><MapPin className="h-3 w-3"/> Origen (Fábrica)</Label>
                                        <Button 
                                            variant={editingPoint === 'provider' ? 'default' : 'outline'} 
                                            size="sm" 
                                            className="h-7 text-[8px] md:text-[9px] font-black uppercase"
                                            onClick={() => setEditingPoint(editingPoint === 'provider' ? null : 'provider')}
                                        >
                                            <MousePointer2 className="mr-1 h-2.5 w-2.5" /> {editingPoint === 'provider' ? 'Editando...' : 'Mover en Mapa'}
                                        </Button>
                                    </div>
                                    <Select value={order.providerLocation} onValueChange={(v) => handleCityChange('provider', v)}>
                                        <SelectTrigger className="h-9 md:h-11 font-bold border-2 text-[10px] md:text-xs">
                                            <SelectValue placeholder="Ciudad origen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENEZUELA_CITIES.map(city => (
                                                <SelectItem key={city.name} value={city.name} className='font-bold uppercase text-[9px] md:text-[10px]'>{city.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className='space-y-1'><span className='text-[7px] uppercase font-black opacity-40 ml-1'>LAT</span><Input type="number" className="h-8 text-[8px] md:text-[9px] font-mono text-center" value={order.providerCoords.lat} onChange={e => handleCoordChange('provider', 'lat', e.target.value)} /></div>
                                        <div className='space-y-1'><span className='text-[7px] uppercase font-black opacity-40 ml-1'>LNG</span><Input type="number" className="h-8 text-[8px] md:text-[9px] font-mono text-center" value={order.providerCoords.lng} onChange={e => handleCoordChange('provider', 'lng', e.target.value)} /></div>
                                    </div>
                                </div>

                                <div className={cn("space-y-3 bg-white p-3 md:p-4 rounded-xl border-2 shadow-inner transition-all", editingPoint === 'destination' ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20" : "border-muted-foreground/10")}>
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[9px] md:text-[10px] font-black uppercase text-primary flex items-center gap-1"><Navigation className="h-3 w-3"/> Destino (Tu Empresa)</Label>
                                        <Button 
                                            variant={editingPoint === 'destination' ? 'secondary' : 'outline'} 
                                            size="sm" 
                                            className="h-7 text-[8px] md:text-[9px] font-black uppercase"
                                            onClick={() => setEditingPoint(editingPoint === 'destination' ? null : 'destination')}
                                        >
                                            <MousePointer2 className="mr-1 h-2.5 w-2.5" /> {editingPoint === 'destination' ? 'Editando...' : 'Mover en Mapa'}
                                        </Button>
                                    </div>
                                    <Select value={order.destinationLocation} onValueChange={(v) => handleCityChange('destination', v)}>
                                        <SelectTrigger className="h-9 md:h-11 font-bold border-2 border-primary/20 text-[10px] md:text-xs">
                                            <SelectValue placeholder="Sede destino" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VENEZUELA_CITIES.map(city => (
                                                <SelectItem key={city.name} value={city.name} className='font-bold uppercase text-[9px] md:text-[10px]'>{city.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className='space-y-1'><span className='text-[7px] uppercase font-black opacity-40 ml-1'>LAT</span><Input type="number" className="h-8 text-[8px] md:text-[9px] font-mono text-center" value={order.destinationCoords.lat} onChange={e => handleCoordChange('destination', 'lat', e.target.value)} /></div>
                                        <div className='space-y-1'><span className='text-[7px] uppercase font-black opacity-40 ml-1'>LNG</span><Input type="number" className="h-8 text-[8px] md:text-[9px] font-mono text-center" value={order.destinationCoords.lng} onChange={e => handleCoordChange('destination', 'lng', e.target.value)} /></div>
                                    </div>
                                </div>

                                <div className="pt-3 md:pt-4 border-t-2 border-dashed border-primary/10 flex justify-between items-baseline">
                                    <span className="text-[9px] md:text-[10px] font-black uppercase opacity-60">Inversión Lote</span>
                                    <div className="text-right">
                                        <span className="text-2xl md:text-3xl font-black text-primary tracking-tighter">Bs. {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 md:p-6 pt-0">
                                <Button className="w-full h-14 md:h-16 text-base md:text-lg font-black uppercase shadow-2xl rounded-2xl" onClick={handleSave} disabled={loading || order.items.length === 0}>
                                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5"/> : <Save className="mr-2 h-5 w-5 md:h-6 md:w-6"/>}
                                    Emitir Orden y Activar GPS
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}