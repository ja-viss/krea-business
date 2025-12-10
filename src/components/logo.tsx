'use client';

import { cn } from '@/lib/utils';
import { useId } from 'react';

const KreaIcon = (props: React.SVGProps<SVGSVGElement>) => {
  const gradientId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 60"
      width="40"
      height="40"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M25,0 L40,0 L15,30 L0,30 Z M60,0 L75,0 L100,30 L85,30 Z M75,60 L60,60 L85,30 L100,30 Z M40,60 L25,60 L0,30 L15,30 Z"
        transform="skewX(-20)"
      />
    </svg>
  );
};


export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <KreaIcon />
      <span className="font-headline text-3xl font-bold text-primary group-data-[collapsible=icon]:hidden">Krea</span>
    </div>
  );
}