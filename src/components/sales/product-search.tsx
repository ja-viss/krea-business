'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Camera } from 'lucide-react';
import { IProduct } from '@/models/Product';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '../inventory/barcode-scanner';
import { useToast } from '@/hooks/use-toast';

interface ProductSearchProps {
  onProductSelect: (product: IProduct) => void;
}

export function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch(`/api/products?storeId=${storeId}&search=${query}`);
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

    const debounce = setTimeout(fetchProducts, 300);
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
    onProductSelect(product);
    setQuery('');
    setResults([]);
  };

  const handleScan = async (scannedCode: string) => {
    setShowScanner(false);
    setLoading(true);
    try {
        const storeId = localStorage.getItem('storeId');
        const response = await fetch(`/api/products/lookup?storeId=${storeId}&code=${scannedCode}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Producto no encontrado');
        }

        toast({
            title: "Producto Encontrado",
            description: `Se añadió ${data.name} a la venta.`,
        });
        handleSelect(data);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="flex gap-2">
        <div className='relative flex-grow'>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar producto por nombre, SKU o código..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setShowScanner(true)}>
            <Camera className="h-4 w-4" />
            <span className="sr-only">Escanear</span>
        </Button>
      </div>

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {(loading || results.length > 0) && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-card shadow-lg z-10">
          {loading && <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>}
          {!loading && results.length > 0 && (
            <ul className="max-h-60 overflow-y-auto">
              {results.map((product) => (
                <li
                  key={product._id}
                  className="p-3 border-b cursor-pointer hover:bg-muted"
                  onClick={() => handleSelect(product)}
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">
                    <span>Stock: {product.stock}</span> | <span>SKU: {product.sku || 'N/A'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
       {!loading && query.length >=2 && results.length === 0 && (
         <div className="absolute top-full mt-1 w-full rounded-md border bg-card shadow-lg z-10 p-4 text-center text-sm text-muted-foreground">
            No se encontraron productos.
        </div>
       )}
    </div>
  );
}
