import {
  BarChart3,
  BookUser,
  Boxes,
  DollarSign,
  FileText,
  LayoutDashboard,
  LucideIcon,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Store,
  ShieldCheck
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  isGlobal?: boolean;
};

export const navLinks: NavLink[] = [
  // --- SECCION GLOBAL (Solo Super Desarrollador) ---
  {
    href: '/dashboard',
    label: 'Dashboard Sistema',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
  },
  {
    href: '/admin/stores',
    label: 'Empresas',
    icon: Store,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
  },
  {
    href: '/users',
    label: 'Soporte Usuarios',
    icon: Users,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
  },
  
  // --- SECCION OPERATIVA (Tiendas) ---
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario', 'Vendedor', 'Almacenista'],
  },
  {
    href: '/sales',
    label: 'Ventas',
    icon: ShoppingCart,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Vendedor'],
  },
  {
    href: '/inventory',
    label: 'Inventario',
    icon: Boxes,
    roles: ['Administrador Principal', 'Gerente de Inventario', 'Almacenista'],
  },
  {
    href: '/expenses',
    label: 'Gastos',
    icon: Receipt,
    roles: ['Administrador Principal', 'Gerente de Ventas'],
  },
  {
    href: '/accounts',
    label: 'Cuentas',
    icon: BookUser,
    roles: ['Administrador Principal', 'Gerente de Ventas'],
  },
  {
    href: '/billing',
    label: 'Facturación',
    icon: FileText,
    roles: ['Administrador Principal', 'Gerente de Ventas'],
  },
  {
    href: '/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario'],
  },
  {
    href: '/exchange-rates',
    label: 'Tasas de Cambio',
    icon: DollarSign,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario', 'Vendedor', 'Almacenista'],
  },
  {
    href: '/users',
    label: 'Usuarios',
    icon: Users,
    roles: ['Administrador Principal'],
  },
  {
    href: '/ai-insights',
    label: 'AI Insights',
    icon: Sparkles,
    roles: ['Administrador Principal'],
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: Settings,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario', 'Vendedor', 'Almacenista'],
  },
];
