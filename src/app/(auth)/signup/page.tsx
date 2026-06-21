'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Store, Loader2, UserCircle } from 'lucide-react';

const STORE_ROLES = [
  { value: 'Administrador Principal', label: 'Administrador Principal' },
  { value: 'Gerente de Ventas', label: 'Gerente de Ventas' },
  { value: 'Gerente de Inventario', label: 'Gerente de Inventario' },
  { value: 'Vendedor', label: 'Vendedor' },
  { value: 'Almacenista', label: 'Almacenista' },
];

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Administrador Principal');
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            businessName, 
            name, 
            email, 
            password, 
            isGlobalAdmin,
            roleName: isGlobalAdmin ? 'SUPER_ADMIN_MASTER' : role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar.');
      }
      
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('storeId', data.user.store);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);

      toast({
        title: isGlobalAdmin ? '¡Acceso Maestro Creado!' : '¡Cuenta Creada!',
        description: 'Bienvenido al ecosistema Krea Business.',
      });
      router.push('/dashboard');

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error en el registro',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <form onSubmit={handleSignup}>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Únete a Krea</CardTitle>
          <CardDescription>
            {isGlobalAdmin ? 'Registra tu cuenta de Desarrollador Maestro' : 'Crea tu tienda y empieza a vender hoy mismo'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 mb-4">
            <div className="flex items-center gap-2">
                {isGlobalAdmin ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Store className="h-5 w-5 text-muted-foreground" />}
                <div className="space-y-0.5">
                    <Label className="text-xs font-bold uppercase tracking-wider">Modo de Cuenta</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">
                        {isGlobalAdmin ? 'Super Desarrollador (Global)' : 'Dueño de Tienda (Local)'}
                    </p>
                </div>
            </div>
            <Switch 
                checked={isGlobalAdmin} 
                onCheckedChange={setIsGlobalAdmin} 
            />
          </div>

          {!isGlobalAdmin && (
            <>
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre de la Tienda</Label>
                  <Input
                    id="business-name"
                    placeholder="Ej: Mi Supermercado"
                    required={!isGlobalAdmin}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Tu Rol en la Tienda</Label>
                  <Select value={role} onValueChange={setRole} disabled={loading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu cargo" />
                    </SelectTrigger>
                    <SelectContent>
                        {STORE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                                {r.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nombre Completo</Label>
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
            <Label htmlFor="email">Usuario / Email</Label>
            <Input
              id="email"
              type="text"
              placeholder="javistech o admin@negocio.com"
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
          <Button className="w-full font-bold h-12" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isGlobalAdmin ? 'Registrar como Super Dev' : 'Crear mi Cuenta'}
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
