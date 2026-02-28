# CI ERP — Crispin Intelligence ERP — Development Plan

## Design Guidelines

### Design References
- **Linear.app**: Fast, clean, keyboard-driven interface
- **Stripe Dashboard**: Premium data density, beautiful tables
- **Notion**: Smooth transitions, drawer-based editing
- **Style**: Premium Dark Mode + Blue Accents + Enterprise Grade

### Color Palette
- Background: #0F172A (Slate 900 - main bg)
- Surface: #1E293B (Slate 800 - cards/panels)
- Surface Elevated: #334155 (Slate 700 - hover/active)
- Primary: #3B82F6 (Blue 500 - primary actions)
- Primary Hover: #2563EB (Blue 600)
- Success: #22C55E (Green 500)
- Warning: #F59E0B (Amber 500)
- Danger: #EF4444 (Red 500)
- Text Primary: #F8FAFC (Slate 50)
- Text Secondary: #94A3B8 (Slate 400)
- Border: #334155 (Slate 700)

### Typography
- Font: Inter (clean, modern, enterprise)
- H1: 28px font-bold
- H2: 22px font-semibold
- H3: 18px font-medium
- Body: 14px font-normal
- Small: 12px font-normal

### State Badge Colors
- Draft: bg-slate-600 text-slate-200
- Confirmed/Active: bg-blue-600 text-blue-100
- In Progress: bg-amber-600 text-amber-100
- Delivered/Done: bg-orange-600 text-orange-100
- Invoiced/Paid: bg-green-600 text-green-100
- Cancelled/Rejected: bg-red-600 text-red-100

### Key Component Patterns
- Sidebar: Dark (slate-950), icons + labels, collapsible, active highlight
- Tables: Sortable columns, filter chips, search, 20 rows/page
- Drawers: Right-slide 50% width, overlay backdrop, Esc close
- Toasts: Top-right, auto-dismiss 4s
- Empty States: Illustration + description + CTA button
- KPI Cards: Clickable, apply filters
- Loading: Skeleton rows, never blank
- RBAC: Disabled buttons with tooltips, never hidden

---

## Architecture (8 files max)

### File Structure:
1. **src/lib/auth.ts** — Auth store, RBAC permissions, role definitions, login/logout logic, localStorage persistence
2. **src/lib/store.ts** — Global state management for all modules (sales, CRM, purchasing, inventory, etc.), workflow state machines, CRUD operations
3. **src/components/Layout.tsx** — Main layout with sidebar navigation, header, auth guard, toast system, drawer system
4. **src/pages/Index.tsx** — Login page + Dashboard (switches based on auth state)
5. **src/pages/SalesModule.tsx** — Sales & CRM: Orders, Customers, Leads, Opportunities, Contacts, Pipeline
6. **src/pages/OperationsModule.tsx** — Purchasing + Inventory + Accounting modules
7. **src/pages/ManufacturingModule.tsx** — Manufacturing: MRP, MES, Quality, Shop Floor, Maintenance, BOM, Work Orders
8. **src/pages/WorkspaceModule.tsx** — HR + Projects + Helpdesk + Approvals + Admin (User/Role mgmt, Audit log)

### Auth:
- Default admin: admin@cierp.com / admin123
- localStorage key: ci_erp_auth
- Roles: Admin (all), Manager, User, Viewer
- Session survives F5

### Routing:
- / → Login (if not auth) or Dashboard (if auth)
- /dashboard
- /sales/orders, /sales/customers, /crm/leads, /crm/opportunities, /crm/contacts
- /purchasing/orders, /purchasing/vendors
- /inventory/products, /inventory/stock
- /accounting/invoices, /accounting/payments, /accounting/journal
- /hr/employees, /hr/departments, /hr/leave, /hr/payroll
- /manufacturing/workorders, /manufacturing/bom, /manufacturing/mrp, /manufacturing/mes, /manufacturing/quality, /manufacturing/shopfloor, /manufacturing/maintenance
- /projects, /helpdesk, /approvals
- /admin/users, /admin/roles, /admin/audit, /admin/settings