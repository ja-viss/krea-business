
'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Logo({ className }: { className?: string }) {
  // Buscamos el placeholder por si la imagen física no carga
  const logoPlaceholder = PlaceHolderImages.find(img => img.id === 'krea-logo-placeholder')?.imageUrl || '';

  return (
    <div className={cn('flex items-center justify-center p-2', className)}>
      <div className="relative h-24 w-64 md:h-28 md:w-72">
        <Image
          // Usamos la ruta directa para evitar errores de importación de módulo si el archivo no existe en src
          src="/img/krealogo.png"
          alt="Krea Business Logo"
          fill
          className="object-contain"
          priority
          // Si la imagen falla (porque no se ha subido aún), mostramos el placeholder
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = logoPlaceholder;
          }}
        />
      </div>
    </div>
  );
}
