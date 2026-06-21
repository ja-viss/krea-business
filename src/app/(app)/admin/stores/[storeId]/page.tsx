'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ShieldCheck, Calendar, Zap, HardDrive, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function StoreAdminDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchStore();
    }, []);

    const fetchStore = async () => {
        try {
            const res = await fetch(`/api/admin/stores/${params.storeId}`);
            if (!res.ok) throw new Error('Error al cargar');
            const data = await res.json();
            setStore(data);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar la empresa." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updates: any) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/stores/${params.storeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Error al guardar');
            const data = await res.json();
            setStore(data);
            toast({ title: "Actualizado", description: "Los cambios se aplicaron con éxito." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin h-10 w-10 mx-auto" /></div>;
    if (!store) return <div className="p-8">Empresa no encontrada.</div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title={store.name} 
                    description={`ID de Cliente: ${store._id}`}
                    actions={
                        <Button variant="outline" onClick={() => router.back()}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Volver al Directorio
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Control de Acceso y Estado */}
                    <Card className={`md:col-span-2 border-2 ${store.status === 'Suspended' ? 'border-red-500' : 'border-primary/20'}`}>
                        <CardHeader className="bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg uppercase font-black">Control de Licencia</CardTitle>
                                    <CardDescription>Gestiona el acceso y vigencia del servicio.</CardDescription>
                                </div>
                                <div className={`px-4 py-1 rounded-full text-xs font-black uppercase ${store.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {store.status === 'Active' ? 'ACCESO HABILITADO' : 'ACCESO SUSPENDIDO'}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border-2 border-dashed">
                                <div className="space-y-1">
                                    <p className="font-black uppercase text-sm">Interruptor de Acceso Maestro</p>
                                    <p className="text-xs text-muted-foreground">Apaga esto para bloquear inmediatamente a todos los usuarios de esta empresa.</p>
                                </div>
                                <Switch 
                                    checked={store.status === 'Active'} 
                                    onCheckedChange={(val) => handleUpdate({ status: val ? 'Active' : 'Suspended' })}
                                    disabled={saving}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Plan de Suscripción</Label>
                                    <Select 
                                        value={store.plan} 
                                        onValueChange={(val) => handleUpdate({ plan: val })}
                                        disabled={saving}
                                    >
                                        <SelectTrigger className="font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Basic">Básico (Limitado)</SelectItem>
                                            <SelectItem value="Pro">Profesional (Estándar)</SelectItem>
                                            <SelectItem value="Premium">Premium (Ilimitado)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Fecha de Vencimiento</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type="date" 
                                            value={format(new Date(store.expiryDate), 'yyyy-MM-dd')} 
                                            onChange={(e) => handleUpdate({ expiryDate: new Date(e.target.value) })}
                                            className="font-mono font-bold"
                                            disabled={saving}
                                        />
                                        <Button variant="outline" size="icon" onClick={() => {
                                            const nextMonth = new Date(store.expiryDate);
                                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                                            handleUpdate({ expiryDate: nextMonth, status: 'Active' });
                                        }}>
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Limites del Plan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase">Límites de Uso</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Usuarios</span>
                                    <span>{store.maxUsers}</span>
                                </div>
                                <Input 
                                    type="number" 
                                    value={store.maxUsers} 
                                    onChange={(e) => handleUpdate({ maxUsers: parseInt(e.target.value) })}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span>Docs / Mes</span>
                                    <span>{store.maxInvoicesPerMonth}</span>
                                </div>
                                <Input 
                                    type="number" 
                                    value={store.maxInvoicesPerMonth} 
                                    onChange={(e) => handleUpdate({ maxInvoicesPerMonth: parseInt(e.target.value) })}
                                    disabled={saving}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 border-t">
                            <p className="text-[9px] text-muted-foreground italic">Cualquier cambio en límites se aplica al próximo ciclo de facturación del cliente.</p>
                        </CardFooter>
                    </Card>

                    {/* Acciones de Soporte */}
                    <Card className="md:col-span-3 bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-black uppercase">Centro de Soporte Técnico</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-4">
                            <Button variant="outline" className="h-20 flex-col gap-2 font-bold text-xs uppercase" disabled={saving}>
                                <Zap className="h-5 w-5 text-amber-500" />
                                Suplantar Acceso (Modo Soporte)
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 font-bold text-xs uppercase" disabled={saving}>
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Forzar Cierre de Sesiones
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 font-bold text-xs uppercase" disabled={saving}>
                                <HardDrive className="h-5 w-5 text-blue-500" />
                                Depurar Cache de Inventario
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 font-bold text-xs uppercase" onClick={fetchStore}>
                                <Loader2 className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} />
                                Refrescar Datos
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
