
'use client';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-2 select-none', className)}>
      <div className="flex flex-col items-center justify-center group">
        {/* Texto principal con estética moderna y audaz */}
        <span className="text-6xl md:text-7xl font-black tracking-tighter text-primary italic transform -skew-x-2 transition-transform duration-300 group-hover:scale-105">
          KREA
        </span>
        {/* Detalle visual de subrayado tecnológico */}
        <div className="h-2 w-16 bg-primary mt-[-8px] rounded-full self-end mr-2 shadow-sm shadow-primary/20" />
        
        {/* Subtexto sutil opcional para dar contexto de producto */}
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mt-1 ml-4">
          BUSINESS
        </span>
      </div>
    </div>
  );
}
