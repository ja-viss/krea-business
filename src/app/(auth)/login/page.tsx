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
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual login logic
    router.push('/dashboard');
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
        <CardTitle className="text-2xl font-bold">Bienvenido de Nuevo</CardTitle>
        <CardDescription>
          Ingresa tu email para iniciar sesión en tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@ejemplo.com" required />
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
          <Input id="password" type="password" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" type="submit">
          Iniciar Sesión
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleVerifyConnection}
          disabled={isVerifying}
        >
          {isVerifying ? 'Verificando...' : 'Verificar Conexión a BD'}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{' '}
          <Link
            href="/signup"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Regístrate
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}
