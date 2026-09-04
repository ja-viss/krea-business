'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative h-10 w-10">
        <Image
          src="/img/krealogo.png"
          alt="Krea Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <span className="font-headline text-3xl font-black tracking-tighter text-primary group-data-[collapsible=icon]:hidden">
        Krea
      </span>
    </div>
  );
}
