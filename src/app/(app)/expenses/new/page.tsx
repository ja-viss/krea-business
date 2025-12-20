
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const expenseSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres.'),
  amount: z.coerce.number().positive('El monto debe ser un número positivo.'),
  category: z.enum(['Servicios', 'Nómina', 'Alquiler', 'Impuestos', 'Marketing', 'Otro']),
  date: z.date({
    required_error: 'La fecha es obligatoria.',
  }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

function FormSkeleton() {
    return (
        <div className="space-y-8">
            <div className='space-y-2'>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                 <div className='space-y-2'>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className='space-y-2'>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
             <div className='space-y-2'>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-[240px]" />
            </div>
        </div>
    )
}

export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      category: 'Servicios',
      date: new Date(),
      amount: undefined,
    },
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    setIsSubmitting(true);
    try {
        const storeId = localStorage.getItem('storeId');
        if (!storeId) {
            throw new Error('No se encontró la tienda. Por favor, inicia sesión de nuevo.');
        }

        const response = await fetch('/api/expenses/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al registrar el gasto.');
        }

        toast({
            title: '¡Gasto Registrado!',
            description: `El gasto ha sido añadido correctamente.`,
        });
        router.push('/expenses');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Registrar Nuevo Gasto"
          description="Añade un nuevo gasto para mantener tus finanzas al día."
          actions={
            <Button variant="outline" asChild>
              <Link href="/expenses">
                <ChevronLeft />
                Volver a Gastos
              </Link>
            </Button>
          }
        />
        <div className="flex justify-center">
            <Card className="w-full max-w-2xl">
                 <CardHeader>
                    <CardTitle>Detalles del Gasto</CardTitle>
                    <CardDescription>
                      Completa la información a continuación.
                    </CardDescription>
                  </CardHeader>
                <CardContent>
                    {!isClient ? <FormSkeleton /> : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea
                                            placeholder="Ej: Pago de servicio de internet de Enero"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-8'>
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Monto (VES)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona una categoría" />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Servicios">Servicios (Agua, Luz, etc.)</SelectItem>
                                                            <SelectItem value="Nómina">Nómina</SelectItem>
                                                            <SelectItem value="Alquiler">Alquiler</SelectItem>
                                                            <SelectItem value="Impuestos">Impuestos</SelectItem>
                                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                                            <SelectItem value="Otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                        <FormLabel>Fecha del Gasto</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPP", { locale: es })
                                                ) : (
                                                    <span>Selecciona una fecha</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                locale={es}
                                                mode="single"
                                                captionLayout="dropdown-buttons" fromYear={1960} toYear={2030}
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => router.push('/expenses')}>Cancelar</Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Guardando...' : 'Guardar Gasto'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
