
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, ShieldAlert, Briefcase } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  email: z.string().min(1, 'El usuario de acceso es obligatorio.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  roleId: z.string().min(1, 'Debes seleccionar un cargo.'),
});

type UserFormValues = z.infer<typeof userSchema>;

interface NewUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: () => void;
}

export function NewUserDialog({ isOpen, onOpenChange, onUserAdded }: NewUserDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleId: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
          const storeId = localStorage.getItem('storeId');
          const res = await fetch(`/api/roles?storeId=${storeId}`);
          const data = await res.json();
          // No permitir crear otros "Administradores Principales" por este medio por seguridad
          setRoles(data.filter((r: any) => r.name !== 'Administrador Principal'));
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingRoles(false);
      }
  };

  const onSubmit = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const storeId = localStorage.getItem('storeId');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, storeId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      toast({ title: 'Empleado Registrado', description: `${values.name} ya tiene acceso al sistema.` });
      onUserAdded();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fallo de Registro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] border-4">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Alta de Personal</DialogTitle>
          <DialogDescription className="font-bold text-[10px] uppercase text-muted-foreground">
            Define las credenciales de acceso para tu nuevo colaborador.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase opacity-60">Nombre del Colaborador</FormLabel>
                  <FormControl><Input placeholder="Ej: Carlos Pérez" className="h-11 font-bold rounded-xl border-2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase opacity-60">Usuario / Login</FormLabel>
                            <FormControl><Input placeholder="cperez" className="h-11 font-mono font-bold rounded-xl border-2" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                                <Briefcase className="h-3 w-3" /> Cargo Asignado
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="font-bold h-11 border-2 border-primary/20 bg-primary/[0.02] rounded-xl">
                                        <SelectValue placeholder={loadingRoles ? "Cargando..." : "Elegir cargo"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl border-2">
                                    {roles.map(r => (
                                        <SelectItem key={r._id} value={r._id} className="font-bold uppercase text-[10px] py-2">
                                            {r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase opacity-60">Contraseña de Inicio</FormLabel>
                  <FormControl><Input type="password" placeholder="Mínimo 6 caracteres" className="h-11 font-bold rounded-xl border-2" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-amber-50 border-2 border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 leading-tight">
                    RECOMENDACIÓN: Informe al empleado que su usuario de acceso es único y no debe compartir su contraseña por razones de auditoría.
                </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold uppercase text-xs">Cerrar</Button>
              <Button type="submit" disabled={isSubmitting} className="font-black uppercase h-12 px-8 shadow-xl flex-1 rounded-xl">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Activar Acceso
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
