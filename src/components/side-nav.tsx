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

  useEffect(() => {
    setIsGlobalAdmin(localStorage.getItem('isGlobalAdmin') === 'true');
  }, []);

  // Filtrar links: Si es global admin, mostrar solo los marcados como isGlobal.
  // Si no es global, mostrar el resto según roles (aquí simplificado para mostrar todo lo no-global)
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
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive && 'bg-muted text-primary'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="font-medium">{link.label}</span>
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
