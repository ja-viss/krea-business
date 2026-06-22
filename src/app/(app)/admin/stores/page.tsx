
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Store, UserPlus, Loader2, Calendar, ShieldCheck, Settings2, Package, ShoppingCart, Receipt, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
        adminPassword: '',
        plan: 'Basic',
        enabledModules: {
            inventory: true,
            sales: true,
            expenses: true,
            reports: true
        }
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

            toast({ title: "Empresa Creada", description: "Configurada con los módulos seleccionados." });
            setIsOpen(false);
            setForm({ 
                storeName: '', adminName: '', adminUser: '', adminPassword: '', plan: 'Basic',
                enabledModules: { inventory: true, sales: true, expenses: true, reports: true } 
            });
            fetchStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setCreating(false);
        }
    };

    const toggleModule = (module: keyof typeof form.enabledModules) => {
        setForm({
            ...form,
            enabledModules: {
                ...form.enabledModules,
                [module]: !form.enabledModules[module]
            }
        });
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'Active': return <Badge className="bg-green-100 text-green-800 border-green-200">ACTIVA</Badge>;
            case 'Suspended': return <Badge variant="destructive">SUSPENDIDA</Badge>;
            case 'Demo': return <Badge variant="outline" className="bg-blue-50">DEMO</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Directorio Maestro de Empresas" 
                    description="Supervisa y controla todos los clientes de Krea Business."
                    actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-black shadow-lg">
                                    <Store className="mr-2 h-4 w-4" /> Alta de Nueva Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Nueva Empresa + Módulos SaaS</DialogTitle>
                                    <DialogDescription>Configura los datos base y selecciona qué herramientas habilitar.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-black uppercase">Nombre del Negocio</Label>
                                            <Input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} required />
                                        </div>
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-[10px] font-black uppercase">Plan Inicial</Label>
                                            <Select value={form.plan} onValueChange={v => setForm({...form, plan: v})}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Basic">BÁSICO (500 docs)</SelectItem>
                                                    <SelectItem value="Pro">PROFESIONAL (2k docs)</SelectItem>
                                                    <SelectItem value="Premium">PREMIUM (10k docs)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* SECCIÓN DE MÓDULOS MODULARES */}
                                    <div className="bg-muted/30 p-4 rounded-xl border-2 border-dashed space-y-3">
                                        <p className="text-[10px] font-black uppercase text-primary">Módulos del Sistema (Feature Flags)</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs font-bold">Inventario</span>
                                                </div>
                                                <Switch checked={form.enabledModules.inventory} onCheckedChange={() => toggleModule('inventory')} />
                                            </div>
                                            <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs font-bold">Ventas</span>
                                                </div>
                                                <Switch checked={form.enabledModules.sales} onCheckedChange={() => toggleModule('sales')} />
                                            </div>
                                            <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs font-bold">Gastos</span>
                                                </div>
                                                <Switch checked={form.enabledModules.expenses} onCheckedChange={() => toggleModule('expenses')} />
                                            </div>
                                            <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                                                <div className="flex items-center gap-2">
                                                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs font-bold">Reportes</span>
                                                </div>
                                                <Switch checked={form.enabledModules.reports} onCheckedChange={() => toggleModule('reports')} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 space-y-3">
                                        <p className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                            <UserPlus className="h-3 w-3" /> Datos del Administrador Principal
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Nombre Completo</Label>
                                                <Input value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Usuario / Email</Label>
                                                <Input value={form.adminUser} onChange={e => setForm({...form, adminUser: e.target.value})} required />
                                            </div>
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

                <Card className="border-2 shadow-md">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Cartera de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Empresa / Razón Social</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Plan Activo</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Vencimiento</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={5}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                    ))
                                ) : stores.length > 0 ? (
                                    stores.map((s) => (
                                        <TableRow key={s._id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6">{getStatusBadge(s.status || 'Active')}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black uppercase text-xs">{s.name}</span>
                                                    <span className="font-mono text-[9px] text-muted-foreground uppercase">{s._id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-black text-[9px] uppercase border-primary/30 text-primary bg-primary/5">
                                                    {s.plan || 'BASIC'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs font-medium">
                                                    <Calendar className="h-3 w-3 opacity-50" />
                                                    {format(new Date(s.expiryDate || s.createdAt), 'dd/MM/yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button asChild variant="outline" size="sm" className="font-bold text-[10px]">
                                                    <Link href={`/admin/stores/${s._id}`}>
                                                        <Settings2 className="mr-2 h-3 w-3" /> CONTROL
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No hay empresas registradas aún.</TableCell>
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
