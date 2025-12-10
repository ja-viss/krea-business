'use client';

import { PageHeader } from '@/components/page-header';
import { MobileHeader } from '../layout';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

const usersData = [
  {
    id: 'USR001',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@example.com',
    role: 'Admin',
    avatar: 'https://picsum.photos/seed/avatar-1/40/40',
  },
  {
    id: 'USR002',
    name: 'Maria Santos',
    email: 'maria.santos@example.com',
    role: 'Sales Manager',
    avatar: 'https://picsum.photos/seed/avatar-2/40/40',
  },
  {
    id: 'USR003',
    name: 'Carlos Gomez',
    email: 'carlos.gomez@example.com',
    role: 'Salesperson',
    avatar: 'https://picsum.photos/seed/avatar-3/40/40',
  },
  {
    id: 'USR004',
    name: 'Ana Reyes',
    email: 'ana.reyes@example.com',
    role: 'Inventory Manager',
    avatar: 'https://picsum.photos/seed/avatar-4/40/40',
  },
];

export default function UsersPage() {
  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader />
      <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <PageHeader
          title="Usuarios"
          description="Gestiona los usuarios y roles del sistema."
          actions={
            <Button>
              <PlusCircle />
              Invitar Usuario
            </Button>
          }
        />
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar} alt="Avatar" />
                        <AvatarFallback>
                          {user.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Cambiar Rol</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
