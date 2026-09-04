
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
    Search
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

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
        const matchesSearch = log.userName.toLowerCase().includes(search.toLowerCase()) || 
                             log.details.toLowerCase().includes(search.toLowerCase());
        const matchesModule = filterModule === 'ALL' || log.module === filterModule;
        return matchesSearch && matchesModule;
    });

    const getActionBadge = (action: string) => {
        if (action.includes('ANULADA') || action.includes('ELIMINADO')) {
            return <Badge variant="destructive" className='text-[9px] font-black uppercase'>{action}</Badge>;
        }
        if (action.includes('MODIFICADO') || action.includes('CONFIG')) {
            return <Badge className='bg-amber-500 text-white text-[9px] font-black uppercase'>{action}</Badge>;
        }
        return <Badge variant="secondary" className='text-[9px] font-black uppercase'>{action}</Badge>;
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Auditoría de Operaciones" 
                    description="Historial inmutable de acciones críticas realizadas por el personal."
                />

                <div className="grid gap-6 md:grid-cols-4">
                    <Card className='border-2 shadow-sm'>
                        <CardHeader className='pb-2'><CardDescription className='text-[10px] font-bold uppercase'>Acciones Hoy</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black'>{logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length}</div>
                        </CardContent>
                    </Card>
                    <Card className='border-2 border-red-200 bg-red-50/20'>
                        <CardHeader className='pb-2'><CardDescription className='text-[10px] font-bold uppercase text-red-700'>Acciones Críticas</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-3xl font-black text-red-800'>
                                {logs.filter(l => l.action.includes('ANULADA') || l.action.includes('ELIMINADO')).length}
                            </div>
                        </CardContent>
                    </Card>
                    <div className='md:col-span-2'>
                        <Card className='border-2 border-dashed bg-muted/20'>
                            <CardHeader className='pb-2'><CardTitle className='text-xs font-black uppercase flex items-center gap-2'><ShieldAlert className='h-4 w-4 text-primary'/> Integridad de Datos</CardTitle></CardHeader>
                            <CardContent>
                                <p className='text-[10px] font-medium leading-relaxed italic opacity-70'>
                                    Este registro es de solo-lectura y no puede ser alterado. Cada entrada representa un cambio físico en la base de datos vinculado a un usuario e IP.
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
                                className='pl-9 bg-white'
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className='w-48 space-y-2'>
                        <label className='text-[10px] font-black uppercase ml-1'>Módulo</label>
                        <Select value={filterModule} onValueChange={setFilterModule}>
                            <SelectTrigger className='bg-white'><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los módulos</SelectItem>
                                <SelectItem value="Ventas">Ventas</SelectItem>
                                <SelectItem value="Inventario">Inventario</SelectItem>
                                <SelectItem value="Configuración">Configuración</SelectItem>
                                <SelectItem value="Seguridad">Seguridad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-xl border-2 bg-card shadow-lg overflow-hidden">
                    <Table>
                        <TableHeader className='bg-muted/50'>
                            <TableRow>
                                <TableHead className='font-black text-[10px] uppercase pl-6'>Fecha / IP</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Actor / Usuario</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Módulo</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Acción Ejecutada</TableHead>
                                <TableHead className='font-black text-[10px] uppercase'>Detalles del Evento</TableHead>
                                <TableHead className='w-[40px] pr-6'></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className='pl-6'><Skeleton className='h-4 w-24'/><Skeleton className='h-3 w-16 mt-1'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-32'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-20'/></TableCell>
                                        <TableCell><Skeleton className='h-6 w-24 rounded-full'/></TableCell>
                                        <TableCell><Skeleton className='h-4 w-full'/></TableCell>
                                        <TableCell className='pr-6'><Skeleton className='h-8 w-8 ml-auto'/></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <TableRow key={log._id} className='hover:bg-muted/30 group transition-colors'>
                                        <TableCell className='pl-6'>
                                            <div className='flex flex-col'>
                                                <span className='font-bold text-[11px] whitespace-nowrap'>{format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss')}</span>
                                                <span className='text-[9px] font-mono opacity-50'>{log.ipAddress}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className='flex items-center gap-2'>
                                                <User className='h-3 w-3 text-muted-foreground' />
                                                <span className='font-black uppercase text-[10px]'>{log.userName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className='text-[10px] font-bold text-muted-foreground uppercase'>{log.module}</span>
                                        </TableCell>
                                        <TableCell>{getActionBadge(log.action)}</TableCell>
                                        <TableCell>
                                            <p className='text-[11px] font-medium leading-tight max-w-[400px]'>{log.details}</p>
                                        </TableCell>
                                        <TableCell className='pr-6 text-right'>
                                            { (log.previousState || log.newState) && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <button className='p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors'>
                                                            <History className='h-4 w-4' />
                                                        </button>
                                                    </DialogTrigger>
                                                    <DialogContent className='max-w-2xl border-4'>
                                                        <DialogHeader>
                                                            <DialogTitle className='font-black uppercase flex items-center gap-2'>
                                                                <Info className='h-5 w-5 text-primary' /> Comparativa de Valores
                                                            </DialogTitle>
                                                            <DialogDescription>Cambios técnicos detectados en la base de datos.</DialogDescription>
                                                        </DialogHeader>
                                                        <div className='grid grid-cols-2 gap-4 mt-4'>
                                                            <div className='space-y-2'>
                                                                <h4 className='text-[10px] font-black uppercase text-muted-foreground'>Estado Previo</h4>
                                                                <pre className='p-3 bg-muted rounded-lg text-[10px] overflow-auto max-h-[300px] border-2 border-dashed'>
                                                                    {JSON.stringify(log.previousState, null, 2)}
                                                                </pre>
                                                            </div>
                                                            <div className='space-y-2'>
                                                                <h4 className='text-[10px] font-black uppercase text-primary'>Nuevo Estado</h4>
                                                                <pre className='p-3 bg-primary/5 rounded-lg text-[10px] overflow-auto max-h-[300px] border-2 border-primary/20'>
                                                                    {JSON.stringify(log.newState, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className='h-40 text-center text-muted-foreground italic'>No hay registros de auditoría que coincidan con los filtros.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}
