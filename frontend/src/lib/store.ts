/**
 * CI ERP — Data Store
 * All data functions call the real backend API.
 * Types match the backend response shapes.
 */
import { api } from './api';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role: string;
  is_active: boolean;
}

export interface ManagedRole {
  id: string;
  name: string;
  permissions: string[];
  is_system?: boolean;
}

export interface AuditLog {
  id: string;
  created_at: string;
  actor_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalesOrder {
  id: string;
  number: string;
  customer_id: string;
  customer_name: string;
  salesperson: string;
  order_date: string;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  state: 'draft' | 'confirmed' | 'done' | 'cancelled';
  lines: SalesOrderLine[];
  notes: string;
  invoice_id?: string | null;
}

export interface SalesOrderLine {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  country: string;
}

export interface Lead {
  id: string;
  title: string;
  customer_name: string;
  contact_name: string;
  source: string;
  state: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
  expected_revenue: number;
  probability: number;
  notes?: string;
}

export interface HelpdeskTicket {
  id: string;
  number: string;
  subject: string;
  customer_name: string;
  state: 'new' | 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  replies: TicketReply[];
}

export interface TicketReply {
  id: string;
  body: string;
  author: string;
  created_at: string;
}

export interface DashboardKPIs {
  total_orders: number;
  active_orders: number;
  total_customers: number;
  open_tickets: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  order_date: string;
  state: 'draft' | 'sent' | 'confirmed' | 'received' | 'billed' | 'cancelled';
  lines: POLine[];
  subtotal: number;
  tax_total: number;
  grand_total: number;
}

export interface POLine {
  id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  payment_terms: string;
  notes: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  cost_price: number;
  stock_qty: number;
  reorder_level: number;
  location: string;
  unit: string;
  description: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  type: 'invoice' | 'bill';
  partner_name: string;
  invoice_date: string;
  due_date: string;
  state: 'draft' | 'confirmed' | 'sent' | 'paid' | 'cancelled';
  subtotal: number;
  tax_total: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  reference?: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hire_date: string;
  salary: number;
  status: 'active' | 'on_leave' | 'terminated';
}

export interface LeaveRequest {
  id: string;
  employee_name: string;
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'other';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  state: 'pending' | 'approved' | 'rejected';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  tasks: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  due_date: string;
  time_logged: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRule {
  id: string;
  module: string;
  action: string;
  steps: { step: number; approver_role: string; required: boolean }[];
  is_active: boolean;
}

export interface ApprovalRequest {
  id: string;
  module: string;
  resource_id: string;
  resource_label: string;
  requested_by: string;
  requested_at: string;
  state: 'pending' | 'approved' | 'rejected';
  current_step: number;
  history: { step: number; approver: string; decision: 'approved' | 'rejected'; decided_at: string; comments: string }[];
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  state: 'open' | 'in_progress' | 'resolved' | 'closed';
  queue: string;
  customer_name: string;
  customer_email: string;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  product_name: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  state: 'draft' | 'planned' | 'in_progress' | 'done' | 'cancelled';
  planned_start: string;
  planned_end: string;
  workcenter: string;
  assigned_to: string;
  routing_steps: { step: number; name: string; duration: number; status: 'pending' | 'in_progress' | 'done' }[];
}

export interface BOM {
  id: string;
  product_name: string;
  version: string;
  status: 'active' | 'inactive';
  total_cost: number;
  components: { name: string; qty: number; unit: string; cost: number }[];
}

// ─── User/Role management (used by auth and settings) ──────────────────────

const _defaultAdmin: ManagedUser = {
  id: 'admin',
  full_name: 'CI Admin',
  email: 'admin@cierp.com',
  role: 'admin',
  is_active: true,
};

export const getManagedUsers = (): ManagedUser[] => [_defaultAdmin];
export const createManagedUser = (u: Omit<ManagedUser, 'id'>): ManagedUser => ({ ...u, id: crypto.randomUUID() });
export const updateManagedUser = (id: string, u: Partial<ManagedUser>): ManagedUser => ({ ..._defaultAdmin, ...u, id });
export const getManagedRoles = (): ManagedRole[] => [
  { id: '1', name: 'admin',    permissions: ['*'],                    is_system: true },
  { id: '2', name: 'manager',  permissions: ['sales.*', 'inventory.*'],is_system: true },
  { id: '3', name: 'viewer',   permissions: ['*.view'],               is_system: true },
];
export const createManagedRole = (r: Omit<ManagedRole, 'id'>): ManagedRole => ({ ...r, id: crypto.randomUUID() });
export const updateManagedRole = (id: string, r: Partial<ManagedRole>): ManagedRole => ({ id, name: '', permissions: [], ...r });
export const getAuditLogs = (): AuditLog[] => [];

// ─── Helpers ───────────────────────────────────────────────────────────────

function normPaginated<T>(res: any, pageSize = 20): Paginated<T> {
  // Backend returns { items, total } or arrays
  const items  = res?.items ?? (Array.isArray(res) ? res : []);
  const total  = res?.total ?? items.length;
  const page   = res?.page  ?? 1;
  return { items, total, page, pageSize };
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export const getSalesDashboard = () => api.get<any>('/sales/dashboard');

export const getSalesOrders = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<SalesOrder>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (state) params.set('state', state);
  const res = await api.get<any>(`/sales/orders?${params}`);
  return normPaginated<SalesOrder>(res, pageSize);
};

export const getSalesOrder = (id: string) => api.get<SalesOrder>(`/sales/orders/${id}`);
export const createSalesOrder = (data: Partial<SalesOrder>) => api.post<SalesOrder>('/sales/orders', data);
export const updateSalesOrder = (id: string, data: Partial<SalesOrder>) => api.put<SalesOrder>(`/sales/orders/${id}`, data);
export const deleteSalesOrder = (id: string) => api.delete<void>(`/sales/orders/${id}`);
export const addSalesOrderLine = (orderId: string, line: any) => api.post<SalesOrderLine>(`/sales/orders/${orderId}/lines`, line);
export const updateSalesOrderLine = (lineId: string, data: any) => api.put<SalesOrderLine>(`/sales/orders/lines/${lineId}`, data);
export const deleteSalesOrderLine = (lineId: string) => api.delete<void>(`/sales/orders/lines/${lineId}`);
export const confirmSalesOrder = (id: string) => api.post<SalesOrder>(`/sales/orders/${id}/confirm`, {});
export const cancelSalesOrder = (id: string) => api.post<SalesOrder>(`/sales/orders/${id}/cancel`, {});
export const validateSalesDelivery = (id: string) => api.post<SalesOrder>(`/sales/orders/${id}/validate-delivery`, {});
export const createSalesInvoice = (id: string) => api.post<any>(`/sales/orders/${id}/create-invoice`, {});

export const getCustomers = async (page = 1, pageSize = 20, search?: string): Promise<Paginated<Customer>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (search) params.set('search', search);
  const res = await api.get<any>(`/sales/customers?${params}`);
  return normPaginated<Customer>(res, pageSize);
};
export const createCustomer = (data: Partial<Customer>) => api.post<Customer>('/sales/customers', data);
export const updateCustomer = (id: string, data: Partial<Customer>) => api.put<Customer>(`/sales/customers/${id}`, data);
export const deleteCustomer = (id: string) => api.delete<void>(`/sales/customers/${id}`);

export const getLeads = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<Lead>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (state) params.set('state', state);
  const res = await api.get<any>(`/sales/leads?${params}`);
  return normPaginated<Lead>(res, pageSize);
};
export const createLead = (data: Partial<Lead>) => api.post<Lead>('/sales/leads', data);
export const updateLead = (id: string, data: Partial<Lead>) => api.put<Lead>(`/sales/leads/${id}`, data);

// ─── Helpdesk ──────────────────────────────────────────────────────────────

export const getHelpdeskDashboard = () => api.get<any>('/helpdesk/dashboard');

export const getTickets = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<HelpdeskTicket>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (state) params.set('state', state);
  const res = await api.get<any>(`/helpdesk/tickets?${params}`);
  return normPaginated<HelpdeskTicket>(res, pageSize);
};
export const getTicket = (id: string) => api.get<HelpdeskTicket>(`/helpdesk/tickets/${id}`);
export const createTicket = (data: Partial<HelpdeskTicket>) => api.post<HelpdeskTicket>('/helpdesk/tickets', data);
export const updateTicket = (id: string, data: Partial<Ticket>) => api.put<Ticket>(`/helpdesk/tickets/${id}`, data);
export const addTicketReply = (id: string, body: string) => api.post<TicketReply>(`/helpdesk/tickets/${id}/replies`, { body });

// ─── Purchasing ─────────────────────────────────────────────────────────────

export const getPurchasingDashboard = () => api.get<any>('/purchasing/dashboard');

export const getPurchaseOrders = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<PurchaseOrder>> => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (state) params.set('state', state);
  const res = await api.get<any>(`/purchasing/orders?${params}`);
  return normPaginated<PurchaseOrder>(res, pageSize);
};
export const createPurchaseOrder = (data: Partial<PurchaseOrder>) => api.post<PurchaseOrder>('/purchasing/orders', data);
export const updatePurchaseOrder = (id: string, data: Partial<PurchaseOrder>) => api.put<PurchaseOrder>(`/purchasing/orders/${id}`, data);
export const transitionPurchaseOrder = (id: string, state: string) => {
  if (state === 'confirmed') return api.post<PurchaseOrder>(`/purchasing/orders/${id}/confirm`, {});
  if (state === 'received')  return api.post<PurchaseOrder>(`/purchasing/orders/${id}/receive`, {});
  return api.post<PurchaseOrder>(`/purchasing/orders/${id}/confirm`, { state });
};

export const getVendors = async (): Promise<Vendor[]> => {
  const res = await api.get<any>('/purchasing/suppliers');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createVendor = (data: Partial<Vendor>) => api.post<Vendor>('/purchasing/suppliers', data);
export const updateVendor = (id: string, data: Partial<Vendor>) => api.put<Vendor>(`/purchasing/suppliers/${id}`, data);

// ─── Inventory ─────────────────────────────────────────────────────────────

export const getInventoryDashboard = () => api.get<any>('/inventory/dashboard');

export const getProducts = async (): Promise<Product[]> => {
  const res = await api.get<any>('/inventory/products');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createProduct = (data: Partial<Product>) => api.post<Product>('/inventory/products', data);
export const updateProduct = (id: string, data: Partial<Product>) => api.put<Product>(`/inventory/products/${id}`, data);

// ─── Accounting ─────────────────────────────────────────────────────────────

export const getAccountingDashboard = () => api.get<any>('/accounting/dashboard');

export const getInvoices = async (): Promise<Invoice[]> => {
  const res = await api.get<any>('/accounting/invoices');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createInvoice = (data: Partial<Invoice>) => api.post<Invoice>('/accounting/invoices', data);
export const transitionInvoice = (id: string, state: string) => api.post<Invoice>(`/accounting/invoices/${id}/post`, { state });

// ─── HR ─────────────────────────────────────────────────────────────────────

export const getHRDashboard = () => api.get<any>('/hr/dashboard');

export const getEmployees = async (): Promise<Employee[]> => {
  const res = await api.get<any>('/hr/employees');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createEmployee = (data: Partial<Employee>) => api.post<Employee>('/hr/employees', data);
export const updateEmployee = (id: string, data: Partial<Employee>) => api.put<Employee>(`/hr/employees/${id}`, data);

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const res = await api.get<any>('/hr/leaves');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createLeaveRequest = (data: Partial<LeaveRequest>) => api.post<LeaveRequest>('/hr/leaves', data);
export const transitionLeaveRequest = (id: string, state: string) => api.post<LeaveRequest>(`/hr/leaves/${id}/transition`, { state });

// ─── Projects ─────────────────────────────────────────────────────────────

export const getProjectsDashboard = () => api.get<any>('/projects/dashboard');

export const getProjects = async (): Promise<Project[]> => {
  const res = await api.get<any>('/projects/projects');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createProject = (data: Partial<Project>) => api.post<Project>('/projects/projects', data);
export const updateProject = (id: string, data: Partial<Project>) => api.put<Project>(`/projects/projects/${id}`, data);

// ─── Manufacturing ─────────────────────────────────────────────────────────

export const getManufacturingDashboard = () => api.get<any>('/manufacturing/dashboard');

export const getWorkOrders = async (): Promise<WorkOrder[]> => {
  const res = await api.get<any>('/manufacturing/orders');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createWorkOrder = (data: Partial<WorkOrder>) => api.post<WorkOrder>('/manufacturing/orders', data);
export const updateWorkOrder = (id: string, data: Partial<WorkOrder>) => api.put<WorkOrder>(`/manufacturing/orders/${id}`, data);
export const transitionWorkOrder = (id: string, state: string) => api.post<WorkOrder>(`/manufacturing/orders/${id}/confirm`, { state });

export const getBOMs = async (): Promise<BOM[]> => {
  const res = await api.get<any>('/manufacturing/boms');
  return res?.items ?? (Array.isArray(res) ? res : []);
};
export const createBOM = (data: Partial<BOM>) => api.post<BOM>('/manufacturing/boms', data);
export const updateBOM = (id: string, data: Partial<BOM>) => api.put<BOM>(`/manufacturing/boms/${id}`, data);

// ─── Approvals (kept as local stubs — no backend module yet) ───────────────

let approvalRules: ApprovalRule[] = [];
let approvalRequests: ApprovalRequest[] = [];

export const getApprovalRules    = () => approvalRules;
export const createApprovalRule  = (r: Omit<ApprovalRule, 'id' | 'is_active'>): ApprovalRule => {
  const rule = { ...r, id: crypto.randomUUID(), is_active: true };
  approvalRules.push(rule);
  return rule;
};
export const getApprovalRequests = () => approvalRequests;
export const createApprovalRequest = (r: any): ApprovalRequest => {
  const req = { ...r, id: crypto.randomUUID(), requested_at: new Date().toISOString(), state: 'pending' as const, current_step: 1, history: [] };
  approvalRequests.push(req);
  return req;
};
export const transitionApprovalRequest = (id: string, decision: 'approved' | 'rejected'): ApprovalRequest | undefined => {
  const req = approvalRequests.find(r => r.id === id);
  if (req) req.state = decision;
  return req;
};

// ─── Dashboard KPIs ────────────────────────────────────────────────────────
export const getDashboardKPIs = () => api.get<DashboardKPIs>('/dashboard/kpis');
