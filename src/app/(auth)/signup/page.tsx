'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ businessName, name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar el usuario.');
      }
      
      // Guardar IDs en localStorage para simular la sesión después del registro
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('storeId', data.user.store);

      toast({
        title: '¡Registro exitoso!',
        description: 'Tu tienda ha sido creada. Serás redirigido al dashboard.',
      });
      router.push('/dashboard');

    } catch (err: any) {
      console.error('Fallo en el registro:', err);
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: err.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <form onSubmit={handleSignup}>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Crea tu Tienda</CardTitle>
          <CardDescription>
            Ingresa tus datos para empezar a gestionar tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Nombre de la Tienda</Label>
            <Input
              id="business-name"
              placeholder="Mi Supermercado"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-name">Tu Nombre Completo</Label>
            <Input
              id="admin-name"
              placeholder="Juan Pérez"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email del Administrador</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@tunegocio.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? 'Creando tienda...' : 'Crear mi Tienda'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link
              href="/login"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Inicia Sesión
            </Link>
          </p>
        </CardFooter>
      </form>
  );
}
