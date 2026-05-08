'use client';

import { Logo } from '@/components/logo';
import { type NavLink } from '@/lib/nav-links';
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
import { ChevronDown, LogOut, PanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SideNav } from '@/components/side-nav';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Skeleton } from '@/components/ui/skeleton';


interface User {
  id: string;
  name: string;
  email: string;
  store: string;
}

const DesktopSidebar = () => (
  <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r">
    <div className="flex items-center h-16 px-6 border-b">
        <Logo />
    </div>
    <div className="flex-1 overflow-y-auto">
        <SideNav />
    </div>
  </aside>
);

const MobileSidebar = () => (
    <Sheet>
        <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
                <PanelLeft />
                <span className="sr-only">Toggle Menu</span>
            </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
             <VisuallyHidden>
                <SheetTitle>Menú Principal</SheetTitle>
            </VisuallyHidden>
            <div className="flex items-center h-16 px-6 border-b">
                <Logo />
            </div>
            <SideNav />
        </SheetContent>
    </Sheet>
);

const UserMenu = ({ user }: { user: User | null }) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
    );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setIsClient(true);

    const storedUser = {
        id: localStorage.getItem('userId'),
        name: localStorage.getItem('userName'),
        email: localStorage.getItem('userEmail'),
        store: localStorage.getItem('storeId'),
    };
    
    if (storedUser.id && storedUser.name && storedUser.email && storedUser.store) {
        setUser(storedUser as User);
    } else {
        setUser({ id: 'default', name: "Usuario", email: "email@ejemplo.com", store: 'default' });
    }
  }, []);

  return (
    <div className="flex min-h-screen">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col">
            <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:justify-end">
                {isClient ? <MobileSidebar /> : <Skeleton className="h-8 w-8 lg:hidden" />}
                {isClient ? <UserMenu user={user} /> : <Skeleton className="h-8 w-8 rounded-full" />}
            </header>
            <main className="flex-1">{children}</main>
        </div>
    </div>
  );
}
