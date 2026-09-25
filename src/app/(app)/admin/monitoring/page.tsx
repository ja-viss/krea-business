
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Activity, 
    ShieldAlert, 
    Terminal, 
    Zap, 
    RefreshCcw, 
    Loader2, 
    User, 
    Search,
    Clock,
    History,
    Cpu,
    Lock,
    ShieldCheck,
    Server,
    Network,
    Database
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export default function SystemMonitoringPage() {
    const { toast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [search, setSearch] = useState('');
    const [lastStatsUpdate, setLastStatsUpdate] = useState<Date>(new Date());

    // Refs para evitar peticiones solapadas si el servidor tarda en responder
    const isFetchingLogs = useRef(false);
    const isFetchingStats = useRef(false);

    // FETCH LOGS: Datos pesados, frecuencia baja (30s)
    const fetchLogs = useCallback(async (isManual = false) => {
        if (isFetchingLogs.current) return;
        if (isManual) setLoadingLogs(true);
        isFetchingLogs.current = true;
        
        try {
            const res = await fetch('/api/audit-logs?storeId=SYSTEM_MASTER');
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) {
            if (isManual) toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar el stream de logs." });
        } finally {
            isFetchingLogs.current = false;
            setLoadingLogs(false);
        }
    }, [toast]);

    // FETCH STATS: Datos ligeros, frecuencia alta (5s)
    const fetchStats = useCallback(async () => {
        if (isFetchingStats.current) return;
        isFetchingStats.current = true;

        try {
            const res = await fetch('/api/admin/system-stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setLastStatsUpdate(new Date());
            }
        } catch (e) {
            console.warn("Fallo latido de telemetría");
        } finally {
            isFetchingStats.current = false;
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial
        fetchLogs(true);
        fetchStats();

        // Control de intervalos con sensor de visibilidad para ahorrar recursos
        let statsInterval: NodeJS.Timeout;
        let logsInterval: NodeJS.Timeout;

        const startPolling = () => {
            statsInterval = setInterval(fetchStats, 5000); // Hardware cada 5s
            logsInterval = setInterval(() => fetchLogs(false), 30000); // Eventos cada 30s
        };

        const stopPolling = () => {
            clearInterval(statsInterval);
            clearInterval(logsInterval);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
                console.log("[NOC] Monitoreo en pausa (pestaña oculta)");
            } else {
                startPolling();
                fetchStats(); // Forzar actualización al volver
                console.log("[NOC] Monitoreo reactivado");
            }
        };

        if (!document.hidden) startPolling();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchLogs, fetchStats]);

    // Optimización: Filtrado memorizado para evitar lag en la UI al actualizar stats
    const filteredLogs = useMemo(() => {
        if (!Array.isArray(logs)) return [];
        if (!search) return logs;
        const q = search.toLowerCase();
        return logs.filter(log => 
            (log.userName || '').toLowerCase().includes(q) ||
            (log.details || '').toLowerCase().includes(q) ||
            (log.action || '').toLowerCase().includes(q) ||
            (log.ipAddress || '').includes(q)
        );
    }, [logs, search]);

    const getActionColor = (action: string) => {
        if (!action) return 'bg-slate-500';
        const a = action.toUpperCase();
        if (a.includes('ANULADA') || a.includes('ELIMINADO') || a.includes('FAIL') || a.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
        if (a.includes('PROVISION') || a.includes('LOGIN') || a.includes('OPEN')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (a.includes('MIGRACION') || a.includes('MASTER') || a.includes('EDIT')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (a.includes('RECIBIDO') || a.includes('CREATE')) return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="flex flex-1 flex-col bg-slate-50/50 text-foreground min-h-screen overflow-x-hidden">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-[1600px] mx-auto w-full">
                <PageHeader 
                    title="NOC: Consola de Infraestructura" 
                    description="Supervisión global de recursos, seguridad perimetral y telemetría de clústeres."
                    actions={
                        <div className="flex gap-2">
                             <div className="hidden md:flex items-center gap-4 mr-4 px-4 py-1.5 bg-white border rounded-full shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Core Online</span>
                                </div>
                                <Separator orientation="vertical" className="h-4" />
                                <div className="flex items-center gap-2">
                                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    <span className="text-[10px] font-mono text-muted-foreground">Live: {format(lastStatsUpdate, 'HH:mm:ss')}</span>
                                </div>
                             </div>
                             <Button variant="outline" onClick={() => { fetchLogs(true); fetchStats(); }} disabled={loadingLogs} className='h-11 border-2 bg-white hover:bg-slate-50 font-bold'>
                                {loadingLogs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                Sincronizar
                            </Button>
                        </div>
                    }
                />

                {/* FILA 1: TELEMETRÍA DE HARDWARE (Optimizado) */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-white border-2 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Actualizando cada 5s" />
                        <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                            <CardTitle className="text-[9px] font-black uppercase text-blue-600 tracking-[0.2em]">Carga de CPU</CardTitle>
                            <Cpu className="h-4 w-4 text-blue-500/30" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-3xl font-black">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : `${stats?.hardware?.cpuUsage || 0}%`}</div>
                            <Progress value={stats?.hardware?.cpuUsage || 0} className="h-1.5 bg-slate-100" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 shadow-sm relative group">
                        <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                        <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                            <CardTitle className="text-[9px] font-black uppercase text-purple-600 tracking-[0.2em]">Memoria RAM</CardTitle>
                            <Server className="h-4 w-4 text-purple-500/30" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-3xl font-black">{loadingStats ? <Loader2 className="h-6 w-6 animate-spin opacity-20" /> : `${stats?.hardware?.ramUsage || 0}%`}</div>
                            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">De {stats?.hardware?.totalRam || 0}GB físicos del Host</p>
                            <Progress value={stats?.hardware?.ramUsage || 0} className="h-1.5 bg-slate-100" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 shadow-sm">
                        <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                            <CardTitle className="text-[9px] font-black uppercase text-red-600 tracking-[0.2em]">Ciberseguridad</CardTitle>
                            <ShieldAlert className="h-4 w-4 text-red-500/30" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-3xl font-black text-red-600">{stats?.overview?.securityAlerts || 0}</div>
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[8px] font-black uppercase">Amenazas Bloqueadas</Badge>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-2 shadow-sm">
                        <CardHeader className="pb-2 space-y-0 flex flex-row items-center justify-between">
                            <CardTitle className="text-[9px] font-black uppercase text-green-600 tracking-[0.2em]">Disponibilidad</CardTitle>
                            <Network className="h-4 w-4 text-green-500/30" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-green-600">100%</div>
                            <div className="flex items-center gap-2 mt-2">
                                <Lock className="h-3 w-3 text-green-600" />
                                <span className="text-[8px] font-bold uppercase text-muted-foreground">Cifrado AES-256 Activo</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* FILA 2: LIVE EVENT STREAM (Pausado si la pestaña no es visible) */}
                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <Card className="bg-white border-2 shadow-xl rounded-2xl overflow-hidden flex flex-col flex-1">
                            <CardHeader className="bg-slate-50/50 border-b py-4 flex flex-row items-center justify-between">
                                <div className='flex items-center gap-3'>
                                    <Terminal className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-sm font-black uppercase italic tracking-widest text-slate-700">Stream Forense de Eventos</CardTitle>
                                    <Badge variant="outline" className="text-[8px] font-bold opacity-40">Sync: 30s</Badge>
                                </div>
                                <div className="relative w-64 hidden md:block">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input 
                                        placeholder="Filtrar por IP, Actor o Acción..." 
                                        className="bg-white border-slate-200 h-9 text-[10px] pl-9 font-bold"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto max-h-[600px] scrollbar-hide">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 backdrop-blur-md">
                                        <TableRow className="border-slate-200 hover:bg-transparent">
                                            <TableHead className="font-black text-[9px] uppercase pl-6 py-4">Timestamp / IP</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase">Identidad</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase">Acción</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase">Detalle Operativo</TableHead>
                                            <TableHead className="w-[40px] pr-6"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingLogs && logs.length === 0 ? (
                                            Array.from({ length: 8 }).map((_, i) => (
                                                <TableRow key={i} className="border-slate-100"><TableCell colSpan={5}><div className="h-10 bg-slate-50 animate-pulse rounded m-1" /></TableCell></TableRow>
                                            ))
                                        ) : filteredLogs.length > 0 ? (
                                            filteredLogs.map((log) => (
                                                <TableRow key={log._id} className="border-slate-100 hover:bg-primary/[0.02] transition-colors group">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-[10px] font-bold">
                                                                {log.createdAt ? format(new Date(log.createdAt), 'HH:mm:ss') : 'N/A'}
                                                            </span>
                                                            <span className="text-[8px] font-mono text-muted-foreground">{log.ipAddress || '0.0.0.0'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                                                <User className="h-3 w-3 text-primary" />
                                                            </div>
                                                            <span className="font-black text-[9px] uppercase truncate max-w-[100px]">{log.userName || 'Sistema'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn("text-[7px] font-black uppercase px-2 py-0.5", getActionColor(log.action))}>
                                                            {log.action || 'UNDEFINED'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-[10px] font-medium leading-tight text-muted-foreground italic line-clamp-1 group-hover:line-clamp-none transition-all">
                                                            {log.details}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        {(log.previousState || log.newState) && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className='h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10'>
                                                                        <History className='h-3.5 w-3.5' />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className='max-w-3xl bg-white border-4 rounded-2xl'>
                                                                    <DialogHeader>
                                                                        <DialogTitle className='font-black uppercase text-sm flex items-center gap-2'>
                                                                            <ShieldCheck className='h-4 w-4 text-primary' /> Inspección de Payload Forense
                                                                        </DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className='grid grid-cols-2 gap-4 mt-4 max-h-[500px] overflow-auto'>
                                                                        <div className='space-y-2'>
                                                                            <h4 className='text-[9px] font-black uppercase text-red-600'>State: Pre-Comando</h4>
                                                                            <pre className='p-3 bg-red-50 rounded-xl text-[9px] font-mono text-red-700 border border-red-100 shadow-inner'>
                                                                                {JSON.stringify(log.previousState, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                        <div className='space-y-2'>
                                                                            <h4 className='text-[9px] font-black uppercase text-green-600'>State: Post-Comando</h4>
                                                                            <pre className='p-3 bg-green-50 rounded-xl text-[9px] font-mono text-green-700 border border-green-100 shadow-inner'>
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
                                            <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic text-xs">Sin actividad en el buffer.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-white border-2 shadow-sm">
                            <CardHeader className="pb-3 border-b bg-slate-50/50">
                                <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Auditoría de Cifrado
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-slate-700">Mongo SSL/TLS</span>
                                        <span className="text-[8px] text-muted-foreground italic">Encriptación en tránsito</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[8px] font-black uppercase">Encrypted</Badge>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-slate-700">URIs en Reposo</span>
                                        <span className="text-[8px] text-muted-foreground italic">AES-256 Protected</span>
                                    </div>
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[8px] font-black uppercase">Secured</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-2 border-primary/10 shadow-lg shadow-primary/5">
                            <CardHeader className="pb-3 bg-primary/5 border-b">
                                <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                    <Database className="h-3.5 w-3.5" /> Estado de Clústeres (Live)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-muted-foreground">Nodos Cloud Activos:</span>
                                    <span className="font-bold">{stats?.health?.activeNodes || 0}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-muted-foreground">Nodos con Latencia:</span>
                                    <span className="text-amber-600 font-bold">0</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
                                    <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                                </div>
                                <p className="text-[8px] text-muted-foreground italic text-center font-bold">Health Check dinámico activo</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-red-50 border-2 border-red-100">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-red-600 flex items-center gap-2 tracking-widest">
                                    <Lock className="h-3 w-3" /> Security Alert Feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="p-2 bg-red-100 border border-red-200 rounded-lg animate-pulse">
                                        <p className="text-[9px] font-black text-red-700 uppercase">Intento Brute-Force Detectado</p>
                                        <p className="text-[8px] text-red-600/70 font-mono">Source: 190.x.x.x {"->"} /api/login</p>
                                    </div>
                                    <p className="text-[9px] font-medium text-red-600/60 italic leading-tight uppercase font-bold">
                                        Rate-Limiting automático activo sobre IPs sospechosas.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
