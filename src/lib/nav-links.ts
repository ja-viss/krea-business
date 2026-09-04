
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
  HardDriveDownload,
  Calculator,
  RotateCcw,
  Truck,
  ClipboardList,
  Fingerprint,
  Wallet,
  Scale,
  Printer,
  Layers
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  isGlobal?: boolean;
  category?: string;
  moduleKey?: 'inventory' | 'sales' | 'expenses' | 'reports';
};

export const navLinks: NavLink[] = [
  // --- SECCION GLOBAL ---
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
    href: '/admin/saas-billing',
    label: 'Control de Pagos',
    icon: CreditCard,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Control Comercial',
  },

  // --- SECCION OPERATIVA ---
  {
    href: '/dashboard',
    label: 'Resumen',
    icon: LayoutDashboard,
    roles: ['Administrador Principal', 'Vendedor'],
    category: 'General',
  },
  {
    href: '/cash-control',
    label: 'Arqueo de Caja',
    icon: Calculator,
    roles: ['Administrador Principal', 'Vendedor'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/quotes',
    label: 'Cotizaciones',
    icon: ClipboardList,
    roles: ['Administrador Principal', 'Vendedor'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/sales',
    label: 'Ventas / POS',
    icon: ShoppingCart,
    roles: ['Administrador Principal', 'Vendedor'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/returns',
    label: 'Devoluciones',
    icon: RotateCcw,
    roles: ['Administrador Principal'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/inventory',
    label: 'Existencias',
    icon: Boxes,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },
  {
    href: '/inventory/composite',
    label: 'Kits y Combos',
    icon: Layers,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },
  {
    href: '/inventory/labels',
    label: 'Etiquetado',
    icon: Tag,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },
  {
    href: '/purchases',
    label: 'Compras (Entradas)',
    icon: Truck,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },
  {
    href: '/expenses',
    label: 'Gastos de Negocio',
    icon: Receipt,
    roles: ['Administrador Principal'],
    category: 'Finanzas',
    moduleKey: 'expenses',
  },
  {
    href: '/accounts',
    label: 'Cuentas x Cobrar',
    icon: Wallet,
    roles: ['Administrador Principal'],
    category: 'Finanzas',
    moduleKey: 'expenses',
  },
  {
    href: '/audit-logs',
    label: 'Logs de Auditoría',
    icon: Fingerprint,
    roles: ['Administrador Principal'],
    category: 'Seguridad',
    moduleKey: 'reports',
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: Settings,
    roles: ['Administrador Principal'],
    category: 'Seguridad',
  },
  {
    href: '/settings/hardware',
    label: 'Hardware / Periféricos',
    icon: Printer,
    roles: ['Administrador Principal'],
    category: 'Seguridad',
  },
];
