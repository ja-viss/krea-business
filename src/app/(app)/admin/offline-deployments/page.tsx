
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
    Terminal,
    Loader2,
    Package,
    Download,
    Cpu,
    Lock,
    FileArchive
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function OfflineDeploymentsPage() {
    const { toast } = useToast();
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [preparingPackage, setPreparingPackage] = useState(false);
    const [packageReady, setPackageReady] = useState(false);

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

    const handlePreparePackage = () => {
        setPreparingPackage(true);
        setPackageReady(false);
        setTimeout(() => {
            setPreparingPackage(false);
            setPackageReady(true);
            toast({ title: "Paquete Compilado", description: "El instalador 'krea-runtime-v2.exe' está listo para descarga." });
        }, 2500);
    };

    const handleDownload = () => {
        toast({ title: "Descarga Iniciada", description: "El paquete maestro se está transfiriendo..." });
        // Simulación de descarga de binario
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
                    description="Genera licencias y paquetes para instalaciones locales blindadas."
                    actions={
                        <Button variant="outline" onClick={fetchOfflineStores} disabled={loading}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Refrescar
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className={`border-2 transition-all ${packageReady ? 'border-green-500 bg-green-50/10 shadow-green-100' : 'border-primary/20 bg-primary/5 shadow-primary/5'}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                                <Package className="h-3 w-3" /> Instalador Maestro
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-2xl font-black">Krea Runtime v2.0</div>
                            <p className="text-[10px] font-bold text-muted-foreground leading-tight italic">
                                Entorno de ejecución pre-configurado con Backend de Gestión y base de datos aislada local.
                            </p>
                            
                            {!packageReady ? (
                                <Button className="w-full font-black uppercase text-xs" onClick={handlePreparePackage} disabled={preparingPackage}>
                                    {preparingPackage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    {preparingPackage ? 'Compilando...' : 'Compilar Nuevo Paquete'}
                                </Button>
                            ) : (
                                <Button className="w-full font-black uppercase text-xs bg-green-600 hover:bg-green-700 animate-in fade-in zoom-in duration-300" onClick={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" /> Descargar Paquete (.exe)
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/50 border-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Instalaciones Activas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">{stores.filter(s => s.offlineHardwareId).length}</div>
                            <p className="text-[10px] font-bold text-green-600 mt-1 uppercase">Equipos vinculados</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 border-amber-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-amber-700">Tokens Pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-amber-800">{stores.filter(s => s.activationToken && !s.offlineHardwareId).length}</div>
                            <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase">Esperando Handshake</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-2 shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <HardDriveDownload className="h-5 w-5 text-primary" /> Directorio de Licencias Locales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase pl-6">Cliente / Sede</TableHead>
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
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-green-100 text-green-800 border-green-200 font-black text-[9px] uppercase">
                                                            <Cpu className="mr-1 h-3 w-3" /> VINCULADO
                                                        </Badge>
                                                        <span className="text-[8px] font-mono text-muted-foreground truncate max-w-[80px]">ID: {s.offlineHardwareId}</span>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 animate-pulse font-black text-[9px] uppercase">
                                                        <Zap className="mr-1 h-3 w-3" /> PENDIENTE
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {s.activationToken ? (
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[9px] bg-muted p-1 rounded font-mono truncate max-w-[150px] font-bold">
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
                                                    {s.activationToken ? 'Regenerar Token' : 'Generar Token'}
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
                    <Card className="border-4 border-black bg-black text-white shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-primary">
                                <Terminal className="h-4 w-4" /> Protocolo de Activación Local
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-[11px] font-medium leading-relaxed">
                            <p>Sigue esta secuencia en la máquina destino para establecer el vínculo seguro:</p>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <span className="text-primary font-black">1. INSTALACIÓN DE RUNTIME</span>
                                    <p className="opacity-70 italic font-bold">Descarga el paquete .EXE o .DMG y ejecútalo como administrador.</p>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-primary font-black">2. COMANDO DE HANDSHAKE</span>
                                    <div className="p-3 bg-white/10 rounded border border-white/20 font-mono text-[10px] text-primary-foreground">
                                        $ krea-cli activate --token <span className="text-white">[TU_TOKEN_GENERADO]</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-primary font-black">3. CIFRADO DE NÚCLEO</span>
                                    <p className="opacity-70 italic font-bold">El sistema detectará el Hardware ID, cifrará la DB local y bloqueará la máquina.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-white/10 pt-4 flex items-center gap-2">
                            <Lock className="h-4 w-4 text-primary" />
                            <span className="text-[9px] font-black uppercase opacity-60">Seguridad Híbrida AES-256-GCM Activa</span>
                        </CardFooter>
                    </Card>

                    <Card className="border-2 border-red-200 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-red-700">
                                <ShieldAlert className="h-4 w-4" /> Mecanismos de Revocación
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs font-medium text-red-800">
                            <p>En caso de impago o brecha de seguridad:</p>
                            <ul className="list-disc pl-4 space-y-2 font-bold italic text-[10px]">
                                <li>Cambia el estado de la empresa a <strong>'Suspendido'</strong> en el panel de control.</li>
                                <li>El cliente local detectará el cambio mediante el <strong>Ping de Seguridad (Heartbeat)</strong>.</li>
                                <li>Se activará el <strong>Kill Switch</strong>: el software se bloqueará inmediatamente y las llaves de descifrado en memoria serán purgadas.</li>
                                <li>La base de datos local quedará inaccesible sin el reporte positivo del servidor central.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
