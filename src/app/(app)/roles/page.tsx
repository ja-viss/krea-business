
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    ShieldCheck, 
    PlusCircle, 
    Lock, 
    Loader2, 
    Trash2, 
    CheckCircle2, 
    ShoppingCart, 
    Boxes, 
    BarChart3, 
    Users, 
    Wallet,
    Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const PERMISSIONS = [
    { id: 'manage_sales', label: 'Ventas y POS', icon: ShoppingCart },
    { id: 'manage_inventory', label: 'Inventario y Almacén', icon: Boxes },
    { id: 'manage_expenses', label: 'Gastos y Cuentas', icon: Wallet },
    { id: 'view_reports', label: 'Reportes y BI', icon: BarChart3 },
    { id: 'manage_users', label: 'Gestión de Personal', icon: Users },
];

export default function RolesManagementPage() {
    const { toast } = useToast();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [newRole, setNewRole] = useState({
        name: '',
        permissions: [] as string[]
    });

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/roles?storeId=${storeId}`);
            const data = await res.json();
            setRoles(data);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los cargos." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleCreateRole = async () => {
        if (!newRole.name || newRole.permissions.length === 0) {
            toast({ variant: 'destructive', title: "Datos Incompletos", description: "Indica un nombre para el cargo y selecciona sus permisos." });
            return;
        }

        setIsCreating(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRole, storeId })
            });

            if (!res.ok) throw new Error("Fallo al crear el cargo.");

            toast({ title: "Cargo Configurado", description: "Ya puedes asignarlo a tus empleados en el Directorio." });
            setIsOpen(false);
            setNewRole({ name: '', permissions: [] });
            fetchRoles();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setIsCreating(false);
        }
    };

    const togglePermission = (id: string) => {
        setNewRole(prev => ({
            ...prev,
            permissions: prev.permissions.includes(id)
                ? prev.permissions.filter(p => p !== id)
                : [...prev.permissions, id]
        }));
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Estructura de Cargos" 
                    description="Define los perfiles de acceso y responsabilidades de tu personal."
                    actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-black uppercase shadow-lg shadow-primary/20 h-11">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Cargo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md border-4">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Nuevo Perfil de Acceso</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nombre del Cargo (Ej: Supervisor de Turno)</Label>
                                        <Input 
                                            placeholder="Nombre descriptivo" 
                                            value={newRole.name}
                                            onChange={e => setNewRole({...newRole, name: e.target.value})}
                                            className="font-bold h-12 rounded-xl border-2"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1 ml-1">
                                            <Lock className="h-3 w-3" /> Privilegios del Cargo
                                        </Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {PERMISSIONS.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${newRole.permissions.includes(p.id) ? 'bg-primary/[0.03] border-primary/40' : 'bg-muted/10 border-transparent hover:border-muted-foreground/20'}`}
                                                    onClick={() => togglePermission(p.id)}
                                                >
                                                    <Checkbox 
                                                        id={p.id} 
                                                        checked={newRole.permissions.includes(p.id)}
                                                        onCheckedChange={() => togglePermission(p.id)}
                                                        className="h-5 w-5 rounded-md"
                                                    />
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className={`p-1.5 rounded-lg ${newRole.permissions.includes(p.id) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                            <p.icon className="h-3.5 w-3.5" />
                                                        </div>
                                                        <label htmlFor={p.id} className="text-xs font-black uppercase cursor-pointer select-none">
                                                            {p.label}
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold uppercase text-xs">Cancelar</Button>
                                    <Button onClick={handleCreateRole} disabled={isCreating} className="font-black uppercase h-12 flex-1 rounded-xl shadow-xl">
                                        {isCreating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                        Guardar Estructura
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    }
                />

                <div className="grid gap-6">
                    <Card className="border-2 shadow-xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-black uppercase flex items-center gap-2 italic tracking-tighter">
                                    <ShieldCheck className="h-5 w-5 text-primary" /> Matriz de Responsabilidades
                                </CardTitle>
                                <CardDescription className="font-bold text-[10px] uppercase">Jerarquía interna de Krea Business.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Cargo / Rol</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Tipo de Perfil</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase">Módulos Habilitados</TableHead>
                                            <TableHead className="text-right w-[100px] pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <TableRow key={i}><TableCell colSpan={4}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                            ))
                                        ) : roles.map((role) => (
                                            <TableRow key={role._id} className="hover:bg-primary/[0.02] transition-colors group">
                                                <TableCell className="pl-6 py-5">
                                                    <div className="font-black uppercase text-xs text-primary group-hover:translate-x-1 transition-transform">{role.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {role.isSystemRole || role.name === 'Administrador Principal' ? (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-black uppercase px-3">Núcleo Krea</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black uppercase px-3">Personalizado</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {role.permissions.includes('all') ? (
                                                            <Badge variant="secondary" className="text-[9px] font-black uppercase bg-primary text-white">CONTROL TOTAL DEL SISTEMA</Badge>
                                                        ) : (
                                                            role.permissions.map((p: string) => (
                                                                <Badge key={p} variant="outline" className="text-[9px] font-bold uppercase border-muted-foreground/30">
                                                                    {p.replace('manage_', '').replace('view_', '').replace('_', ' ')}
                                                                </Badge>
                                                            ))
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {(!role.isSystemRole && role.name !== 'Administrador Principal') && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-full">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-4 border-black bg-black text-white shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Seguridad de Privacidad
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-[11px] font-medium text-white/70 leading-relaxed italic">
                                    Al limitar un cargo, el empleado solo visualizará los módulos estrictamente necesarios para su operación diaria. 
                                    El sistema ocultará automáticamente el Dashboard financiero, los costos de compra y la configuración maestra para los roles de Vendedor y Almacén.
                                </p>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Badge variant="outline" className="text-white border-white/20 font-black text-[8px] uppercase">Cifrado de Permisos Activo</Badge>
                            </CardFooter>
                        </Card>

                        <Card className="border-2 border-dashed bg-muted/20">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" /> Guía Rápida
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-[10px] font-bold uppercase">Administrador: Control total.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                    <p className="text-[10px] font-bold uppercase">Vendedor: Factura, cobra y cierra caja.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                    <p className="text-[10px] font-bold uppercase">Contador: Audita, ve reportes y exporta libros.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                                    <p className="text-[10px] font-bold uppercase">Almacenista: Recibe mercancía y ajusta stock.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
