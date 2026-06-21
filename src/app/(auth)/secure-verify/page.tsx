
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Lock, Zap, Loader2 } from 'lucide-react';

export default function SecureVerifyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = useState(40);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        user: '',
        key1: '',
        key2: ''
    });

    // Temporizador de Seguridad (40 Segundos)
    useEffect(() => {
        if (timeLeft <= 0) {
            handleSecurityFailure("TIEMPO AGOTADO: Sesión invalidada por protocolo de seguridad.");
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleSecurityFailure = (message: string) => {
        localStorage.clear();
        toast({ variant: 'destructive', title: "Protocolo de Seguridad", description: message });
        router.push('/login');
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Verificación contra el endpoint maestro
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
            toast({ title: "Acceso Concedido", description: "Identidad verificada. Entrando al núcleo del sistema." });
            router.push('/dashboard');
        } catch (err: any) {
            handleSecurityFailure(err.message);
        } finally {
            setLoading(false);
        }
    };

    const progressValue = (timeLeft / 40) * 100;

    return (
        <div className="space-y-4">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <ShieldAlert className="text-white h-7 w-7" />
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Verificación Nivel 2</CardTitle>
                <CardDescription className="font-bold text-amber-600">
                    Solo para Desarrolladores Principales
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-muted-foreground">Tiempo de respuesta restante</span>
                        <span className={timeLeft < 10 ? "text-red-500 animate-bounce" : ""}>{timeLeft}s</span>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest">Identificador Maestro</Label>
                        <Input 
                            value={form.user} 
                            onChange={e => setForm({...form, user: e.target.value})} 
                            placeholder="Usuario Dev" 
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
                                className="bg-muted/50 border-2" 
                                required 
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-amber-500/20">
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Lock className="mr-2 h-4 w-4" />}
                        Validar Acceso
                    </Button>
                </form>
            </CardContent>
            <CardFooter>
                <p className="text-[9px] text-center text-muted-foreground italic leading-tight w-full">
                    * Si falla este desafío o se agota el tiempo, el sistema cerrará la sesión actual automáticamente por sospecha de intrusión.
                </p>
            </CardFooter>
        </div>
    );
}
