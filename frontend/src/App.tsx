import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import RequireAuth from '@/components/RequireAuth';
import Layout from '@/components/Layout';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import SalesModule from './pages/SalesModule';
import PurchasingModule from './pages/PurchasingModule';
import InventoryModule from './pages/InventoryModule';
import AccountingModule from './pages/AccountingModule';
import HRModule from './pages/HRModule';
import ManufacturingModule from './pages/ManufacturingModule';
import ProjectsModule from './pages/ProjectsModule';
import HelpdeskModule from './pages/HelpdeskModule';
import ApprovalsModule from './pages/ApprovalsModule';
import AdminModule from './pages/AdminModule';
import OrderTrackingModule from './pages/OrderTrackingModule';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();


function RootRedirect() {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  return <Navigate to={token ? '/dashboard' : '/login'} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Index />} />
          <Route path="/" element={<RootRedirect />} />
          {/* Dashboard - wrapped in Layout */}
          <Route path="/dashboard" element={<RequireAuth><Layout><Dashboard /></Layout></RequireAuth>} />
          {/* Sales & CRM */}
          <Route path="/sales/orders" element={<RequireAuth><Layout><SalesModule /></Layout></RequireAuth>} />
          <Route path="/sales/customers" element={<RequireAuth><Layout><SalesModule /></Layout></RequireAuth>} />
          <Route path="/crm/leads" element={<RequireAuth><Layout><SalesModule /></Layout></RequireAuth>} />
          <Route path="/crm/opportunities" element={<RequireAuth><Layout><SalesModule /></Layout></RequireAuth>} />
          <Route path="/crm/contacts" element={<RequireAuth><Layout><SalesModule /></Layout></RequireAuth>} />
          {/* Purchasing */}
          <Route path="/purchasing/orders" element={<RequireAuth><Layout><PurchasingModule /></Layout></RequireAuth>} />
          <Route path="/purchasing/vendors" element={<RequireAuth><Layout><PurchasingModule /></Layout></RequireAuth>} />
          {/* Inventory */}
          <Route path="/inventory/products" element={<RequireAuth><Layout><InventoryModule /></Layout></RequireAuth>} />
          <Route path="/inventory/stock" element={<RequireAuth><Layout><InventoryModule /></Layout></RequireAuth>} />
          {/* Accounting */}
          <Route path="/accounting/invoices" element={<RequireAuth><Layout><AccountingModule /></Layout></RequireAuth>} />
          <Route path="/accounting/payments" element={<RequireAuth><Layout><AccountingModule /></Layout></RequireAuth>} />
          <Route path="/accounting/journal" element={<RequireAuth><Layout><AccountingModule /></Layout></RequireAuth>} />
          {/* HR */}
          <Route path="/hr/employees" element={<RequireAuth><Layout><HRModule /></Layout></RequireAuth>} />
          <Route path="/hr/departments" element={<RequireAuth><Layout><HRModule /></Layout></RequireAuth>} />
          <Route path="/hr/leave" element={<RequireAuth><Layout><HRModule /></Layout></RequireAuth>} />
          <Route path="/hr/payroll" element={<RequireAuth><Layout><HRModule /></Layout></RequireAuth>} />
          {/* Manufacturing */}
          <Route path="/manufacturing/workorders" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/bom" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/mrp" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/mes" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/quality" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/shopfloor" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          <Route path="/manufacturing/maintenance" element={<RequireAuth><Layout><ManufacturingModule /></Layout></RequireAuth>} />
          {/* Order Tracking */}
          <Route path="/order-tracking" element={<RequireAuth><Layout><OrderTrackingModule /></Layout></RequireAuth>} />
          <Route path="/order-tracking/:orderNumber" element={<RequireAuth><Layout><OrderTrackingModule /></Layout></RequireAuth>} />
          {/* Projects */}
          <Route path="/projects" element={<RequireAuth><Layout><ProjectsModule /></Layout></RequireAuth>} />
          {/* Helpdesk */}
          <Route path="/helpdesk" element={<RequireAuth><Layout><HelpdeskModule /></Layout></RequireAuth>} />
          {/* Approvals */}
          <Route path="/approvals" element={<RequireAuth><Layout><ApprovalsModule /></Layout></RequireAuth>} />
          {/* Admin */}
          <Route path="/admin/users" element={<RequireAuth><Layout><AdminModule /></Layout></RequireAuth>} />
          <Route path="/admin/roles" element={<RequireAuth><Layout><AdminModule /></Layout></RequireAuth>} />
          <Route path="/admin/audit" element={<RequireAuth><Layout><AdminModule /></Layout></RequireAuth>} />
          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
      </AuthProvider>
  </QueryClientProvider>
);

export default App;