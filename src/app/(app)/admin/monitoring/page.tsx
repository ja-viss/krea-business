
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    Globe, 
    Search,
    Clock,
    Database,
    AlertCircle,
    Info,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function SystemMonitoringPage() {
    const { toast } = useToast();
    const [logs, setLogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [logsRes, statsRes] = await Promise.all([
                fetch('/api/audit-logs?storeId=SYSTEM_MASTER'),
                fetch('/api/admin/system-stats')
            ]);
            
            const logsData = await logsRes.json();
            const statsData = await statsRes.json();
            
            setLogs(Array.isArray(logsData) ? logsData : []);
            setStats(statsData);
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar la telemetría." });
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh cada 30s
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = Array.isArray(logs) ? logs.filter(log => 
        (log.userName || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(search.toLowerCase())
    ) : [];

    const getActionColor = (action: string) => {
        if (!action) return 'bg-slate-500 text-white';
        if (action.includes('ANULADA') || action.includes('ELIMINADO')) return 'bg-red-500 text-white';
        if (action.includes('APERTURA') || action.includes('LOGIN')) return 'bg-blue-500 text-white';
        if (action.includes('MIGRACION') || action.includes('MASTER')) return 'bg-amber-600 text-white';
        return 'bg-slate-500 text-white';
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Telemetría y Control Forense" 
                    description="Monitoreo de infraestructura global y registro inmutable de intervenciones."
                    actions={
                        <Button variant="outline" onClick={fetchData} disabled={loading} className='h-11 border-2'>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                            Actualizar Pulso
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="border-2 bg-black text-white shadow-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Salud de Red
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">100%</div>
                            <p className="text-[10px] font-bold text-green-500 uppercase mt-1">Sistemas Online</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alertas Seguridad</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-red-600">{stats?.overview?.securityAlerts || 0}</div>
                            <p className="text-[10px] font-bold text-red-400 uppercase mt-1">Intervenciones Críticas</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-sm md:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Distribución de Carga</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                             <div className='flex-1 h-2 bg-muted rounded-full overflow-hidden flex'>
                                 <div className='h-full bg-primary' style={{width: '60%'}}></div>
                                 <div className='h-full bg-blue-500' style={{width: '25%'}}></div>
                                 <div className='h-full bg-amber-500' style={{width: '15%'}}></div>
                             </div>
                             <span className='text-[10px] font-black opacity-60'>BALANCED</span>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-2xl border-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar en el flujo forense (Usuario, IP, Acción)..." 
                            className="pl-9 h-11 border-2 font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden rounded-2xl">
                    <CardHeader className="bg-black text-white py-4 flex flex-row items-center justify-between">
                        <div className='flex items-center gap-3'>
                            <Terminal className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg font-black uppercase italic tracking-tighter">Stream de Eventos del Núcleo</CardTitle>
                        </div>
                        <Badge className='bg-primary/20 text-primary border-primary/40 font-black text-[9px]'>LIVE FEED</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase pl-6 py-4">Sello de Tiempo / IP</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Actor / Identidad</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Comando / Acción</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase">Intervención / Detalle</TableHead>
                                        <TableHead className="text-right pr-6"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={5}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                        ))
                                    ) : filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <TableRow key={log._id} className="hover:bg-primary/[0.02] border-b transition-colors group">
                                                <TableCell className="pl-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[11px] flex items-center gap-1">
                                                            <Clock className='h-2.5 w-2.5 opacity-40' /> {log.createdAt ? format(new Date(log.createdAt), 'HH:mm:ss dd/MM') : 'N/A'}
                                                        </span>
                                                        <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                                                            <Globe className='h-2.5 w-2.5' /> {log.ipAddress || '0.0.0.0'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className='h-7 w-7 rounded-full bg-muted flex items-center justify-center border'>
                                                            <User className='h-3.5 w-3.5 text-muted-foreground' />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-[10px] uppercase">{log.userName || 'Sistema'}</span>
                                                            <span className='text-[8px] font-mono opacity-40'>{log.user || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn("text-[8px] font-black uppercase px-2 py-0.5 border-none", getActionColor(log.action))}>
                                                        {log.action || 'DESCONOCIDO'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-[10px] font-medium leading-tight max-w-[350px] italic opacity-80 line-clamp-2">
                                                        {log.details || 'Sin detalles registrados.'}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {(log.previousState || log.newState) && (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className='h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors'>
                                                                    <History className='h-4 w-4' />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className='max-w-2xl border-4'>
                                                                <DialogHeader>
                                                                    <DialogTitle className='font-black uppercase flex items-center gap-2'>
                                                                        <Info className='h-5 w-5 text-primary' /> Diferencial de Intervención
                                                                    </DialogTitle>
                                                                    <DialogDescription className='font-bold uppercase text-[10px]'>Comando ejecutado por {log.userName}</DialogDescription>
                                                                </DialogHeader>
                                                                <div className='grid grid-cols-2 gap-4 mt-4'>
                                                                    <div className='space-y-2'>
                                                                        <h4 className='text-[10px] font-black uppercase text-muted-foreground'>Estado Pre-Comando</h4>
                                                                        <pre className='p-3 bg-muted rounded-lg text-[9px] overflow-auto max-h-[350px] border-2 border-dashed font-mono'>
                                                                            {JSON.stringify(log.previousState, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                    <div className='space-y-2'>
                                                                        <h4 className='text-[10px] font-black uppercase text-primary'>Resultado Post-Comando</h4>
                                                                        <pre className='p-3 bg-primary/5 rounded-lg text-[9px] overflow-auto max-h-[350px] border-2 border-primary/20 font-mono'>
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
                                            <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">No hay actividad registrada en el flujo.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-2 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-primary" /> Protocolo de Integridad
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] font-medium leading-relaxed italic opacity-70">
                                El sistema de logs utiliza una base de datos circular (Capped Collection) inmutable. Cada entrada es firmada por la sesión del usuario y la IP de origen, asegurando que las intervenciones técnicas puedan ser auditadas ante fallos críticos o accesos no autorizados.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/10">
                        <CardHeader className='pb-3'>
                            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                <Database className="h-4 w-4 text-primary" /> Uso de Infraestructura por Módulo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats?.activity?.map((item: any) => (
                                <div key={item.module} className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black uppercase">
                                        <span>{item.module}</span>
                                        <span>{item.value} Op.</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (item.value / 1000) * 100)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
