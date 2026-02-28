// CI ERP — Auth System & RBAC
// localStorage key: ci_erp_auth
// Default admin: admin@cierp.com / admin123

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
}

export interface AuthState {
  access_token: string;
  user: User;
  tenant: Tenant;
}

// Permission definitions per role
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'], // all permissions
  manager: [
    'dashboard.view',
    'sales.orders.view', 'sales.orders.create', 'sales.orders.edit', 'sales.orders.confirm', 'sales.orders.cancel', 'sales.orders.deliver', 'sales.orders.invoice',
    'sales.customers.view', 'sales.customers.create', 'sales.customers.edit', 'sales.customers.delete',
    'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.leads.delete', 'crm.opportunities.view', 'crm.opportunities.edit', 'crm.opportunities.convert', 'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit',
    'purchasing.orders.view', 'purchasing.orders.create', 'purchasing.orders.confirm', 'purchasing.orders.receive', 'purchasing.orders.cancel', 'purchasing.orders.bill', 'purchasing.vendors.view', 'purchasing.vendors.create', 'purchasing.vendors.edit',
    'inventory.products.view', 'inventory.products.create', 'inventory.products.edit', 'inventory.stock.view', 'inventory.adjustments.create', 'inventory.adjustments.validate',
    'accounting.invoices.view', 'accounting.invoices.create', 'accounting.invoices.confirm', 'accounting.invoices.pay', 'accounting.bills.view', 'accounting.bills.create', 'accounting.journals.view', 'accounting.coa.edit',
    'hr.employees.view', 'hr.employees.create', 'hr.employees.edit', 'hr.leave.view', 'hr.leave.approve', 'hr.payroll.view', 'hr.payroll.run',
    'manufacturing.workorders.view', 'manufacturing.workorders.create', 'manufacturing.workorders.start', 'manufacturing.workorders.complete', 'manufacturing.boms.view', 'manufacturing.boms.edit',
    'projects.view', 'projects.create', 'projects.edit', 'projects.tasks.view', 'projects.tasks.create', 'projects.tasks.edit', 'projects.timelog.view', 'projects.timelog.create',
    'helpdesk.tickets.view', 'helpdesk.tickets.create', 'helpdesk.tickets.edit', 'helpdesk.tickets.assign', 'helpdesk.tickets.close', 'helpdesk.queues.manage',
    'approvals.rules.view', 'approvals.requests.view', 'approvals.requests.approve', 'approvals.requests.reject',
    'admin.users.view', 'admin.roles.view', 'admin.audit.view',
  ],
  user: [
    'dashboard.view',
    'sales.orders.view', 'sales.orders.create', 'sales.orders.edit',
    'sales.customers.view', 'sales.customers.create',
    'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.opportunities.view', 'crm.contacts.view', 'crm.contacts.create',
    'purchasing.orders.view', 'purchasing.orders.create', 'purchasing.vendors.view',
    'inventory.products.view', 'inventory.stock.view',
    'accounting.invoices.view', 'accounting.bills.view', 'accounting.journals.view',
    'hr.employees.view', 'hr.leave.view',
    'manufacturing.workorders.view', 'manufacturing.boms.view',
    'projects.view', 'projects.tasks.view', 'projects.tasks.create', 'projects.timelog.view', 'projects.timelog.create',
    'helpdesk.tickets.view', 'helpdesk.tickets.create',
    'approvals.requests.view',
  ],
  viewer: [
    'dashboard.view',
    'sales.orders.view', 'sales.customers.view',
    'crm.leads.view', 'crm.opportunities.view', 'crm.contacts.view',
    'purchasing.orders.view', 'purchasing.vendors.view',
    'inventory.products.view', 'inventory.stock.view',
    'accounting.invoices.view', 'accounting.bills.view', 'accounting.journals.view',
    'hr.employees.view', 'hr.leave.view', 'hr.payroll.view',
    'manufacturing.workorders.view', 'manufacturing.boms.view',
    'projects.view', 'projects.tasks.view', 'projects.timelog.view',
    'helpdesk.tickets.view',
    'approvals.requests.view',
    'admin.audit.view',
  ],
};

export const ALL_PERMISSIONS = [
    'dashboard.view', 'sales.orders.view', 'sales.orders.create', 'sales.orders.edit', 'sales.orders.confirm', 'sales.orders.cancel', 'sales.orders.deliver', 'sales.orders.invoice',
    'sales.customers.view', 'sales.customers.create', 'sales.customers.edit', 'sales.customers.delete',
    'crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.opportunities.view', 'crm.opportunities.edit', 'crm.contacts.view',
    'purchasing.orders.view', 'purchasing.orders.create', 'purchasing.orders.confirm', 'purchasing.orders.receive', 'purchasing.orders.bill', 'purchasing.vendors.view', 'purchasing.vendors.create',
    'inventory.products.view', 'inventory.products.create', 'inventory.products.edit', 'inventory.stock.view',
    'accounting.invoices.view', 'accounting.invoices.create', 'accounting.invoices.confirm', 'accounting.invoices.pay', 'accounting.journals.view',
    'hr.employees.view', 'hr.employees.create', 'hr.employees.edit', 'hr.leave.view', 'hr.leave.approve', 'hr.payroll.view',
    'manufacturing.workorders.view', 'manufacturing.workorders.create', 'manufacturing.workorders.start', 'manufacturing.workorders.complete', 'manufacturing.boms.view', 'manufacturing.boms.edit',
    'projects.view', 'projects.create', 'projects.edit', 'projects.tasks.view', 'projects.tasks.create',
    'helpdesk.tickets.view', 'helpdesk.tickets.create', 'helpdesk.tickets.edit', 'helpdesk.tickets.assign', 'helpdesk.tickets.close',
    'approvals.requests.view', 'approvals.requests.approve', 'approvals.requests.reject',
    'admin.users.view', 'admin.roles.view', 'admin.audit.view'
];

const AUTH_KEY = 'ci_erp_auth';

// Default admin user
const DEFAULT_ADMIN: AuthState = {
  access_token: 'ci-erp-jwt-token-admin-001',
  user: {
    id: 'usr-001',
    email: 'admin@cierp.com',
    full_name: 'CI Admin',
    role: 'admin',
    tenant_id: 'tenant-001',
    is_active: true,
  },
  tenant: {
    id: 'tenant-001',
    name: 'CI ERP',
    slug: 'cierp',
    currency: 'USD',
    timezone: 'UTC',
  },
};

export function login(email: string, password: string): AuthState | null {
  if (email === 'admin@cierp.com' && password === 'admin123') {
    localStorage.setItem(AUTH_KEY, JSON.stringify(DEFAULT_ADMIN));
    return DEFAULT_ADMIN;
  }
  // Check custom users stored in localStorage
  const usersJson = localStorage.getItem('ci_erp_users');
  if (usersJson) {
    const users = JSON.parse(usersJson) as Array<{ email: string; password: string; full_name: string; role: string; id: string; is_active: boolean }>;
    const found = users.find(u => u.email === email && u.password === password && u.is_active);
    if (found) {
      const authState: AuthState = {
        access_token: `ci-erp-jwt-token-${found.id}`,
        user: {
          id: found.id,
          email: found.email,
          full_name: found.full_name,
          role: found.role,
          tenant_id: 'tenant-001',
          is_active: true,
        },
        tenant: DEFAULT_ADMIN.tenant,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(authState));
      return authState;
    }
  }
  return null;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getAuth(): AuthState | null {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthState;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function getUserPermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}