
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { 
    PlusCircle, 
    Search, 
    Store as StoreIcon, 
    ShieldCheck, 
    UserPlus, 
    Users as UsersIcon,
    Lock,
    KeyRound,
    CheckCircle2,
    Ban,
    MoreHorizontal
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { NewUserDialog } from '@/components/users/new-user-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface User {
  _id: string;
  name: string;
  email: string;
  active: boolean;
  role: { _id: string; name: string };
  store: { _id: string; name: string };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchUsersAndStore = async () => {
      try {
        setLoading(true);
        const storeId = localStorage.getItem('storeId');
        const isMaster = localStorage.getItem('isGlobalAdmin') === 'true';
        setIsGlobal(isMaster);

        if (!storeId) throw new Error('No se ha iniciado sesión.');

        const [usersRes, storeRes] = await Promise.all([
            fetch(`/api/users?storeId=${storeId}`),
            fetch(`/api/settings/store?storeId=${storeId}`)
        ]);

        if (!usersRes.ok) throw new Error('Error cargando personal.');
        
        setUsers(await usersRes.json());
        if (storeRes.ok) setStoreInfo(await storeRes.json());

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchUsersAndStore();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const userLimitReached = storeInfo ? users.length >= storeInfo.maxUsers : false;
  const progressPercent = storeInfo ? (users.length / storeInfo.maxUsers) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title={isGlobal ? "Control Global de Cuentas" : "Gestión de Personal"}
          description={isGlobal ? "Directorio maestro de todos los operadores del sistema." : "Administra los accesos y cargos de tu equipo comercial."}
          actions={
            !isGlobal && (
                <Button 
                    className="font-black uppercase shadow-lg shadow-primary/20 h-11" 
                    onClick={() => setIsDialogOpen(true)}
                    disabled={userLimitReached}
                >
                    <UserPlus className="mr-2 h-4 w-4" /> Registrar Empleado
                </Button>
            )
          }
        />

        {!isGlobal && storeInfo && (
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-2 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                            <UsersIcon className="h-3 w-3" /> Capacidad de Equipo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl font-black">{users.length} <span className="text-sm text-muted-foreground">/ {storeInfo.maxUsers}</span></span>
                            <Badge variant={userLimitReached ? "destructive" : "secondary"} className="text-[9px] font-black uppercase">
                                Plan {storeInfo.plan || 'BASIC'}
                            </Badge>
                        </div>
                        <Progress value={progressPercent} className="h-1.5" />
                        <p className="text-[9px] font-medium text-muted-foreground italic">
                            {userLimitReached ? "Has alcanzado el límite de tu plan." : `Te quedan ${storeInfo.maxUsers - users.length} cupos disponibles.`}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20 border-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase text-primary">Operadores Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-primary">{users.filter(u => u.active).length}</div>
                        <p className="text-[9px] font-bold text-green-600 mt-1 uppercase">Con acceso al sistema</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-dashed bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase opacity-60">Seguridad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-[10px] font-medium leading-relaxed italic opacity-70">
                            Recomendamos asignar cargos específicos (Vendedor/Almacén) para proteger la información financiera sensible.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )}

        <NewUserDialog 
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onUserAdded={fetchUsersAndStore}
        />

        <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre o usuario..."
                    className="pl-9 h-11 font-bold border-2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fallo de Conexión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-2xl border-2 bg-card shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] pl-6">Identidad / Perfil</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Acceso (User)</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Cargo Asignado</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Estado</TableHead>
                <TableHead className="w-[50px] pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user._id} className="hover:bg-primary/[0.02] transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10">
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">
                            {user.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-black uppercase text-xs tracking-tight">{user.name}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">ID: {user._id.slice(-6)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] font-bold text-slate-500">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-black border-primary/20 bg-primary/5 text-primary text-[9px] uppercase px-3 py-1">
                        {user.role?.name || 'SIN CARGO'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        {user.active ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-[8px] font-black uppercase">ACTIVO</Badge>
                        ) : (
                            <Badge variant="destructive" className="text-[8px] font-black uppercase">BLOQUEADO</Badge>
                        )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border-2 shadow-2xl">
                          <DropdownMenuItem className="font-bold text-xs uppercase cursor-pointer p-3">
                             <KeyRound className="mr-2 h-4 w-4" /> Cambiar Clave
                          </DropdownMenuItem>
                          <DropdownMenuItem className="font-bold text-xs uppercase cursor-pointer p-3">
                             <ShieldCheck className="mr-2 h-4 w-4" /> Editar Permisos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 font-black text-xs uppercase cursor-pointer p-3">
                             {user.active ? <Ban className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                             {user.active ? "Suspender Acceso" : "Reactivar Cuenta"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic font-medium">
                    No hay empleados registrados con esos criterios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
