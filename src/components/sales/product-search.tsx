
'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Camera, Zap } from 'lucide-react';
import { IProduct } from '@/models/Product';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '../inventory/barcode-scanner';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductSearchProps {
  onProductSelect: (product: IProduct, quantity?: number) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function ProductSearch({ onProductSelect, inputRef }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Lógica de multiplicador (ej. 12*)
  const [multiplier, setMultiplier] = useState<number>(1);

  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      // Limpiar multiplicador de la query visual
      let searchQuery = query;
      if (query.includes('*')) {
          const parts = query.split('*');
          const qty = parseInt(parts[0]);
          if (!isNaN(qty)) {
              setMultiplier(qty);
              searchQuery = parts[1] || '';
          }
      } else {
          setMultiplier(1);
      }

      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch(`/api/products?storeId=${storeId}&search=${searchQuery}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 150); // Reducido para mayor velocidad
    return () => clearTimeout(debounce);
  }, [query]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleSelect = (product: IProduct) => {
    onProductSelect(product, multiplier);
    setQuery('');
    setResults([]);
    setMultiplier(1);
  };

  const handleScan = async (scannedCode: string) => {
    setShowScanner(false);
    setLoading(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch(`/api/products/lookup?storeId=${storeId}&code=${scannedCode}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message || 'No encontrado');

        toast({ title: "Producto Escaneado", description: `${data.name} añadido (Cant: ${multiplier})` });
        handleSelect(data);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Fallo de Escaneo", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && results.length > 0) {
          e.preventDefault();
          handleSelect(results[0]); // Seleccionar el primero por defecto al dar Enter
      }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="flex gap-2">
        <div className='relative flex-grow'>
            <div className='absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                <Search className="h-4 w-4 text-muted-foreground" />
                {multiplier > 1 && (
                    <Badge variant="outline" className='bg-primary/10 text-primary border-primary/20 h-6 font-black'>
                        {multiplier}x
                    </Badge>
                )}
            </div>
            <Input
                ref={inputRef}
                placeholder="Escanea barras o escribe (ej: 12*Leche)..."
                className={cn(
                    "h-12 text-lg font-bold transition-all",
                    multiplier > 1 ? "pl-16" : "pl-10"
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
            />
            {loading && (
                <div className='absolute right-12 top-1/2 -translate-y-1/2'>
                    <Zap className='h-4 w-4 text-primary animate-pulse fill-primary' />
                </div>
            )}
        </div>
        <Button type="button" variant="outline" size="icon" className='h-12 w-12 border-2' onClick={() => setShowScanner(true)}>
            <Camera className="h-6 w-6" />
        </Button>
      </div>

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {(results.length > 0) && (
        <div className="absolute top-full mt-1 w-full rounded-xl border-2 bg-card shadow-2xl z-[100] overflow-hidden animate-in slide-in-from-top-2">
          <ul className="max-h-80 overflow-y-auto">
            {results.map((product, idx) => (
              <li
                key={product._id}
                className={cn(
                    "p-3 border-b cursor-pointer flex justify-between items-center transition-all",
                    idx === 0 ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted"
                )}
                onClick={() => handleSelect(product)}
              >
                <div className='flex flex-col'>
                    <span className="font-black uppercase text-xs">{product.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                        SKU: {product.sku || 'N/A'} | STOCK: <span className={cn("font-bold", product.stock < product.minStock ? "text-red-500" : "text-green-600")}>{product.stock}</span>
                    </span>
                </div>
                <div className='text-right'>
                    <span className='font-black text-primary text-sm'>Bs. {product.price.toLocaleString('es-VE')}</span>
                    {idx === 0 && <span className='block text-[8px] font-black uppercase text-primary/40'>[Presiona Enter]</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
