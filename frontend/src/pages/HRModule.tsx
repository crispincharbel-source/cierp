// CI ERP — HR Module
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getEmployees, createEmployee, updateEmployee,
  getLeaveRequests, createLeaveRequest, transitionLeaveRequest,
  type Employee, type LeaveRequest,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, Users, Calendar, UserCircle, DollarSign, Building2 } from 'lucide-react';
import { toast } from 'sonner';

// ===== EMPLOYEES =====
function EmployeesPage() {
  const { showToast } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', position: '', hire_date: '', salary: 0 });

  const refresh = () => setEmployees(getEmployees());
  useEffect(() => { refresh(); }, []);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const filtered = employees.filter(e => {
    if (deptFilter && e.department !== deptFilter) return false;
    if (search) { const q = search.toLowerCase(); return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.position.toLowerCase().includes(q); }
    return true;
  });

  const kpis = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    onLeave: employees.filter(e => e.status === 'on_leave').length,
    departments: departments.length,
  };

  const openNew = () => { setForm({ name: '', email: '', phone: '', department: '', position: '', hire_date: new Date().toISOString().split('T')[0], salary: 0 }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (e: Employee) => { setForm({ name: e.name, email: e.email, phone: e.phone, department: e.department, position: e.position, hire_date: e.hire_date, salary: e.salary }); setSelected(e); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createEmployee(form); showToast('success', `"${form.name}" added`); }
    else if (selected) { updateEmployee(selected.id, form); showToast('success', `"${form.name}" updated`); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Employees</h1><p className="text-sm text-slate-400 mt-0.5">Employee directory</p></div>
        <PermButton permission="hr.employees.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Employee</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Employees" value={kpis.total} color="blue" icon={Users} />
        <KPICard label="Active" value={kpis.active} color="green" />
        <KPICard label="On Leave" value={kpis.onLeave} color="amber" />
        <KPICard label="Departments" value={kpis.departments} color="purple" icon={Building2} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
        </div>
        {departments.length > 0 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 outline-none">
            <option value="">All Departments</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? <EmptyState title="No employees yet" description="Add your first employee." actionLabel="Add Employee" onAction={openNew} icon={UserCircle} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Position</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(e => (
          <tr key={e.id} onClick={() => openEdit(e)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{e.name}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{e.email || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{e.department || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{e.position || '—'}</td>
            <td className="px-4 py-3"><StateBadge state={e.status} /></td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Employee' : `Edit: ${selected?.name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" /></div>
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
            <div><label className="text-xs text-slate-400 mb-1 block">Salary</label><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" min="0" /></div>
          </div>
          {!isNew && selected && (
            <div><label className="text-xs text-slate-400 mb-1 block">Status</label>
              <select value={selected.status} onChange={e => { updateEmployee(selected.id, { status: e.target.value as Employee['status'] }); refresh(); setDrawerOpen(false); showToast('success', 'Status updated'); }} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
                <option value="active">Active</option><option value="on_leave">On Leave</option><option value="terminated">Terminated</option>
              </select></div>
          )}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'hr.employees.create' : 'hr.employees.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== DEPARTMENTS =====
function DepartmentsPage() {
  const employees = getEmployees();
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const deptData = departments.map(d => ({
    name: d,
    count: employees.filter(e => e.department === d).length,
    active: employees.filter(e => e.department === d && e.status === 'active').length,
    totalSalary: employees.filter(e => e.department === d).reduce((s, e) => s + e.salary, 0),
  }));

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Departments</h1><p className="text-sm text-slate-400 mt-0.5">Organization structure</p></div>
      {deptData.length === 0 ? <EmptyState title="No departments yet" description="Departments are created when you assign employees to them." icon={Building2} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptData.map(d => (
            <div key={d.name} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-blue-400" /></div>
                <div><h3 className="text-sm font-semibold text-slate-200">{d.name}</h3><p className="text-xs text-slate-500">{d.count} employees</p></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Active</span><span className="text-slate-300">{d.active}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Total Salary</span><span className="text-slate-300">${d.totalSalary.toLocaleString()}/mo</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== LEAVE REQUESTS =====
function LeavePage() {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const [newForm, setNewForm] = useState({ employee_name: '', type: 'annual' as LeaveRequest['type'], start_date: '', end_date: '', days: 1, reason: '' });

  const refresh = () => setRequests(getLeaveRequests());
  useEffect(() => { refresh(); }, []);

  const kpis = {
    pending: requests.filter(r => r.state === 'pending').length,
    approved: requests.filter(r => r.state === 'approved').length,
    rejected: requests.filter(r => r.state === 'rejected').length,
    totalDays: requests.filter(r => r.state === 'approved').reduce((s, r) => s + r.days, 0),
  };

  const handleCreate = () => {
    if (!newForm.employee_name.trim()) { toast.error('Employee name required'); return; }
    createLeaveRequest(newForm);
    setShowNewModal(false); refresh(); showToast('success', 'Leave request created');
    setNewForm({ employee_name: '', type: 'annual', start_date: '', end_date: '', days: 1, reason: '' });
  };

  const handleDecision = (id: string, decision: 'approved' | 'rejected') => {
    transitionLeaveRequest(id, decision);
    refresh(); setDrawerOpen(false); showToast('success', `Request ${decision}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Leave Requests</h1><p className="text-sm text-slate-400 mt-0.5">Manage time off</p></div>
        <PermButton permission="hr.leave.view" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Request</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Pending" value={kpis.pending} color="amber" icon={Calendar} />
        <KPICard label="Approved" value={kpis.approved} color="green" />
        <KPICard label="Rejected" value={kpis.rejected} color="red" />
        <KPICard label="Days Taken" value={kpis.totalDays} color="blue" />
      </div>

      {requests.length === 0 ? <EmptyState title="No leave requests" description="Submit a leave request." actionLabel="New Request" onAction={() => setShowNewModal(true)} icon={Calendar} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Dates</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Days</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{requests.map(r => (
          <tr key={r.id} onClick={() => { setSelected(r); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{r.employee_name}</td>
            <td className="px-4 py-3"><StateBadge state={r.type} /></td>
            <td className="px-4 py-3 text-sm text-slate-400">{r.start_date} → {r.end_date}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">{r.days}</td>
            <td className="px-4 py-3"><StateBadge state={r.state} /></td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Leave: ${selected?.employee_name || ''}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Employee</label><p className="text-sm text-slate-200">{selected.employee_name}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Type</label><StateBadge state={selected.type} size="md" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Start</label><p className="text-sm text-slate-200">{selected.start_date}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">End</label><p className="text-sm text-slate-200">{selected.end_date}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Days</label><p className="text-sm text-slate-200">{selected.days}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">State</label><StateBadge state={selected.state} size="md" /></div>
            </div>
            {selected.reason && <div><label className="text-xs text-slate-500 mb-1 block">Reason</label><p className="text-sm text-slate-300">{selected.reason}</p></div>}
            {selected.state === 'pending' && (
              <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                <PermButton permission="hr.leave.approve" onClick={() => handleDecision(selected.id, 'approved')}>Approve</PermButton>
                <PermButton permission="hr.leave.approve" onClick={() => handleDecision(selected.id, 'rejected')} variant="danger">Reject</PermButton>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Leave Request</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Employee Name *</label>
                <input value={newForm.employee_name} onChange={e => setNewForm(f => ({ ...f, employee_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Type</label>
                <select value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value as LeaveRequest['type'] }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
                  <option value="annual">Annual</option><option value="sick">Sick</option><option value="personal">Personal</option><option value="maternity">Maternity</option><option value="other">Other</option>
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Start</label><input type="date" value={newForm.start_date} onChange={e => setNewForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
                <div><label className="text-xs text-slate-400 mb-1.5 block">End</label><input type="date" value={newForm.end_date} onChange={e => setNewForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Days</label><input type="number" value={newForm.days} onChange={e => setNewForm(f => ({ ...f, days: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" min="1" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Reason</label><textarea value={newForm.reason} onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))} rows={2} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PAYROLL =====
function PayrollPage() {
  const employees = getEmployees().filter(e => e.status === 'active');
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Payroll</h1><p className="text-sm text-slate-400 mt-0.5">Monthly payroll overview</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Active Employees" value={employees.length} color="blue" icon={Users} />
        <KPICard label="Monthly Payroll" value={`$${totalPayroll.toLocaleString()}`} color="green" icon={DollarSign} />
        <KPICard label="Avg Salary" value={`$${employees.length ? Math.round(totalPayroll / employees.length).toLocaleString() : 0}`} color="purple" />
      </div>
      {employees.length === 0 ? <EmptyState title="No active employees" description="Add employees to run payroll." icon={DollarSign} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Department</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Position</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Gross</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Tax (20%)</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Net</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{employees.map(e => {
          const tax = Math.round(e.salary * 0.2);
          return (
            <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-slate-200">{e.name}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{e.department || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{e.position || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-300 text-right">${e.salary.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-red-400 text-right">-${tax.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm font-medium text-green-400 text-right">${(e.salary - tax).toLocaleString()}</td>
            </tr>
          );
        })}</tbody></table></div>
          <div className="px-4 py-3 border-t border-slate-800/50 flex justify-end gap-8">
            <span className="text-xs text-slate-500">Total Gross: <span className="text-slate-300 font-medium">${totalPayroll.toLocaleString()}</span></span>
            <span className="text-xs text-slate-500">Total Net: <span className="text-green-400 font-medium">${Math.round(totalPayroll * 0.8).toLocaleString()}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ROUTER =====
export default function HRModule() {
  const { pathname } = useLocation();
  if (pathname === '/hr/departments') return <DepartmentsPage />;
  if (pathname === '/hr/leave') return <LeavePage />;
  if (pathname === '/hr/payroll') return <PayrollPage />;
  return <EmployeesPage />;
}