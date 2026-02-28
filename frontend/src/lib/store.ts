
// CI ERP - In-memory data store
// This file mocks a data store for the purpose of UI development.
// In a real application, you would replace these functions with API calls to your backend.

import { api } from './api';

// --- TYPES ---
export interface ManagedUser { id: string; full_name: string; email: string; password?: string; role: string; is_active: boolean; }
export interface ManagedRole { id: string; name: string; permissions: string[]; is_system?: boolean; }
export interface AuditLog { id: string; created_at: string; actor_name: string; action: string; resource_type: string; resource_id: string; }
export interface SalesOrder { id: string; number: string; customer_id: string; customer_name: string; salesperson: string; order_date: string; currency: string; subtotal: number; tax_amount: number; total: number; state: 'draft' | 'confirmed' | 'done' | 'cancelled'; lines: SalesOrderLine[]; notes: string; invoice_id?: string | null; }
export interface SalesOrderLine { id: string; order_id: string; product_name: string; quantity: number; unit_price: number; discount: number; total: number; }
export interface Customer { id: string; name: string; email: string; phone: string; address_line1: string; address_line2: string; city: string; country: string; }
export interface Lead { id: string; title: string; customer_name: string; contact_name: string; source: string; state: 'new' | 'qualified' | 'proposal' | 'won' | 'lost'; expected_revenue: number; probability: number; notes?: string; }
export interface HelpdeskTicket { id: string; number: string; subject: string; customer_name: string; state: 'new' | 'open' | 'resolved' | 'closed'; priority: 'low' | 'medium' | 'high' | 'urgent'; created_at: string; updated_at: string; replies: TicketReply[]; }
export interface TicketReply { id: string; body: string; author: string; created_at: string; }
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface DashboardKPIs { total_orders: number; active_orders: number; total_customers: number; open_tickets: number; }
export interface PurchaseOrder { id: string; po_number: string; vendor_id: string; vendor_name: string; order_date: string; state: 'draft' | 'sent' | 'confirmed' | 'received' | 'billed' | 'cancelled'; lines: POLine[]; subtotal: number; tax_total: number; grand_total: number; }
export interface POLine { id: string; product_name: string; qty: number; unit_price: number; line_total: number; }
export interface Vendor { id: string; name: string; email: string; phone: string; company: string; address: string; city: string; country: string; payment_terms: string; notes: string; }
export interface Product { id: string; name: string; sku: string; category: string; unit_price: number; cost_price: number; stock_qty: number; reorder_level: number; location: string; unit: string; description: string; }
export interface Invoice { id: string; invoice_number: string; type: 'invoice' | 'bill'; partner_name: string; invoice_date: string; due_date: string; state: 'draft' | 'confirmed' | 'sent' | 'paid' | 'cancelled'; subtotal: number; tax_total: number; amount_due: number; amount_paid: number; currency: string; reference?: string; notes?: string; }
export interface Employee { id: string; name: string; email: string; phone: string; department: string; position: string; hire_date: string; salary: number; status: 'active' | 'on_leave' | 'terminated'; }
export interface LeaveRequest { id: string; employee_name: string; type: 'annual' | 'sick' | 'personal' | 'maternity' | 'other'; start_date: string; end_date: string; days: number; reason: string; state: 'pending' | 'approved' | 'rejected'; }
export interface Project { id: string; name: string; description: string; start_date: string; end_date: string; status: 'not_started' | 'in_progress' | 'completed' | 'on_hold'; progress: number; tasks: ProjectTask[]; }
export interface ProjectTask { id: string; project_id: string; title: string; description: string; status: 'todo' | 'in_progress' | 'review' | 'done'; priority: 'low' | 'medium' | 'high'; assigned_to: string; due_date: string; time_logged: number; created_at: string; updated_at: string; }
export interface ApprovalRule { id: string; module: string; action: string; steps: { step: number; approver_role: string; required: boolean; }[]; is_active: boolean; }
export interface ApprovalRequest { id: string; module: string; resource_id: string; resource_label: string; requested_by: string; requested_at: string; state: 'pending' | 'approved' | 'rejected'; current_step: number; history: { step: number; approver: string; decision: 'approved' | 'rejected'; decided_at: string; comments: string; }[]; }
export interface Ticket { id: string; ticket_number: string; subject: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent'; state: 'open' | 'in_progress' | 'resolved' | 'closed'; queue: string; customer_name: string; customer_email: string; }
export interface WorkOrder { id: string; wo_number: string; product_name: string; quantity: number; priority: 'low' | 'medium' | 'high' | 'urgent'; state: 'draft' | 'planned' | 'in_progress' | 'done' | 'cancelled'; planned_start: string; planned_end: string; workcenter: string; assigned_to: string; routing_steps: { step: number; name: string; duration: number; status: 'pending' | 'in_progress' | 'done'; }[]; }
export interface BOM { id: string; product_name: string; version: string; status: 'active' | 'inactive'; total_cost: number; components: { name: string; qty: number; unit: string; cost: number; }[]; }
// --- HELPERS ---
const TODAY = new Date().toISOString().split('T')[0];
const fakeN = (n: number) => Math.round(Math.random() * n);
const fakeDate = () => new Date(Date.now() - fakeN(30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// --- MOCK DATABASE ---
let users: ManagedUser[] = [
  { id: 'usr_1', full_name: 'Admin', email: 'admin@cierp.com', role: 'admin', is_active: true },
  { id: 'usr_2', full_name: 'John Manager', email: 'john@cierp.com', role: 'manager', is_active: true },
];
let roles: ManagedRole[] = [
  { id: 'rol_1', name: 'admin', permissions: ['*'], is_system: true },
  { id: 'rol_2', name: 'manager', permissions: ['sales.orders.view', 'sales.orders.edit', 'sales.customers.view'], is_system: true },
  { id: 'rol_3', name: 'user', permissions: ['sales.orders.view', 'sales.customers.view'], is_system: true },
  { id: 'rol_4', name: 'viewer', permissions: ['sales.orders.view'], is_system: true },
];
let auditLogs: AuditLog[] = [
  { id: 'aud_1', created_at: new Date().toISOString(), actor_name: 'Admin', action: 'user.login', resource_type: 'user', resource_id: 'usr_1' },
];
let customers: Customer[] = [
  { id: 'cus_1', name: 'ABC Corp', email: 'contact@abccorp.com', phone: '123-456-7890', address_line1: '123 Main St', address_line2: '', city: 'Anytown', country: 'USA' },
  { id: 'cus_2', name: 'XYZ Inc', email: 'info@xyzinc.com', phone: '987-654-3210', address_line1: '456 Oak Ave', address_line2: '', city: 'Someville', country: 'USA' },
];
let salesOrders: SalesOrder[] = [
  { id: 'ord_1', number: 'SO-00001', customer_id: 'cus_1', customer_name: 'ABC Corp', salesperson: 'John Manager', order_date: fakeDate(), currency: 'USD', subtotal: 1500, tax_amount: 150, total: 1650, state: 'confirmed', lines: [], notes: '' },
  { id: 'ord_2', number: 'SO-00002', customer_id: 'cus_2', customer_name: 'XYZ Inc', salesperson: 'John Manager', order_date: fakeDate(), currency: 'USD', subtotal: 200, tax_amount: 20, total: 220, state: 'draft', lines: [], notes: '' },
];
let leads: Lead[] = [
  { id: 'led_1', title: 'New Website Inquiry', customer_name: 'BigCo', contact_name: 'Jane Doe', source: 'website', state: 'new', expected_revenue: 5000, probability: 20 },
  { id: 'led_2', title: 'Referral from ABC Corp', customer_name: 'FriendCo', contact_name: 'Jim Smith', source: 'referral', state: 'qualified', expected_revenue: 10000, probability: 50 },
];
let helpdeskTickets: HelpdeskTicket[] = [
  { id: 'tkt_1', number: 'TKT-001', subject: 'Cannot login', customer_name: 'John Doe', state: 'open', priority: 'high', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), replies: [] },
  { id: 'tkt_2', number: 'TKT-002', subject: 'Feature Request: Dark Mode', customer_name: 'Jane Smith', state: 'new', priority: 'low', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), replies: [] },
];
let purchaseOrders: PurchaseOrder[] = [
  { id: 'po_1', po_number: 'PO-001', vendor_id: 'ven_1', vendor_name: 'Supplier A', order_date: fakeDate(), state: 'confirmed', lines: [], subtotal: 800, tax_total: 80, grand_total: 880 },
  { id: 'po_2', po_number: 'PO-002', vendor_id: 'ven_2', vendor_name: 'Supplier B', order_date: fakeDate(), state: 'draft', lines: [], subtotal: 1200, tax_total: 120, grand_total: 1320 },
];
let vendors: Vendor[] = [
  { id: 'ven_1', name: 'Supplier A', email: 'supplya@email.com', phone: '111-222-3333', company: 'Supplies Co', address: '1 Supply St', city: 'Supplyville', country: 'USA', payment_terms: 'Net 30', notes: '' },
  { id: 'ven_2', name: 'Supplier B', email: 'supplyb@email.com', phone: '444-555-6666', company: 'Materials Inc', address: '2 Material Ave', city: 'Materialton', country: 'USA', payment_terms: 'Net 60', notes: '' },
];
let products: Product[] = [
  { id: 'prod_1', name: 'Widget A', sku: 'W-A', category: 'Widgets', unit_price: 10, cost_price: 5, stock_qty: 100, reorder_level: 20, location: 'Main Warehouse', unit: 'pcs', description: 'A standard widget.' },
  { id: 'prod_2', name: 'Widget B', sku: 'W-B', category: 'Widgets', unit_price: 20, cost_price: 10, stock_qty: 50, reorder_level: 10, location: 'Main Warehouse', unit: 'pcs', description: 'A premium widget.' },
];
let invoices: Invoice[] = [
  { id: 'inv_1', invoice_number: 'INV-001', type: 'invoice', partner_name: 'ABC Corp', invoice_date: fakeDate(), due_date: fakeDate(), state: 'paid', subtotal: 1500, tax_total: 150, amount_due: 1650, amount_paid: 1650, currency: 'USD' },
  { id: 'inv_2', invoice_number: 'BILL-001', type: 'bill', partner_name: 'Supplier A', invoice_date: fakeDate(), due_date: fakeDate(), state: 'confirmed', subtotal: 800, tax_total: 80, amount_due: 880, amount_paid: 0, currency: 'USD' },
];
let employees: Employee[] = [
  { id: 'emp_1', name: 'Alice', email: 'alice@email.com', phone: '123', department: 'Sales', position: 'Manager', hire_date: '2022-01-01', salary: 80000, status: 'active' },
  { id: 'emp_2', name: 'Bob', email: 'bob@email.com', phone: '456', department: 'Engineering', position: 'Developer', hire_date: '2023-01-01', salary: 70000, status: 'active' },
];
let leaveRequests: LeaveRequest[] = [
  { id: 'lr_1', employee_name: 'Alice', type: 'annual', start_date: '2024-01-01', end_date: '2024-01-05', days: 5, reason: 'Vacation', state: 'approved' },
];
let projects: Project[] = [
  { id: 'proj_1', name: 'Q1 Marketing Campaign', description: 'Launch new campaign for Widget B', start_date: '2024-01-01', end_date: '2024-03-31', status: 'in_progress', progress: 50, tasks: [] },
];
let approvalRules: ApprovalRule[] = [
  { id: 'ar_1', module: 'purchasing', action: 'confirm_po', steps: [{ step: 1, approver_role: 'manager', required: true }], is_active: true },
];
let approvalRequests: ApprovalRequest[] = [
  { id: 'apr_1', module: 'purchasing', resource_id: 'po_1', resource_label: 'PO-001', requested_by: 'John Manager', requested_at: new Date().toISOString(), state: 'pending', current_step: 1, history: [] },
];
let tickets: Ticket[] = [
    { id: 'tkt_1', ticket_number: 'TKT-001', subject: 'Cannot log in', description: 'User cannot log in to the system.', priority: 'high', state: 'open', queue: 'Support', customer_name: 'Test Customer', customer_email: 'test@test.com' },
    ];
let workOrders: WorkOrder[] = [
    { id: 'wo_1', wo_number: 'WO-001', product_name: 'Widget A', quantity: 100, priority: 'medium', state: 'planned', planned_start: '2024-01-01', planned_end: '2024-01-02', workcenter: 'WC-01', assigned_to: 'Alice', routing_steps: [] },
    ];
let boms: BOM[] = [
    { id: 'bom_1', product_name: 'Widget A', version: '1.0', status: 'active', total_cost: 5, components: [{ name: 'Component A', qty: 1, unit: 'pcs', cost: 5 }] },
    ];

// --- ADMIN ---
export const getManagedUsers = (): ManagedUser[] => users;
export const createManagedUser = (user: Omit<ManagedUser, 'id'>): ManagedUser => {
  const newUser: ManagedUser = { ...user, id: `usr_${++users.length}` };
  users.push(newUser);
  return newUser;
};
export const updateManagedUser = (id: string, updates: Partial<ManagedUser>): ManagedUser | undefined => {
  const user = users.find(u => u.id === id);
  if (user) { Object.assign(user, updates); }
  return user;
};
export const getManagedRoles = (): ManagedRole[] => roles;
export const createManagedRole = (role: Omit<ManagedRole, 'id'>): ManagedRole => {
    const newRole: ManagedRole = { ...role, id: `rol_${++roles.length}` };
    roles.push(newRole);
    return newRole;
};
export const updateManagedRole = (id: string, updates: Partial<ManagedRole>): ManagedRole | undefined => {
    const role = roles.find(r => r.id === id);
    if (role) { Object.assign(role, updates); }
    return role;
};
export const getAuditLogs = (): AuditLog[] => auditLogs;

// --- SALES & CRM ---
export const getSalesDashboard = async (): Promise<any> => ({ total_orders: salesOrders.length, confirmed_orders: salesOrders.filter(o => o.state === 'confirmed').length, revenue: 150000, pipeline_value: 30000 });
export const getSalesOrders = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<SalesOrder>> => {
  const filtered = salesOrders.filter(o => !state || o.state === state);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
};
export const getSalesOrder = async (id: string): Promise<SalesOrder> => {
    const order = salesOrders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    return order;
};
export const createSalesOrder = async (data: Partial<SalesOrder>): Promise<SalesOrder> => {
  const customer = customers.find(c => c.id === data.customer_id);
  const newOrder: SalesOrder = {
    id: `ord_${++salesOrders.length}`,
    number: `SO-${String(salesOrders.length + 1).padStart(5, '0')}`,
    customer_name: customer?.name || 'N/A',
    order_date: TODAY,
    currency: 'USD',
    subtotal: 0,
    tax_amount: 0,
    total: 0,
    state: 'draft',
    lines: [],
    notes: '',
    salesperson: 'Admin',
    ...data,
  };
  salesOrders.push(newOrder);
  return newOrder;
};
export const updateSalesOrder = async (id: string, updates: Partial<SalesOrder>): Promise<SalesOrder> => {
  const order = await getSalesOrder(id);
  Object.assign(order, updates);
  // Recalculate totals
  order.subtotal = order.lines.reduce((sum, line) => sum + line.total, 0);
  order.tax_amount = order.subtotal * 0.1; // 10% tax
  order.total = order.subtotal + order.tax_amount;
  return order;
};
export const deleteSalesOrder = async (id: string): Promise<void> => {
    salesOrders = salesOrders.filter(o => o.id !== id);
};
export const addSalesOrderLine = async (orderId: string, line: Omit<SalesOrderLine, 'id' | 'order_id' | 'total'>): Promise<SalesOrderLine> => {
  const order = await getSalesOrder(orderId);
  const newLine: SalesOrderLine = {
    ...line,
    id: `line_${Date.now()}`,
    order_id: orderId,
    total: line.quantity * line.unit_price * (1 - (line.discount || 0) / 100),
  };
  order.lines.push(newLine);
  await updateSalesOrder(orderId, {}); // Recalculate
  return newLine;
};
export const updateSalesOrderLine = async (lineId: string, updates: Partial<SalesOrderLine>): Promise<SalesOrderLine> => {
    const order = salesOrders.find(o => o.lines.some(l => l.id === lineId));
    if (!order) throw new Error('Line not found');
    const line = order.lines.find(l => l.id === lineId);
    if (!line) throw new Error('Line not found');
    Object.assign(line, updates);
    line.total = line.quantity * line.unit_price * (1 - (line.discount || 0) / 100);
    await updateSalesOrder(order.id, {}); // Recalculate
    return line;
};
export const deleteSalesOrderLine = async (lineId: string): Promise<void> => {
    const order = salesOrders.find(o => o.lines.some(l => l.id === lineId));
    if (order) {
        order.lines = order.lines.filter(l => l.id !== lineId);
        await updateSalesOrder(order.id, {}); // Recalculate
    }
};
export const confirmSalesOrder = async (id: string): Promise<SalesOrder> => updateSalesOrder(id, { state: 'confirmed' });
export const cancelSalesOrder = async (id: string): Promise<SalesOrder> => updateSalesOrder(id, { state: 'cancelled' });
export const validateSalesDelivery = async (id: string): Promise<SalesOrder> => updateSalesOrder(id, { state: 'done' });
export const createSalesInvoice = async (id: string): Promise<any> => {
    const order = await getSalesOrder(id);
    const newInvoice = {
        id: `inv_${++invoices.length}`,
        invoice_number: `INV-${String(invoices.length + 1).padStart(5, '0')}`,
        type: 'invoice',
        partner_name: order.customer_name,
        invoice_date: TODAY,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        state: 'draft',
        subtotal: order.subtotal,
        tax_total: order.tax_amount,
        amount_due: order.total,
        amount_paid: 0,
        currency: order.currency,
        reference: order.number,
    };
    invoices.push(newInvoice);
    await updateSalesOrder(id, { invoice_id: newInvoice.id });
    return newInvoice;
};
export const getCustomers = async (page = 1, pageSize = 20, search?: string): Promise<Paginated<Customer>> => {
  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
};
export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  const newCustomer: Customer = { id: `cus_${++customers.length}`, ...data } as Customer;
  customers.push(newCustomer);
  return newCustomer;
};
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<Customer> => {
  const customer = customers.find(c => c.id === id);
  if (!customer) throw new Error('Customer not found');
  Object.assign(customer, updates);
  return customer;
};
export const deleteCustomer = async (id: string): Promise<void> => {
    customers = customers.filter(c => c.id !== id);
};
export const getLeads = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<Lead>> => {
  const filtered = leads.filter(l => !state || l.state === state);
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
};
export const createLead = async (data: Partial<Lead>): Promise<Lead> => {
  const newLead: Lead = { id: `led_${++leads.length}`, state: 'new', ...data } as Lead;
  leads.push(newLead);
  return newLead;
};
export const updateLead = (id: string, updates: Partial<Lead>): Lead | undefined => {
    const lead = leads.find(l => l.id === id);
    if (lead) { Object.assign(lead, updates); }
    return lead;
};
// --- HELPDESK ---
export const getHelpdeskDashboard = async (): Promise<any> => ({ total_tickets: helpdeskTickets.length, open_tickets: helpdeskTickets.filter(t => t.state === 'open').length, urgent_tickets: helpdeskTickets.filter(t => t.priority === 'urgent').length });
export const getTickets = async (page = 1, pageSize = 20, state?: string): Promise<Paginated<HelpdeskTicket>> => {
    const filtered = helpdeskTickets.filter(t => !state || t.state === state);
    return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize };
};
export const getTicket = async (id: string): Promise<HelpdeskTicket> => {
    const ticket = helpdeskTickets.find(t => t.id === id);
    if (!ticket) throw new Error('Ticket not found');
    return ticket;
};
export const addTicketReply = async (ticketId: string, body: string): Promise<TicketReply> => {
    const ticket = await getTicket(ticketId);
    const newReply: TicketReply = {
        id: `rep_${Date.now()}`,
        body,
        author: 'Admin', // Assuming current user is admin
        created_at: new Date().toISOString(),
    };
    ticket.replies.push(newReply);
    ticket.updated_at = newReply.created_at;
    return newReply;
};
// --- DASHBOARD ---
export const getDashboardKPIs = async (): Promise<DashboardKPIs> => {
  const response = await api.get('/api/v1/dashboard/kpis');
  return response.data;
};

// --- PURCHASING ---
export const getPurchaseOrders = (): PurchaseOrder[] => purchaseOrders;
export const createPurchaseOrder = (po: Partial<PurchaseOrder>): PurchaseOrder => {
    const newPO: PurchaseOrder = {
        id: `po_${++purchaseOrders.length}`,
        po_number: `PO-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
        order_date: TODAY,
        state: 'draft',
        lines: [],
        subtotal: 0,
        tax_total: 0,
        grand_total: 0,
        ...po
    } as PurchaseOrder;
    purchaseOrders.push(newPO);
    return newPO;
};
export const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>): PurchaseOrder | undefined => {
    const po = purchaseOrders.find(p => p.id === id);
    if (po) {
        Object.assign(po, updates);
        if (updates.lines) {
            po.subtotal = po.lines.reduce((sum, l) => sum + l.line_total, 0);
            po.tax_total = po.subtotal * 0.1;
            po.grand_total = po.subtotal + po.tax_total;
        }
    }
    return po;
};
export const transitionPurchaseOrder = (id: string, state: PurchaseOrder['state']): PurchaseOrder | undefined => {
    const po = purchaseOrders.find(p => p.id === id);
    if (po) { po.state = state; }
    return po;
};
// --- VENDORS ---
export const getVendors = (): Vendor[] => vendors;
export const createVendor = (vendor: Omit<Vendor, 'id'>): Vendor => {
    const newVendor: Vendor = { ...vendor, id: `ven_${++vendors.length}` };
    vendors.push(newVendor);
    return newVendor;
};
export const updateVendor = (id: string, updates: Partial<Vendor>): Vendor | undefined => {
    const vendor = vendors.find(v => v.id === id);
    if (vendor) { Object.assign(vendor, updates); }
    return vendor;
};
// --- PRODUCTS ---
export const getProducts = (): Product[] => products;
export const createProduct = (product: Omit<Product, 'id'>): Product => {
    const newProduct: Product = { ...product, id: `prod_${++products.length}` };
    products.push(newProduct);
    return newProduct;
};
export const updateProduct = (id: string, updates: Partial<Product>): Product | undefined => {
    const product = products.find(p => p.id === id);
    if (product) { Object.assign(product, updates); }
    return product;
};
// --- ACCOUNTING ---
export const getInvoices = (): Invoice[] => invoices;
export const createInvoice = (invoice: Partial<Invoice>): Invoice => {
    const newInvoice: Invoice = {
        id: `inv_${++invoices.length}`,
        invoice_number: `${invoice.type === 'bill' ? 'BILL' : 'INV'}-${String(invoices.length + 1).padStart(3, '0')}`,
        invoice_date: TODAY,
        state: 'draft',
        amount_paid: 0,
        currency: 'USD',
        ...invoice,
    } as Invoice;
    invoices.push(newInvoice);
    return newInvoice;
};
export const transitionInvoice = (id: string, state: Invoice['state']): Invoice | undefined => {
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
        invoice.state = state;
        if (state === 'paid') {
            invoice.amount_paid = invoice.amount_due;
        }
    }
    return invoice;
};
// --- HR ---
export const getEmployees = (): Employee[] => employees;
export const createEmployee = (employee: Omit<Employee, 'id' | 'status'>): Employee => {
    const newEmployee: Employee = { ...employee, id: `emp_${++employees.length}`, status: 'active' };
    employees.push(newEmployee);
    return newEmployee;
};
export const updateEmployee = (id: string, updates: Partial<Employee>): Employee | undefined => {
    const employee = employees.find(e => e.id === id);
    if (employee) { Object.assign(employee, updates); }
    return employee;
};
export const getLeaveRequests = (): LeaveRequest[] => leaveRequests;
export const createLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'state'>): LeaveRequest => {
    const newReq: LeaveRequest = { ...req, id: `lr_${++leaveRequests.length}`, state: 'pending' };
    leaveRequests.push(newReq);
    return newReq;
};
export const transitionLeaveRequest = (id: string, state: LeaveRequest['state']): LeaveRequest | undefined => {
    const req = leaveRequests.find(r => r.id === id);
    if (req) { req.state = state; }
    return req;
};
// --- PROJECTS ---
export const getProjects = (): Project[] => projects;
export const createProject = (project: Omit<Project, 'id' | 'status' | 'progress' | 'tasks'>): Project => {
    const newProject: Project = { ...project, id: `proj_${++projects.length}`, status: 'not_started', progress: 0, tasks: [] };
    projects.push(newProject);
    return newProject;
};
export const updateProject = (id: string, updates: Partial<Project>): Project | undefined => {
    const project = projects.find(p => p.id === id);
    if (project) { Object.assign(project, updates); }
    return project;
};
// --- APPROVALS ---
export const getApprovalRules = (): ApprovalRule[] => approvalRules;
export const createApprovalRule = (rule: Omit<ApprovalRule, 'id' | 'is_active'>): ApprovalRule => {
    const newRule: ApprovalRule = { ...rule, id: `ar_${++approvalRules.length}`, is_active: true };
    approvalRules.push(newRule);
    return newRule;
};
export const getApprovalRequests = (): ApprovalRequest[] => approvalRequests;
export const createApprovalRequest = (req: Omit<ApprovalRequest, 'id' | 'requested_by' | 'requested_at' | 'state' | 'current_step' | 'history'>): ApprovalRequest => {
    const newReq: ApprovalRequest = {
        ...req,
        id: `apr_${++approvalRequests.length}`,
        requested_by: 'Admin',
        requested_at: new Date().toISOString(),
        state: 'pending',
        current_step: 1,
        history: [],
    };
    approvalRequests.push(newReq);
    return newReq;
};
export const transitionApprovalRequest = (id: string, decision: 'approved' | 'rejected'): ApprovalRequest | undefined => {
    const req = approvalRequests.find(r => r.id === id);
    if (req) { req.state = decision; }
    return req;
};

// --- HELPDESK ---
export const createTicket = (ticket: Omit<Ticket, 'id' | 'ticket_number' | 'state'>): Ticket => {
    const newTicket: Ticket = {
        ...ticket,
        id: `tkt_${++tickets.length}`,
        ticket_number: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
        state: 'open',
    };
    tickets.push(newTicket);
    return newTicket;
};

export const updateTicket = (id: string, updates: Partial<Ticket>): Ticket | undefined => {
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
        Object.assign(ticket, updates);
    }
    return ticket;
};

// --- MANUFACTURING ---
export const getWorkOrders = (): WorkOrder[] => workOrders;
export const createWorkOrder = (wo: Partial<WorkOrder>): WorkOrder => {
    const newWO: WorkOrder = {
        id: `wo_${++workOrders.length}`,
        wo_number: `WO-${String(workOrders.length + 1).padStart(3, '0')}`,
        state: 'draft',
        routing_steps: [],
        ...wo
    } as WorkOrder;
    workOrders.push(newWO);
    return newWO;
};
export const updateWorkOrder = (id: string, updates: Partial<WorkOrder>): WorkOrder | undefined => {
    const wo = workOrders.find(w => w.id === id);
    if (wo) { Object.assign(wo, updates); }
    return wo;
};
export const transitionWorkOrder = (id: string, state: WorkOrder['state']): WorkOrder | undefined => {
    const wo = workOrders.find(w => w.id === id);
    if (wo) { wo.state = state; }
    return wo;
};
export const getBOMs = (): BOM[] => boms;
export const createBOM = (bom: Partial<BOM>): BOM => {
    const newBOM: BOM = {
        id: `bom_${++boms.length}`,
        status: 'active',
        total_cost: 0,
        components: [],
        ...bom
    } as BOM;
    boms.push(newBOM);
    return newBOM;
};
export const updateBOM = (id: string, updates: Partial<BOM>): BOM | undefined => {
    const bom = boms.find(b => b.id === id);
    if (bom) { Object.assign(bom, updates); }
    return bom;
};
