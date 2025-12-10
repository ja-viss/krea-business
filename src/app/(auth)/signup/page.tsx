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

export default function SignupPage() {
  const router = useRouter();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual signup logic
    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleSignup}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Crea una Cuenta</CardTitle>
        <CardDescription>
          Ingresa tus datos para empezar a gestionar tu negocio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">Nombre del Negocio</Label>
          <Input id="business-name" placeholder="Tu Negocio Inc." required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="admin@tunegocio.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" type="submit">
          Crear Cuenta
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Inicia Sesión
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}
