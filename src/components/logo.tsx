
'use client';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-2 select-none', className)}>
      <div className="flex flex-col items-center justify-center">
        {/* Logotipo tipográfico gigante con estética Krea */}
        <span className="text-6xl md:text-8xl font-black tracking-tighter text-primary italic transform -skew-x-6">
          KREA
        </span>
        <div className="h-2 w-24 bg-primary mt-[-10px] rounded-full self-end mr-4 shadow-xl shadow-primary/30" />
      </div>
    </div>
  );
}
