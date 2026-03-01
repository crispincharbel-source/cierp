/**
 * CI ERP — Settings Module
 * Company settings, branding/logo management, RBAC, and audit logs.
 */
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranding } from "@/lib/branding-context";
import LogoUploader from "@/components/LogoUploader";
import { toast } from "sonner";
import {
  Settings, Image as ImageIcon, Shield, ClipboardList,
  Palette, User, Key, Bell, Save, Check,
} from "lucide-react";

// ── Branding Tab ──────────────────────────────────────────────────────────────
function BrandingTab() {
  const { branding, updateSettings, logoDataUrl } = useBranding();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    toast.success("Branding settings saved!");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Upload your logo — it will appear on all invoices, reports, payslips, and exported PDFs.
            This is a premium feature not found in most ERPs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader />
        </CardContent>
      </Card>

      {/* Print Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-purple-600" />
            Report Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Report Header Text</label>
            <Input
              placeholder="e.g. Confidential — CI Corporation"
              value={branding.report_header || ""}
              onChange={e => updateSettings({ report_header: e.target.value })}
              className="max-w-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Appears below the logo on reports</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Report Footer Text</label>
            <Input
              placeholder="e.g. Confidential — Not for distribution"
              value={branding.report_footer || ""}
              onChange={e => updateSettings({ report_footer: e.target.value })}
              className="max-w-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.primary_color}
                  onChange={e => updateSettings({ primary_color: e.target.value })}
                  className="w-9 h-9 rounded cursor-pointer border-0"
                />
                <Input value={branding.primary_color} onChange={e => updateSettings({ primary_color: e.target.value })}
                  className="flex-1 font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.secondary_color}
                  onChange={e => updateSettings({ secondary_color: e.target.value })}
                  className="w-9 h-9 rounded cursor-pointer border-0"
                />
                <Input value={branding.secondary_color} onChange={e => updateSettings({ secondary_color: e.target.value })}
                  className="flex-1 font-mono text-sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo Visibility</CardTitle>
          <CardDescription>Choose where your logo appears on outputs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "show_logo_on_reports" as const, label: "Financial Reports", desc: "Income statements, balance sheets, etc." },
            { key: "show_logo_on_invoices" as const, label: "Invoices & Purchase Orders", desc: "Customer invoices and vendor POs" },
            { key: "show_logo_on_payslips" as const, label: "Payslips", desc: "Employee salary payslips" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Switch
                checked={branding[key]}
                onCheckedChange={v => updateSettings({ [key]: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      {logoDataUrl && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Print Preview</CardTitle>
            <CardDescription>How your logo appears on outputs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <img src={logoDataUrl} alt="Company logo" className="max-h-12 max-w-32 object-contain" />
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: branding.primary_color }}>INVOICE</p>
                  <p className="text-sm text-slate-500"># INV-2025-0001</p>
                </div>
              </div>
              {branding.report_header && (
                <p className="text-xs text-slate-400">{branding.report_header}</p>
              )}
              <div className="h-px bg-slate-100" />
              <p className="text-xs text-slate-400 text-center">
                {branding.report_footer || `CI ERP • Generated ${new Date().toLocaleDateString()}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={save} className="gap-2">
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Branding Settings"}
      </Button>
    </div>
  );
}

// ── RBAC Tab ──────────────────────────────────────────────────────────────────
const ROLES_DATA = [
  { role: "admin", label: "Administrator", color: "bg-red-100 text-red-800", perms: ["All permissions (wildcard)"] },
  { role: "manager", label: "Manager", color: "bg-purple-100 text-purple-800", perms: ["Sales", "Purchasing", "Inventory", "HR", "Projects", "Reports"] },
  { role: "accountant", label: "Accountant", color: "bg-blue-100 text-blue-800", perms: ["Accounting", "Invoices", "Reports", "Purchasing (view)"] },
  { role: "warehouse", label: "Warehouse", color: "bg-orange-100 text-orange-800", perms: ["Inventory", "Order Tracking", "Purchasing (view)"] },
  { role: "hr_officer", label: "HR Officer", color: "bg-green-100 text-green-800", perms: ["HR", "Employees", "Leaves", "Payroll", "Reports"] },
  { role: "sales_rep", label: "Sales Rep", color: "bg-cyan-100 text-cyan-800", perms: ["Sales", "Customers", "Inventory (view)", "Order Tracking (view)"] },
  { role: "viewer", label: "Viewer (Read-only)", color: "bg-slate-100 text-slate-700", perms: ["All modules (view only)"] },
];

function RBACTab() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          CI ERP uses full Role-Based Access Control (RBAC). Each role grants specific permissions
          across modules and actions (e.g., <code className="bg-blue-100 px-1 rounded text-xs">sales.orders.confirm</code>,
          <code className="bg-blue-100 px-1 rounded text-xs ml-1">inventory.adjustments.create</code>).
        </p>
      </div>
      
      <div className="grid gap-3">
        {ROLES_DATA.map(({ role, label, color, perms }) => (
          <Card key={role} className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${color} border-0 font-medium`}>{label}</Badge>
                    <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{role}</code>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map(p => (
                      <span key={p} className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Key className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Permission Codes</p>
              <p className="text-xs text-amber-700 mt-1">
                All permissions follow the format <code className="bg-amber-100 px-1 rounded">module.resource.action</code>.
                Policy checks are enforced on every API endpoint server-side.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────
const MOCK_AUDIT = [
  { id: "1", action: "auth.login", module: "auth", actor_email: "admin@cierp.com", actor_name: "Admin", severity: "info", resource_type: "user", created_at: new Date(Date.now() - 60000).toISOString() },
  { id: "2", action: "branding.logo.upload", module: "branding", actor_email: "admin@cierp.com", actor_name: "Admin", severity: "info", resource_type: "company_branding", created_at: new Date(Date.now() - 120000).toISOString() },
  { id: "3", action: "sales.orders.confirm", module: "sales", actor_email: "admin@cierp.com", actor_name: "Admin", severity: "info", resource_type: "sales_order", created_at: new Date(Date.now() - 300000).toISOString() },
  { id: "4", action: "admin.users.create", module: "admin", actor_email: "admin@cierp.com", actor_name: "Admin", severity: "info", resource_type: "user", created_at: new Date(Date.now() - 600000).toISOString() },
  { id: "5", action: "payroll.process", module: "payroll", actor_email: "admin@cierp.com", actor_name: "Admin", severity: "warning", resource_type: "payroll_run", created_at: new Date(Date.now() - 900000).toISOString() },
];

const severityColor = (s: string) => s === "warning" ? "bg-amber-100 text-amber-700" : s === "critical" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700";

function AuditTab() {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m/60)}h ago`;
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">All ERP actions are logged for compliance and security.</p>
        <Button size="sm" variant="outline" onClick={() => toast.info("Export coming soon")}>
          Export CSV
        </Button>
      </div>
      <Card>
        <div className="divide-y divide-slate-100">
          {MOCK_AUDIT.map(log => (
            <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                    {log.action}
                  </code>
                  <Badge className={`text-xs border-0 ${severityColor(log.severity)}`}>{log.severity}</Badge>
                  {log.resource_type && (
                    <span className="text-xs text-slate-400">{log.resource_type}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">by {log.actor_name} ({log.actor_email})</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(log.created_at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Main Settings Module ───────────────────────────────────────────────────────
export default function SettingsModule() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-600" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Company branding, access control, and system configuration
        </p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="branding" className="gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Branding & Logo
          </TabsTrigger>
          <TabsTrigger value="rbac" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-6">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="rbac" className="mt-6">
          <RBACTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
