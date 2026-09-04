
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, UserCheck } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface CustomerSearchProps {
  onCustomerSelect: (customer: ICustomer) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const newCustomerSchema = z.object({
  idNumber: z.string().min(1, 'La cédula/ID es obligatoria.'),
  name: z.string().min(3, 'El nombre es obligatorio.'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

export function CustomerSearch({ onCustomerSelect, inputRef }: CustomerSearchProps) {
  const [query, setQuery] = useState('');
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

    const debounce = setTimeout(fetchCustomers, 250);
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
    setQuery('');
    setShowResults(false);
  };
  
  const handleAddNewCustomer = () => {
     setShowResults(false);
     setIsModalOpen(true);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleSelect(results[0]);
    }
  };

  const onNewCustomerSubmit = async (data: NewCustomerFormValues) => {
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch('/api/customers/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, storeId }),
        });
        const newCustomer = await response.json();
        if (!response.ok) throw new Error(newCustomer.message);
        toast({ title: 'Cliente Registrado' });
        handleSelect(newCustomer);
        setIsModalOpen(false);
        form.reset();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="DNI / RIF / Nombre..."
          className="pl-9 h-11 font-bold"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!showResults) setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showResults && (
        <div className="absolute top-full mt-1 w-full rounded-xl border-2 bg-card shadow-2xl z-[110] overflow-hidden">
          {loading && <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Buscando en base de datos...</div>}
          {!loading && (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((customer, idx) => (
                <li
                  key={customer._id}
                  className={cn(
                      "p-3 border-b cursor-pointer flex justify-between items-center transition-colors",
                      idx === 0 ? "bg-primary/5" : "hover:bg-muted"
                  )}
                  onClick={() => handleSelect(customer)}
                >
                  <div className='flex flex-col'>
                      <span className="font-black uppercase text-xs">{customer.name}</span>
                      <span className="text-[10px] font-mono opacity-60">{customer.idNumber}</span>
                  </div>
                  {idx === 0 && <UserCheck className='h-4 w-4 text-primary' />}
                </li>
              ))}
               <li
                    className="p-3 border-b cursor-pointer hover:bg-primary/10 flex items-center gap-3 text-primary transition-colors"
                    onClick={handleAddNewCustomer}
                >
                    <PlusCircle className="h-5 w-5" />
                    <span className="font-black uppercase text-[10px] tracking-widest">Registrar Nuevo (Alt+N)</span>
                </li>
            </ul>
          )}
        </div>
      )}
      
       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className='border-4'>
                <DialogHeader>
                    <DialogTitle className='font-black uppercase italic'>Nuevo Cliente</DialogTitle>
                    <DialogDescription className='font-bold'>Registro rápido para facturación.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onNewCustomerSubmit)} className="space-y-4">
                        <div className='grid grid-cols-2 gap-4'>
                            <FormField
                                control={form.control}
                                name="idNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase'>Identificación</FormLabel>
                                        <FormControl><Input placeholder="V-000000" className='font-mono font-bold' {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className='text-[10px] font-black uppercase'>Teléfono</FormLabel>
                                        <FormControl><Input placeholder="04xx-000000" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className='text-[10px] font-black uppercase'>Nombre / Razón Social</FormLabel>
                                    <FormControl><Input placeholder="Nombre Completo" className='font-bold uppercase' {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className='pt-2'>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" className='font-black uppercase' disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Registrando..." : "Confirmar (Enter)"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
