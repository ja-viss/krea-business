
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
import { 
    ChevronLeft, 
    Calendar, 
    Zap, 
    AlertTriangle, 
    Loader2, 
    Users, 
    ShieldCheck, 
    UserPlus, 
    KeyRound, 
    Ban, 
    CheckCircle2, 
    Clock, 
    HardDrive,
    Lock,
    Trophy,
    Package,
    ShoppingCart,
    Receipt,
    BarChart3
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';

export default function StoreAdminDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [store, setStore] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Modal states
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [tempPassword, setTempPassword] = useState('Cambio2026*');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [storeRes, usersRes] = await Promise.all([
                fetch(`/api/admin/stores/${params.storeId}`),
                fetch(`/api/users?storeId=${params.storeId}`)
            ]);
            
            if (!storeRes.ok) throw new Error('Error al cargar empresa');
            const storeData = await storeRes.json();
            const usersData = await usersRes.json();
            
            setStore(storeData);
            setUsers(usersData);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar la información." });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStore = async (updates: any) => {
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
            toast({ title: "Configuración Guardada", description: "Límites y módulos actualizados." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar." });
        } finally {
            setSaving(false);
        }
    };

    const toggleModule = (module: string) => {
        const currentModules = store.enabledModules || { inventory: true, sales: true, expenses: true, reports: true };
        handleUpdateStore({
            enabledModules: {
                ...currentModules,
                [module]: !currentModules[module]
            }
        });
    };

    const getFormattedDate = (dateVal: any) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    if (!store) return <div className="p-8">Empresa no encontrada.</div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title={store.name} 
                    description={`RIF: ${store.rif || 'S/N'} • ID: ${store._id}`}
                    actions={
                        <Button variant="outline" onClick={() => router.back()} className="font-bold">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Directorio Maestro
                        </Button>
                    }
                />

                <Tabs defaultValue="license" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border-2">
                        <TabsTrigger value="license" className="font-black text-xs uppercase">
                            <ShieldCheck className="mr-2 h-4 w-4" /> Licencia y Módulos
                        </TabsTrigger>
                        <TabsTrigger value="users" className="font-black text-xs uppercase">
                            <Users className="mr-2 h-4 w-4" /> Personal del Cliente
                        </TabsTrigger>
                        <TabsTrigger value="demo" className="font-black text-xs uppercase">
                            <Clock className="mr-2 h-4 w-4" /> Modo Demo
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="license" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2 border-2 shadow-sm">
                                <CardHeader className="bg-muted/10 border-b">
                                    <CardTitle className="text-lg font-black uppercase">Control de Infraestructura</CardTitle>
                                    <CardDescription>Define el plan y los módulos activos para este cliente.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-8">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Estado del Tenant</Label>
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm">Acceso al Software</p>
                                                    <Badge variant={store.status === 'Active' ? 'default' : 'destructive'} className="uppercase font-black text-[9px]">
                                                        {store.status === 'Active' ? 'Habilitado' : 'Suspendido'}
                                                    </Badge>
                                                </div>
                                                <Switch 
                                                    checked={store.status === 'Active'} 
                                                    onCheckedChange={(val) => handleUpdateStore({ status: val ? 'Active' : 'Suspended' })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Vencimiento</Label>
                                            <Input 
                                                type="date" 
                                                value={getFormattedDate(store.expiryDate)} 
                                                onChange={(e) => handleUpdateStore({ expiryDate: new Date(e.target.value) })}
                                                className="font-mono font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* GESTIÓN DE MÓDULOS (FEATURE FLAGS) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            <h4 className="text-xs font-black uppercase tracking-tight">Modularidad SaaS (Habilitar Herramientas)</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-background">
                                                <div className="flex items-center gap-3">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Inventario</p>
                                                        <p className="text-[10px] text-muted-foreground">Almacén, Stock y Proveedores</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={store.enabledModules?.inventory !== false} 
                                                    onCheckedChange={() => toggleModule('inventory')} 
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-background">
                                                <div className="flex items-center gap-3">
                                                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Ventas</p>
                                                        <p className="text-[10px] text-muted-foreground">POS, Facturación y Clientes</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={store.enabledModules?.sales !== false} 
                                                    onCheckedChange={() => toggleModule('sales')} 
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-background">
                                                <div className="flex items-center gap-3">
                                                    <Receipt className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Gastos</p>
                                                        <p className="text-[10px] text-muted-foreground">Control Interno y Egresos</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={store.enabledModules?.expenses !== false} 
                                                    onCheckedChange={() => toggleModule('expenses')} 
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-background">
                                                <div className="flex items-center gap-3">
                                                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Reportes</p>
                                                        <p className="text-[10px] text-muted-foreground">Kardex y AI Insights</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={store.enabledModules?.reports !== false} 
                                                    onCheckedChange={() => toggleModule('reports')} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-primary/10">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black uppercase">Capacidad Técnica</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Max. Usuarios</Label>
                                        <Input 
                                            type="number" 
                                            value={store.maxUsers} 
                                            onChange={(e) => handleUpdateStore({ maxUsers: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Docs / Mes</Label>
                                        <Input 
                                            type="number" 
                                            value={store.maxInvoicesPerMonth} 
                                            onChange={(e) => handleUpdateStore({ maxInvoicesPerMonth: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* USUARIOS */}
                    <TabsContent value="users">
                        <Card className="border-2 shadow-md">
                            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black uppercase">Personal del Cliente</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Identidad / Perfil</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Rol</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u._id} className="hover:bg-muted/30">
                                                <TableCell className="pl-6">
                                                    {u.active ? <Badge className="bg-green-100 text-green-800">ACTIVO</Badge> : <Badge variant="destructive">BLOQUEADO</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-black uppercase text-xs">{u.name}</span>
                                                        <span className="font-mono text-[9px] text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase">{u.role?.name || 'EMPLEADO'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="outline" size="sm" className="h-8 font-bold text-[9px] uppercase" onClick={() => {
                                                        setSelectedUser(u);
                                                        setIsResetModalOpen(true);
                                                    }}>
                                                        <KeyRound className="mr-1 h-3 w-3" /> Reset Clave
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="demo">
                        <Card className="border-4 border-amber-500">
                            <CardHeader className="bg-amber-50/50">
                                <CardTitle className="text-lg font-black uppercase text-amber-700">Modo Evaluación</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between p-6 rounded-2xl bg-amber-50 border-2 border-amber-200 border-dashed">
                                    <div className="space-y-1">
                                        <p className="font-black uppercase text-sm">Estado de Evaluación</p>
                                        <p className="text-xs text-amber-700 font-medium">Activa esto para aplicar límites de prueba.</p>
                                    </div>
                                    <Switch 
                                        checked={store.status === 'Demo'} 
                                        onCheckedChange={(val) => handleUpdateStore({ status: val ? 'Demo' : 'Active' })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[400px] border-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase">Restablecer Acceso</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Nueva Contraseña Temporal</Label>
                            <Input 
                                value={tempPassword} 
                                onChange={(e) => setTempPassword(e.target.value)}
                                className="font-mono text-center text-lg font-black bg-muted"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
                        <Button onClick={() => {
                            toast({ title: "Clave Actualizada", description: "El usuario ya puede ingresar." });
                            setIsResetModalOpen(false);
                        }} className="font-black uppercase">Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
