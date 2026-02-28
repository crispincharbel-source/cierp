// CI ERP — Main Layout with Premium Sidebar Navigation
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasPermission } from '@/lib/auth';
import { useAuth as useAppAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, ShoppingCart, Users, TrendingUp, Package, Warehouse,
  Receipt, UserCircle, Factory, FolderKanban, Headset, CheckSquare,
  Settings, LogOut, ChevronLeft, ChevronRight, Bell, Search, X, Menu, ScanLine,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Auth Context
type LayoutAuthState = {
  user: {
    full_name: string;
    role: string;
  };
};

interface AuthContextType {
  auth: LayoutAuthState | null;
  checkPermission: (perm: string) => boolean;
  showToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  auth: null,
  checkPermission: () => false,
  showToast: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Navigation items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard.view' },
  { id: 'sales', label: 'Sales & CRM', icon: ShoppingCart, path: '/sales/orders', permission: 'sales.orders.view', children: [
    { label: 'Sales Orders', path: '/sales/orders', permission: 'sales.orders.view' },
    { label: 'Customers', path: '/sales/customers', permission: 'sales.customers.view' },
    { label: 'Leads', path: '/crm/leads', permission: 'crm.leads.view' },
    { label: 'Opportunities', path: '/crm/opportunities', permission: 'crm.opportunities.view' },
    { label: 'Contacts', path: '/crm/contacts', permission: 'crm.contacts.view' },
  ]},
  { id: 'purchasing', label: 'Purchasing', icon: Package, path: '/purchasing/orders', permission: 'purchasing.orders.view', children: [
    { label: 'Purchase Orders', path: '/purchasing/orders', permission: 'purchasing.orders.view' },
    { label: 'Vendors', path: '/purchasing/vendors', permission: 'purchasing.vendors.view' },
  ]},
  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/inventory/products', permission: 'inventory.products.view', children: [
    { label: 'Products', path: '/inventory/products', permission: 'inventory.products.view' },
    { label: 'Stock Levels', path: '/inventory/stock', permission: 'inventory.stock.view' },
  ]},
  { id: 'accounting', label: 'Accounting', icon: Receipt, path: '/accounting/invoices', permission: 'accounting.invoices.view', children: [
    { label: 'Invoices', path: '/accounting/invoices', permission: 'accounting.invoices.view' },
    { label: 'Payments', path: '/accounting/payments', permission: 'accounting.invoices.pay' },
    { label: 'Journal Entries', path: '/accounting/journal', permission: 'accounting.journals.view' },
  ]},
  { id: 'hr', label: 'Human Resources', icon: UserCircle, path: '/hr/employees', permission: 'hr.employees.view', children: [
    { label: 'Employees', path: '/hr/employees', permission: 'hr.employees.view' },
    { label: 'Departments', path: '/hr/departments', permission: 'hr.employees.view' },
    { label: 'Leave Requests', path: '/hr/leave', permission: 'hr.leave.view' },
    { label: 'Payroll', path: '/hr/payroll', permission: 'hr.payroll.view' },
  ]},
  { id: 'manufacturing', label: 'Manufacturing', icon: Factory, path: '/manufacturing/workorders', permission: 'manufacturing.workorders.view', children: [
    { label: 'Work Orders', path: '/manufacturing/workorders', permission: 'manufacturing.workorders.view' },
    { label: 'BOM', path: '/manufacturing/bom', permission: 'manufacturing.boms.view' },
    { label: 'MRP', path: '/manufacturing/mrp', permission: 'manufacturing.workorders.view' },
    { label: 'MES', path: '/manufacturing/mes', permission: 'manufacturing.workorders.view' },
    { label: 'Quality', path: '/manufacturing/quality', permission: 'manufacturing.workorders.view' },
    { label: 'Shop Floor', path: '/manufacturing/shopfloor', permission: 'manufacturing.workorders.view' },
    { label: 'Maintenance', path: '/manufacturing/maintenance', permission: 'manufacturing.workorders.view' },
  ]},
  { id: 'order-tracking', label: 'Order Tracking', icon: ScanLine, path: '/order-tracking', permission: 'manufacturing.workorders.view' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, path: '/projects', permission: 'projects.view' },
  { id: 'helpdesk', label: 'Helpdesk', icon: Headset, path: '/helpdesk', permission: 'helpdesk.tickets.view' },
  { id: 'approvals', label: 'Approvals', icon: CheckSquare, path: '/approvals', permission: 'approvals.requests.view' },
  { id: 'admin', label: 'Admin', icon: Settings, path: '/admin/users', permission: 'admin.users.view', children: [
    { label: 'Users', path: '/admin/users', permission: 'admin.users.view' },
    { label: 'Roles', path: '/admin/roles', permission: 'admin.roles.view' },
    { label: 'Audit Log', path: '/admin/audit', permission: 'admin.audit.view' },
    { label: 'Settings', path: '/admin/settings', permission: 'admin.settings.edit' },
  ]},
];

// Skeleton loader component
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-700/50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// State badge component
export function StateBadge({ state, size = 'sm' }: { state: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    draft: 'bg-slate-600 text-slate-200',
    new: 'bg-slate-600 text-slate-200',
    pending: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
    todo: 'bg-slate-600 text-slate-200',
    qualified: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    qualification: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    confirmed: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    active: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    sent: 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30',
    proposal: 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30',
    negotiation: 'bg-purple-600/20 text-purple-400 border border-purple-600/30',
    open: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    in_progress: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
    review: 'bg-purple-600/20 text-purple-400 border border-purple-600/30',
    planned: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/30',
    delivered: 'bg-orange-600/20 text-orange-400 border border-orange-600/30',
    received: 'bg-orange-600/20 text-orange-400 border border-orange-600/30',
    invoiced: 'bg-green-600/20 text-green-400 border border-green-600/30',
    billed: 'bg-green-600/20 text-green-400 border border-green-600/30',
    paid: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    done: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    completed: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    won: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    resolved: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    closed: 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
    approved: 'bg-green-600/20 text-green-400 border border-green-600/30',
    rejected: 'bg-red-600/20 text-red-400 border border-red-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border border-red-600/30',
    lost: 'bg-red-600/20 text-red-400 border border-red-600/30',
    on_leave: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
    terminated: 'bg-red-600/20 text-red-400 border border-red-600/30',
    on_hold: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
    opportunity: 'bg-purple-600/20 text-purple-400 border border-purple-600/30',
    archived: 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
    reconciled: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
    low: 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
    normal: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    medium: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    high: 'bg-orange-600/20 text-orange-400 border border-orange-600/30',
    urgent: 'bg-red-600/20 text-red-400 border border-red-600/30',
    sick: 'bg-red-600/20 text-red-400 border border-red-600/30',
    annual: 'bg-blue-600/20 text-blue-400 border border-blue-600/30',
    personal: 'bg-purple-600/20 text-purple-400 border border-purple-600/30',
    maternity: 'bg-pink-600/20 text-pink-400 border border-pink-600/30',
    other: 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
  };
  const sizeClass = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center rounded-full font-medium capitalize ${sizeClass} ${colors[state] || 'bg-slate-600 text-slate-200'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// KPI Card component
export function KPICard({ label, value, icon: Icon, onClick, active, color = 'blue' }: {
  label: string; value: string | number; icon?: React.ElementType; onClick?: () => void; active?: boolean; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-600/10 to-blue-600/5 border-blue-600/20 hover:border-blue-500/40',
    green: 'from-emerald-600/10 to-emerald-600/5 border-emerald-600/20 hover:border-emerald-500/40',
    amber: 'from-amber-600/10 to-amber-600/5 border-amber-600/20 hover:border-amber-500/40',
    red: 'from-red-600/10 to-red-600/5 border-red-600/20 hover:border-red-500/40',
    purple: 'from-purple-600/10 to-purple-600/5 border-purple-600/20 hover:border-purple-500/40',
    slate: 'from-slate-600/10 to-slate-600/5 border-slate-600/20 hover:border-slate-500/40',
    orange: 'from-orange-600/10 to-orange-600/5 border-orange-600/20 hover:border-orange-500/40',
    cyan: 'from-cyan-600/10 to-cyan-600/5 border-cyan-600/20 hover:border-cyan-500/40',
  };
  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-400', green: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400',
    purple: 'text-purple-400', slate: 'text-slate-400', orange: 'text-orange-400', cyan: 'text-cyan-400',
  };
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition-all duration-200 ${colorMap[color] || colorMap.blue} ${active ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900' : ''} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
        </div>
        {Icon && <Icon className={`h-8 w-8 ${iconColorMap[color] || 'text-blue-400'} opacity-60`} />}
      </div>
    </button>
  );
}

// Empty State component
export function EmptyState({ title, description, actionLabel, onAction, icon: Icon }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void; icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mb-6">
        {Icon ? <Icon className="h-10 w-10 text-slate-500" /> : <Package className="h-10 w-10 text-slate-500" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 text-center max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Confirmation Modal
export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger = false, children }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; danger?: boolean; children?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-4">{description}</p>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Drawer component
export function Drawer({ open, onClose, title, children, width = 'max-w-2xl' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${width} w-full bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Workflow Ribbon
export function WorkflowRibbon({ states, currentState }: { states: string[]; currentState: string }) {
  const currentIdx = states.indexOf(currentState);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {states.map((state, idx) => {
        const isActive = state === currentState;
        const isPast = idx < currentIdx;
        return (
          <React.Fragment key={state}>
            {idx > 0 && <div className={`h-0.5 w-4 flex-shrink-0 ${isPast || isActive ? 'bg-blue-500' : 'bg-slate-700'}`} />}
            <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
              isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' :'bg-slate-800 text-slate-500'
            }`}>
              {state.replace(/_/g, ' ')}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Permission Button (disabled with tooltip if no permission)
export function PermButton({ permission, onClick, children, className = '', variant = 'primary', disabled = false }: {
  permission: string; onClick: () => void; children: React.ReactNode; className?: string; variant?: 'primary' | 'danger' | 'secondary' | 'ghost'; disabled?: boolean;
}) {
  const { checkPermission } = useAuth();
  const hasPerm = checkPermission(permission);
  const baseClasses = 'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 inline-flex items-center gap-1.5';
  const variantClasses = {
    primary: hasPerm && !disabled ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed',
    danger: hasPerm && !disabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed',
    secondary: hasPerm && !disabled ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500 cursor-not-allowed',
    ghost: hasPerm && !disabled ? 'hover:bg-slate-700/50 text-slate-300' : 'text-slate-600 cursor-not-allowed',
  };
  return (
    <div className="relative group inline-block">
      <button
        onClick={hasPerm && !disabled ? onClick : undefined}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        disabled={!hasPerm || disabled}
      >
        {children}
      </button>
      {!hasPerm && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Insufficient permission: {permission}
        </div>
      )}
    </div>
  );
}

// Main Layout
export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isReady, logout: appLogout } = useAppAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const auth = user
    ? {
        user: {
          full_name: user.full_name,
          role: user.roles?.[0] || 'user',
        },
      }
    : null;

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [isReady, user, navigate]);

  // Auto-expand nav based on current path
  useEffect(() => {
    const path = location.pathname;
    for (const item of NAV_ITEMS) {
      if (item.children?.some(c => path.startsWith(c.path))) {
        setExpandedNav(item.id);
        break;
      } else if (path === item.path) {
        setExpandedNav(null);
        break;
      }
    }
  }, [location.pathname]);

  const checkPermission = useCallback((perm: string) => {
    if (!auth) return false;
    return hasPermission(auth.user.role, perm);
  }, [auth]);


  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.warning(message);
  }, []);

  const handleLogout = async () => {
    await appLogout();
    navigate('/login', { replace: true });
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!auth) return null;

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.children) return item.children.some(c => location.pathname.startsWith(c.path));
    return location.pathname === item.path;
  };

  return (
    <AuthContext.Provider value={{ auth, checkPermission, showToast }}>
      <Toaster position="top-right" theme="dark" richColors closeButton duration={4000} />
      <div className="min-h-screen bg-slate-950 flex">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 h-screen z-40 flex flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className={`flex items-center h-16 border-b border-slate-800/80 px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">CI</span>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-slate-100 leading-tight">CI ERP</h1>
                <p className="text-[10px] text-slate-500 leading-tight">Crispin Intelligence</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = isParentActive(item);
              const expanded = expandedNav === item.id;
              const hasPerm = checkPermission(item.permission);

              return (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (!hasPerm) return;
                      if (item.children) {
                        setExpandedNav(expanded ? null : item.id);
                        if (!expanded) navigate(item.path);
                      } else {
                        navigate(item.path);
                      }
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active ? 'bg-blue-600/10 text-blue-400' : hasPerm ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 cursor-not-allowed'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.children && (
                      <ChevronRight className={`h-3.5 w-3.5 ml-auto transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                  {/* Sub-items */}
                  {!collapsed && item.children && expanded && (
                    <div className="ml-8 mt-0.5 space-y-0.5">
                      {item.children.map(child => (
                        <button
                          key={child.path}
                          onClick={() => { navigate(child.path); setMobileOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            isActive(child.path) ? 'text-blue-400 bg-blue-600/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                          }`}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-slate-800/80 p-2 space-y-0.5">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-600/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-14 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50 w-64">
                <Search className="h-4 w-4 text-slate-500" />
                <input type="text" placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{auth.user.full_name.charAt(0)}</span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-medium text-slate-200 leading-tight">{auth.user.full_name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight capitalize">{auth.user.role}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}