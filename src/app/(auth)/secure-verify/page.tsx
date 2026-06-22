
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Lock, Zap, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SecureVerifyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState(40);
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [activeTab, setActiveTab] = useState('verify');
    
    const [form, setForm] = useState({
        user: '',
        key1: '',
        key2: ''
    });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/admin/verify-master');
                const data = await res.json();
                setIsInitialized(data.initialized);
                // Si no está inicializado, forzamos la pestaña de configuración
                if (!data.initialized) {
                    setActiveTab('setup');
                }
            } catch (e) {
                console.error("Error checking master status");
            }
        };
        checkStatus();
    }, []);

    useEffect(() => {
        // El temporizador solo corre si estamos en modo verificación
        if (activeTab !== 'verify') return;

        if (timeLeft <= 0) {
            handleSecurityFailure("TIEMPO AGOTADO: Sesión invalidada por protocolo de seguridad.");
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, activeTab]);

    const handleSecurityFailure = (message: string) => {
        localStorage.clear();
        toast({ variant: 'destructive', title: "Protocolo de Seguridad", description: message });
        router.push('/login');
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/verify-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Claves incorrectas');
            }

            localStorage.setItem('master_verified', 'true');
            toast({ 
                title: activeTab === 'setup' ? "Núcleo Activado" : "Acceso Concedido", 
                description: activeTab === 'setup' 
                    ? "Tus llaves maestras han sido guardadas con éxito." 
                    : "Identidad verificada. Entrando al sistema global." 
            });
            router.push('/dashboard');
        } catch (err: any) {
            if (activeTab === 'verify') {
                handleSecurityFailure(err.message);
            } else {
                toast({ variant: 'destructive', title: "Error", description: err.message });
                setLoading(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const progressValue = (timeLeft / 40) * 100;

    return (
        <div className="space-y-4">
            <CardHeader className="text-center pb-2">
                <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-xl transition-all ${activeTab === 'setup' ? 'bg-primary rotate-12' : 'bg-amber-500 animate-pulse'}`}>
                    {activeTab === 'setup' ? <Sparkles className="text-white h-8 w-8" /> : <ShieldAlert className="text-white h-8 w-8" />}
                </div>
                <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">
                    Nivel de Seguridad 2
                </CardTitle>
                <CardDescription className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest">
                    The Master Challenge • Protocolo Krea
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-12">
                        <TabsTrigger value="verify" className="font-black text-[10px] uppercase data-[state=active]:bg-background">
                            <Lock className="mr-2 h-3 w-3" /> Validar
                        </TabsTrigger>
                        <TabsTrigger value="setup" className="font-black text-[10px] uppercase data-[state=active]:bg-primary data-[state=active]:text-white">
                            <Sparkles className="mr-2 h-3 w-3" /> Configurar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="verify" className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase">
                                <span className="text-muted-foreground italic">Cierre de sesión inminente en:</span>
                                <span className={timeLeft < 10 ? "text-red-500 animate-bounce font-mono text-xs" : "font-mono text-xs"}>{timeLeft}s</span>
                            </div>
                            <Progress value={progressValue} className={`h-2 transition-all ${timeLeft < 10 ? 'bg-red-100' : ''}`} />
                        </div>

                        <form onSubmit={handleAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identificador Maestro</Label>
                                <Input 
                                    value={form.user} 
                                    onChange={e => setForm({...form, user: e.target.value})} 
                                    placeholder="javistech" 
                                    className="bg-muted/30 border-2 font-mono h-11 text-center font-bold" 
                                    required 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Alpha</Label>
                                    <Input 
                                        type="password" 
                                        value={form.key1} 
                                        onChange={e => setForm({...form, key1: e.target.value})} 
                                        placeholder="••••••••"
                                        className="bg-muted/30 border-2 text-center" 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Beta</Label>
                                    <Input 
                                        type="password" 
                                        value={form.key2} 
                                        onChange={e => setForm({...form, key2: e.target.value})} 
                                        placeholder="••••••••"
                                        className="bg-muted/30 border-2 text-center" 
                                        required 
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600">
                                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                                Validar Acceso
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="setup" className="space-y-6 pt-4">
                        <div className="p-4 bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl space-y-2">
                            <p className="text-[11px] font-black text-primary uppercase flex items-center gap-2">
                                <KeyRound className="h-4 w-4" /> Inicialización de Seguridad
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground leading-tight italic">
                                Define ahora tus credenciales de segundo nivel. Estos datos NO son tu contraseña de login, son llaves de infraestructura.
                            </p>
                        </div>

                        <form onSubmit={handleAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-primary">Nuevo Usuario Maestro</Label>
                                <Input 
                                    value={form.user} 
                                    onChange={e => setForm({...form, user: e.target.value})} 
                                    placeholder="Ej: javistech_master" 
                                    className="border-2 border-primary/20 h-11" 
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-primary">Master Key Alpha (Principal)</Label>
                                <Input 
                                    type="password" 
                                    value={form.key1} 
                                    onChange={e => setForm({...form, key1: e.target.value})} 
                                    placeholder="Crea tu primera llave"
                                    className="border-2 border-primary/20 h-11" 
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-primary">Master Key Beta (Respaldo)</Label>
                                <Input 
                                    type="password" 
                                    value={form.key2} 
                                    onChange={e => setForm({...form, key2: e.target.value})} 
                                    placeholder="Crea tu segunda llave"
                                    className="border-2 border-primary/20 h-11" 
                                    required 
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="w-full h-14 font-black uppercase tracking-tight shadow-2xl bg-primary hover:bg-primary/90 text-lg">
                                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Zap className="mr-2 h-5 w-5" />}
                                Activar Seguridad Maestra
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-2">
                <p className="text-[9px] text-center text-muted-foreground italic leading-tight w-full max-w-[280px] mx-auto">
                    {activeTab === 'setup' 
                        ? "⚠️ Al activar, estas llaves serán obligatorias en cada inicio de sesión para el rol de desarrollador."
                        : "* El fallo en la validación o el agotamiento del tiempo resultará en la invalidación de la sesión actual."
                    }
                </p>
            </CardFooter>
        </div>
    );
}
