
'use client';

import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Logo({ className }: { className?: string }) {
  // Placeholder de alta calidad como respaldo inmediato
  const logoPlaceholder = PlaceHolderImages.find(img => img.id === 'krea-logo-placeholder')?.imageUrl || 'https://placehold.co/600x200/0047AB/white?text=KREA+BUSINESS';

  return (
    <div className={cn('flex items-center justify-center p-2', className)}>
      <div className="relative flex items-center justify-center">
        <img
          // Intentamos cargar la imagen física
          src="/img/krealogo.png"
          alt="Krea Business"
          // Tamaño masivo para impacto visual
          className="h-32 md:h-40 w-auto object-contain transition-all duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Si falla la carga de la imagen local, aplicamos el placeholder sin parpadeos
            if (target.src !== logoPlaceholder) {
              target.src = logoPlaceholder;
            }
          }}
        />
      </div>
    </div>
  );
}
