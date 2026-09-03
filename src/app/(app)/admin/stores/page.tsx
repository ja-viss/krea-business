
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
import { Store, UserPlus, Loader2, Calendar, ShieldCheck, Settings2, Package, ShoppingCart, Receipt, BarChart3, Globe, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
        deploymentMode: 'Online',
        tenantDbUri: '',
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
            toast({ variant: 'destructive', title: "Error", description: "Fallo al cargar empresas." });
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

            toast({ title: "Tenant Activado", description: "La empresa ha sido provisionada exitosamente." });
            setIsOpen(false);
            setForm({ 
                storeName: '', adminName: '', adminUser: '', adminPassword: '', plan: 'Basic',
                deploymentMode: 'Online', tenantDbUri: '',
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
            case 'Demo': return <Badge variant="outline" className="bg-blue-50 text-blue-700">DEMO</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control de Infraestructura" 
                    description="Supervisa y gestiona todos los inquilinos de la plataforma."
                    actions={
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="font-black shadow-lg shadow-primary/20">
                                    <Store className="mr-2 h-4 w-4" /> Nueva Empresa
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto border-4">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase">Provisionar Tenant</DialogTitle>
                                    <DialogDescription className="font-bold">Define la modalidad y capacidades del nuevo cliente.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-6 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black uppercase">Razón Social</Label>
                                            <Input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} required />
                                        </div>
                                        
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-[10px] font-black uppercase">Modalidad de Despliegue</Label>
                                            <RadioGroup 
                                                value={form.deploymentMode} 
                                                onValueChange={v => setForm({...form, deploymentMode: v})}
                                                className="grid grid-cols-2 gap-3"
                                            >
                                                <div className={`flex items-center space-x-2 rounded-lg p-3 border-2 transition-all ${form.deploymentMode === 'Online' ? 'bg-primary/5 border-primary' : 'border-muted'}`}>
                                                    <RadioGroupItem value="Online" id="mode-online" />
                                                    <Label htmlFor="mode-online" className="font-bold flex items-center gap-2 cursor-pointer">
                                                        <Globe className="h-4 w-4" /> Cloud (Atlas)
                                                    </Label>
                                                </div>
                                                <div className={`flex items-center space-x-2 rounded-lg p-3 border-2 transition-all ${form.deploymentMode === 'Offline' ? 'bg-amber-50 border-amber-500' : 'border-muted'}`}>
                                                    <RadioGroupItem value="Offline" id="mode-offline" />
                                                    <Label htmlFor="mode-offline" className="font-bold flex items-center gap-2 cursor-pointer">
                                                        <HardDrive className="h-4 w-4" /> Local (Node.js)
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {form.deploymentMode === 'Online' && (
                                            <div className="space-y-2 col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-[10px] font-black uppercase text-primary">URI MongoDB (Atlas)</Label>
                                                <Input 
                                                    placeholder="mongodb+srv://..." 
                                                    value={form.tenantDbUri}
                                                    onChange={e => setForm({...form, tenantDbUri: e.target.value})}
                                                    required
                                                    className="font-mono text-xs"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Plan</Label>
                                            <Select value={form.plan} onValueChange={v => setForm({...form, plan: v})}>
                                                <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Basic">Pequeño (500 docs)</SelectItem>
                                                    <SelectItem value="Pro">Mediano (2k docs)</SelectItem>
                                                    <SelectItem value="Premium">Grande (10k docs)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 p-4 rounded-xl border-2 border-dashed space-y-3">
                                        <p className="text-[10px] font-black uppercase text-primary">Módulos Habilitados</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'inventory', label: 'Inventario', icon: Package },
                                                { id: 'sales', label: 'Ventas', icon: ShoppingCart },
                                                { id: 'expenses', label: 'Finanzas', icon: Receipt },
                                                { id: 'reports', label: 'Reportes', icon: BarChart3 },
                                            ].map((m) => (
                                                <div key={m.id} className="flex items-center justify-between p-2 bg-background rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-[11px] font-bold uppercase">{m.label}</span>
                                                    </div>
                                                    <Switch checked={(form.enabledModules as any)[m.id]} onCheckedChange={() => toggleModule(m.id as any)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 space-y-4">
                                        <p className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                                            <UserPlus className="h-3 w-3" /> Credenciales Administrador
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase">Nombre</Label>
                                                <Input value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase">Usuario</Label>
                                                <Input value={form.adminUser} onChange={e => setForm({...form, adminUser: e.target.value})} required className="font-mono" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase">Password Inicial</Label>
                                            <Input type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} required />
                                        </div>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button type="submit" disabled={creating} className="w-full font-black uppercase h-12">
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
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Estado</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Empresa</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Plan / Despliegue</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Vencimiento</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Control</TableHead>
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
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit font-black text-[9px] uppercase border-primary/30 text-primary bg-primary/5">
                                                        {s.plan || 'BASIC'}
                                                    </Badge>
                                                    <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                                        {s.deploymentMode === 'Offline' ? <HardDrive className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                                                        {s.deploymentMode || 'Online'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                                    <Calendar className="h-3 w-3 opacity-50" />
                                                    {format(new Date(s.expiryDate || s.createdAt), 'dd/MM/yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button asChild variant="outline" size="sm" className="font-black text-[9px] h-8">
                                                    <Link href={`/admin/stores/${s._id}`}>
                                                        <Settings2 className="mr-1.5 h-3 w-3" /> GESTIONAR
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No hay empresas registradas.</TableCell>
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
