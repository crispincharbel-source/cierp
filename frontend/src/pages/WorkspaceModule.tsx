// CI ERP — Workspace Module: HR, Projects, Helpdesk, Approvals, Admin
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getEmployees, createEmployee, updateEmployee,
  getLeaveRequests, createLeaveRequest, transitionLeaveRequest,
  getTickets, createTicket, updateTicket,
  getProjects, createProject, updateProject,
  getApprovalRules, createApprovalRule, getApprovalRequests, createApprovalRequest, transitionApprovalRequest,
  getAuditLogs, getManagedUsers, createManagedUser, updateManagedUser, getManagedRoles, createManagedRole, updateManagedRole,
  type Employee, type LeaveRequest, type Ticket, type Project, type ProjectTask,
  type ApprovalRule, type ApprovalRequest, type AuditLog, type ManagedUser, type ManagedRole,
} from '@/lib/store';
import { ALL_PERMISSIONS } from '@/lib/auth';
import { KPICard, StateBadge, EmptyState, Drawer, WorkflowRibbon, PermButton, useAuth, ConfirmModal } from '@/components/Layout';
import { Plus, Search, Users, UserCircle, Calendar, DollarSign, FolderKanban, Headset, CheckSquare, Settings, Shield, FileText, Clock, Trash2, Eye, Building } from 'lucide-react';
import { toast } from 'sonner';

// ===== EMPLOYEES =====
function EmployeesPage() {
  const { showToast } = useAuth();
  const [emps, setEmps] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', position: '', hire_date: '', salary: 0 });

  const refresh = () => setEmps(getEmployees());
  useEffect(() => { refresh(); }, []);
  const filtered = emps.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: '', email: '', phone: '', department: '', position: '', hire_date: new Date().toISOString().split('T')[0], salary: 0 }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (e: Employee) => { setForm({ name: e.name, email: e.email, phone: e.phone, department: e.department, position: e.position, hire_date: e.hire_date, salary: e.salary }); setSelected(e); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createEmployee(form); showToast('success', 'Employee added'); } else if (selected) { updateEmployee(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Employees</h1><p className="text-sm text-slate-400 mt-0.5">Employee directory</p></div>
        <PermButton permission="hr.employees.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Employee</PermButton></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total" value={emps.length} color="blue" icon={Users} /><KPICard label="Active" value={emps.filter(e => e.status === 'active').length} color="green" />
        <KPICard label="On Leave" value={emps.filter(e => e.status === 'on_leave').length} color="amber" /><KPICard label="Departments" value={[...new Set(emps.map(e => e.department).filter(Boolean))].length} color="purple" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No employees" description="Add your first employee." actionLabel="Add Employee" onAction={openNew} icon={UserCircle} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Position</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(e => (
          <tr key={e.id} onClick={() => openEdit(e)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{e.name}</td><td className="px-4 py-3 text-sm text-slate-400">{e.email || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{e.department || '—'}</td><td className="px-4 py-3 text-sm text-slate-400">{e.position || '—'}</td>
            <td className="px-4 py-3"><StateBadge state={e.status} /></td>
          </tr>))}</tbody></table></div></div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Employee' : selected?.name || ''}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Department</label><input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Position</label><input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Hire Date</label><input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Salary</label><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'hr.employees.create' : 'hr.employees.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== DEPARTMENTS =====
function DepartmentsPage() {
  const emps = getEmployees();
  const depts = [...new Set(emps.map(e => e.department).filter(Boolean))];
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Departments</h1><p className="text-sm text-slate-400 mt-0.5">Organization structure</p></div>
      {depts.length === 0 ? <EmptyState title="No departments" description="Departments are created when employees are assigned to them." icon={Building} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{depts.map(d => {
          const deptEmps = emps.filter(e => e.department === d);
          return (<div key={d} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">{d}</h3>
            <p className="text-xs text-slate-500 mb-3">{deptEmps.length} employee{deptEmps.length !== 1 ? 's' : ''}</p>
            <div className="space-y-1">{deptEmps.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs"><div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold">{e.name.charAt(0)}</div>
                <span className="text-slate-300">{e.name}</span><span className="text-slate-600 ml-auto">{e.position}</span></div>
            ))}{deptEmps.length > 5 && <p className="text-[10px] text-slate-600">+{deptEmps.length - 5} more</p>}</div>
          </div>);
        })}</div>
      )}
    </div>
  );
}

// ===== LEAVE REQUESTS =====
function LeavePage() {
  const { showToast } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ employee_name: '', type: 'annual' as LeaveRequest['type'], start_date: '', end_date: '', days: 1, reason: '' });
  const emps = getEmployees();

  const refresh = () => setLeaves(getLeaveRequests());
  useEffect(() => { refresh(); }, []);

  const handleCreate = () => {
    if (!form.employee_name) { toast.error('Select employee'); return; }
    createLeaveRequest(form); setShowNew(false); refresh(); showToast('success', 'Leave request created');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Leave Requests</h1><p className="text-sm text-slate-400 mt-0.5">Manage time off</p></div>
        <PermButton permission="hr.leave.view" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Request</PermButton></div>
      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Pending" value={leaves.filter(l => l.state === 'pending').length} color="amber" icon={Clock} />
        <KPICard label="Approved" value={leaves.filter(l => l.state === 'approved').length} color="green" />
        <KPICard label="Rejected" value={leaves.filter(l => l.state === 'rejected').length} color="red" />
      </div>
      {leaves.length === 0 ? <EmptyState title="No leave requests" description="Submit a leave request." actionLabel="New Request" onAction={() => setShowNew(true)} icon={Calendar} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Dates</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Days</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{leaves.map(l => (
          <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{l.employee_name}</td><td className="px-4 py-3"><StateBadge state={l.type} /></td>
            <td className="px-4 py-3 text-sm text-slate-400">{l.start_date} → {l.end_date}</td><td className="px-4 py-3 text-sm text-slate-200 text-right">{l.days}</td>
            <td className="px-4 py-3"><StateBadge state={l.state} /></td>
            <td className="px-4 py-3">{l.state === 'pending' && (<div className="flex gap-1">
              <PermButton permission="hr.leave.approve" onClick={() => { transitionLeaveRequest(l.id, 'approved'); refresh(); showToast('success', 'Approved'); }} variant="secondary">✓</PermButton>
              <PermButton permission="hr.leave.approve" onClick={() => { transitionLeaveRequest(l.id, 'rejected'); refresh(); showToast('success', 'Rejected'); }} variant="danger">✗</PermButton>
            </div>)}</td>
          </tr>))}</tbody></table></div></div>
      )}
      {showNew && (<div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">New Leave Request</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Employee</label><select value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
              <option value="">Choose...</option>{emps.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as LeaveRequest['type'] }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
              <option value="annual">Annual</option><option value="sick">Sick</option><option value="personal">Personal</option><option value="maternity">Maternity</option><option value="other">Other</option></select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Start</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">End</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Days</label><input type="number" value={form.days} onChange={e => setForm(f => ({ ...f, days: parseInt(e.target.value) || 1 }))} min="1" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Reason</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Submit</button></div>
        </div></div>)}
    </div>
  );
}

// ===== PAYROLL =====
function PayrollPage() {
  const emps = getEmployees().filter(e => e.status === 'active');
  const totalPayroll = emps.reduce((s, e) => s + e.salary, 0);
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Payroll</h1><p className="text-sm text-slate-400 mt-0.5">Salary overview</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Active Employees" value={emps.length} color="blue" icon={Users} />
        <KPICard label="Monthly Payroll" value={`$${totalPayroll.toLocaleString()}`} color="green" icon={DollarSign} />
        <KPICard label="Avg Salary" value={emps.length ? `$${Math.round(totalPayroll / emps.length).toLocaleString()}` : '$0'} color="purple" />
      </div>
      {emps.length === 0 ? <EmptyState title="No payroll data" description="Add employees to see payroll." icon={DollarSign} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Position</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Salary</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{emps.map(e => (
          <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{e.name}</td><td className="px-4 py-3 text-sm text-slate-400">{e.department || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{e.position || '—'}</td><td className="px-4 py-3 text-sm font-medium text-green-400 text-right">${e.salary.toLocaleString()}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== PROJECTS =====
function ProjectsPage() {
  const { showToast } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [taskForm, setTaskForm] = useState({ title: '', assigned_to: '', due_date: '', priority: 'medium' as ProjectTask['priority'] });

  const refresh = () => setProjects(getProjects());
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setForm({ name: '', description: '', start_date: new Date().toISOString().split('T')[0], end_date: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (p: Project) => { setForm({ name: p.name, description: p.description, start_date: p.start_date, end_date: p.end_date }); setSelected(p); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createProject(form); showToast('success', 'Project created'); } else if (selected) { updateProject(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  const addTask = () => {
    if (!selected || !taskForm.title.trim()) { toast.error('Task title required'); return; }
    const task: ProjectTask = { id: 'task-' + Date.now(), project_id: selected.id, title: taskForm.title, description: '', status: 'todo', priority: taskForm.priority, assigned_to: taskForm.assigned_to, due_date: taskForm.due_date, time_logged: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const u = updateProject(selected.id, { tasks: [...selected.tasks, task] });
    if (u) { setSelected(u); setTaskForm({ title: '', assigned_to: '', due_date: '', priority: 'medium' }); }
  };

  const updateTaskStatus = (taskId: string, status: ProjectTask['status']) => {
    if (!selected) return;
    const tasks = selected.tasks.map(t => t.id === taskId ? { ...t, status, updated_at: new Date().toISOString() } : t);
    const progress = tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0;
    const u = updateProject(selected.id, { tasks, progress }); if (u) setSelected(u);
  };

  const taskStatuses: ProjectTask['status'][] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Projects</h1><p className="text-sm text-slate-400 mt-0.5">Task boards and milestones</p></div>
        <PermButton permission="projects.create" onClick={openNew}><Plus className="h-4 w-4" /> New Project</PermButton></div>
      {projects.length === 0 ? <EmptyState title="No projects" description="Create your first project." actionLabel="New Project" onAction={openNew} icon={FolderKanban} /> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p => (
          <div key={p.id} onClick={() => openEdit(p)} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 cursor-pointer hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-slate-200">{p.name}</h3><StateBadge state={p.status} /></div>
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description || 'No description'}</p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${p.progress}%` }} /></div>
            <div className="flex items-center justify-between text-xs text-slate-500"><span>{p.progress}% complete</span><span>{p.tasks.length} tasks</span></div>
          </div>
        ))}</div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Project' : selected?.name || ''} width="max-w-3xl">
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Start</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">End</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          {!isNew && selected && (<>
            <div className="border-t border-slate-700/50 pt-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Tasks ({selected.tasks.length})</h3>
              <div className="flex gap-2 mb-3">
                <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" />
                <button onClick={addTask} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-500">Add</button>
              </div>
              {/* Kanban */}
              <div className="flex gap-3 overflow-x-auto pb-2">{taskStatuses.map(status => (
                <div key={status} className="flex-shrink-0 w-48 bg-slate-800/20 rounded-lg p-2">
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-2 px-1">{status.replace('_', ' ')} ({selected.tasks.filter(t => t.status === status).length})</h4>
                  <div className="space-y-1">{selected.tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="p-2 bg-slate-800/50 rounded border border-slate-700/30 text-xs">
                      <p className="text-slate-200 font-medium mb-1">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <StateBadge state={task.priority} />
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value as ProjectTask['status'])} className="bg-transparent text-[10px] text-slate-400 outline-none">
                          {taskStatuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}</div>
                </div>
              ))}</div>
            </div>
          </>)}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'projects.create' : 'projects.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== HELPDESK =====
function HelpdeskPage() {
  const { showToast } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' as Ticket['priority'], queue: 'General', customer_name: '', customer_email: '' });

  const refresh = () => setTickets(getTickets());
  useEffect(() => { refresh(); }, []);
  const filtered = tickets.filter(t => !search || t.ticket_number.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()));
  const kpis = { open: tickets.filter(t => t.state === 'open').length, in_progress: tickets.filter(t => t.state === 'in_progress').length, resolved: tickets.filter(t => t.state === 'resolved').length, closed: tickets.filter(t => t.state === 'closed').length };

  const handleCreate = () => {
    if (!form.subject.trim()) { toast.error('Subject required'); return; }
    const t = createTicket(form); setShowNew(false); refresh(); showToast('success', `${t.ticket_number} created`);
  };

  const transition = (state: Ticket['state']) => {
    if (!selected) return;
    const u = updateTicket(selected.id, { state }); if (u) { setSelected(u); refresh(); showToast('success', `→ ${state.replace('_', ' ')}`); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-xl font-bold text-slate-100">Helpdesk</h1><p className="text-sm text-slate-400 mt-0.5">Support tickets</p></div>
        <PermButton permission="helpdesk.tickets.create" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Ticket</PermButton></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Open" value={kpis.open} color="blue" /><KPICard label="In Progress" value={kpis.in_progress} color="amber" />
        <KPICard label="Resolved" value={kpis.resolved} color="green" /><KPICard label="Closed" value={kpis.closed} color="slate" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No tickets" description="Create a support ticket." actionLabel="New Ticket" onAction={() => setShowNew(true)} icon={Headset} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Ticket</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Subject</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Priority</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Queue</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(t => (
          <tr key={t.id} onClick={() => { setSelected(t); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{t.ticket_number}</td><td className="px-4 py-3 text-sm text-slate-300">{t.subject}</td>
            <td className="px-4 py-3"><StateBadge state={t.priority} /></td><td className="px-4 py-3"><StateBadge state={t.state} /></td>
            <td className="px-4 py-3 text-sm text-slate-400">{t.queue}</td>
          </tr>))}</tbody></table></div></div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.ticket_number || 'Ticket'}>
        {selected && (<div className="space-y-6">
          <WorkflowRibbon states={['open', 'in_progress', 'resolved', 'closed']} currentState={selected.state} />
          <div className="flex flex-wrap gap-2">
            {selected.state === 'open' && <PermButton permission="helpdesk.tickets.edit" onClick={() => transition('in_progress')}>Start Working</PermButton>}
            {selected.state === 'in_progress' && <PermButton permission="helpdesk.tickets.edit" onClick={() => transition('resolved')}>Resolve</PermButton>}
            {selected.state === 'resolved' && <PermButton permission="helpdesk.tickets.close" onClick={() => transition('closed')}>Close</PermButton>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Subject</label><p className="text-sm text-slate-200">{selected.subject}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Priority</label><StateBadge state={selected.priority} size="md" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Customer</label><p className="text-sm text-slate-200">{selected.customer_name || '—'}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Queue</label><p className="text-sm text-slate-200">{selected.queue}</p></div>
          </div>
          {selected.description && <div><label className="text-xs text-slate-500 mb-1 block">Description</label><p className="text-sm text-slate-300">{selected.description}</p></div>}
        </div>)}
      </Drawer>
      {showNew && (<div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNew(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">New Ticket</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Subject *</label><input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Priority</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Ticket['priority'] }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Queue</label><input value={form.queue} onChange={e => setForm(f => ({ ...f, queue: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Customer Name</label><input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Customer Email</label><input value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button></div>
        </div></div>)}
    </div>
  );
}

// ===== APPROVALS =====
function ApprovalsPage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const refresh = () => setRequests(getApprovalRequests());
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Approvals</h1><p className="text-sm text-slate-400 mt-0.5">Approval workflows</p></div>
      <div className="grid grid-cols-3 gap-3">
        <KPICard label="Pending" value={requests.filter(r => r.state === 'pending').length} color="amber" icon={Clock} />
        <KPICard label="Approved" value={requests.filter(r => r.state === 'approved').length} color="green" />
        <KPICard label="Rejected" value={requests.filter(r => r.state === 'rejected').length} color="red" />
      </div>
      {requests.length === 0 ? <EmptyState title="No approval requests" description="Approval requests will appear here when workflows are triggered." icon={CheckSquare} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Module</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Resource</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Requested By</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{requests.map(r => (
          <tr key={r.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm text-slate-300 capitalize">{r.module}</td><td className="px-4 py-3 text-sm text-slate-200">{r.resource_label}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{r.requested_by}</td><td className="px-4 py-3"><StateBadge state={r.state} /></td>
            <td className="px-4 py-3">{r.state === 'pending' && (<div className="flex gap-1">
              <PermButton permission="approvals.requests.approve" onClick={() => { transitionApprovalRequest(r.id, 'approved'); refresh(); showToast('success', 'Approved'); }} variant="secondary">Approve</PermButton>
              <PermButton permission="approvals.requests.reject" onClick={() => { transitionApprovalRequest(r.id, 'rejected'); refresh(); showToast('success', 'Rejected'); }} variant="danger">Reject</PermButton>
            </div>)}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== ADMIN: USERS =====
function AdminUsersPage() {
  const { showToast } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'user', is_active: true });
  const roles = getManagedRoles();

  const refresh = () => setUsers(getManagedUsers());
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setForm({ full_name: '', email: '', password: 'password123', role: 'user', is_active: true }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (u: ManagedUser) => { setForm({ full_name: u.full_name, email: u.email, password: u.password, role: u.role, is_active: u.is_active }); setSelected(u); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.full_name.trim() || !form.email.trim()) { toast.error('Name and email required'); return; }
    if (isNew) { createManagedUser(form); showToast('success', 'User created'); } else if (selected) { updateManagedUser(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">User Management</h1><p className="text-sm text-slate-400 mt-0.5">Manage system users</p></div>
        <PermButton permission="admin.users.view" onClick={openNew}><Plus className="h-4 w-4" /> Add User</PermButton></div>
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Role</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
      </tr></thead><tbody className="divide-y divide-slate-800/30">{users.map(u => (
        <tr key={u.id} onClick={() => openEdit(u)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
          <td className="px-4 py-3 text-sm font-medium text-slate-200">{u.full_name}</td><td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
          <td className="px-4 py-3"><StateBadge state={u.role === 'admin' ? 'confirmed' : u.role === 'manager' ? 'planned' : u.role === 'viewer' ? 'closed' : 'active'} /><span className="ml-1 text-xs text-slate-400 capitalize">{u.role}</span></td>
          <td className="px-4 py-3"><StateBadge state={u.is_active ? 'active' : 'cancelled'} /></td>
        </tr>))}</tbody></table></div></div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New User' : `Edit: ${selected?.full_name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Full Name *</label><input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Email *</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Password</label><input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none font-mono" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Role</label><select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" /><label className="text-sm text-slate-300">Active</label></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission="admin.users.view" onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== ADMIN: ROLES =====
function AdminRolesPage() {
  const { showToast } = useAuth();
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ManagedRole | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', permissions: [] as string[] });

  const permGroups = ALL_PERMISSIONS.reduce((acc, p) => {
    const group = p.split('.').slice(0, -1).join('.');
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {} as Record<string, string[]>);

  const refresh = () => setRoles(getManagedRoles());
  useEffect(() => { refresh(); }, []);

  const openNew = () => { setForm({ name: '', permissions: [] }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (r: ManagedRole) => { setForm({ name: r.name, permissions: [...r.permissions] }); setSelected(r); setIsNew(false); setDrawerOpen(true); };

  const togglePerm = (perm: string) => {
    setForm(f => ({ ...f, permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm] }));
  };

  const toggleGroup = (group: string) => {
    const groupPerms = permGroups[group] || [];
    const allSelected = groupPerms.every(p => form.permissions.includes(p));
    if (allSelected) setForm(f => ({ ...f, permissions: f.permissions.filter(p => !groupPerms.includes(p)) }));
    else setForm(f => ({ ...f, permissions: [...new Set([...f.permissions, ...groupPerms])] }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createManagedRole(form); showToast('success', 'Role created'); } else if (selected) { updateManagedRole(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Role Management</h1><p className="text-sm text-slate-400 mt-0.5">Configure roles and permissions</p></div>
        <PermButton permission="admin.roles.view" onClick={openNew}><Plus className="h-4 w-4" /> New Role</PermButton></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{roles.map(r => (
        <div key={r.id} onClick={() => openEdit(r)} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 cursor-pointer hover:bg-slate-800/20 transition-colors">
          <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-blue-400" /><h3 className="text-sm font-semibold text-slate-200 capitalize">{r.name}</h3>
            {r.is_system && <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">System</span>}</div>
          <p className="text-xs text-slate-500">{r.permissions.includes('*') ? 'All permissions' : `${r.permissions.length} permissions`}</p>
        </div>
      ))}</div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Role' : `Role: ${selected?.name || ''}`} width="max-w-3xl">
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Role Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={selected?.is_system} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none disabled:opacity-50" /></div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Permissions ({form.permissions.length})</label>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">{Object.entries(permGroups).map(([group, perms]) => {
              const allSelected = perms.every(p => form.permissions.includes(p));
              const someSelected = perms.some(p => form.permissions.includes(p));
              return (
                <div key={group} className="bg-slate-800/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => toggleGroup(group)}>
                    <input type="checkbox" checked={allSelected} readOnly className="rounded" style={{ accentColor: someSelected ? '#3b82f6' : undefined }} />
                    <span className="text-xs font-semibold text-slate-300 uppercase">{group}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-5">{perms.map(p => {
                    const action = p.split('.').pop() || '';
                    return (
                      <button key={p} onClick={() => togglePerm(p)} className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${form.permissions.includes(p) ? 'bg-blue-600/20 border-blue-600/30 text-blue-400' : 'bg-slate-800 border-slate-700/50 text-slate-500 hover:text-slate-300'}`}>
                        {action}
                      </button>
                    );
                  })}</div>
                </div>
              );
            })}</div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission="admin.roles.view" onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== ADMIN: AUDIT LOG =====
function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => { setLogs(getAuditLogs()); }, []);
  const filtered = logs.filter(l => !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.resource_type.toLowerCase().includes(search.toLowerCase()) || l.actor_name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Audit Log</h1><p className="text-sm text-slate-400 mt-0.5">Complete activity trail</p></div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search actions, resources..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No audit logs" description="Actions will be logged here." icon={FileText} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Time</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actor</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Resource</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">ID</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{paginated.map(l => (
          <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-xs text-slate-400 font-mono">{new Date(l.created_at).toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{l.actor_name}</td>
            <td className="px-4 py-3 text-sm text-slate-200 font-mono">{l.action}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{l.resource_type}</td>
            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{l.resource_id.substring(0, 12)}...</td>
          </tr>))}</tbody></table></div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{filtered.length} entries · Page {page}/{totalPages}</span>
            <div className="flex gap-1"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ADMIN: SETTINGS =====
function SettingsPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Settings</h1><p className="text-sm text-slate-400 mt-0.5">Tenant and system settings</p></div>
      <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Tenant Name</label><p className="text-sm text-slate-200">CI ERP</p></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Currency</label><p className="text-sm text-slate-200">USD</p></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Timezone</label><p className="text-sm text-slate-200">UTC</p></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Version</label><p className="text-sm text-slate-200">1.0.0</p></div>
        </div>
      </div>
    </div>
  );
}

// ===== ROUTER =====
export default function WorkspaceModule() {
  const { pathname } = useLocation();
  if (pathname === '/hr/employees') return <EmployeesPage />;
  if (pathname === '/hr/departments') return <DepartmentsPage />;
  if (pathname === '/hr/leave') return <LeavePage />;
  if (pathname === '/hr/payroll') return <PayrollPage />;
  if (pathname === '/projects') return <ProjectsPage />;
  if (pathname === '/helpdesk') return <HelpdeskPage />;
  if (pathname === '/approvals') return <ApprovalsPage />;
  if (pathname === '/admin/users') return <AdminUsersPage />;
  if (pathname === '/admin/roles') return <AdminRolesPage />;
  if (pathname === '/admin/audit') return <AuditLogPage />;
  if (pathname === '/admin/settings') return <SettingsPage />;
  return <EmployeesPage />;
}