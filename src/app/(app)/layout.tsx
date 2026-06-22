
'use client';

import { Logo } from '@/components/logo';
import { type NavLink } from '@/lib/nav-links';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, PanelLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SideNav } from '@/components/side-nav';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface User {
  id: string;
  name: string;
  email: string;
  store: string;
}

const DesktopSidebar = () => (
  <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-card">
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const isGlobal = localStorage.getItem('isGlobalAdmin') === 'true';
    const isMasterVerified = localStorage.getItem('master_verified') === 'true';

    // BLOQUEO MAESTRO: Si es admin global pero no ha pasado el segundo login, forzar verificación
    if (isGlobal && !isMasterVerified) {
        router.push('/secure-verify');
        return;
    }

    const storedUser = {
        id: localStorage.getItem('userId'),
        name: localStorage.getItem('userName'),
        email: localStorage.getItem('userEmail'),
        store: localStorage.getItem('storeId'),
    };
    
    if (storedUser.id && storedUser.name) {
        setUser(storedUser as User);
    } else {
        router.push('/login');
    }
  }, [router]);

  if (!isClient) return null;

  return (
    <div className="flex min-h-screen">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col bg-muted/20">
            <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4 lg:px-8">
                <MobileSidebar />
                
                <div className="flex items-center gap-4">
                    {localStorage.getItem('isGlobalAdmin') === 'true' && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-700 uppercase">Master Verified</span>
                        </div>
                    )}
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full border-2 border-primary/10">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                                        {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="font-black text-xs uppercase tracking-tight">Mi Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild className="cursor-pointer font-bold text-xs uppercase">
                                <Link href="/settings">Configuración</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-bold text-xs uppercase">Centro de Soporte</DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem 
                                className="cursor-pointer text-red-600 font-black text-xs uppercase"
                                onClick={() => {
                                    localStorage.clear();
                                    router.push('/login');
                                }}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 flex flex-col">{children}</main>
        </div>
    </div>
  );
}
