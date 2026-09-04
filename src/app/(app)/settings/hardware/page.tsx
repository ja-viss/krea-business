
'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Printer, 
    Scale, 
    Monitor, 
    Usb, 
    Wifi, 
    RefreshCcw, 
    CheckCircle2, 
    XCircle, 
    Zap,
    Cpu,
    Bluetooth
} from 'lucide-react';

export default function HardwareSettingsPage() {
    const { toast } = useToast();
    const [scanning, setScanning] = useState(false);
    const [devices, setDevices] = useState({
        printer: { connected: false, name: 'EPSON TM-T88V', port: 'USB001', auto: true },
        scale: { connected: false, name: 'Balanza Torrey', port: 'COM3', auto: false },
        drawer: { connected: false, name: 'Gaveta Estándar', port: 'RJ11 via Printer', auto: true },
        display: { connected: false, name: 'Visor Pole', port: 'VGA/HDMI', auto: false }
    });

    const handleScan = () => {
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            setDevices(prev => ({
                ...prev,
                printer: { ...prev.printer, connected: true },
                drawer: { ...prev.drawer, connected: true }
            }));
            toast({ 
                title: "Detección Completada", 
                description: "Se han vinculado 2 nuevos dispositivos via USB." 
            });
        }, 2000);
    };

    const DeviceCard = ({ icon: Icon, title, data, type }: any) => (
        <Card className={`border-2 transition-all ${data.connected ? 'border-primary bg-primary/[0.02]' : 'border-muted opacity-60'}`}>
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
                <Badge variant={data.connected ? 'default' : 'outline'} className="text-[9px] font-black uppercase">
                    {data.connected ? 'Activo' : 'Offline'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-muted-foreground uppercase">Modelo:</span>
                    <span>{data.name}</span>
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
                <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase h-8" disabled={!data.connected}>
                    <RefreshCcw className="mr-1.5 h-3 w-3" /> Probar Conexión
                </Button>
            </CardFooter>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col">
            <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
                <PageHeader 
                    title="Hardware y Periféricos" 
                    description="Vincula balanzas, impresoras térmicas y visores de cliente."
                    actions={
                        <Button onClick={handleScan} disabled={scanning} className="font-black uppercase shadow-lg shadow-primary/20">
                            {scanning ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Usb className="mr-2 h-4 w-4" />}
                            Escanear Puertos
                        </Button>
                    }
                />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <DeviceCard icon={Printer} title="Impresora POS" data={devices.printer} />
                    <DeviceCard icon={Scale} title="Balanza" data={devices.scale} />
                    <DeviceCard icon={Cpu} title="Cajón Monedas" data={devices.drawer} />
                    <DeviceCard icon={Monitor} title="Visor Cliente" data={devices.display} />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="border-2 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-primary" /> Protocolo de Red (IoT)
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase italic">Conexión de periféricos vía IP Estática.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                Si tu impresora o balanza está conectada a la red local (Ethernet/Wi-Fi), ingresa la dirección IP para realizar el apretón de manos (Handshake).
                            </p>
                            <div className="flex gap-2">
                                <div className="bg-background border-2 rounded-lg px-3 py-2 text-xs font-mono font-bold flex-1">
                                    192.168.1.150
                                </div>
                                <Button size="sm" className="font-black uppercase text-[10px]">Vincular IP</Button>
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
                            <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                                <span className="text-[10px] font-black uppercase">Web Serial API</span>
                                <Badge className="bg-green-500 text-[8px] font-black uppercase">Soportado</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                                <span className="text-[10px] font-black uppercase">Web USB API</span>
                                <Badge className="bg-green-500 text-[8px] font-black uppercase">Soportado</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg opacity-40">
                                <span className="text-[10px] font-black uppercase">Web Bluetooth</span>
                                <Badge variant="outline" className="text-[8px] font-black uppercase text-white border-white/20">Beta</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
