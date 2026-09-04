'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import logoKrea from '@/img/logo-krea.png';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="relative h-12 w-40">
        <Image
          src={logoKrea}
          alt="Krea Business Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
