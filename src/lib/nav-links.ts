
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LucideIcon,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Store,
  CreditCard,
  Tag,
  Monitor,
  Calculator,
  RotateCcw,
  Truck,
  ClipboardList,
  Fingerprint,
  Wallet,
  Printer,
  Layers,
  UserCheck,
  ShieldCheck,
  Database,
  ShieldAlert,
  Zap,
  Settings2,
  Activity,
  ScrollText
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

/**
 * Mapa de Navegación Maestro con Seguridad RBAC Estricta.
 */
export const navLinks: NavLink[] = [
  // --- SECCION GLOBAL (SÓLO SUPER ADMIN) ---
  {
    href: '/dashboard',
    label: 'Consola Maestra',
    icon: Monitor,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Infraestructura',
  },
  {
    href: '/admin/monitoring',
    label: 'Telemetría y Logs',
    icon: Activity,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Infraestructura',
  },
  {
    href: '/admin/stores',
    label: 'Agencias y Datos',
    icon: Database,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Infraestructura',
  },
  {
    href: '/admin/saas-billing',
    label: 'Cuentas SaaS',
    icon: CreditCard,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Infraestructura',
  },
  {
    href: '/admin/users',
    label: 'Acceso Global',
    icon: Users,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Infraestructura',
  },
  {
    href: '/admin/plans',
    label: 'Planes y Tarifas',
    icon: Settings2,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Estrategia',
  },
  {
    href: '/admin/offline-deployments',
    label: 'Nodos Locales',
    icon: Zap,
    roles: ['SUPER_ADMIN_MASTER'],
    isGlobal: true,
    category: 'Estrategia',
  },

  // --- SECCION OPERATIVA (TIENDAS) ---
  {
    href: '/dashboard',
    label: 'Resumen Diario',
    icon: LayoutDashboard,
    roles: ['Administrador Principal', 'Contador', 'Vendedor', 'Almacenista'],
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
    href: '/sales/new',
    label: 'Terminal POS',
    icon: ShoppingCart,
    roles: ['Administrador Principal', 'Vendedor'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/sales',
    label: 'Historial Ventas',
    icon: Receipt,
    roles: ['Administrador Principal', 'Vendedor', 'Contador'],
    category: 'Operaciones',
    moduleKey: 'sales',
  },
  {
    href: '/quotes',
    label: 'Presupuestos',
    icon: ClipboardList,
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

  // --- SECCION LOGÍSTICA ---
  {
    href: '/inventory',
    label: 'Stock Físico',
    icon: Boxes,
    roles: ['Administrador Principal', 'Almacenista', 'Vendedor', 'Contador'],
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
    href: '/purchases',
    label: 'Pedidos (Compras)',
    icon: Truck,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },
  {
    href: '/inventory/labels',
    label: 'Imprimir Etiquetas',
    icon: Tag,
    roles: ['Administrador Principal', 'Almacenista'],
    category: 'Inventario',
    moduleKey: 'inventory',
  },

  // --- SECCION FINANCIERA ---
  {
    href: '/reports',
    label: 'BI & Fiscal',
    icon: BarChart3,
    roles: ['Administrador Principal', 'Contador'],
    category: 'Finanzas',
    moduleKey: 'reports',
  },
  {
    href: '/expenses',
    label: 'Egresos',
    icon: Wallet,
    roles: ['Administrador Principal', 'Contador'],
    category: 'Finanzas',
    moduleKey: 'expenses',
  },
  {
    href: '/accounts',
    label: 'Cuentas x Cobrar',
    icon: CreditCard,
    roles: ['Administrador Principal', 'Contador'],
    category: 'Finanzas',
    moduleKey: 'expenses',
  },

  // --- SECCION SEGURIDAD ---
  {
    href: '/users',
    label: 'Personal',
    icon: Users,
    roles: ['Administrador Principal'],
    category: 'Configuración',
  },
  {
    href: '/audit-logs',
    label: 'Auditoría',
    icon: Fingerprint,
    roles: ['Administrador Principal', 'Contador'],
    category: 'Configuración',
  },
  {
    href: '/settings',
    label: 'Fiscal & Tienda',
    icon: Settings,
    roles: ['Administrador Principal'],
    category: 'Configuración',
  },
];
