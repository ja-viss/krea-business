
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión.');
      }
      
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('storeId', data.user.store);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('isGlobalAdmin', String(data.user.isGlobalAdmin));

      toast({
        title: 'Fase 1 Completada',
        description: data.user.needsVerification ? 'Validando privilegios maestros...' : 'Bienvenido a Krea Business.',
      });

      if (data.user.needsVerification) {
          router.push('/secure-verify');
      } else {
          router.push('/dashboard');
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de acceso',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-black uppercase tracking-tighter">Krea Business</CardTitle>
        <CardDescription className="font-medium">
          Acceso al Ecosistema Empresarial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-bold uppercase">Usuario / Email</Label>
          <Input 
            id="email" 
            type="text" 
            placeholder="Identificador de acceso" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="font-medium"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold uppercase">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-[10px] font-bold text-primary underline-offset-4 hover:underline"
            >
              ¿OLVIDÓ SU CLAVE?
            </Link>
          </div>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full font-black uppercase tracking-tight shadow-lg shadow-primary/20 h-12" type="submit" disabled={isLoading}>
          {isLoading ? 'VERIFICANDO...' : 'ENTRAR AL SISTEMA'}
        </Button>
        <div className="text-center text-sm text-muted-foreground mt-2">
          ¿No tienes una cuenta?{' '}
          <Link href="/signup" className="font-bold text-primary hover:underline">
            Regístrate aquí
          </Link>
        </div>
        <div className="text-center text-[10px] text-muted-foreground pt-4 border-t w-full">
            Krea Suite v2.0 • Soporte Multi-Tenant
        </div>
      </CardFooter>
    </form>
  );
}
