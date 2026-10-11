'use client';

import { Logo } from '@/components/logo';
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
import { LogOut, Menu, ShieldCheck, ChevronLeft, ChevronRight, PanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { SideNav } from '@/components/side-nav';
import { BottomNav } from '@/components/bottom-nav';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  store: string;
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r shadow-xl bg-white z-50">
      <SidebarContent className="scrollbar-hide py-4">
        <SideNav />
      </SidebarContent>
    </Sidebar>
  );
}

function Header({ user, isGlobalAdmin }: { user: User | null; isGlobalAdmin: boolean }) {
  const router = useRouter();
  
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-white/80 backdrop-blur-md px-4 lg:px-6 shadow-sm z-30 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Logo siempre visible en la cabecera para mantener identidad de marca */}
        <Logo className="scale-75 origin-left" />
        <div className="h-6 w-[1px] bg-border mx-1" />
        <SidebarTrigger className="h-10 w-10 hover:bg-primary/5 text-primary" />
      </div>
      
      <div className="flex items-center gap-3">
        {isGlobalAdmin && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Master Access</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/10 hover:border-primary transition-all active:scale-90">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-2 shadow-2xl mt-1 rounded-2xl p-2">
                <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest opacity-50 px-3 pt-2 pb-1">Usuario Activo</DropdownMenuLabel>
                <div className="px-3 pb-3">
                  <p className="text-sm font-black truncate">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 font-black text-xs uppercase p-3 rounded-xl hover:bg-red-50"
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
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedUserId = localStorage.getItem('userId');
    const storedName = localStorage.getItem('userName');
    const storedIsGlobal = localStorage.getItem('isGlobalAdmin') === 'true';
    
    setIsGlobalAdmin(storedIsGlobal);

    if (storedUserId && storedName) {
      setUser({
        id: storedUserId,
        name: storedName,
        email: localStorage.getItem('userEmail') || '',
        store: localStorage.getItem('storeId') || '',
      });
    }
  }, []);

  if (!isMounted) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 bg-[#fcfcfc] relative">
          <Header user={user} isGlobalAdmin={isGlobalAdmin} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col pb-20 lg:pb-0 scrollbar-hide pt-safe">
            {children}
          </main>

          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
