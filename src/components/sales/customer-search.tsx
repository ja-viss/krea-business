
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle } from 'lucide-react';
import { ICustomer } from '@/models/Customer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useToast } from '@/hooks/use-toast';

interface CustomerSearchProps {
  onCustomerSelect: (customer: ICustomer) => void;
  selectedCustomerName: string;
}

const newCustomerSchema = z.object({
  idNumber: z.string().min(1, 'La cédula/ID es obligatoria.'),
  name: z.string().min(3, 'El nombre es obligatorio.'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export function CustomerSearch({ onCustomerSelect, selectedCustomerName }: CustomerSearchProps) {
  const [query, setQuery] = useState(selectedCustomerName || '');
  const [results, setResults] = useState<ICustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const form = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      idNumber: '',
      name: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    // Sync local query state if parent form state changes (e.g. customer selected or sale completed)
    if (selectedCustomerName !== query) {
        setQuery(selectedCustomerName);
    }
  }, [selectedCustomerName]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch(`/api/customers/search?storeId=${storeId}&query=${query}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (customer: ICustomer) => {
    onCustomerSelect(customer);
    setQuery(customer.name); // Update input to show selected customer
    setShowResults(false);
  };
  
  const handleAddNewCustomer = () => {
     setShowResults(false);
     setIsModalOpen(true);
  }

  const onNewCustomerSubmit = async (data: NewCustomerFormValues) => {
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/customers/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });

        const newCustomer = await response.json();

        if (!response.ok) {
            throw new Error(newCustomer.message || 'Error al crear el cliente.');
        }

        toast({
            title: 'Cliente Creado',
            description: `El cliente "${newCustomer.name}" ha sido registrado.`,
        });

        handleSelect(newCustomer);
        setIsModalOpen(false);
        form.reset();

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
        });
    }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nombre o cédula..."
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!showResults) setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>

      {showResults && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-card shadow-lg z-10">
          {loading && <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>}
          {!loading && (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((customer) => (
                <li
                  key={customer._id}
                  className="p-3 border-b cursor-pointer hover:bg-muted"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">{customer.idNumber}</div>
                </li>
              ))}
               <li
                    className="p-3 border-b cursor-pointer hover:bg-muted flex items-center gap-2 text-primary"
                    onClick={handleAddNewCustomer}
                >
                    <PlusCircle className="h-4 w-4" />
                    <span className="font-medium">Registrar nuevo cliente</span>
                </li>
            </ul>
          )}
        </div>
      )}
      
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Rellena los datos para crear un nuevo cliente en tu base de datos.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onNewCustomerSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="idNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cédula / Identificación</FormLabel>
                                    <FormControl><Input placeholder="V-12345678" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombres y Apellidos</FormLabel>
                                    <FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teléfono (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="0414-1234567" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dirección (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="Av. Principal, Edif. Centro" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cliente"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    </div>
  );
}

    