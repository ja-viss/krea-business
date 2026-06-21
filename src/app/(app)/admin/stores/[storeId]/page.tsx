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
    Trophy
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
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
            toast({ title: "Configuración Guardada", description: "Límites y licencias actualizados." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar." });
        } finally {
            setSaving(false);
        }
    };

    const handleUserSecurity = async (userId: string, updates: any) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('No se pudo actualizar el usuario');
            
            toast({ title: "Seguridad Actualizada", description: "El acceso del usuario ha sido modificado." });
            setIsResetModalOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Error de servidor", description: err.message });
        } finally {
            setSaving(false);
        }
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
                        <TabsTrigger value="license" className="data-[state=active]:bg-background font-black text-xs uppercase">
                            <ShieldCheck className="mr-2 h-4 w-4" /> Licencia y Límites
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-background font-black text-xs uppercase">
                            <Users className="mr-2 h-4 w-4" /> Personal y Accesos
                        </TabsTrigger>
                        <TabsTrigger value="demo" className="data-[state=active]:bg-background font-black text-xs uppercase">
                            <Clock className="mr-2 h-4 w-4" /> Modo Demo
                        </TabsTrigger>
                    </TabsList>

                    {/* SECCIÓN 1: LICENCIA Y LÍMITES */}
                    <TabsContent value="license" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card className="md:col-span-2 border-2 shadow-sm">
                                <CardHeader className="bg-muted/10 border-b">
                                    <CardTitle className="text-lg font-black uppercase">Control Comercial</CardTitle>
                                    <CardDescription>Define el plan y la vigencia del servicio.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Estado del Tenant</Label>
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
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Vencimiento de Licencia</Label>
                                            <div className="flex gap-2">
                                                <Input 
                                                    type="date" 
                                                    value={format(new Date(store.expiryDate), 'yyyy-MM-dd')} 
                                                    onChange={(e) => handleUpdateStore({ expiryDate: new Date(e.target.value) })}
                                                    className="font-mono font-bold"
                                                    disabled={saving}
                                                />
                                                <Button variant="outline" size="icon" onClick={() => {
                                                    const next = new Date(store.expiryDate);
                                                    next.setMonth(next.getMonth() + 1);
                                                    handleUpdateStore({ expiryDate: next, status: 'Active' });
                                                }}>
                                                    <Calendar className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground italic">El sistema bloquea automáticamente al expirar esta fecha.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Plan de Suscripción</Label>
                                        <Select value={store.plan} onValueChange={(val) => handleUpdateStore({ plan: val })} disabled={saving}>
                                            <SelectTrigger className="h-12 font-black text-primary border-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Basic" className="font-bold">BÁSICO (Funciones Esenciales)</SelectItem>
                                                <SelectItem value="Pro" className="font-bold">PROFESIONAL (Estándar de Oro)</SelectItem>
                                                <SelectItem value="Premium" className="font-bold">PREMIUM (Todo Ilimitado)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-primary/10">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black uppercase">Capacidad Personalizada</CardTitle>
                                    <CardDescription>Sobrescribe los límites del plan.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase">
                                            <span>Max. Usuarios</span>
                                            <Badge variant="outline" className="font-mono">{store.maxUsers}</Badge>
                                        </div>
                                        <Input 
                                            type="number" 
                                            value={store.maxUsers} 
                                            onChange={(e) => setStore({...store, maxUsers: parseInt(e.target.value)})}
                                            onBlur={(e) => handleUpdateStore({ maxUsers: parseInt(e.target.value) })}
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase">
                                            <span>Docs / Mes</span>
                                            <Badge variant="outline" className="font-mono">{store.maxInvoicesPerMonth}</Badge>
                                        </div>
                                        <Input 
                                            type="number" 
                                            value={store.maxInvoicesPerMonth} 
                                            onChange={(e) => setStore({...store, maxInvoicesPerMonth: parseInt(e.target.value)})}
                                            onBlur={(e) => handleUpdateStore({ maxInvoicesPerMonth: parseInt(e.target.value) })}
                                            disabled={saving}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-primary/5 pt-4">
                                    <p className="text-[9px] text-muted-foreground leading-tight italic">
                                        * Estos límites controlan la creación de usuarios y emisión de facturas dentro de la empresa.
                                    </p>
                                </CardFooter>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* SECCIÓN 2: USUARIOS DE LA EMPRESA */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="border-2 shadow-md">
                            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Directorio de Personal del Cliente</CardTitle>
                                    <CardDescription>Audita y gestiona los accesos internos de esta sede.</CardDescription>
                                </div>
                                <Button className="font-black text-xs uppercase" onClick={() => setIsAddUserModalOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Alta de Usuario Raíz
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Identidad / Perfil</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Rol Asignado</TableHead>
                                            <TableHead className="text-right font-black text-[10px] uppercase pr-6">Seguridad</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length > 0 ? (
                                            users.map((u) => (
                                                <TableRow key={u._id} className="hover:bg-muted/30">
                                                    <TableCell className="pl-6">
                                                        {u.active ? (
                                                            <Badge className="bg-green-100 text-green-800 border-green-200">ACTIVO</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">BLOQUEADO</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-black uppercase text-xs">{u.name}</span>
                                                            <span className="font-mono text-[9px] text-muted-foreground">{u.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5">
                                                            {u.role?.name || 'EMPLEADO'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="outline" size="sm" className="h-8 font-bold text-[9px] uppercase" onClick={() => {
                                                                setSelectedUser(u);
                                                                setIsResetModalOpen(true);
                                                            }}>
                                                                <KeyRound className="mr-1 h-3 w-3" /> Reset Clave
                                                            </Button>
                                                            <Button 
                                                                variant={u.active ? "destructive" : "outline"} 
                                                                size="sm" 
                                                                className="h-8 font-bold text-[9px] uppercase"
                                                                onClick={() => handleUserSecurity(u._id, { active: !u.active })}
                                                            >
                                                                {u.active ? <Ban className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                                                                {u.active ? 'Suspender' : 'Activar'}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No hay usuarios registrados aún.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SECCIÓN 3: CONFIGURACIÓN DEMO */}
                    <TabsContent value="demo" className="space-y-6">
                        <Card className={`border-4 ${store.status === 'Demo' ? 'border-amber-500' : 'border-dashed'}`}>
                            <CardHeader className="bg-amber-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-500 rounded-xl text-white">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tighter text-amber-700">Entorno de Pruebas (Demo)</CardTitle>
                                        <CardDescription className="text-amber-600 font-bold">Configura las restricciones para cuentas de evaluación.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="flex items-center justify-between p-6 rounded-2xl bg-amber-50 border-2 border-amber-200 border-dashed">
                                    <div className="space-y-1">
                                        <p className="font-black uppercase text-sm">Estado de Evaluación</p>
                                        <p className="text-xs text-amber-700 font-medium">Activa esto para aplicar límites de prueba y avisos de expiración al cliente.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {store.status === 'Demo' && <Badge className="bg-amber-600 animate-pulse font-black uppercase">MODO DEMO ACTIVO</Badge>}
                                        <Switch 
                                            checked={store.status === 'Demo'} 
                                            onCheckedChange={(val) => handleUpdateStore({ status: val ? 'Demo' : 'Active' })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="p-4 border-2 rounded-xl space-y-4">
                                        <h4 className="font-black text-xs uppercase flex items-center gap-2"><Lock className="h-3 w-3" /> Restricciones de Prueba</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span>Límite de Catálogo</span>
                                                <span className="text-primary font-black uppercase">20 Productos Max.</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span>Facturación de Prueba</span>
                                                <span className="text-primary font-black uppercase">50 Facturas Max.</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span>Soporte Técnico</span>
                                                <span className="text-primary font-black uppercase">NIVEL 1 (Limitado)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-muted/20 border-2 border-dashed rounded-xl space-y-4">
                                        <h4 className="font-black text-xs uppercase flex items-center gap-2"><Trophy className="h-3 w-3 text-amber-500" /> Meta de Conversión</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                                            El sistema mostrará un banner constante al cliente indicando cuántos días le quedan de prueba. 
                                            Al llegar a cero, el acceso se bloquea y se le invita a contratar el **Plan Básico**.
                                        </p>
                                        <Button variant="outline" className="w-full h-8 text-[10px] font-black uppercase border-amber-300 text-amber-700">
                                            Previsualizar Aviso de Expiración
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                
                {/* ACCIONES DE SOPORTE TÉCNICO (PIE DE PÁGINA) */}
                <Card className="bg-blue-50/30 border-blue-200 border-2">
                    <CardHeader className="py-4 border-b border-blue-100 bg-blue-50">
                        <CardTitle className="text-xs font-black uppercase text-blue-800 flex items-center gap-2">
                            <Zap className="h-3 w-3 fill-blue-800" /> Consola de Emergencia Técnica
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                        <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-blue-300 hover:bg-blue-100">
                            <HardDrive className="mr-2 h-3 w-3" /> Purgar Cache de Inventario
                        </Button>
                        <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-blue-300 hover:bg-blue-100">
                            <AlertTriangle className="mr-2 h-3 w-3" /> Reset Contador Facturas
                        </Button>
                        <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-blue-300 hover:bg-blue-100">
                            <Zap className="mr-2 h-3 w-3" /> Suplantar Acceso (Soporte)
                        </Button>
                        <Button variant="outline" onClick={fetchData} className="h-10 text-[10px] font-black uppercase border-blue-300">
                            Refrescar Datos
                        </Button>
                    </CardContent>
                </Card>
            </main>

            {/* MODAL RESET CONTRASEÑA */}
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[400px] border-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-amber-500" /> Restablecer Acceso
                        </DialogTitle>
                        <DialogDescription className="font-bold">
                            Generar clave temporal para: <span className="text-primary">{selectedUser?.name}</span>
                        </DialogDescription>
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
                        <Alert variant="destructive" className="bg-amber-50 border-amber-500 text-amber-900 py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <p className="text-[10px] font-bold">Esta acción es inmediata. El usuario deberá cambiar su clave al entrar.</p>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetModalOpen(false)} className="font-bold">Cancelar</Button>
                        <Button onClick={() => handleUserSecurity(selectedUser._id, { password: tempPassword })} disabled={saving} className="font-black uppercase">
                            {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirmar Cambio
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

