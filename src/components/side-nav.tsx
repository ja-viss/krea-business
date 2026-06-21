'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks, type NavLink } from '@/lib/nav-links';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SideNav() {
  const pathname = usePathname();
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsGlobalAdmin(localStorage.getItem('isGlobalAdmin') === 'true');
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Filtrar links: Si es global admin (javistech), mostrar solo los marcados como isGlobal.
  // Si no es global, mostrar el resto de opciones operativas de la tienda.
  const filteredLinks = navLinks.filter(link => {
    if (isGlobalAdmin) {
      return link.isGlobal === true;
    }
    return link.isGlobal !== true;
  });

  return (
    <TooltipProvider>
      <nav className="flex flex-col gap-2 p-4">
        {filteredLinks.map((link: NavLink) => {
          const isActive = pathname === link.href;
          return (
            <Tooltip key={`${link.href}-${link.label}`}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/5',
                    isActive && 'bg-primary/10 text-primary font-bold border-l-4 border-primary rounded-l-none'
                  )}
                >
                  <link.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  <span className="font-medium text-sm">{link.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{link.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
