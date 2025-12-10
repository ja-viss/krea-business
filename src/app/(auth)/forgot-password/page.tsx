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

export default function ForgotPasswordPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password recovery logic
    alert('Se ha enviado un enlace de recuperación a tu correo electrónico.');
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">
          Recuperar Contraseña
        </CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos instrucciones para recuperarla
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>          
          <Input id="email" type="email" placeholder="m@ejemplo.com" required />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" type="submit">
          Enviar Instrucciones
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Volver a Iniciar Sesión
          </Link>
        </div>
      </CardFooter>
    </form>
  );
}
