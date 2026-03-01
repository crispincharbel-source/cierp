import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth-context";
import { BrandingProvider } from "@/lib/branding-context";
import RequireAuth from "@/components/RequireAuth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import OrderTrackingModule from "@/pages/OrderTrackingModule";
import PayrollModule from "@/pages/PayrollModule";
import SalesModule from "@/pages/SalesModule";
import AccountingModule from "@/pages/AccountingModule";
import HRModule from "@/pages/HRModule";
import InventoryModule from "@/pages/InventoryModule";
import PurchasingModule from "@/pages/PurchasingModule";
import ManufacturingModule from "@/pages/ManufacturingModule";
import ProjectsModule from "@/pages/ProjectsModule";
import HelpdeskModule from "@/pages/HelpdeskModule";
import SettingsModule from "@/pages/SettingsModule";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route element={<RequireAuth><Layout/></RequireAuth>}>
              <Route index element={<Navigate to="/dashboard" replace/>}/>
              <Route path="dashboard"       element={<Dashboard/>}/>
              <Route path="order-tracking"  element={<OrderTrackingModule/>}/>
              <Route path="order-tracking/:orderNumber" element={<OrderTrackingModule/>}/>
              <Route path="payroll"         element={<PayrollModule/>}/>
              <Route path="sales"           element={<SalesModule/>}/>
              <Route path="accounting"      element={<AccountingModule/>}/>
              <Route path="hr"              element={<HRModule/>}/>
              <Route path="inventory"       element={<InventoryModule/>}/>
              <Route path="purchasing"      element={<PurchasingModule/>}/>
              <Route path="manufacturing"   element={<ManufacturingModule/>}/>
              <Route path="projects"        element={<ProjectsModule/>}/>
              <Route path="helpdesk"        element={<HelpdeskModule/>}/>
              <Route path="settings"        element={<SettingsModule/>}/>
            </Route>
            <Route path="*" element={<NotFound/>}/>
          </Routes>
        </BrowserRouter>
        <Toaster/>
      </BrandingProvider>
    </AuthProvider>
  );
}
