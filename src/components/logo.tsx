'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative h-12 w-32">
        <Image
          src="/img/krealogo.png"
          alt="Krea Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
