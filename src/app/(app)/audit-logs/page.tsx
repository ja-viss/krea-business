
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    User, 
    ShieldAlert, 
    Info, 
    History,
    Search,
    Clock,
    Globe,
    ArrowRightLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterModule, setFilterModule] = useState('ALL');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/audit-logs?storeId=${storeId}`);
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = (log.userName || '').toLowerCase().includes(search.toLowerCase()) || 
                             (log.details || '').toLowerCase().includes(search.toLowerCase());
        const matchesModule = filterModule === 'ALL' || log.module === filterModule;
        return matchesSearch && matchesModule;
    });

    const getActionBadge = (action: string) => {
        if (!action) return null;
        if (action.includes('ANULADA') || action.includes('ELIMINADO')) {
            return <Badge variant="destructive" className='text-[9px] font-black uppercase'>{action}</Badge>;
        }
        if (action.includes('MODIFICADO') || action.includes('EDIT') || action.includes('CONFIG')) {
            return <Badge className='bg-amber-500 text-white text-[9px] font-black uppercase'>{action}</Badge>;
        }
        return <Badge variant="secondary" className='text-[9px] font-black uppercase'>{action}</Badge>;
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Auditoría Forense" 
                    description="Historial inmutable de cambios con trazabilidad de 'antes' y 'después'."
                />

                <div className="grid gap-6 md:grid-cols-4">
                    <Card className='border-2 shadow-sm'>
                        <CardHeader className='pb-2'><CardDescription className='text-[10px] font-bold uppercase'>Actividad Total</CardDescription></CardHeader>
                        <CardContent><div className='text-3xl font-black'>{logs.length}</div></CardContent>
                    </Card>
                    <Card className='border-2 border-red-200 bg-red-50/20'>
                        <CardHeader className='pb-2'><CardDescription className='text-[10px] font-bold uppercase text-red-700'>Acciones Críticas</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black text-red-800'>
                                {logs.filter(l => (l.action || '').includes('ANULADA') || (l.action || '').includes('ELIMINADO')).length}
                            </div>
                        </CardContent>
                    </Card>
                    <div className='md:col-span-2'>
                        <Card className='border-2 border-dashed bg-muted/20'>
                            <CardHeader className='pb-2'><CardTitle className='text-xs font-black uppercase flex items-center gap-2'><ShieldAlert className='h-4 w-4 text-primary'/> Integridad Centralizada</CardTitle></CardHeader>
                            <CardContent>
                                <p className='text-[10px] font-medium leading-relaxed italic opacity-70'>
                                    Cada entrada representa un cambio físico en la base de datos vinculado a un usuario e IP. Este registro se almacena en la Base de Datos Maestra y no puede ser alterado por administradores locales.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className='flex flex-wrap items-end gap-4 bg-muted/30 p-4 rounded-xl border-2'>
                    <div className='flex-1 min-w-[300px] space-y-2'>
                        <label className='text-[10px] font-black uppercase ml-1'>Buscador Rápido</label>
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input 
                                placeholder="Buscar por usuario o detalle de acción..." 
                                className='pl-9 bg-white font-bold h-11 border-2'
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='w-48 space-y-2'>
                        <label className='text-[10px] font-black uppercase ml-1'>Filtrar Módulo</label>
                        <Select value={filterModule} onValueChange={setFilterModule}>
                            <SelectTrigger className='bg-white font-bold h-11 border-2'><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los módulos</SelectItem>
                                <SelectItem value="Ventas">Ventas</SelectItem>
                                <SelectItem value="Inventario">Inventario</SelectItem>
                                <SelectItem value="Finanzas">Finanzas</SelectItem>
                                <SelectItem value="Configuración">Configuración</SelectItem>
                                <SelectItem value="Infraestructura">Infraestructura</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
                    <Table>
                        <TableHeader className='bg-muted/50'>
                            <TableRow>
                                <TableHead className='font-black text-[10px] uppercase pl-6 py-4'>Sello / IP</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Actor / Usuario</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Módulo</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Comando</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Detalle de Intervención</TableHead>
                                <TableHead className='w-[60px] pr-6'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className='h-12 w-full'/></TableCell></TableRow>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <TableRow key={log._id} className='hover:bg-primary/[0.02] group transition-colors border-b'>
                                        <TableCell className='pl-6 py-4'>
                                            <div className='flex flex-col'>
                                                <span className='font-bold text-[11px] flex items-center gap-1'><Clock className='h-3 w-3 opacity-40'/> {format(new Date(log.createdAt), 'dd/MM HH:mm:ss')}</span>
                                                <span className='text-[9px] font-mono opacity-50 flex items-center gap-1'><Globe className='h-2 w-2'/> {log.ipAddress}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className='flex items-center gap-2'>
                                                <div className='h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center border'><User className='h-3.5 w-3.5 text-primary' /></div>
                                                <span className='font-black uppercase text-[10px]'>{log.userName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell><span className='text-[10px] font-bold text-muted-foreground uppercase'>{log.module}</span></TableCell>
                                        <TableCell>{getActionBadge(log.action)}</TableCell>
                                        <TableCell>
                                            <p className='text-[11px] font-medium leading-tight max-w-[350px] line-clamp-2 italic'>{log.details}</p>
                                        </TableCell>
                                        <TableCell className='pr-6 text-right'>
                                            { (log.previousState || log.newState) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button className='p-2 rounded-xl bg-primary/5 hover:bg-primary/20 text-primary transition-all shadow-sm border border-primary/10'>
                                                            <History className='h-4 w-4' />
                                                        </button>
                                                    </DialogTrigger>
                                                    <DialogContent className='max-w-4xl border-[6px] border-primary/10 rounded-3xl overflow-hidden p-0'>
                                                        <div className='bg-primary p-6 text-white'>
                                                            <DialogHeader>
                                                                <DialogTitle className='text-2xl font-black uppercase flex items-center gap-3 italic tracking-tighter'>
                                                                    <ArrowRightLeft className='h-8 w-8' /> Comparativa Forense
                                                                </DialogTitle>
                                                                <DialogDescription className='text-white/70 font-bold uppercase text-[10px] tracking-widest'>
                                                                    Acción: {log.action} • Realizada por {log.userName}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                        </div>
                                                        <div className='p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white'>
                                                            <div className='space-y-3'>
                                                                <h4 className='text-[10px] font-black uppercase text-red-600 flex items-center gap-2'>
                                                                    <div className='h-2 w-2 rounded-full bg-red-600'/> Estado Anterior
                                                                </h4>
                                                                <div className='p-4 bg-red-50/50 rounded-2xl border-2 border-red-100 overflow-auto max-h-[450px] font-mono text-[11px] leading-relaxed shadow-inner'>
                                                                    {log.previousState ? (
                                                                        <pre className='text-red-900'>{JSON.stringify(log.previousState, null, 2)}</pre>
                                                                    ) : (
                                                                        <span className='italic opacity-40'>- No disponible (NUEVO REGISTRO) -</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className='space-y-3'>
                                                                <h4 className='text-[10px] font-black uppercase text-green-600 flex items-center gap-2'>
                                                                    <div className='h-2 w-2 rounded-full bg-green-600'/> Nuevo Estado
                                                                </h4>
                                                                <div className='p-4 bg-green-50/50 rounded-2xl border-2 border-green-100 overflow-auto max-h-[450px] font-mono text-[11px] leading-relaxed shadow-inner'>
                                                                    {log.newState ? (
                                                                        <pre className='text-green-900'>{JSON.stringify(log.newState, null, 2)}</pre>
                                                                    ) : (
                                                                        <span className='italic opacity-40'>- No disponible (ELIMINACIÓN) -</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className='p-4 bg-slate-50 border-t flex justify-center'>
                                                            <p className='text-[9px] font-black uppercase opacity-40 tracking-widest italic'>Rastro de Auditoría Inmutable v70.0</p>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className='h-40 text-center text-muted-foreground italic uppercase font-black opacity-20'>No hay registros en este contexto.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </main>
        </div>
    );
}
