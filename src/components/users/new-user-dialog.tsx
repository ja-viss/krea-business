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
import { Loader2, UserPlus } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  email: z.string().min(1, 'El usuario o email es obligatorio.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  roleId: z.string().min(1, 'Debes seleccionar un rol.'),
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
          // Filtrar para no permitir crear otros Admin Principales (opcional, según política)
          setRoles(data);
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

      toast({ title: 'Usuario Creado', description: `${values.name} ha sido registrado exitosamente.` });
      onUserAdded();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" /> Registrar Personal
          </DialogTitle>
          <DialogDescription className="font-bold">
            Crea un nuevo acceso para un empleado de tu empresa.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase">Nombre Completo</FormLabel>
                  <FormControl><Input placeholder="Ej: Maria Delgado" {...field} /></FormControl>
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
                            <FormLabel className="text-[10px] font-black uppercase">Usuario / Login</FormLabel>
                            <FormControl><Input placeholder="mariad" className="font-mono" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">Cargo / Rol</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="font-bold">
                                        <SelectValue placeholder={loadingRoles ? "Cargando..." : "Elegir rol"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {roles.map(r => (
                                        <SelectItem key={r._id} value={r._id} className="font-bold uppercase text-[10px]">
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
                  <FormLabel className="text-[10px] font-black uppercase">Contraseña Temporal</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="font-black uppercase">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finalizar Registro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
