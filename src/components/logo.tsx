
'use client';

import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Logo({ className }: { className?: string }) {
  // Obtenemos el placeholder de seguridad para evitar el estado de "cargando infinito"
  const logoPlaceholder = PlaceHolderImages.find(img => img.id === 'krea-logo-placeholder')?.imageUrl || 'https://placehold.co/600x200/0047AB/white?text=KREA+BUSINESS';

  return (
    <div className={cn('flex items-center justify-center p-4', className)}>
      <div className="relative flex items-center justify-center">
        <img
          // Intentamos cargar la imagen física del sistema
          src="/img/krealogo.png"
          alt="Krea Business"
          className="h-28 w-auto md:h-32 object-contain transition-all duration-500 ease-in-out"
          // Si la imagen física no existe o falla, cargamos el placeholder instantáneamente
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== logoPlaceholder) {
              target.src = logoPlaceholder;
            }
          }}
        />
      </div>
    </div>
  );
}
