'use client';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-2 select-none', className)}>
      <div className="flex flex-col items-center justify-center">
        {/* Logotipo Tipográfico Premium v2.0 */}
        <span className="text-5xl font-black tracking-tighter text-primary italic transform -skew-x-6 drop-shadow-sm select-none">
          KREA
        </span>
        {/* Barra de acento con el color rosa institucional */}
        <div className="h-1.5 w-16 bg-secondary mt-[-6px] rounded-full self-end mr-1 shadow-lg shadow-secondary/20" />
      </div>
    </div>
  );
}
