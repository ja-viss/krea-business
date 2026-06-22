
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
import { ShieldAlert, Zap, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export function SideNav() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [enabledModules, setEnabledModules] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  useEffect(() => {
    setIsGlobalAdmin(localStorage.getItem('isGlobalAdmin') === 'true');
    const modulesRaw = localStorage.getItem('enabledModules');
    if (modulesRaw) {
        setEnabledModules(JSON.parse(modulesRaw));
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filteredLinks = navLinks.filter(link => {
    // 1. Si es Admin Global, solo ve links de Global
    if (isGlobalAdmin) {
      return link.isGlobal === true;
    }
    
    // 2. Si es usuario de tienda, filtrar por roles y MODULE FLAGS
    if (link.isGlobal) return false;

    // Validación de Feature Flag (Banderas de Módulo)
    if (link.moduleKey && enabledModules) {
        if (enabledModules[link.moduleKey] === false) return false;
    }

    return true;
  });

  const categories = Array.from(new Set(filteredLinks.map(l => l.category || 'General')));

  const confirmMaintenance = async () => {
    setIsTogglingMaintenance(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsMaintenanceActive(!isMaintenanceActive);
    setIsTogglingMaintenance(false);
    setIsMaintenanceDialogOpen(false);
    
    toast({
        title: !isMaintenanceActive ? "SISTEMA PAUSADO" : "SISTEMA ONLINE",
        description: !isMaintenanceActive 
            ? "El modo mantenimiento global ha sido activado."
            : "La plataforma Krea Business vuelve a estar operativa.",
        variant: !isMaintenanceActive ? "destructive" : "default"
    });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full justify-between py-4">
        <nav className="flex flex-col gap-6 px-4">
            {categories.map(category => (
                <div key={category} className="space-y-1">
                    <p className="px-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-2">
                        {category}
                    </p>
                    <div className="space-y-1">
                        {filteredLinks
                            .filter(link => (link.category || 'General') === category)
                            .map((link: NavLink) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Tooltip key={`${link.href}-${link.label}`}>
                                    <TooltipTrigger asChild>
                                        <Link
                                        href={link.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/5',
                                            isActive && 'bg-primary/10 text-primary font-black border-l-4 border-primary rounded-l-none'
                                        )}
                                        >
                                        <link.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                                        <span className={cn("text-xs font-bold uppercase tracking-tight", isActive && "font-black")}>{link.label}</span>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>{link.label}</p>
                                    </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                    </div>
                </div>
            ))}
        </nav>

        {isGlobalAdmin && (
            <div className="px-4 mt-8 pt-4 border-t">
                <button
                    onClick={() => setIsMaintenanceDialogOpen(true)}
                    disabled={isTogglingMaintenance}
                    className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl p-3 transition-all border-2 border-dashed",
                        isMaintenanceActive 
                            ? "bg-red-500 text-white border-red-600 shadow-lg animate-pulse" 
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Zap className={cn("h-4 w-4", isMaintenanceActive ? "fill-white" : "fill-amber-500")} />
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase leading-none">Mantenimiento</p>
                            <p className="text-[9px] font-bold opacity-80">{isMaintenanceActive ? 'SISTEMA PAUSADO' : 'SISTEMA ONLINE'}</p>
                        </div>
                    </div>
                    {isTogglingMaintenance && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>

                <AlertDialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                    <AlertDialogContent className="border-4 border-amber-500">
                        <AlertDialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="h-8 w-8 text-amber-600" />
                                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Confirmación Maestra</AlertDialogTitle>
                            </div>
                            <AlertDialogDescription className="text-base font-bold text-foreground">
                                {isMaintenanceActive 
                                    ? "¿Deseas reactivar el acceso global?" 
                                    : "Estás a punto de activar el MODO MANTENIMIENTO GLOBAL. Esto cerrará el acceso a todos los usuarios."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel className="font-bold">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={confirmMaintenance} 
                                className={cn("font-black uppercase", isMaintenanceActive ? "bg-green-600" : "bg-red-600")}
                            >
                                {isMaintenanceActive ? "Restaurar" : "Pausar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </div>
    </TooltipProvider>
  );
}
