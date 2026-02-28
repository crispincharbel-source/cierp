// CI ERP — Admin Module
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getManagedUsers, createManagedUser, updateManagedUser,
  getManagedRoles, createManagedRole,
  getAuditLogs,
  type ManagedUser, type ManagedRole, type AuditLog,
} from '@/lib/store';
import { ROLE_PERMISSIONS } from '@/lib/auth';
import { KPICard, StateBadge, EmptyState, Drawer, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, Users, Shield, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

// ===== USERS =====
function UsersPage() {
  const { showToast } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'user', password: '' });
  const [showPw, setShowPw] = useState(false);

  const refresh = () => setUsers(getManagedUsers());
  useEffect(() => { refresh(); }, []);

  const filtered = users.filter(u => !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ email: '', full_name: '', role: 'user', password: 'password123' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (u: ManagedUser) => { setForm({ email: u.email, full_name: u.full_name, role: u.role, password: '' }); setSelected(u); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.email.trim() || !form.full_name.trim()) { toast.error('Email and name required'); return; }
    if (isNew) {
      if (!form.password) { toast.error('Password required'); return; }
      createManagedUser(form); showToast('success', `User "${form.full_name}" created`);
    } else if (selected) {
      const updates: Partial<ManagedUser & { password?: string }> = { email: form.email, full_name: form.full_name, role: form.role };
      if (form.password) (updates as Record<string, unknown>).password = form.password;
      updateManagedUser(selected.id, updates); showToast('success', 'Updated');
    }
    setDrawerOpen(false); refresh();
  };

  const toggleActive = (u: ManagedUser) => {
    updateManagedUser(u.id, { is_active: !u.is_active });
    refresh(); showToast('success', u.is_active ? 'Deactivated' : 'Activated');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">User Management</h1><p className="text-sm text-slate-400 mt-0.5">Manage system users</p></div>
        <PermButton permission="admin.users.view" onClick={openNew}><Plus className="h-4 w-4" /> Add User</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Users" value={users.length} color="blue" icon={Users} />
        <KPICard label="Active" value={users.filter(u => u.is_active).length} color="green" />
        <KPICard label="Admins" value={users.filter(u => u.role === 'admin').length} color="purple" icon={Shield} />
        <KPICard label="Inactive" value={users.filter(u => !u.is_active).length} color="red" />
      </div>

      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
      </div>

      {filtered.length === 0 ? <EmptyState title="No users" description="Add users to the system." actionLabel="Add User" onAction={openNew} icon={Users} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Role</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(u => (
          <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200 cursor-pointer" onClick={() => openEdit(u)}>{u.full_name}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
            <td className="px-4 py-3"><StateBadge state={u.role} /></td>
            <td className="px-4 py-3"><StateBadge state={u.is_active ? 'active' : 'archived'} /></td>
            <td className="px-4 py-3">
              <button onClick={() => toggleActive(u)} className={`text-xs px-2 py-1 rounded ${u.is_active ? 'text-red-400 hover:bg-red-600/10' : 'text-green-400 hover:bg-green-600/10'}`}>
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New User' : `Edit: ${selected?.full_name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Full Name *</label><input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Email *</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
              <option value="admin">Admin</option><option value="manager">Manager</option><option value="user">User</option><option value="viewer">Viewer</option>
            </select></div>
          <div><label className="text-xs text-slate-400 mb-1 block">{isNew ? 'Password *' : 'New Password (leave blank to keep)'}</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={isNew ? '' : '••••••••'} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission="admin.users.view" onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== ROLES =====
function RolesPage() {
  const roles = getManagedRoles();
  const availableRoles = Object.keys(ROLE_PERMISSIONS);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Roles & Permissions</h1><p className="text-sm text-slate-400 mt-0.5">Role-based access control</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableRoles.map(role => {
          const perms = ROLE_PERMISSIONS[role] || [];
          const isAll = perms.includes('*');
          return (
            <div key={role} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role === 'admin' ? 'bg-purple-600/10' : role === 'manager' ? 'bg-blue-600/10' : role === 'user' ? 'bg-green-600/10' : 'bg-slate-700'}`}>
                  <Shield className={`h-5 w-5 ${role === 'admin' ? 'text-purple-400' : role === 'manager' ? 'text-blue-400' : role === 'user' ? 'text-green-400' : 'text-slate-400'}`} />
                </div>
                <div><h3 className="text-sm font-semibold text-slate-200 capitalize">{role}</h3><p className="text-xs text-slate-500">{isAll ? 'All permissions' : `${perms.length} permissions`}</p></div>
              </div>
              {isAll ? (
                <p className="text-xs text-purple-400 bg-purple-600/10 px-2 py-1 rounded-lg text-center">Full Access</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {perms.slice(0, 8).map(p => (
                    <p key={p} className="text-[10px] text-slate-500 font-mono truncate">{p}</p>
                  ))}
                  {perms.length > 8 && <p className="text-[10px] text-slate-600">+{perms.length - 8} more</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {roles.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Custom Roles</h2>
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Permissions</th>
          </tr></thead><tbody className="divide-y divide-slate-800/30">{roles.map(r => (
            <tr key={r.id} className="hover:bg-slate-800/20">
              <td className="px-4 py-3 text-sm font-medium text-slate-200">{r.name}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{r.description || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-300 text-right">{r.permissions.length}</td>
            </tr>))}</tbody></table></div>
        </div>
      )}
    </div>
  );
}

// ===== AUDIT LOG =====
function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  useEffect(() => { setLogs(getAuditLogs()); }, []);

  const filtered = logs.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.actor_name.toLowerCase().includes(search.toLowerCase()) || l.resource_type.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Audit Log</h1><p className="text-sm text-slate-400 mt-0.5">System activity trail</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Total Events" value={logs.length} color="blue" icon={Clock} />
        <KPICard label="Today" value={logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length} color="green" />
        <KPICard label="Unique Actors" value={new Set(logs.map(l => l.actor_name)).size} color="purple" icon={Users} />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
      </div>
      {filtered.length === 0 ? <EmptyState title="No audit logs" description="Activity will be logged here." icon={Clock} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actor</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Resource</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
          </tr></thead><tbody className="divide-y divide-slate-800/30">{paginated.map(l => (
            <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
              <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 text-sm text-slate-200">{l.actor_name}</td>
              <td className="px-4 py-2 text-sm text-slate-400">{l.action}</td>
              <td className="px-4 py-2 text-sm text-slate-400">{l.resource_type}</td>
              <td className="px-4 py-2 text-xs text-slate-600 font-mono">{l.resource_id.substring(0, 12)}</td>
            </tr>))}</tbody></table></div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{filtered.length} events · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ROUTER =====
export default function AdminModule() {
  const { pathname } = useLocation();
  if (pathname === '/admin/roles') return <RolesPage />;
  if (pathname === '/admin/audit') return <AuditLogPage />;
  return <UsersPage />;
}