
'use client';

import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-card shadow-sm shrink-0">
    <div className="flex items-center h-24 px-4 border-b justify-center">
        <Logo />
    </div>
    <div className="flex-1 overflow-y-auto pt-4">
        <SideNav />
    </div>
  </aside>
);

const MobileSidebar = () => (
    <Sheet>
        <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
                <PanelLeft className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
            </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 border-r-4 border-primary/20">
             <VisuallyHidden>
                <SheetTitle>Menú Principal</SheetTitle>
            </VisuallyHidden>
            <div className="flex items-center h-24 px-4 border-b justify-center bg-muted/10">
                <Logo />
            </div>
            <div className="h-[calc(100vh-6rem)] overflow-y-auto">
                <SideNav />
            </div>
        </SheetContent>
    </Sheet>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const storedUserId = localStorage.getItem('userId');
    const storedName = localStorage.getItem('userName');
    
    if (storedUserId && storedName) {
        setUser({
            id: storedUserId,
            name: storedName,
            email: localStorage.getItem('userEmail') || '',
            store: localStorage.getItem('storeId') || '',
        });
    } else {
        router.push('/login');
    }
  }, [router]);

  if (!isClient) return null;

  return (
    <div className="flex min-h-[100svh] w-full overflow-hidden bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 lg:px-8 shadow-sm z-30">
                <MobileSidebar />
                
                <div className="flex items-center gap-4">
                    {localStorage.getItem('isGlobalAdmin') === 'true' && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-tight">Super Admin Mode</span>
                        </div>
                    )}
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20 hover:border-primary transition-all">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                                        {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 border-2">
                            <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest opacity-50">Mi Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild className="cursor-pointer font-bold text-xs uppercase p-3">
                                <Link href="/settings">Configuración</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem 
                                className="cursor-pointer text-red-600 font-black text-xs uppercase p-3"
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
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
                {children}
            </main>
        </div>
    </div>
  );
}
