'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Store as StoreIcon, ShieldCheck } from 'lucide-react';
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
import { MoreHorizontal, AlertTriangle, UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface Role {
  _id: string;
  name: string;
}
interface Store {
  _id: string;
  name: string;
}
interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  store: Store;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const storeId = localStorage.getItem('storeId');
        const isMaster = localStorage.getItem('isGlobalAdmin') === 'true';
        setIsGlobal(isMaster);

        if (!storeId) {
            throw new Error('No se ha iniciado sesión.');
        }

        const response = await fetch(`/api/users?storeId=${storeId}`);
        if (!response.ok) {
          throw new Error('No se pudieron obtener los usuarios del sistema.');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.store?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title={isGlobal ? "Gestión de Soporte a Usuarios" : "Directorio de Personal"}
          description={isGlobal ? "Administra el acceso de todos los usuarios registrados en la plataforma." : "Gestiona los usuarios y roles de tu tienda."}
          actions={
            !isGlobal && (
                <Button className="font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Registrar Usuario
                </Button>
            )
          }
        />

        <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nombre, email o tienda..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error de Sistema</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-xl border-2 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px]">Identidad</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Acceso (Email/User)</TableHead>
                <TableHead className="font-black uppercase text-[10px]">Rol Asignado</TableHead>
                {isGlobal && <TableHead className="font-black uppercase text-[10px]">Empresa / Cliente</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-[150px]" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                    {isGlobal && <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>}
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-primary/10">
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">
                            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-black uppercase text-xs tracking-tight">{user.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary text-[10px] uppercase">
                        {user.role?.name || 'SIN ROL'}
                      </Badge>
                    </TableCell>
                    {isGlobal && (
                        <TableCell>
                            <div className="flex items-center gap-2 font-black text-[10px] uppercase text-muted-foreground">
                                <StoreIcon className="h-3 w-3 opacity-50" />
                                {user.store?.name || 'MAESTRO'}
                            </div>
                        </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="font-bold text-xs">VER PERFIL</DropdownMenuItem>
                          <DropdownMenuItem className="font-bold text-xs">EDITAR PERMISOS</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 font-bold text-xs">SUSPENDER ACCESO</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isGlobal ? 5 : 4} className="h-32 text-center text-muted-foreground italic text-sm">
                    No se encontraron usuarios que coincidan con la búsqueda.
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
