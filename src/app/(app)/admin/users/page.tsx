'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
    Search, 
    MoreHorizontal, 
    ShieldAlert, 
    UserCog, 
    KeyRound, 
    Store, 
    Loader2, 
    CheckCircle2, 
    Ban, 
    ShieldCheck 
} from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger, 
    DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';

export default function GlobalUsersManagementPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(false);
    
    // Modal State
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/users?storeId=SYSTEM_MASTER');
            if (!response.ok) throw new Error('Error al cargar usuarios globales');
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Error", description: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateUser = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUser._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    active: selectedUser.active,
                    password: newPassword || undefined
                })
            });

            if (!res.ok) throw new Error('No se pudo actualizar el usuario');

            toast({ title: "Cambios guardados", description: "Los permisos y acceso del usuario han sido actualizados." });
            setIsEditModalOpen(false);
            setNewPassword('');
            fetchUsers();
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Error de servidor", description: err.message });
        } finally {
            setUpdating(false);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.store?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control Maestro de Usuarios" 
                    description="Supervisa y gestiona los accesos de todos los administradores y empleados de la red Krea."
                />

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre, email o empresa..." 
                            className="pl-10 font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Badge variant="outline" className="h-10 px-4 font-black bg-primary/5 border-primary/20">
                        {users.length} USUARIOS REGISTRADOS
                    </Badge>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Directorio de Personal del Sistema
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Identidad / Perfil</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Empresa / Cliente</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Rol Asignado</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="pl-6"><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                                                <TableCell><div className="flex gap-2 items-center"><div className="h-8 w-8 bg-muted rounded-full animate-pulse" /><div className="h-4 w-32 bg-muted animate-pulse rounded" /></div></TableCell>
                                                <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                                <TableCell className="text-right pr-6"><div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : filteredUsers.length > 0 ? (
                                        filteredUsers.map((u) => (
                                            <TableRow key={u._id} className="hover:bg-muted/30 group">
                                                <TableCell className="pl-6">
                                                    {u.active ? (
                                                        <Badge className="bg-green-100 text-green-800 border-green-200">ACTIVO</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">BLOQUEADO</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 border-2 border-primary/10">
                                                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black uppercase">
                                                                {u.name.slice(0, 2)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-black uppercase text-xs">{u.name}</span>
                                                            <span className="font-mono text-[10px] text-muted-foreground">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-bold text-[11px] text-muted-foreground uppercase">
                                                        <Store className="h-3 w-3 opacity-50 text-primary" />
                                                        {u.store?.name || 'SOPORTE MAESTRO'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5">
                                                        {u.role?.name || 'SIN ROL'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedUser(u);
                                                                setIsEditModalOpen(true);
                                                            }} className="font-bold text-xs uppercase cursor-pointer">
                                                                <UserCog className="mr-2 h-4 w-4" /> Gestionar Acceso
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 font-bold text-xs uppercase cursor-pointer" onClick={() => {
                                                                setSelectedUser({...u, active: !u.active});
                                                                // Trigger quick toggle
                                                                setTimeout(() => handleUpdateUser(), 100);
                                                            }}>
                                                                {u.active ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                                                {u.active ? 'Suspender Usuario' : 'Activar Usuario'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                                No se encontraron usuarios que coincidan con la búsqueda.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* MODAL DE EDICIÓN Y SEGURIDAD */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-[400px] border-4 border-primary/20">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                                <ShieldAlert className="h-6 w-6 text-amber-500" />
                                Panel de Seguridad
                            </DialogTitle>
                            <DialogDescription className="font-bold">
                                Modificando el acceso para: <span className="text-primary uppercase">{selectedUser?.name}</span>
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border-2 border-dashed">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-black uppercase">Estado del Acceso</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">Permitir entrada al sistema</p>
                                </div>
                                <Switch 
                                    checked={selectedUser?.active} 
                                    onCheckedChange={(val) => setSelectedUser({...selectedUser, active: val})}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase flex items-center gap-2">
                                    <KeyRound className="h-3 w-3 text-primary" />
                                    Cambiar Contraseña (Reset Forzado)
                                </Label>
                                <Input 
                                    type="password" 
                                    placeholder="Nueva clave (mín. 6 caracteres)" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="font-mono text-center font-bold"
                                />
                                <p className="text-[9px] text-muted-foreground italic">Deja en blanco si no deseas cambiarla.</p>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="font-bold">CANCELAR</Button>
                            <Button onClick={handleUpdateUser} disabled={updating} className="font-black uppercase shadow-lg">
                                {updating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                GUARDAR CONFIGURACIÓN
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
