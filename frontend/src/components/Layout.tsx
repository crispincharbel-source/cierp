import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useBranding } from "@/lib/branding-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, ShoppingCart, BookOpen, Users, Package,
  ShoppingBag, Factory, FolderKanban, Headphones,
  Scan, Wallet, LogOut, ChevronLeft, ChevronRight, Building2, Settings
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
  { to: "/order-tracking", label: "Order Tracking", icon: Scan },
  { to: "/sales",          label: "Sales",           icon: ShoppingCart },
  { to: "/purchasing",     label: "Purchasing",      icon: ShoppingBag },
  { to: "/accounting",     label: "Accounting",      icon: BookOpen },
  { to: "/inventory",      label: "Inventory",       icon: Package },
  { to: "/manufacturing",  label: "Manufacturing",   icon: Factory },
  { to: "/hr",             label: "HR",              icon: Users },
  { to: "/payroll",        label: "Payroll",         icon: Wallet },
  { to: "/projects",       label: "Projects",        icon: FolderKanban },
  { to: "/helpdesk",       label: "Helpdesk",        icon: Headphones },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { logoDataUrl, branding } = useBranding();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col text-white transition-all duration-200 shadow-xl",
        collapsed ? "w-16" : "w-56"
      )} style={{ backgroundColor: branding.primary_color }}>
        {/* Logo area — shows company logo if uploaded, else default icon */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 min-h-[64px]">
          {logoDataUrl ? (
            <div className={cn(
              "flex items-center gap-2 w-full",
              collapsed ? "justify-center" : ""
            )}>
              <img
                src={logoDataUrl}
                alt="Company logo"
                className={cn(
                  "object-contain flex-shrink-0",
                  collapsed ? "max-w-[28px] max-h-[28px]" : "max-w-[110px] max-h-[36px]"
                )}
              />
            </div>
          ) : (
            <>
              <Building2 className="w-7 h-7 text-blue-300 flex-shrink-0"/>
              {!collapsed && <span className="font-bold text-lg tracking-tight">CI ERP</span>}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-white/20 text-white border border-white/20"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}>
              <Icon className="w-4 h-4 flex-shrink-0"/>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {/* Settings link */}
          <NavLink to="/settings" className={({ isActive }) => cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full",
            isActive
              ? "bg-white/20 text-white border border-white/20"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )}>
            <Settings className="w-4 h-4 flex-shrink-0"/>
            {!collapsed && <span>Settings</span>}
          </NavLink>

          {!collapsed && user && (
            <div className="px-1 py-1 border-t border-white/10 mt-1 pt-2">
              <p className="text-xs font-semibold text-white truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-white/60 truncate">{user.email}</p>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}
            className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-start gap-2">
            <LogOut className="w-4 h-4"/>
            {!collapsed && "Logout"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(c => !c)}
            className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-center">
            {collapsed ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet/>
      </main>
    </div>
  );
}
