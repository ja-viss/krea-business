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
import { ShieldCheck, Store, Loader2 } from 'lucide-react';

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
      
      // Guardar datos en el cliente para acceso inmediato
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('storeId', data.user.store);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('isGlobalAdmin', String(data.user.isGlobalAdmin));

      toast({
        title: isGlobalAdmin ? '¡Acceso Maestro Creado!' : '¡Cuenta Creada!',
        description: isGlobalAdmin 
          ? 'Has configurado el usuario administrador global del sistema.' 
          : 'Bienvenido al ecosistema Krea Business.',
      });
      
      if (isGlobalAdmin) {
          router.push('/secure-verify');
      } else {
          router.push('/dashboard');
      }

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
          <CardTitle className="text-2xl font-black uppercase tracking-tighter">Únete a Krea</CardTitle>
          <CardDescription className='font-medium'>
            {isGlobalAdmin ? 'Configura el acceso maestro del desarrollador' : 'Crea tu tienda y gestiona tu negocio'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className={`flex items-center justify-between p-3 border-2 rounded-xl transition-colors ${isGlobalAdmin ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'} mb-2`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isGlobalAdmin ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                    {isGlobalAdmin ? <ShieldCheck className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                </div>
                <div className="space-y-0.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest leading-none">Tipo de Registro</Label>
                    <p className={`text-xs font-bold ${isGlobalAdmin ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isGlobalAdmin ? 'SUPER DESARROLLADOR' : 'TIENDA INDEPENDIENTE'}
                    </p>
                </div>
            </div>
            <Switch 
                checked={isGlobalAdmin} 
                onCheckedChange={setIsGlobalAdmin} 
            />
          </div>

          <div className="space-y-4 pt-2">
              {!isGlobalAdmin && (
                <>
                    <div className="space-y-2">
                      <Label htmlFor="business-name" className="text-xs font-bold uppercase">Nombre de tu Negocio</Label>
                      <Input
                        id="business-name"
                        placeholder="Ej: Inversiones Javis"
                        required={!isGlobalAdmin}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        disabled={loading}
                        className="font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-xs font-bold uppercase">Tu Cargo</Label>
                      <Select value={role} onValueChange={setRole} disabled={loading}>
                        <SelectTrigger className="font-bold">
                            <SelectValue placeholder="Selecciona tu cargo" />
                        </SelectTrigger>
                        <SelectContent>
                            {STORE_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value} className="font-medium">
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="admin-name" className="text-xs font-bold uppercase">Nombre del Responsable</Label>
                <Input
                  id="admin-name"
                  placeholder="Ej: Javier Rodríguez"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase">Usuario / Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="javistech"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-2">
          <Button className="w-full font-black uppercase tracking-tight h-12 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isGlobalAdmin ? 'Registrar Super Developer' : 'Crear mi Empresa'}
          </Button>
          <p className="text-sm text-center text-muted-foreground font-medium">
            ¿Ya tienes acceso?{' '}
            <Link
              href="/login"
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
  );
}
