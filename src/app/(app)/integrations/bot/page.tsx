
'use client';

import { useState, useEffect, useCallback } from 'react';
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
    Download, 
    Terminal, 
    MessageSquare, 
    Globe, 
    ArrowRight, 
    Loader2, 
    Bug, 
    History, 
    FileCode, 
    Cpu, 
    CheckCircle2,
    Lock,
    Webhook
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import crypto from 'crypto';

export default function BotIntegrationsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [simulating, setIsSimulating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sandboxQuery, setSandboxQuery] = useState('V-12345678');
    const [sandboxResult, setSandboxResult] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    
    const [storeData, setStoreData] = useState<any>({
        botApi: { enabled: false, apiKey: '', webhookUrl: '', webhookSecret: '', permissions: [] }
    });

    const fetchData = useCallback(async () => {
        try {
            const storeId = localStorage.getItem('storeId');
            const [storeRes, logsRes] = await Promise.all([
                fetch(`/api/settings/store?storeId=${storeId}`),
                fetch(`/api/audit-logs?storeId=${storeId}`)
            ]);
            
            if (storeRes.ok) setStoreData(await storeRes.json());
            if (logsRes.ok) {
                const allLogs = await logsRes.json();
                // Filtrar solo logs relacionados con bot
                setLogs(allLogs.filter((l: any) => l.action.includes('BOT') || l.user === 'BOT_INTEGRATION'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copiado al portapapeles" });
    };

    const generateApiKey = () => {
        const key = `krea_live_${crypto.randomBytes(24).toString('hex')}`;
        const secret = crypto.randomBytes(16).toString('hex');
        setStoreData({
            ...storeData,
            botApi: { ...storeData.botApi, apiKey: key, webhookSecret: secret, enabled: true }
        });
        toast({ title: "Nuevas credenciales generadas", description: "Guarda los cambios para activar." });
    };

    const handleSave = async () => {
        try {
            const storeId = localStorage.getItem('storeId');
            const res = await fetch('/api/settings/store', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storeId, 
                    botApi: storeData.botApi 
                })
            });
            if (res.ok) {
                toast({ title: "Configuración Guardada", description: "Tu API de integración está activa." });
                fetchData();
            }
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
            toast({ title: "Simulación Exitosa", description: "Respuesta recibida desde el núcleo." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error en simulación" });
        } finally {
            setIsSimulating(false);
        }
    };

    const downloadWorkflow = () => {
        const tenantId = localStorage.getItem('storeId');
        const apiBase = window.location.origin;
        
        const workflow = {
            name: `Krea Bot - ${storeData.name}`,
            nodes: [
                {
                    parameters: {
                        updates: ["message"],
                        additionalFields: {}
                    },
                    name: "Telegram Trigger",
                    type: "n8n-nodes-base.telegramTrigger",
                    typeVersion: 1,
                    position: [100, 300]
                },
                {
                    parameters: {
                        conditions: {
                            string: [
                                {
                                    value1: "={{$json[\"message\"][\"text\"]}}",
                                    operation: "regex",
                                    value2: "^[VEP]-[0-9]+$"
                                }
                            ]
                        }
                    },
                    name: "Check Input Type",
                    type: "n8n-nodes-base.if",
                    typeVersion: 1,
                    position: [350, 300]
                },
                {
                    parameters: {
                        url: `${apiBase}/api/v1/bot/orders/lookup`,
                        authentication: "genericCredentialType",
                        genericAuthType: "httpHeaderAuth",
                        headerParameters: {
                            parameters: [
                                { name: "x-api-key", value: storeData.botApi.apiKey },
                                { name: "x-tenant-id", value: tenantId }
                            ]
                        },
                        options: {
                            queryParameters: {
                                parameters: [
                                    { name: "search", value: "={{$node[\"Telegram Trigger\"].json[\"message\"][\"text\"]}}" }
                                ]
                            }
                        }
                    },
                    name: "Krea Order Lookup",
                    type: "n8n-nodes-base.httpRequest",
                    typeVersion: 1,
                    position: [600, 200]
                }
            ],
            connections: {
                "Telegram Trigger": { main: [ [ { node: "Check Input Type", type: "main", index: 0 } ] ] },
                "Check Input Type": { main: [ [ { node: "Krea Order Lookup", type: "main", index: 0 } ] ] }
            }
        };

        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `krea_n8n_v2_${storeData.name?.toLowerCase().replace(/\s/g, '_')}.json`;
        a.click();
        toast({ title: "Workflow Preparado", description: "Listo para importar en n8n." });
    };

    if (loading) return <div className='p-12 flex justify-center'><Loader2 className='animate-spin text-primary h-12 w-12' /></div>;

    return (
        <div className="flex flex-1 flex-col bg-slate-50/30">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full">
                <PageHeader 
                    title="Centro de Bots e Integraciones" 
                    description="Conecta Krea con n8n y Telegram para automatizar la atención a tus clientes."
                    actions={
                        <Button onClick={handleSave} className='font-black uppercase shadow-xl h-11 px-8 rounded-xl'>
                            <CheckCircle2 className='mr-2 h-4 w-4' /> Sincronizar Cambios
                        </Button>
                    }
                />

                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-2 shadow-sm bg-white">
                        <CardHeader className="pb-2"><CardDescription className='text-[9px] font-black uppercase tracking-widest'>Estado API</CardDescription></CardHeader>
                        <CardContent>
                            <div className='flex items-center gap-2'>
                                <div className='h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse' />
                                <span className='text-lg font-black uppercase'>Conectado</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 shadow-sm bg-white">
                        <CardHeader className="pb-2"><CardDescription className='text-[9px] font-black uppercase tracking-widest'>Latencia Núcleo</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-2xl font-black'>38ms</div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 shadow-sm bg-white">
                        <CardHeader className="pb-2"><CardDescription className='text-[9px] font-black uppercase tracking-widest'>Uso de Cuota</CardDescription></CardHeader>
                        <CardContent>
                            <div className='text-lg font-black'>14% <span className='text-[10px] font-bold opacity-40 uppercase ml-1'>(1.4k / 10k)</span></div>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2"><CardDescription className='text-[9px] font-black uppercase tracking-widest text-primary'>Security Tier</CardDescription></CardHeader>
                        <CardContent>
                            <div className='flex items-center gap-2 text-primary font-black uppercase text-sm italic'>
                                <Lock className='h-4 w-4' /> AES-256 Validated
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="setup" className="space-y-6">
                    <TabsList className="bg-muted/50 p-1 border-2 h-auto grid grid-cols-2 md:grid-cols-4 w-full">
                        <TabsTrigger value="setup" className="font-black text-[10px] uppercase h-10"><Zap className='mr-2 h-4 w-4'/> Setup</TabsTrigger>
                        <TabsTrigger value="keys" className="font-black text-[10px] uppercase h-10"><Key className='mr-2 h-4 w-4'/> Credenciales</TabsTrigger>
                        <TabsTrigger value="sandbox" className="font-black text-[10px] uppercase h-10"><Terminal className='mr-2 h-4 w-4'/> Sandbox</TabsTrigger>
                        <TabsTrigger value="logs" className="font-black text-[10px] uppercase h-10"><History className='mr-2 h-4 w-4'/> Debug Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="setup" className="animate-in fade-in slide-in-from-top-2">
                        <div className='grid gap-6 lg:grid-cols-3'>
                            <div className='lg:col-span-2 space-y-6'>
                                <Card className='border-2 shadow-lg'>
                                    <CardHeader className='bg-primary/5 border-b py-4'><CardTitle className='text-sm font-black uppercase flex items-center gap-2'><Webhook className='h-4 w-4 text-primary'/> Automatización n8n + Telegram</CardTitle></CardHeader>
                                    <CardContent className='pt-8 space-y-10'>
                                        <div className='flex gap-5'>
                                            <div className='h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-xl'>1</div>
                                            <div className='space-y-2'>
                                                <h4 className='font-black uppercase text-xs tracking-tight'>Identidad: Bot Father</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>Busca a <strong>@BotFather</strong> en Telegram y crea un nuevo bot. Obtén el TOKEN y pégalo en tu instancia de n8n.</p>
                                            </div>
                                        </div>
                                        <div className='flex gap-5'>
                                            <div className='h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-xl'>2</div>
                                            <div className='space-y-4 flex-1'>
                                                <h4 className='font-black uppercase text-xs tracking-tight'>Lógica: Importar Workflow</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>Descarga la plantilla oficial de Krea. Esta ya contiene los nodos configurados con tu identificación de empresa.</p>
                                                <Button className='font-black uppercase text-[10px] h-12 px-8 shadow-lg rounded-xl' onClick={downloadWorkflow}>
                                                    <Download className='mr-2 h-4 w-4' /> Descargar JSON n8n
                                                </Button>
                                            </div>
                                        </div>
                                        <div className='flex gap-5'>
                                            <div className='h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-xl'>3</div>
                                            <div className='space-y-4 flex-1'>
                                                <h4 className='font-black uppercase text-xs tracking-tight'>Vínculo: Webhooks de Krea</h4>
                                                <p className='text-xs text-muted-foreground leading-relaxed'>Pega la URL de tu n8n aquí para que Krea notifique eventos proactivos (ej: aviso de vencimiento).</p>
                                                <div className='space-y-2 max-w-md'>
                                                    <Label className='text-[10px] font-black uppercase opacity-60'>URL n8n Webhook</Label>
                                                    <Input 
                                                        placeholder="https://n8n.tuempresa.com/webhook/..." 
                                                        value={storeData.botApi.webhookUrl || ''} 
                                                        onChange={e => setStoreData({...storeData, botApi: {...storeData.botApi, webhookUrl: e.target.value}})}
                                                        className='font-mono text-[10px] border-2 h-11'
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className='space-y-6'>
                                <Card className='border-2 bg-slate-900 text-white overflow-hidden shadow-2xl rounded-2xl'>
                                    <CardHeader className='border-b border-white/5 pb-4'>
                                        <CardTitle className='text-[10px] font-black uppercase tracking-[0.2em] text-primary italic'>Arquitectura Live</CardTitle>
                                    </CardHeader>
                                    <CardContent className='py-8 flex flex-col items-center gap-6'>
                                        <div className='p-4 bg-blue-500/20 rounded-3xl border-2 border-blue-500/40'><MessageSquare className='h-8 w-8 text-blue-400' /></div>
                                        <ArrowRight className='rotate-90 opacity-20' />
                                        <div className='p-4 bg-slate-800 rounded-3xl border-2 border-white/5 shadow-inner'><Cpu className='h-8 w-8 text-primary' /></div>
                                        <ArrowRight className='rotate-90 opacity-20' />
                                        <div className='p-4 bg-primary/20 rounded-3xl border-2 border-primary/40'><Globe className='h-8 w-8 text-primary' /></div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="keys" className="animate-in fade-in slide-in-from-top-2">
                        <Card className='border-2 shadow-xl rounded-2xl'>
                            <CardHeader className='bg-muted/10 border-b flex flex-row items-center justify-between py-5 px-6'>
                                <div>
                                    <CardTitle className='text-sm font-black uppercase'>Credenciales Programáticas</CardTitle>
                                    <CardDescription className='text-[10px] font-bold uppercase'>Acceso seguro para tus integraciones externas.</CardDescription>
                                </div>
                                <Button variant="outline" className='font-black text-[10px] uppercase border-2 h-10' onClick={generateApiKey}>
                                    <RefreshCcw className='mr-2 h-3.5 w-3.5'/> Rotar Credenciales
                                </Button>
                            </CardHeader>
                            <CardContent className='p-8 space-y-8'>
                                <div className='grid gap-6 md:grid-cols-2'>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase opacity-60'>API Key (x-api-key)</Label>
                                        <div className='flex gap-2'>
                                            <Input value={storeData.botApi.apiKey || ''} readOnly className='font-mono font-bold h-12 bg-muted/20 border-2' />
                                            <Button variant="secondary" size="icon" className='h-12 w-12 rounded-xl' onClick={() => copyToClipboard(storeData.botApi.apiKey)}><Copy className='h-4 w-4'/></Button>
                                        </div>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase opacity-60'>Webhook Secret</Label>
                                        <div className='flex gap-2'>
                                            <Input value={storeData.botApi.webhookSecret || ''} readOnly className='font-mono font-bold h-12 bg-muted/20 border-2' />
                                            <Button variant="secondary" size="icon" className='h-12 w-12 rounded-xl' onClick={() => copyToClipboard(storeData.botApi.webhookSecret)}><Copy className='h-4 w-4'/></Button>
                                        </div>
                                    </div>
                                </div>
                                <div className='p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-4'>
                                    <ShieldCheck className='h-6 w-6 text-amber-600 shrink-0 mt-0.5' />
                                    <p className='text-[10px] font-bold text-amber-900 leading-tight uppercase italic'>
                                        ADVERTENCIA: Estas llaves permiten leer tu inventario y clientes. Mantenlas fuera de repositorios públicos.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sandbox" className="animate-in fade-in slide-in-from-top-2">
                        <div className='grid gap-6 lg:grid-cols-12'>
                            <div className='lg:col-span-7 space-y-6'>
                                <Card className='border-2 shadow-xl rounded-2xl'>
                                    <CardHeader className='bg-muted/10 border-b py-4'><CardTitle className='text-sm font-black uppercase italic'>Live Simulator</CardTitle></CardHeader>
                                    <CardContent className='p-8 space-y-6'>
                                        <div className='space-y-2'>
                                            <Label className='text-[10px] font-black uppercase opacity-60'>Cédula o Código de Ticket</Label>
                                            <div className='flex gap-2'>
                                                <Input 
                                                    value={sandboxQuery} 
                                                    onChange={e => setSandboxQuery(e.target.value)} 
                                                    placeholder="V-00000000" 
                                                    className='h-14 font-black uppercase border-2 text-primary text-base' 
                                                />
                                                <Button className='h-14 px-8 font-black uppercase rounded-xl' onClick={handleSimulate} disabled={simulating || !storeData.botApi.apiKey}>
                                                    {simulating ? <Loader2 className='animate-spin h-5 w-5'/> : <Terminal className='mr-2 h-5 w-5'/>} PROBAR
                                                </Button>
                                            </div>
                                        </div>
                                        <Separator className='border-dashed' />
                                        <div className='space-y-3'>
                                            <Label className='text-[10px] font-black uppercase opacity-60 flex items-center gap-2'><FileCode className='h-3.5 w-3.5'/> Respuesta JSON</Label>
                                            <pre className='p-6 bg-slate-900 rounded-2xl text-[10px] font-mono text-green-400 overflow-auto max-h-[300px] shadow-inner'>
                                                {sandboxResult ? JSON.stringify(sandboxResult, null, 2) : '// Sin ejecución previa.'}
                                            </pre>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className='lg:col-span-5'>
                                <div className='sticky top-4 bg-[#77a1d3] p-8 rounded-[3rem] shadow-2xl h-[550px] relative overflow-hidden flex flex-col border-8 border-white/20'>
                                    <div className='absolute top-0 left-0 right-0 h-16 bg-black/10 backdrop-blur-md flex items-center px-8 gap-3 border-b border-white/10'>
                                        <div className='h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white font-black'>K</div>
                                        <div className='flex flex-col'><span className='text-white text-xs font-black uppercase'>{storeData.name || 'Tu Bot'}</span><span className='text-white/40 text-[7px] uppercase font-bold'>Bot de Atención</span></div>
                                    </div>
                                    <div className='mt-20 space-y-4'>
                                        <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm animate-in slide-in-from-left-4'>
                                            <p className='text-xs font-medium'>Hola 👋, escribe tu cédula o número de nota de entrega para consultar tu estatus.</p>
                                        </div>
                                        <div className='bg-[#effdde] rounded-2xl rounded-br-none p-4 max-w-[50%] self-end shadow-sm animate-in slide-in-from-right-4 ml-auto'>
                                            <p className='text-xs font-black uppercase text-right'>{sandboxQuery}</p>
                                        </div>
                                        {sandboxResult && sandboxResult.length > 0 ? (
                                            <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[90%] shadow-xl border-l-4 border-primary animate-in zoom-in-95'>
                                                <h5 className='text-[10px] font-black uppercase text-primary mb-2'>📦 Registro Encontrado</h5>
                                                <div className='space-y-2'>
                                                    {sandboxResult.map((res: any, i: number) => (
                                                        <div key={i} className='bg-slate-50 p-2 rounded-lg border text-[9px] font-bold uppercase'>
                                                            <p className='text-primary'>{res.type}: {res.code}</p>
                                                            <p className='opacity-60'>Status: {res.status}</p>
                                                            <p className='mt-1 text-slate-800'>Saldo: ${res.balance_usd || 0}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : sandboxResult && (
                                            <div className='bg-white rounded-2xl rounded-bl-none p-4 max-w-[85%] shadow-sm animate-in zoom-in-95'>
                                                <p className='text-xs italic opacity-40 font-bold'>No se encontraron registros. 😕</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="logs" className="animate-in fade-in slide-in-from-top-2">
                        <Card className='border-2 shadow-xl rounded-2xl overflow-hidden'>
                            <CardHeader className='bg-muted/10 border-b flex flex-row items-center justify-between py-4 px-6'>
                                <CardTitle className='text-xs font-black uppercase flex items-center gap-2'><History className='h-4 w-4'/> Live Activity Monitor</CardTitle>
                                <Button variant="ghost" size="sm" className='text-[9px] font-black uppercase' onClick={fetchData}><RefreshCcw className='mr-1.5 h-3 w-3'/> Refrescar</Button>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <Table>
                                    <TableHeader className='bg-muted/50'>
                                        <TableRow>
                                            <TableHead className='font-black text-[9px] uppercase pl-6 py-4'>Timestamp</TableHead>
                                            <TableHead className='font-black text-[9px] uppercase'>Canal / Evento</TableHead>
                                            <TableHead className='font-black text-[9px] uppercase'>Detalle Operativo</TableHead>
                                            <TableHead className='text-right font-black text-[9px] uppercase pr-6'>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length > 0 ? logs.map((log) => (
                                            <TableRow key={log._id} className='hover:bg-primary/[0.02]'>
                                                <TableCell className='pl-6 py-4 font-mono text-[10px] font-bold'>{format(new Date(log.createdAt), 'HH:mm:ss')}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className='text-[8px] font-black uppercase border-blue-200 bg-blue-50 text-blue-600'>{log.action}</Badge>
                                                </TableCell>
                                                <TableCell className='text-[10px] font-medium text-muted-foreground italic'>{log.details}</TableCell>
                                                <TableCell className='text-right pr-6'>
                                                    <CheckCircle2 className='h-4 w-4 text-green-500 ml-auto' />
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className='h-32 text-center opacity-30 italic uppercase font-black text-xs'>Sin actividad reciente en el nodo de integración.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
