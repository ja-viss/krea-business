
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
import { 
    Store, 
    UserPlus, 
    Loader2, 
    Calendar, 
    ShieldCheck, 
    Settings2, 
    Package, 
    ShoppingCart, 
    Receipt, 
    BarChart3, 
    Globe, 
    HardDrive,
    Database,
    Download,
    ArrowRightLeft,
    ShieldAlert,
    RefreshCcw,
    Zap,
    User,
    ArrowUpRight,
    Search,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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

export default function AdminStoresPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Estados para Gestión de Datos
    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<any>(null);
    const [migrationUri, setMigrationUri] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

            toast({ title: "Empresa Activada", description: "El tenant ha sido provisionado exitosamente." });
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

    const handleDeleteStore = async () => {
        if (!selectedStore) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/stores/${selectedStore._id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast({ title: "Empresa Eliminada", description: "Se ha purgado toda la información asociada." });
            setIsDeleteDialogOpen(false);
            setSelectedStore(null);
            fetchStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Fallo de Eliminación", description: e.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadBackup = async (storeId: string, storeName: string) => {
        try {
            toast({ title: "Generando Respaldo", description: "Preparando flujo de datos comprimido..." });
            const res = await fetch(`/api/admin/stores/backup?storeId=${storeId}`);
            if (!res.ok) throw new Error("No se pudo generar el backup");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_krea_${storeName.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast({ title: "Descarga Completada", description: "El archivo de datos ya está en tu equipo." });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Backup", description: e.message });
        }
    };

    const handleMigrate = async () => {
        if (!migrationUri.startsWith('mongodb')) {
            toast({ variant: 'destructive', title: "URI Inválida", description: "Debe ser una cadena de conexión MongoDB válida." });
            return;
        }

        setIsMigrating(true);
        try {
            const res = await fetch('/api/admin/stores/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storeId: selectedStore._id, 
                    newUri: migrationUri,
                    keepOriginal: true
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast({ title: "Migración Exitosa", description: "La infraestructura ha sido trasladada y vinculada." });
            setIsDataModalOpen(false);
            setMigrationUri('');
            fetchStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Fallo de Migración", description: e.message });
        } finally {
            setIsMigrating(false);
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
            case 'Maintenance': return <Badge className="bg-amber-100 text-amber-800 border-amber-300 animate-pulse">MANTENIMIENTO</Badge>;
            case 'Demo': return <Badge variant="outline" className="bg-blue-50 text-blue-700">DEMO</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredStores = stores.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.owner?.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control de Empresas" 
                    description="Supervisa el despliegue de clientes y gestiona la portabilidad de sus datos."
                    actions={
                        <div className='flex gap-2'>
                            <Button variant="outline" onClick={fetchStores} disabled={loading} className='h-11 px-4'>
                                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="font-black shadow-lg shadow-primary/20 h-11 px-6">
                                        <Store className="mr-2 h-4 w-4" /> Nueva Empresa
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto border-4">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black uppercase">Provisionar Empresa</DialogTitle>
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
                        </div>
                    }
                />

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filtrar por Empresa o Dueño..." 
                            className="pl-9 h-11 border-2 font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Badge variant="outline" className="h-11 px-4 font-black bg-primary/5 uppercase">
                        {filteredStores.length} Empresas Activas
                    </Badge>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 italic">
                            <Database className="h-5 w-5 text-primary" /> Directorio de Infraestructura y Portabilidad
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Estado</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Empresa / Razón Social</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Usuario Padre (Owner)</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Plan / Despliegue</TableHead>
                                        <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acciones Maestras</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={5}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                        ))
                                    ) : filteredStores.length > 0 ? (
                                        filteredStores.map((s) => (
                                            <TableRow key={s._id} className="hover:bg-primary/[0.02] transition-colors">
                                                <TableCell className="pl-6">{getStatusBadge(s.status || 'Active')}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-black uppercase text-xs">{s.name}</span>
                                                        <span className="font-mono text-[9px] text-muted-foreground uppercase">{s._id}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {s.owner ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                                <User className="h-4 w-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black uppercase text-[10px]">{s.owner.name}</span>
                                                                <span className="text-[9px] font-mono text-muted-foreground">{s.owner.email}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] italic text-muted-foreground">Sin owner registrado</span>
                                                    )}
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
                                                <TableCell className="text-right pr-6 space-x-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className='font-black text-[9px] uppercase h-9 border-2'
                                                        onClick={() => { setSelectedStore(s); setIsDataModalOpen(true); }}
                                                    >
                                                        <Database className="mr-1.5 h-3.5 w-3.5 text-primary" /> MIGRAR / DATA
                                                    </Button>
                                                    <Button asChild variant="ghost" size="icon" className='h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary'>
                                                        <Link href={`/admin/stores/${s._id}`}>
                                                            <Settings2 className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className='h-9 w-9 rounded-full text-red-300 hover:text-red-600 hover:bg-red-50'
                                                        onClick={() => { setSelectedStore(s); setIsDeleteDialogOpen(true); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">No se encontraron empresas registradas.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* MODAL DE GESTIÓN DE DATOS AVANZADO */}
            <Dialog open={isDataModalOpen} onOpenChange={setIsDataModalOpen}>
                <DialogContent className='sm:max-w-[550px] border-4 border-primary p-0 overflow-hidden rounded-3xl'>
                    <div className='bg-primary p-6 text-white'>
                        <DialogHeader>
                            <DialogTitle className='text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3'>
                                <Database className='h-7 w-7' /> Centro de Datos Maestra
                            </DialogTitle>
                            <DialogDescription className='text-white/80 font-bold text-xs uppercase tracking-widest'>
                                Empresa: {selectedStore?.name} • Owner: {selectedStore?.owner?.name || 'S/N'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className='p-6 space-y-8'>
                        {/* SECCIÓN 1: PORTABILIDAD (DOWNLOAD) */}
                        <div className='space-y-4'>
                            <div className='flex items-center gap-2 text-[11px] font-black uppercase text-slate-500'>
                                <Download className='h-4 w-4' /> Portabilidad de Datos (Descarga)
                            </div>
                            <div className='p-5 bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center gap-4 text-center'>
                                <p className='text-[10px] font-bold text-muted-foreground leading-relaxed italic px-4 uppercase'>
                                    Extrae el lote completo de documentos (Ventas, Stock, Gastos) en formato JSON estructurado para portabilidad inmediata.
                                </p>
                                <Button 
                                    className='w-full h-14 font-black uppercase bg-white text-primary border-2 border-primary/20 hover:bg-primary hover:text-white transition-all shadow-lg'
                                    onClick={() => handleDownloadBackup(selectedStore._id, selectedStore.name)}
                                >
                                    <Download className='mr-2 h-5 w-5' /> Descargar Base de Datos (.json)
                                </Button>
                            </div>
                        </div>

                        <Separator className='border-2' />

                        {/* SECCIÓN 2: MIGRACIÓN DE CLÚSTER (UPLOAD/LOAD) */}
                        <div className='space-y-4'>
                            <div className='flex items-center gap-2 text-[11px] font-black uppercase text-amber-600'>
                                <ArrowRightLeft className='h-4 w-4' /> Migración de Carga (DB Externa)
                            </div>
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase ml-1 flex items-center gap-2'>
                                        <Zap className='h-3 w-3 text-amber-500' /> URI de Conexión Destino (Target)
                                    </Label>
                                    <Input 
                                        placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname" 
                                        className='font-mono text-xs h-14 border-2 focus:ring-4 focus:ring-amber-500/20'
                                        value={migrationUri}
                                        onChange={e => setMigrationUri(e.target.value)}
                                    />
                                    <p className='text-[8px] font-bold text-slate-400 italic px-1'>
                                        Esta acción moverá físicamente los datos desde el clúster central hacia el clúster dedicado del cliente.
                                    </p>
                                </div>

                                <div className='p-4 bg-amber-50 border-2 border-amber-200 border-dashed rounded-2xl flex items-start gap-3'>
                                    <ShieldAlert className='h-6 w-6 text-amber-600 shrink-0 mt-0.5' />
                                    <div className='space-y-1'>
                                        <p className='text-[10px] font-black text-amber-800 uppercase leading-tight'>
                                            PROTOCOLO DE MANTENIMIENTO ACTIVO
                                        </p>
                                        <p className='text-[9px] font-bold text-amber-700 leading-tight'>
                                            La empresa será bloqueada durante la transferencia. Se copiarán esquemas, índices y documentos de forma íntegra.
                                        </p>
                                    </div>
                                </div>

                                <Button 
                                    className='w-full h-16 font-black uppercase bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-200 rounded-2xl text-lg group'
                                    disabled={isMigrating || !migrationUri}
                                    onClick={handleMigrate}
                                >
                                    {isMigrating ? <Loader2 className='mr-2 h-6 w-6 animate-spin' /> : <Zap className='mr-2 h-6 w-6 group-hover:scale-125 transition-transform' />}
                                    {isMigrating ? 'MIGRANDO CARGA...' : 'CARGAR A DB DEDICADA'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className='p-6 bg-slate-50 border-t'>
                        <Button variant="ghost" className='font-black uppercase text-[10px]' onClick={() => setIsDataModalOpen(false)}>Cerrar Consola</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIÁLOGO DE ELIMINACIÓN CRÍTICA */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="border-4 border-red-500">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AlertCircle className="h-8 w-8" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">ELIMINACIÓN TOTAL</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base font-bold text-foreground">
                            Estás a punto de borrar la empresa <span className="text-red-600 uppercase font-black">"{selectedStore?.name}"</span>. 
                            <br/><br/>
                            Esta acción es <span className="underline">irreversible</span> y resultará en la eliminación de:
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm font-medium italic">
                                <li>Todos los usuarios y credenciales vinculadas.</li>
                                <li>Todo el catálogo de productos e inventario.</li>
                                <li>Historial completo de ventas y facturación.</li>
                                <li>Configuraciones fiscales y registros de auditoría.</li>
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="font-bold uppercase">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteStore} 
                            disabled={isDeleting}
                            className="bg-red-600 font-black uppercase shadow-xl hover:bg-red-700"
                        >
                            {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Confirmar Borrado Absoluto
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
