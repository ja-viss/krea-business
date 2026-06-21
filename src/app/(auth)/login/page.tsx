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
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión.');
      }
      
      // Guardar datos de la sesión en localStorage
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('storeId', data.user.store);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('isGlobalAdmin', String(data.user.isGlobalAdmin));


      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      router.push('/dashboard');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/check-db');
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Conexión Exitosa',
          description: data.message,
        });
      } else {
        throw new Error(data.message || 'Error al verificar la conexión.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: error.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Inicia Sesión</CardTitle>
        <CardDescription>
          Panel de Gestión Krea Business Suite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Usuario / Email</Label>
          <Input 
            id="email" 
            type="text" 
            placeholder="Introduce tu identificador" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
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
        <Button className="w-full font-bold" type="submit" disabled={isLoading}>
          {isLoading ? 'Accediendo...' : 'Iniciar Sesión'}
        </Button>
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          Soporte Técnico: support@krea.com
        </div>
      </CardFooter>
    </form>
  );
}
