'use client';

import { Logo } from '@/components/logo';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import type { ReactNode } from 'react';
import { navLinks, type NavLink } from '@/lib/nav-links';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

// Simulación de un usuario que ha iniciado sesión
interface User {
  businessName: string;
  email: string;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const userAvatar = PlaceHolderImages.find(
    (img) => img.id === 'user-avatar-1'
  );

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // En una aplicación real, obtendrías esto de una sesión de usuario.
    // Por ahora, vamos a buscar el primer usuario para simularlo.
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const users = await response.json();
          if (users.length > 0) {
            setUser(users[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        setUser({ businessName: "Negocio", email: "email@ejemplo.com" });
      }
    };
    fetchUser();
  }, []);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navLinks.map((link: NavLink) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href}
                  tooltip={{
                    children: link.label,
                  }}
                >
                  <Link href={link.href}>
                    <link.icon />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {link.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group/user-menu-button flex w-full items-center justify-between gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    {userAvatar && (
                      <AvatarImage
                        src={userAvatar.imageUrl}
                        alt="User avatar"
                        data-ai-hint={userAvatar.imageHint}
                      />
                    )}
                    <AvatarFallback>
                      {user?.businessName?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate group-data-[collapsible=icon]:hidden">{user?.businessName ?? 'Cargando...'}</span>
                </div>
                <ChevronDown className="size-4 shrink-0 opacity-50 transition-transform duration-200 group-data-[state=open]/user-menu-button:rotate-180 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-56"
              sideOffset={10}
            >
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Configuración</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Soporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Logo />
      </div>
    </header>
  );
}