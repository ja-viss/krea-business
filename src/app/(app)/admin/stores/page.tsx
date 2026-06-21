'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Store, UserPlus, Loader2, Calendar, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminStoresPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const [form, setForm] = useState({
        storeName: '',
        adminName: '',
        adminUser: '',
        adminPassword: ''
    });

    const fetchStores = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/stores');
            const data = await res.json();
            setStores(data);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar las empresas." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);

            toast({ title: "Empresa Creada", description: "Se ha registrado la empresa y su administrador." });
            setIsOpen(false);
            setForm({ storeName: '', adminName: '', adminUser: '', adminPassword: '' });
            fetchStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Gestión de Empresas" 
                    description="Crea y administra los clientes (tiendas) de tu plataforma SaaS."
                    actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-bold shadow-lg">
                                    <Store className="mr-2 h-4 w-4" /> Registrar Nueva Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Nueva Empresa + Administrador</DialogTitle>
                                    <DialogDescription>Completa los datos para dar de alta una nueva empresa en el sistema.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Nombre del Negocio</Label>
                                        <Input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} placeholder="Ej: Inversiones ABC" required />
                                    </div>
                                    <div className="border-t pt-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase text-primary">Datos del Administrador Principal</p>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Nombre Completo</Label>
                                            <Input value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej: Juan Pérez" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Usuario / Email de Acceso</Label>
                                            <Input value={form.adminUser} onChange={e => setForm({...form, adminUser: e.target.value})} placeholder="juanperez" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Contraseña Inicial</Label>
                                            <Input type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} required />
                                        </div>
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button type="submit" disabled={creating} className="w-full font-black uppercase">
                                            {creating ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
                                            Activar Empresa
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    }
                />

                <Card className="border-2 shadow-sm">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Directorio de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-bold">Empresa</TableHead>
                                    <TableHead className="font-bold">ID Sistema</TableHead>
                                    <TableHead className="font-bold">Fecha de Alta</TableHead>
                                    <TableHead className="text-right font-bold pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                            <TableCell className="text-right pr-6"><div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : stores.length > 0 ? (
                                    stores.map((s) => (
                                        <TableRow key={s._id}>
                                            <TableCell className="font-black uppercase text-xs">{s.name}</TableCell>
                                            <TableCell className="font-mono text-[10px] text-muted-foreground">{s._id}</TableCell>
                                            <TableCell className="text-xs flex items-center gap-2">
                                                <Calendar className="h-3 w-3 opacity-50" />
                                                {format(new Date(s.createdAt), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button variant="outline" size="sm" className="font-bold text-[10px]">VER DETALLES</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No hay empresas registradas aún.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
