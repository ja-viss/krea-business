'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Lock, Zap, Loader2, Sparkles } from 'lucide-react';

export default function SecureVerifyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState(40);
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(true);
    const [form, setForm] = useState({
        user: '',
        key1: '',
        key2: ''
    });

    // Verificar si el sistema ya tiene llaves creadas
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/admin/verify-master');
                const data = await res.json();
                setIsInitialized(data.initialized);
            } catch (e) {
                console.error("Error checking master status");
            }
        };
        checkStatus();
    }, []);

    // Temporizador de Seguridad (40 Segundos) - Solo se activa si ya está inicializado
    useEffect(() => {
        if (!isInitialized) return; // No hay prisa si estamos configurando por primera vez

        if (timeLeft <= 0) {
            handleSecurityFailure("TIEMPO AGOTADO: Sesión invalidada por protocolo de seguridad.");
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isInitialized]);

    const handleSecurityFailure = (message: string) => {
        localStorage.clear();
        toast({ variant: 'destructive', title: "Protocolo de Seguridad", description: message });
        router.push('/login');
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/verify-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Claves incorrectas');
            }

            localStorage.setItem('master_verified', 'true');
            toast({ 
                title: isInitialized ? "Acceso Concedido" : "Núcleo Configurado", 
                description: isInitialized 
                    ? "Identidad verificada. Entrando al núcleo." 
                    : "Tus llaves maestras han sido guardadas. No las olvides." 
            });
            router.push('/dashboard');
        } catch (err: any) {
            if (isInitialized) {
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
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${!isInitialized ? 'bg-primary animate-bounce' : 'bg-amber-500 animate-pulse'}`}>
                    {!isInitialized ? <Sparkles className="text-white h-7 w-7" /> : <ShieldAlert className="text-white h-7 w-7" />}
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter">
                    {!isInitialized ? 'Configuración de Seguridad' : 'Verificación Nivel 2'}
                </CardTitle>
                <CardDescription className={`font-bold ${!isInitialized ? 'text-primary' : 'text-amber-600'}`}>
                    {!isInitialized ? 'Define tus llaves maestras ahora' : 'Solo para Desarrolladores Principales'}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                {isInitialized ? (
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-muted-foreground">Tiempo de respuesta restante</span>
                            <span className={timeLeft < 10 ? "text-red-500 animate-bounce" : ""}>{timeLeft}s</span>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                    </div>
                ) : (
                    <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">
                            ⚠️ Primera vez detectada. Los datos que ingreses abajo serán tus llaves permanentes de acceso nivel 2.
                        </p>
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Identificador Maestro</Label>
                        <Input 
                            value={form.user} 
                            onChange={e => setForm({...form, user: e.target.value})} 
                            placeholder="Ej: javistech" 
                            className="bg-muted/50 border-2 font-mono" 
                            required 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Master Key Alpha</Label>
                            <Input 
                                type="password" 
                                value={form.key1} 
                                onChange={e => setForm({...form, key1: e.target.value})} 
                                placeholder="Clave 1"
                                className="bg-muted/50 border-2" 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Master Key Beta</Label>
                            <Input 
                                type="password" 
                                value={form.key2} 
                                onChange={e => setForm({...form, key2: e.target.value})} 
                                placeholder="Clave 2"
                                className="bg-muted/50 border-2" 
                                required 
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className={`w-full h-12 font-black uppercase tracking-widest shadow-xl ${!isInitialized ? 'bg-primary hover:bg-primary/90' : 'shadow-amber-500/20'}`}>
                        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : (!isInitialized ? <Sparkles className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />)}
                        {!isInitialized ? 'ESTABLECER Y ACTIVAR LLAVES' : 'Validar Acceso'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter>
                <p className="text-[9px] text-center text-muted-foreground italic leading-tight w-full">
                    {!isInitialized 
                        ? "* Asegúrate de anotar estas llaves en un lugar físico seguro antes de presionar el botón."
                        : "* Si falla este desafío o se agota el tiempo, el sistema cerrará la sesión actual automáticamente."
                    }
                </p>
            </CardFooter>
        </div>
    );
}
