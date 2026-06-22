
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    HardDriveDownload, 
    Zap, 
    Copy, 
    CheckCircle2, 
    ShieldAlert, 
    RefreshCcw,
    MonitorOff,
    Terminal,
    Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function OfflineDeploymentsPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);

    const fetchOfflineStores = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/stores');
            const data = await res.json();
            // Filtrar tiendas que están en modo offline o pueden serlo
            setStores(data.filter((s: any) => s.deploymentMode === 'Offline' || s.status === 'Demo'));
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar la lista." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOfflineStores();
    }, []);

    const handleGenerateToken = async (storeId: string) => {
        setGenerating(storeId);
        try {
            const res = await fetch('/api/admin/offline-deployments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast({ title: "Token Generado", description: "Copia el token para la activación del cliente local." });
            fetchOfflineStores();
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error", description: e.message });
        } finally {
            setGenerating(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: "Token almacenado en el portapapeles." });
    };

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Control de Despliegues Offline" 
                    description="Gestiona las licencias para instalaciones locales de Krea Business."
                    actions={
                        <Button variant="outline" onClick={fetchOfflineStores} disabled={loading}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Refrescar
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="bg-muted/50 border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Instalaciones Locales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">{stores.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-amber-700">Pendientes de Activación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-amber-800">{stores.filter(s => !s.offlineHardwareId).length}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-2 shadow-xl">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <HardDriveDownload className="h-5 w-5 text-primary" /> Clientes con Soporte Híbrido
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Empresa</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Estado Vínculo</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase">Token de Activación</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={4}><div className="h-12 bg-muted animate-pulse rounded m-2" /></TableCell></TableRow>
                                    ))
                                ) : stores.length > 0 ? (
                                    stores.map((s) => (
                                        <TableRow key={s._id} className="hover:bg-muted/30">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-xs uppercase">{s.name}</span>
                                                    <span className="text-[9px] font-mono text-muted-foreground">{s._id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {s.offlineHardwareId ? (
                                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                                        <CheckCircle2 className="mr-1 h-3 w-3" /> VINCULADO
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 animate-pulse">
                                                        <Zap className="mr-1 h-3 w-3" /> PENDIENTE
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {s.activationToken ? (
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[9px] bg-muted p-1 rounded font-mono truncate max-w-[150px]">
                                                            {s.activationToken}
                                                        </code>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(s.activationToken)}>
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] italic text-muted-foreground">No generado</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button 
                                                    size="sm" 
                                                    className="h-8 font-black text-[9px] uppercase"
                                                    onClick={() => handleGenerateToken(s._id)}
                                                    disabled={generating === s._id}
                                                >
                                                    {generating === s._id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCcw className="h-3 w-3 mr-1" />}
                                                    Generar Token
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">No hay clientes configurados para modo Offline.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <Terminal className="h-4 w-4" /> Protocolo de Instalación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium leading-relaxed">
                            <p>1. Descarga el paquete <strong>Krea Runtime</strong> en la máquina del cliente.</p>
                            <p>2. Ejecuta el comando de inicialización e ingresa el <strong>Token de Activación</strong> generado arriba.</p>
                            <p>3. El sistema realizará el <strong>Handshake Seguro</strong>, cifrará la base de datos local y bloqueará el hardware.</p>
                            <div className="p-3 bg-white rounded border border-primary/20 font-mono text-[10px]">
                                $ krea-cli activate --token [TU_TOKEN]
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-red-200 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-red-700">
                                <ShieldAlert className="h-4 w-4" /> Mecanismos de Revocación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium text-red-800">
                            <p>Si un cliente deja de pagar, cambia su estado a <strong>'Suspendido'</strong> en el Directorio Maestro.</p>
                            <p>El cliente local detectará el cambio mediante el <strong>Ping de Seguridad (Heartbeat)</strong> la próxima vez que detecte internet.</p>
                            <p>Se activará el <strong>Kill Switch</strong>: el software se bloqueará inmediatamente y las llaves de memoria serán purgadas.</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
