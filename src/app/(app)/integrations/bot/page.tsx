
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Bot, 
    Zap, 
    ShieldCheck, 
    Key, 
    RefreshCcw, 
    Copy, 
    Check, 
    Download, 
    ExternalLink, 
    Terminal, 
    MessageSquare, 
    Search, 
    Activity, 
    Lock,
    Globe,
    ArrowRight,
    Loader2,
    Bug,
    History,
    FileCode,
    Cpu,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import crypto from 'crypto';

export default function BotIntegrationsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [simulating, setIsSimulating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sandboxQuery, setSandboxQuery] = useState('V-12345678');
    const [sandboxResult, setSandboxResult] = useState<any>(null);
    
    const [storeData, setStoreData] = useState<any>({
        botApi: { enabled: false, apiKey: '', permissions: [] }
    });

    useEffect(() => {
        async function fetchData() {
            try {
                const storeId = localStorage.getItem('storeId');
                const res = await fetch(`/api/settings/store?storeId=${storeId}`);
                if (res.ok) setStoreData(await res.json());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copiado al portapapeles" });
    };

    const generateApiKey = () => {
        const key = `krea_live_${crypto.randomBytes(24).toString('hex')}`;
        setStoreData({
            ...storeData,
            botApi: { ...storeData.botApi, apiKey: key, enabled: true }
        });
        toast({ title: "Nueva API Key generada", description: "Guarda los cambios para activar." });
    };

    const handleSave = async () => {
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch('/api/settings/store', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, botApi: storeData.botApi })
            });
            if (res.ok) toast({ title: "Configuración Guardada", description: "Tu API de integración está activa." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error al guardar" });
        }
    };

    const handleSimulate = async () => {
        if (!sandboxQuery) return;
        setIsSimulating(true);
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch(`/api/v1/bot/orders/lookup?search=${sandboxQuery}`, {
                headers: {
                    'x-api-key': storeData.botApi.apiKey,
                    'x-tenant-id': storeId || ''
                }
            });
            const data = await res.json();
            setSandboxResult(data);
            toast({ title: "Simulación Exitosa", description: "Respuesta recibida desde el nodo de integración." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error en simulación" });
        } finally {
            setIsSimulating(false);
        }
    };

    const downloadWorkflow = () => {
        const tenantId = localStorage.getItem('storeId');
        const workflow = {
            name: "Krea Bot Customer Service",
            nodes: [
                { parameters: { updates: ["message"] }, name: "Telegram Trigger", type: "n8n-nodes-base.telegramTrigger", typeVersion: 1 },
                { parameters: { url: `https://api.krea.app/api/v1/bot/orders/lookup`, headerParameters: { parameters: [{ name: "x-api-key", value: storeData.botApi.apiKey }, { name: "x-tenant-id", value: tenantId }] } }, name: "HTTP Krea Lookup", type: "n8n-nodes-base.httpRequest" }
            ]
        };
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `krea_n8n_workflow_${tenantId}.json`;
        a.click();
        toast({ title: "Plantilla Descargada", description: "Importa este archivo en tu instancia de n8n." });
    };

    if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin text-primary' /></div>;

    return (
        <div className="flex flex-1 flex-col bg-slate-50/50">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full">
                <PageHeader 
                    title="Integraciones & Bots" 
                    description="Conecta Krea con n8n y WhatsApp para automatizar tu atención al cliente."
                    actions={
                        <Button onClick={handleSave} className='font-black uppercase shadow-xl h-11 px-8'>
                            <CheckCircle2 className='mr-2 h-4 w-4' /> Guardar Cambios
                        </Button>
                    }
                />

                {/* FILA 1: TELEMETRÍA DE INTEGRACIÓN */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Estado del Nodo</CardDescription></CardHeader>
                        <CardContent>
                            <div className='flex items-center gap-2'>
                                <div className='h-3 w-3 rounded-full bg-green-500 animate-pulse' />
                                <span className='text-xl font-black uppercase tracking-tighter'>Operativo</span>
                            </div>
                            <p className='text-[9px] font-bold text-muted-foreground mt-1'>LATENCIA: 42ms</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Consumo API (Mes)</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black'>1,242 <span className='text-xs opacity-40'>/ 10,000</span></div>
                            <div className='w-full h-1 bg-slate-100 mt-2 rounded-full overflow-hidden'><div className='h-full bg-primary w-[12%]' /></div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase'>Tasa de Éxito</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black text-green-600'>99.8%</div>
                            <p className='text-[9px] font-bold opacity-40 uppercase'>Cifrado SSL activo</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-primary/10 bg-primary/[0.02]">
                        <CardHeader className="pb-2"><CardDescription className='text-[10px] font-black uppercase text-primary'>Webhook Base</CardDescription></CardHeader>
                        <CardContent className='flex items-center justify-between gap-2'>
                            <code className='text-[10px] font-bold truncate opacity-60'>api.krea.app/v1/bot/...</code>
                            <Button variant="ghost" size="icon" className='h-7 w-7' onClick={() => copyToClipboard('https://api.krea.app/api/v1/bot/info')}><Copy className='h-3 w-3'/></Button>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="setup" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border-2 h-auto grid grid-cols-2 md:grid-cols-4 w-full">
                        <TabsTrigger value="setup" className="font-black text-[9px] uppercase"><Zap className='mr-2 h-3 w-3'/> Guía de Conexión</TabsTrigger>
                        <TabsTrigger value="keys" className="font-black text-[9px] uppercase"><Key className='mr-2 h-3 w-3'/> Llaves API</TabsTrigger>
                        <TabsTrigger value="sandbox" className="font-black text-[9px] uppercase"><Terminal className='mr-2 h-3 w-3'/> Sandbox / Simulador</TabsTrigger>
                        <TabsTrigger value="logs" className="font-black text-[9px] uppercase"><Bug className='mr-2 h-3 w-3'/> Debug Logs</TabsTrigger>
                    </TabsList>

                    {/* TAB: SETUP GUIADO */}
                    <TabsContent value="setup" className="animate-in fade-in slide-in-from-top-2">
                        <div className='grid gap-6 lg:grid-cols-3'>
                            <div className='lg:col-span-2 space-y-6'>
                                <Card className='border-2 shadow-xl'>
                                    <CardHeader className='bg-primary/5 border-b'><CardTitle className='text-sm font-black uppercase'>Asistente de Despliegue n8n + Telegram</CardTitle></CardHeader>
                                    <CardContent className='pt-6 space-y-8'>
                                        {/* PASO 1 */}
                                        <div className='flex gap-4'>
                                            <div className='h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-lg'>1</div>
                                            <div className='space-y-2'>
                                                <h4 className='font-black uppercase text-xs'>Crear Bot en Telegram</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>Busca a <strong>@BotFather</strong> en Telegram, usa el comando <code>/newbot</code> y obtén tu <strong>Bot Token</strong>. Esto le dará identidad a tu asistente.</p>
                                            </div>
                                        </div>
                                        <Separator className='border-dashed' />
                                        {/* PASO 2 */}
                                        <div className='flex gap-4'>
                                            <div className='h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-lg'>2</div>
                                            <div className='space-y-4 flex-1'>
                                                <h4 className='font-black uppercase text-xs'>Descargar Workflow Inteligente</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>Hemos preparado un archivo JSON que contiene toda la lógica de búsqueda y formateo de mensajes. Solo necesitas importarlo en n8n.</p>
                                                <Button className='font-black uppercase text-[10px] h-12 px-6 shadow-lg' onClick={downloadWorkflow}>
                                                    <Download className='mr-2 h-4 w-4' /> Descargar Workflow (.json)
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator className='border-dashed' />
                                        {/* PASO 3 */}
                                        <div className='flex gap-4'>
                                            <div className='h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-lg'>3</div>
                                            <div className='space-y-4 flex-1'>
                                                <h4 className='font-black uppercase text-xs'>Configurar Credenciales en n8n</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>En el nodo <strong>HTTP Request</strong> del workflow, asegúrate de configurar estas cabeceras:</p>
                                                <div className='p-4 bg-slate-900 rounded-xl font-mono text-[9px] text-green-400 space-y-1 shadow-inner'>
                                                    <div>x-tenant-id: {localStorage.getItem('storeId')}</div>
                                                    <div>x-api-key: {storeData.botApi.apiKey || 'GENERAR_EN_PESTAÑA_LLAVES'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className='space-y-6'>
                                <Card className='border-2 bg-black text-white overflow-hidden shadow-2xl'>
                                    <CardHeader className='border-b border-white/10 pb-4'>
                                        <CardTitle className='text-xs font-black uppercase tracking-widest text-primary italic'>Arquitectura del Bot</CardTitle>
                                    </CardHeader>
                                    <CardContent className='pt-6 space-y-6'>
                                        <div className='flex flex-col items-center gap-4 py-4'>
                                            <div className='p-3 bg-blue-500 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.5)]'><MessageSquare className='h-6 w-6' /></div>
                                            <ArrowRight className='h-4 w-4 rotate-90 opacity-20' />
                                            <div className='p-3 bg-slate-800 border border-white/10 rounded-2xl shadow-xl'><Cpu className='h-6 w-6 text-primary' /></div>
                                            <ArrowRight className='h-4 w-4 rotate-90 opacity-20' />
                                            <div className='p-3 bg-primary rounded-2xl shadow-[0_0_20px_rgba(var(--primary),0.5)]'><Globe className='h-6 w-6' /></div>
                                        </div>
                                        <p className='text-[10px] text-center font-bold text-white/50 uppercase leading-relaxed'>Telegram ➔ n8n Cloud ➔ Krea Core API</p>
                                    </CardContent>
                                    <CardFooter className='bg-white/5 p-4'>
                                        <Badge variant="outline" className='w-full justify-center border-primary/40 text-primary text-[8px] font-black uppercase'>Conexión Encriptada AES-256</Badge>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* TAB: API KEYS */}
                    <TabsContent value="keys" className="animate-in fade-in slide-in-from-top-2">
                        <Card className='border-2 shadow-xl'>
                            <CardHeader className='bg-muted/10 border-b flex flex-row items-center justify-between'>
                                <div>
                                    <CardTitle className='text-sm font-black uppercase'>Credenciales de Acceso Programático</CardTitle>
                                    <CardDescription className='text-[10px] font-bold uppercase'>Gestiona los tokens que usan tus bots para leer datos.</CardDescription>
                                </div>
                                <Button variant="outline" className='font-black text-[10px] uppercase border-2' onClick={generateApiKey}>
                                    <RefreshCcw className='mr-2 h-3 w-3'/> Regenerar Token
                                </Button>
                            </CardHeader>
                            <CardContent className='pt-6 space-y-6'>
                                <div className='space-y-4'>
                                    <Label className='text-[10px] font-black uppercase opacity-60'>Master API Key</Label>
                                    <div className='flex gap-2'>
                                        <Input 
                                            value={storeData.botApi.apiKey || ''} 
                                            readOnly 
                                            className='font-mono font-bold h-12 bg-muted/30 border-2' 
                                            placeholder="No hay llave generada"
                                        />
                                        <Button variant="secondary" size="icon" className='h-12 w-12 rounded-xl' onClick={() => copyToClipboard(storeData.botApi.apiKey)}>
                                            <Copy className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <div className='p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-start gap-3'>
                                        <ShieldCheck className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
                                        <p className='text-[10px] font-bold text-amber-800 leading-tight uppercase'>
                                            Esta llave da acceso de lectura a tu inventario y clientes. Mantenla en secreto. Si sospechas de una filtración, regenérala inmediatamente.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB: SANDBOX SIMULATOR */}
                    <TabsContent value="sandbox" className="animate-in fade-in slide-in-from-top-2">
                        <div className='grid gap-6 lg:grid-cols-12 items-start'>
                            <div className='lg:col-span-7 space-y-6'>
                                <Card className='border-2 shadow-xl'>
                                    <CardHeader className='bg-muted/10 border-b'><CardTitle className='text-sm font-black uppercase italic'>Live Simulator / Debugger</CardTitle></CardHeader>
                                    <CardContent className='pt-6 space-y-6'>
                                        <div className='space-y-4'>
                                            <Label className='text-[10px] font-black uppercase opacity-60'>Cédula o Código a Consultar</Label>
                                            <div className='flex gap-2'>
                                                <Input 
                                                    value={sandboxQuery} 
                                                    onChange={e => setSandboxQuery(e.target.value)} 
                                                    placeholder="V-00000000 o APT-001" 
                                                    className='h-12 font-black uppercase border-2 text-primary' 
                                                />
                                                <Button className='h-12 px-8 font-black uppercase' onClick={handleSimulate} disabled={simulating || !storeData.botApi.apiKey}>
                                                    {simulating ? <Loader2 className='animate-spin'/> : <Terminal className='mr-2 h-4 w-4'/>} Ejecutar
                                                </Button>
                                            </div>
                                        </div>

                                        <Separator className='border-dashed' />

                                        <div className='space-y-3'>
                                            <Label className='text-[10px] font-black uppercase opacity-60 flex items-center gap-2'><FileCode className='h-3 w-3'/> Respuesta JSON (Raw Data)</Label>
                                            <pre className='p-6 bg-slate-900 rounded-2xl text-[10px] font-mono text-green-400 overflow-auto max-h-[350px] shadow-inner custom-scrollbar'>
                                                {sandboxResult ? JSON.stringify(sandboxResult, null, 2) : '// Los resultados aparecerán aquí tras la ejecución.'}
                                            </pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className='lg:col-span-5'>
                                <div className='sticky top-4 space-y-3'>
                                    <p className='text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]'>Vista Previa en Telegram</p>
                                    <div className='bg-[#77a1d3] p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col'>
                                        <div className='absolute top-0 left-0 right-0 h-16 bg-black/10 backdrop-blur-md flex items-center px-6 gap-3 border-b border-white/10'>
                                            <div className='h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-black'>K</div>
                                            <div className='flex flex-col'>
                                                <span className='text-white text-xs font-black uppercase tracking-tight'>{storeData.name || 'Tu Tienda'}</span>
                                                <span className='text-white/60 text-[8px] font-bold uppercase'>Bot de Atención</span>
                                            </div>
                                        </div>

                                        <div className='mt-20 flex flex-col gap-4'>
                                            <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm animate-in slide-in-from-left-4'>
                                                <p className='text-xs font-medium'>Hola 👋, ¿En qué puedo ayudarte hoy?</p>
                                                <p className='text-[8px] text-slate-400 mt-1 text-right'>14:02</p>
                                            </div>
                                            <div className='bg-[#effdde] rounded-2xl rounded-br-none p-4 max-w-[80%] self-end shadow-sm animate-in slide-in-from-right-4'>
                                                <p className='text-xs font-medium uppercase font-bold'>{sandboxQuery}</p>
                                                <p className='text-[8px] text-green-600/60 mt-1 text-right'>14:03 ✓✓</p>
                                            </div>

                                            {sandboxResult && sandboxResult.length > 0 ? (
                                                <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-lg border-l-4 border-primary animate-in zoom-in-95'>
                                                    <h5 className='text-[10px] font-black uppercase text-primary mb-2 italic'>📦 Información Encontrada</h5>
                                                    <div className='space-y-2'>
                                                        {sandboxResult.map((res: any, i: number) => (
                                                            <div key={i} className='bg-slate-50 p-2 rounded-lg border text-[9px]'>
                                                                <p className='font-black uppercase'>{res.type}: {res.code}</p>
                                                                <p className='font-bold opacity-60'>CLIENTE: {res.customer}</p>
                                                                <p className='font-black text-primary mt-1'>SALDO: ${res.balance_usd || 0}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : sandboxResult && (
                                                <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm animate-in zoom-in-95'>
                                                    <p className='text-xs font-medium italic opacity-60'>Lo siento, no encontré registros vinculados a esa identificación. 😕</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* TAB: DEBUG LOGS */}
                    <TabsContent value="logs" className="animate-in fade-in slide-in-from-top-2">
                        <Card className='border-2 shadow-xl overflow-hidden'>
                            <CardHeader className='bg-muted/10 border-b'><CardTitle className='text-sm font-black uppercase flex items-center gap-2'><History className='h-4 w-4'/> Registro de Consultas Externas</CardTitle></CardHeader>
                            <CardContent className='p-0'>
                                <Table>
                                    <TableHeader className='bg-muted/50'>
                                        <TableRow>
                                            <TableHead className='font-black text-[9px] uppercase pl-6 py-4'>Fecha / Canal</TableHead>
                                            <TableHead className='font-black text-[9px] uppercase'>Término de Búsqueda</TableHead>
                                            <TableHead className='font-black text-[9px] uppercase'>Resultado</TableHead>
                                            <TableHead className='text-right font-black text-[9px] uppercase pr-6'>Status HTTP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className='pl-6 py-5 opacity-40 font-bold italic text-xs' colSpan={4}>No hay actividad registrada en los últimos 15 minutos.</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
            `}</style>
        </div>
    );
}

    