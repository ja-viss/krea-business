
'use client';

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

  return (
    <TooltipProvider>
      <nav className="flex flex-col gap-2 p-4">
        {navLinks.map((link: NavLink) => {
          const isActive = pathname.startsWith(link.href);
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
                  <span>{link.label}</span>
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
