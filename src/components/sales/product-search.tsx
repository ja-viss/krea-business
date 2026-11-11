'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Zap, Package } from 'lucide-react';
import type { IProduct } from '@/models/Product';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ProductSearchProps {
  onProductSelect: (product: IProduct, quantity?: number) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductSearch({ onProductSelect, inputRef }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [multiplier, setMultiplier] = useState<number>(1);

  useEffect(() => {
    const fetchProducts = async () => {
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
        const response = await fetch(`/api/products?storeId=${storeId}&search=${encodeURIComponent(searchQuery)}`);
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

    const debounce = setTimeout(fetchProducts, 100);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && results.length > 0) {
          e.preventDefault();
          handleSelect(results[0]);
      }
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="flex gap-2">
        <div className='relative flex-grow'>
            <div className='absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                <Search className="h-4 w-4 text-muted-foreground" />
                {multiplier > 1 && (
                    <Badge variant="outline" className='bg-primary/10 text-primary border-primary/20 h-6 font-black text-[10px]'>
                        {multiplier}x
                    </Badge>
                )}
            </div>
            <Input
                ref={inputRef}
                placeholder="Escanea o busca producto (ej: 12*Harina)..."
                className={cn(
                    "h-12 text-lg font-bold transition-all border-none focus-visible:ring-0 italic",
                    multiplier > 1 ? "pl-16" : "pl-10"
                )}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
            />
            {loading && (
                <div className='absolute right-4 top-1/2 -translate-y-1/2'>
                    <Zap className='h-4 w-4 text-primary animate-pulse fill-primary' />
                </div>
            )}
        </div>
      </div>

      {(results.length > 0) && (
        <div className="absolute top-full mt-2 w-full rounded-2xl border-2 bg-white shadow-3xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
          <ul className="max-h-64 overflow-y-auto">
            {results.map((product, idx) => (
              <li
                key={String(product._id)}
                className={cn(
                    "p-3 border-b last:border-0 cursor-pointer flex justify-between items-center transition-all",
                    idx === 0 ? "bg-slate-50 border-l-4 border-l-primary" : "hover:bg-slate-50"
                )}
                onClick={() => handleSelect(product)}
              >
                <div className='flex items-center gap-4'>
                    <div className='h-12 w-12 rounded-xl bg-slate-100 relative overflow-hidden shrink-0 border'>
                        {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="48px" unoptimized />
                        ) : (
                            <div className='flex h-full w-full items-center justify-center opacity-20'>
                                <Package className='h-6 w-6' />
                            </div>
                        )}
                    </div>
                    <div className='flex flex-col'>
                        <span className="font-black uppercase text-xs leading-tight line-clamp-1 text-slate-800">{product.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-muted-foreground font-mono uppercase">
                                Stock: <span className={cn("font-bold", product.stock < product.minStock ? "text-red-500" : "text-green-600")}>{product.stock}</span>
                            </span>
                            <span className="text-[9px] font-black bg-muted px-1.5 rounded uppercase">{product.category}</span>
                        </div>
                    </div>
                </div>
                <div className='text-right shrink-0'>
                    <span className='font-black text-slate-900 text-sm'>Bs. {product.price.toLocaleString('es-VE')}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
