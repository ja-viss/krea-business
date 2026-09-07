
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
    Printer, 
    Scale, 
    Monitor, 
    Usb, 
    Wifi, 
    RefreshCcw, 
    Zap,
    Cpu,
    Loader2
} from 'lucide-react';
import { conectarBalanza, conectarImpresoraUSB, vincularDispositivoIP } from '@/lib/hardware';

export default function HardwareSettingsPage() {
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [ipInput, setIpInput] = useState('192.168.1.150');
    
    const [devices, setDevices] = useState({
        printer: { connected: false, name: 'EPSON TM-T88V', port: 'USB', auto: true, loading: false },
        scale: { connected: false, name: 'Balanza Torrey', port: 'SERIAL', auto: false, loading: false },
        drawer: { connected: false, name: 'Gaveta Estándar', port: 'RJ11 via Printer', auto: true, loading: false },
        display: { connected: false, name: 'Visor Pole', port: 'VGA/HDMI', auto: false, loading: false }
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleConnectScale = async () => {
        setDevices(prev => ({ ...prev, scale: { ...prev.scale, loading: true } }));
        try {
            const weight = await conectarBalanza();
            setDevices(prev => ({ ...prev, scale: { ...prev.scale, connected: true, loading: false } }));
            toast({ title: "Balanza Conectada", description: `Lectura inicial: ${weight} Kg. Comunicación Serial establecida.` });
        } catch (e: any) {
            setDevices(prev => ({ ...prev, scale: { ...prev.scale, loading: false } }));
            toast({ variant: 'destructive', title: "Fallo de Balanza", description: e.message });
        }
    };

    const handleConnectPrinter = async () => {
        setDevices(prev => ({ ...prev, printer: { ...prev.printer, loading: true } }));
        try {
            const info = await conectarImpresoraUSB();
            setDevices(prev => ({ ...prev, printer: { ...prev.printer, connected: true, name: info.name || prev.printer.name, loading: false } }));
            toast({ title: "Impresora Vinculada", description: "Prueba de impresión enviada exitosamente vía Web USB." });
        } catch (e: any) {
            setDevices(prev => ({ ...prev, printer: { ...prev.printer, loading: false } }));
            toast({ variant: 'destructive', title: "Fallo de Impresora", description: e.message });
        }
    };

    const handleConnectIP = async () => {
        setScanning(true);
        try {
            await vincularDispositivoIP(ipInput);
            toast({ title: "Handshake Exitoso", description: `El dispositivo en ${ipInput} respondió al ping de red.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Error de Red", description: e.message });
        } finally {
            setScanning(false);
        }
    };

    const DeviceCard = ({ icon: Icon, title, data, onConnect }: any) => (
        <Card className={`border-2 transition-all ${data.connected ? 'border-primary bg-primary/[0.02] shadow-lg shadow-primary/5' : 'border-muted opacity-80'}`}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${data.connected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-tight">{title}</CardTitle>
                        <CardDescription className="text-[10px] font-bold">{data.connected ? data.port : 'Desconectado'}</CardDescription>
                    </div>
                </div>
                <Badge variant={data.connected ? 'default' : 'outline'} className={`text-[9px] font-black uppercase ${data.connected ? 'bg-green-500' : ''}`}>
                    {data.connected ? 'Activo' : 'Offline'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase">Modelo:</span>
                    <span className="truncate max-w-[120px]">{data.name}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-[10px] font-black uppercase">Auto-Lectura</Label>
                        <p className="text-[9px] text-muted-foreground italic">Sincronización en vivo</p>
                    </div>
                    <Switch checked={data.auto} onCheckedChange={() => {}} />
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button 
                    variant={data.connected ? "outline" : "default"} 
                    size="sm" 
                    className="w-full text-[10px] font-black uppercase h-9" 
                    onClick={onConnect}
                    disabled={data.loading}
                >
                    {data.loading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <RefreshCcw className="mr-1.5 h-3 w-3" />}
                    {data.connected ? 'Probar de Nuevo' : 'Vincular Ahora'}
                </Button>
            </CardFooter>
        </Card>
    );

    if (!isClient) return null;

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Hardware y Periféricos" 
                    description="Vincula balanzas, impresoras térmicas y visores de cliente."
                    actions={
                        <Button variant="outline" className="font-black uppercase shadow-sm">
                            <Usb className="mr-2 h-4 w-4" /> Gestor de Puertos
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <DeviceCard icon={Printer} title="Impresora POS" data={devices.printer} onConnect={handleConnectPrinter} />
                    <DeviceCard icon={Scale} title="Balanza" data={devices.scale} onConnect={handleConnectScale} />
                    <DeviceCard icon={Cpu} title="Cajón Monedas" data={devices.drawer} onConnect={() => {}} />
                    <DeviceCard icon={Monitor} title="Visor Cliente" data={devices.display} onConnect={() => {}} />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-2 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-primary" /> Protocolo de Red (IOT)
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase italic">Conexión de periféricos vía IP Estática.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                Si tu impresora o balanza está conectada a la red local (Ethernet/Wi-Fi), ingresa la dirección IP para realizar el apretón de manos (Handshake).
                            </p>
                            <div className="flex gap-2">
                                <Input 
                                    className="font-mono font-bold border-2 h-11" 
                                    value={ipInput} 
                                    onChange={e => setIpInput(e.target.value)} 
                                />
                                <Button 
                                    onClick={handleConnectIP} 
                                    disabled={scanning} 
                                    className="font-black uppercase px-6"
                                >
                                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular IP"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-black bg-black text-white shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Estado de los Controladores
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-white/10 rounded-lg border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-wider">Web Serial API</span>
                                <Badge className="bg-green-500 text-[8px] font-black uppercase shadow-lg shadow-green-500/20">SOPORTADO</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-white/10 rounded-lg border border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-wider">Web USB API</span>
                                <Badge className="bg-green-500 text-[8px] font-black uppercase shadow-lg shadow-green-500/20">SOPORTADO</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg opacity-40">
                                <span className="text-[10px] font-black uppercase tracking-wider">Web Bluetooth</span>
                                <Badge variant="outline" className="text-[8px] font-black uppercase text-white border-white/20">BETA</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
