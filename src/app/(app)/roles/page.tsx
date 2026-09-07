
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, PlusCircle, Lock, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const PERMISSIONS = [
    { id: 'manage_sales', label: 'Ventas y POS' },
    { id: 'manage_inventory', label: 'Inventario y Stock' },
    { id: 'manage_expenses', label: 'Gastos y Cuentas' },
    { id: 'view_reports', label: 'Reportes e Insights' },
    { id: 'manage_users', label: 'Gestión de Personal' },
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
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los roles." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleCreateRole = async () => {
        if (!newRole.name || newRole.permissions.length === 0) {
            toast({ variant: 'destructive', title: "Faltan datos", description: "Indica un nombre y al menos un permiso." });
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

            if (!res.ok) throw new Error("Fallo al crear el rol.");

            toast({ title: "Rol Creado", description: "Ya puedes asignar este cargo a tus empleados." });
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
                    title="Roles y Permisos" 
                    description="Define los cargos de tu empresa y qué módulos pueden acceder."
                    actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-black uppercase">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cargo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md border-4">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase italic">Configurar Cargo</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nombre del Cargo (Ej: Cajero Nocturno)</Label>
                                        <Input 
                                            placeholder="Nombre descriptivo" 
                                            value={newRole.name}
                                            onChange={e => setNewRole({...newRole, name: e.target.value})}
                                            className="font-bold h-11"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase text-primary">Permisos de Acceso</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {PERMISSIONS.map(p => (
                                                <div key={p.id} className="flex items-center space-x-3 p-3 rounded-lg border-2 bg-muted/20">
                                                    <Checkbox 
                                                        id={p.id} 
                                                        checked={newRole.permissions.includes(p.id)}
                                                        onCheckedChange={() => togglePermission(p.id)}
                                                    />
                                                    <label htmlFor={p.id} className="text-xs font-black uppercase cursor-pointer flex-1">
                                                        {p.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleCreateRole} disabled={isCreating} className="font-black uppercase">
                                        {isCreating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
                                        Guardar Rol
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    }
                />

                <div className="grid gap-6">
                    <Card className="border-2 shadow-xl overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" /> Estructura Organizativa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6">Cargo / Rol</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Tipo de Rol</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Capacidades</TableHead>
                                        <TableHead className="text-right w-[100px] pr-6"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={4}><div className="h-10 bg-muted animate-pulse rounded" /></TableCell></TableRow>
                                        ))
                                    ) : roles.map((role) => (
                                        <TableRow key={role._id} className="hover:bg-primary/[0.02]">
                                            <TableCell className="pl-6 py-4">
                                                <div className="font-black uppercase text-xs">{role.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                {role.isSystemRole ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-black uppercase">Template Krea</Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black uppercase">Personalizado</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions.includes('all') ? (
                                                        <Badge variant="secondary" className="text-[9px] font-bold">ACCESO TOTAL</Badge>
                                                    ) : (
                                                        role.permissions.map((p: string) => (
                                                            <Badge key={p} variant="outline" className="text-[9px] font-medium uppercase">{p.replace('_', ' ')}</Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                {!role.isSystemRole && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-dashed bg-muted/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                <Lock className="h-4 w-4 text-amber-600" /> Seguridad de Privacidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                                Al limitar un rol, el empleado no podrá ver el Dashboard, ni los Reportes, ni acceder a la configuración del sistema. Solo visualizará los módulos estrictamente necesarios para su operación diaria (ej. POS para vendedores).
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
