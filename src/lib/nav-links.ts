
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
  ShieldCheck,
  Zap,
  MessageSquare,
  CreditCard,
  History,
  Tag,
  Mail,
  ShieldAlert,
  Monitor,
  Package2,
  HardDriveDownload
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  isGlobal?: boolean;
  category?: string;
};

export const navLinks: NavLink[] = [
  // --- SECCION GLOBAL (Krea Admin) ---
  {
    href: '/dashboard',
    label: 'Dashboard / Inicio',
    icon: Monitor,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Monitoreo Principal',
  },
  {
    href: '/admin/stores',
    label: 'Empresas (Tenants)',
    icon: Store,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Gestión de Clientes',
  },
  {
    href: '/admin/offline-deployments',
    label: 'Despliegue Offline',
    icon: HardDriveDownload,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Gestión de Clientes',
  },
  {
    href: '/admin/users',
    label: 'Usuarios Globales',
    icon: Users,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Gestión de Clientes',
  },
  {
    href: '/admin/saas-billing',
    label: 'Control de Pagos',
    icon: CreditCard,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Control Comercial',
  },
  {
    href: '/admin/plans',
    label: 'Planes y Tarifas',
    icon: Tag,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Control Comercial',
  },
  {
    href: '/admin/settings',
    label: 'Configuración Sistema',
    icon: Settings,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Herramientas Dev',
  },
  {
    href: '/admin/system-logs',
    label: 'Logs y Auditoría',
    icon: History,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Herramientas Dev',
  },
  
  // --- SECCION OPERATIVA (Usuarios de Tiendas) ---
  {
    href: '/dashboard',
    label: 'Resumen',
    icon: LayoutDashboard,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario', 'Vendedor', 'Almacenista'],
    category: 'Operaciones',
  },
  {
    href: '/sales',
    label: 'Ventas / POS',
    icon: ShoppingCart,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Vendedor'],
    category: 'Operaciones',
  },
  {
    href: '/inventory',
    label: 'Inventario',
    icon: Boxes,
    roles: ['Administrador Principal', 'Gerente de Inventario', 'Almacenista'],
    category: 'Inventario',
  },
  {
    href: '/expenses',
    label: 'Gastos',
    icon: Receipt,
    roles: ['Administrador Principal', 'Gerente de Ventas'],
    category: 'Finanzas',
  },
  {
    href: '/accounts',
    label: 'Cuentas x Cobrar/Pagar',
    icon: BookUser,
    roles: ['Administrador Principal', 'Gerente de Ventas'],
    category: 'Finanzas',
  },
  {
    href: '/reports',
    label: 'Reportes y Kardex',
    icon: BarChart3,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario'],
    category: 'Administración',
  },
  {
    href: '/ai-insights',
    label: 'AI Insights',
    icon: Sparkles,
    roles: ['Administrador Principal'],
    category: 'Administración',
  },
  {
    href: '/settings',
    label: 'Configuración Fiscal',
    icon: Settings,
    roles: ['Administrador Principal', 'Gerente de Ventas', 'Gerente de Inventario', 'Vendedor', 'Almacenista'],
    category: 'Administración',
  },
];
