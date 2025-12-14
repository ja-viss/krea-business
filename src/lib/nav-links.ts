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
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  children?: NavLink[];
};

export const navLinks: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'sales_manager', 'inventory_manager', 'salesperson', 'warehouse_manager'],
  },
  {
    href: '/sales',
    label: 'Ventas',
    icon: ShoppingCart,
    roles: ['admin', 'sales_manager', 'salesperson'],
  },
  {
    href: '/inventory',
    label: 'Inventario',
    icon: Boxes,
    roles: ['admin', 'inventory_manager', 'warehouse_manager'],
  },
  {
    href: '/expenses',
    label: 'Gastos',
    icon: Receipt,
    roles: ['admin', 'sales_manager'],
  },
  {
    href: '/accounts',
    label: 'Cuentas',
    icon: BookUser,
    roles: ['admin', 'sales_manager'],
  },
  {
    href: '/billing',
    label: 'Facturación',
    icon: FileText,
    roles: ['admin', 'sales_manager'],
  },
  {
    href: '/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['admin', 'sales_manager', 'inventory_manager'],
  },
  {
    href: '/exchange-rates',
    label: 'Tasas de Cambio',
    icon: DollarSign,
    roles: ['admin', 'sales_manager', 'inventory_manager', 'salesperson', 'warehouse_manager'],
  },
  {
    href: '/users',
    label: 'Usuarios',
    icon: Users,
    roles: ['admin'],
  },
  {
    href: '/ai-insights',
    label: 'AI Insights',
    icon: Sparkles,
    roles: ['admin'],
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: Settings,
    roles: ['admin', 'sales_manager', 'inventory_manager', 'salesperson', 'warehouse_manager'],
  },
];
