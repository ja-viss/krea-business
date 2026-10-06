'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Boxes, CalendarClock, LayoutDashboard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/sales/new', label: 'Venta', icon: ShoppingCart },
    { href: '/inventory', label: 'Stock', icon: Boxes },
    { href: '/layaways', label: 'Créditos', icon: CalendarClock },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-90",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span className={cn("text-[10px] font-black uppercase tracking-tighter", isActive && "font-black")}>
                {item.label}
              </span>
              {isActive && <div className="absolute top-0 h-1 w-8 bg-primary rounded-b-full shadow-[0_2px_4px_rgba(var(--primary),0.2)]" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
