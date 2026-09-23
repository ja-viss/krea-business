
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
    Zap, 
    AlertTriangle, 
    Loader2, 
    Users, 
    ShieldCheck, 
    KeyRound, 
    Ban, 
    CheckCircle2, 
    Package,
    ShoppingCart,
    Receipt,
    BarChart3,
    Settings2,
    LogIn,
    Activity,
    HeartPulse,
    ShieldAlert,
    Trash2,
    Save
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function StoreAdminDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [store, setStore] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);
    
    // Health Check State
    const [health, setHealth] = useState<any>(null);
    const [checkingHealth, setCheckingHealth] = useState(false);

    // Modal states
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [tempPassword, setTempPassword] = useState('Krea2026*');

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

    const handleHealthCheck = async () => {
        setCheckingHealth(true);
        try {
            const res = await fetch(`/api/admin/health-check?storeId=${params.storeId}`);
            const data = await res.json();
            setHealth(data);
            toast({ title: "Diagnóstico Completado", description: `Estado de la infraestructura: ${data.status}` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Fallo de Telemetría", description: "No se pudo contactar con el nodo del cliente." });
        } finally {
            setCheckingHealth(false);
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

    const handleDeleteStore = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/stores/${params.storeId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Error al eliminar');
            
            toast({ title: "Empresa Eliminada", description: "Los datos han sido purgados del sistema." });
            router.push('/admin/stores');
        } catch (e) {
            toast({ variant: 'destructive', title: "Error Fatal", description: "No se pudo completar la purga de datos." });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleImpersonate = async (userId: string) => {
        setIsImpersonating(true);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            // Inyectar sesión de suplantación
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('storeId', data.user.store);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userRole', data.user.roleName);
            localStorage.setItem('isGlobalAdmin', 'false'); 
            localStorage.setItem('enabledModules', JSON.stringify(data.user.enabledModules));

            toast({ title: "Modo Suplantación Activo", description: `Has iniciado sesión como ${data.user.name}.` });
            router.push('/dashboard');
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Soporte", description: e.message });
            setIsImpersonating(false);
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
    if (!store) return <div className="p-8 text-center font-black">Empresa no encontrada.</div>;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title={store.name} 
                    description={`RIF: ${store.rif || 'S/N'} • ID: ${store._id}`}
                    actions={
                        <div className='flex gap-2'>
                            <Button variant="outline" onClick={handleHealthCheck} disabled={checkingHealth} className="font-bold">
                                {checkingHealth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartPulse className="mr-2 h-4 w-4 text-red-500" />}
                                Diagnóstico de Nodo
                            </Button>
                            <Button variant="outline" onClick={() => router.back()} className="font-bold">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Volver
                            </Button>
                        </div>
                    }
                />

                {health && (
                    <Card className={cn("border-2 animate-in slide-in-from-top-4 duration-500", 
                        health.status === 'Healthy' ? "border-green-500 bg-green-50/10" : "border-red-500 bg-red-50/10"
                    )}>
                        <CardHeader className='pb-2 flex flex-row items-center justify-between'>
                            <div className='flex items-center gap-2'>
                                <Activity className={cn("h-5 w-5", health.status === 'Healthy' ? "text-green-600" : "text-red-600")} />
                                <CardTitle className='text-sm font-black uppercase'>Resultado del Health Check</CardTitle>
                            </div>
                            <Badge className={cn("font-black uppercase", health.status === 'Healthy' ? "bg-green-600" : "bg-red-600")}>
                                {health.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className='grid grid-cols-2 md:grid-cols-4 gap-4 py-4'>
                            <div className='bg-white/50 p-3 rounded-xl border'>
                                <p className='text-[8px] font-black uppercase opacity-40'>Latencia DB</p>
                                <p className='text-sm font-black'>{health.metrics.latency}</p>
                            </div>
                            <div className='bg-white/50 p-3 rounded-xl border'>
                                <p className='text-[8px] font-black uppercase opacity-40'>Productos</p>
                                <p className='text-sm font-black'>{health.metrics.totalProducts}</p>
                            </div>
                            <div className='bg-white/50 p-3 rounded-xl border'>
                                <p className='text-[8px] font-black uppercase opacity-40'>Ventas (Total)</p>
                                <p className='text-sm font-black'>{health.metrics.totalSales}</p>
                            </div>
                            <div className='bg-white/50 p-3 rounded-xl border'>
                                <p className='text-[8px] font-black uppercase opacity-40'>Aislamiento</p>
                                <p className='text-sm font-black uppercase'>{health.metrics.dbType}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="license" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border-2">
                        <TabsTrigger value="license" className="font-black text-xs uppercase">
                            <ShieldCheck className="mr-2 h-4 w-4" /> Licencia y Módulos
                        </TabsTrigger>
                        <TabsTrigger value="users" className="font-black text-xs uppercase">
                            <Users className="mr-2 h-4 w-4" /> Personal y Soporte
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="license" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2 border-2 shadow-sm">
                                <CardHeader className="bg-muted/10 border-b">
                                    <CardTitle className="text-lg font-black uppercase">Control Maestro de Empresa</CardTitle>
                                    <CardDescription>Configuración de acceso y herramientas contratadas.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-8">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Estado Operativo (Kill Switch)</Label>
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm">Estado Actual</p>
                                                    <Badge variant={store.status === 'Active' ? 'default' : 'destructive'} className="uppercase font-black text-[9px]">
                                                        {store.status === 'Active' ? 'Activo' : store.status === 'Suspended' ? 'Suspendido' : 'Demo'}
                                                    </Badge>
                                                </div>
                                                <Select value={store.status} onValueChange={(val) => handleUpdateStore({ status: val })}>
                                                    <SelectTrigger className="w-[140px] font-black uppercase text-[10px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Active" className="font-bold uppercase text-[10px]">Activar</SelectItem>
                                                        <SelectItem value="Suspended" className="font-bold uppercase text-[10px]">Suspender</SelectItem>
                                                        <SelectItem value="Demo" className="font-bold uppercase text-[10px]">Demo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Vencimiento de Licencia</Label>
                                            <Input 
                                                type="date" 
                                                value={getFormattedDate(store.expiryDate)} 
                                                onChange={(e) => handleUpdateStore({ expiryDate: new Date(e.target.value) })}
                                                className="font-mono font-bold h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Settings2 className="h-4 w-4 text-primary" />
                                            <h4 className="text-xs font-black uppercase tracking-tight">Módulos Habilitados (Feature Flags)</h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between p-4 rounded-xl border-2 bg-background">
                                                <div className="flex items-center gap-3">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Inventario</p>
                                                        <p className="text-[10px] text-muted-foreground">Stock y Kardex</p>
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
                                                        <p className="text-[10px] text-muted-foreground">POS y Facturación</p>
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
                                                        <p className="text-sm font-black uppercase">Finanzas</p>
                                                        <p className="text-[10px] text-muted-foreground">Gastos y Cuentas</p>
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
                                                        <p className="text-[10px] text-muted-foreground">BI e Insights</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={store.enabledModules?.reports !== false} 
                                                    onCheckedChange={() => toggleModule('reports')} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-6 border-t">
                                        <Button 
                                            variant="destructive" 
                                            className="w-full font-black uppercase shadow-lg h-12"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="mr-2 h-5 w-5" /> Eliminar Empresa Permanentemente
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-primary/10 bg-primary/[0.02] shadow-xl h-fit">
                                <CardHeader className="bg-primary/5 border-b">
                                    <CardTitle className="text-sm font-black uppercase italic">Límites del Plan</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Plan Contratado</Label>
                                        <Badge className="w-full justify-center h-10 font-black uppercase text-sm bg-primary">{store.plan || 'BASIC'}</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Máx. Usuarios permitidos</Label>
                                        <Input 
                                            type="number" 
                                            value={store.maxUsers} 
                                            onChange={(e) => handleUpdateStore({ maxUsers: parseInt(e.target.value) || 0 })}
                                            className="font-bold h-11 border-2"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Facturas / Mes</Label>
                                        <Input 
                                            type="number" 
                                            value={store.maxInvoicesPerMonth} 
                                            onChange={(e) => handleUpdateStore({ maxInvoicesPerMonth: parseInt(e.target.value) || 0 })}
                                            className="font-bold h-11 border-2"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Límite Almacenamiento (MB)</Label>
                                        <Input 
                                            type="number" 
                                            value={store.storageLimitMB} 
                                            onChange={(e) => handleUpdateStore({ storageLimitMB: parseInt(e.target.value) || 0 })}
                                            className="font-bold h-11 border-2"
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 bg-muted/5 py-4 border-t">
                                    <p className="text-[9px] text-muted-foreground italic leading-tight text-center w-full">
                                        * Los cambios se aplican en tiempo real al motor de validación de la empresa.
                                    </p>
                                </CardFooter>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card className="border-2 shadow-xl overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black uppercase">Directorio de Cuentas Vinculadas</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase">Gestión de accesos y soporte técnico.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Estado</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Identidad / Login</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Rol</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase pr-6">Herramientas Desarrollador</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u._id} className="hover:bg-muted/30">
                                                <TableCell className="pl-6">
                                                    {u.active ? <Badge className="bg-green-100 text-green-800 font-black text-[8px]">ACTIVO</Badge> : <Badge variant="destructive" className="font-black text-[8px]">BLOQUEADO</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-black uppercase text-xs">{u.name}</span>
                                                        <span className="font-mono text-[9px] text-muted-foreground">{u.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5">{u.role?.name || 'EMPLEADO'}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6 space-x-2">
                                                    <Button 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        className="h-9 font-black text-[9px] uppercase"
                                                        onClick={() => handleImpersonate(u._id)}
                                                        disabled={isImpersonating}
                                                    >
                                                        {isImpersonating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="mr-1.5 h-3.5 w-3.5" />}
                                                        Entrar como
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-9 font-bold text-[9px] uppercase border-2" onClick={() => {
                                                        setSelectedUser(u);
                                                        setIsResetModalOpen(true);
                                                    }}>
                                                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset Clave
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[400px] border-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase">Restablecimiento Maestro</DialogTitle>
                        <DialogDescription className="font-bold">Define una clave temporal para: {selectedUser?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Contraseña Nueva</Label>
                            <Input 
                                value={tempPassword} 
                                onChange={(e) => setTempPassword(e.target.value)}
                                className="font-mono text-center text-lg font-black bg-muted h-12 border-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
                        <Button onClick={() => {
                            toast({ title: "Acceso Modificado", description: "La clave ha sido actualizada en la base de datos." });
                            setIsResetModalOpen(false);
                        }} className="font-black uppercase h-11 px-8 shadow-xl">Confirmar Cambio</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="border-4 border-red-600">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldAlert className="h-10 w-10 text-red-600" />
                            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">ELIMINACIÓN IRREVERSIBLE</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base font-bold text-foreground">
                            Estás a punto de borrar definitivamente la empresa <span className="text-red-600 font-black">"{store.name}"</span>. 
                            <br/><br/>
                            Esto eliminará todos los usuarios, productos, ventas y configuraciones vinculadas de forma inmediata y absoluta.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="font-bold uppercase">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteStore} 
                            disabled={isDeleting}
                            className="bg-red-600 font-black uppercase shadow-xl hover:bg-red-700"
                        >
                            {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirmar Borrado de Empresa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
