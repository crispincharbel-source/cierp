// CI ERP — Projects Module
import React, { useState, useEffect } from 'react';
import {
  getProjects, createProject, updateProject,
  type Project, type ProjectTask,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, FolderKanban, Clock, CheckCircle, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectsModule() {
  const { showToast } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' as ProjectTask['priority'], assigned_to: '', due_date: '' });

  const refresh = () => setProjects(getProjects());
  useEffect(() => { refresh(); }, []);

  const filtered = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const kpis = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalTasks: projects.reduce((s, p) => s + p.tasks.length, 0),
  };

  const handleCreate = () => {
    if (!newForm.name.trim()) { toast.error('Name required'); return; }
    const p = createProject(newForm);
    setShowNewModal(false); setSelected(p); setDrawerOpen(true); refresh();
    showToast('success', `"${p.name}" created`);
    setNewForm({ name: '', description: '', start_date: '', end_date: '' });
  };

  const addTask = () => {
    if (!selected || !taskForm.title.trim()) { toast.error('Title required'); return; }
    const task: ProjectTask = {
      id: 'task-' + Date.now(), project_id: selected.id, title: taskForm.title,
      description: taskForm.description, status: 'todo', priority: taskForm.priority,
      assigned_to: taskForm.assigned_to, due_date: taskForm.due_date, time_logged: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const u = updateProject(selected.id, { tasks: [...selected.tasks, task] });
    if (u) { setSelected(u); refresh(); }
    setTaskForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
    showToast('success', 'Task added');
  };

  const updateTaskStatus = (taskId: string, status: ProjectTask['status']) => {
    if (!selected) return;
    const tasks = selected.tasks.map(t => t.id === taskId ? { ...t, status, updated_at: new Date().toISOString() } : t);
    const progress = tasks.length > 0 ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0;
    const u = updateProject(selected.id, { tasks, progress });
    if (u) { setSelected(u); refresh(); }
  };

  const taskStatuses: ProjectTask['status'][] = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Projects</h1><p className="text-sm text-slate-400 mt-0.5">Manage projects & tasks</p></div>
        <PermButton permission="projects.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Project</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Projects" value={kpis.total} color="blue" icon={FolderKanban} />
        <KPICard label="Active" value={kpis.active} color="green" />
        <KPICard label="Completed" value={kpis.completed} color="purple" icon={CheckCircle} />
        <KPICard label="Total Tasks" value={kpis.totalTasks} color="amber" icon={Target} />
      </div>

      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
      </div>

      {filtered.length === 0 ? <EmptyState title="No projects yet" description="Create your first project." actionLabel="New Project" onAction={() => setShowNewModal(true)} icon={FolderKanban} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(p => (
          <div key={p.id} onClick={() => { setSelected(p); setDrawerOpen(true); }} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5 cursor-pointer hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-slate-200">{p.name}</h3><StateBadge state={p.status} /></div>
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description || 'No description'}</p>
            <div className="flex items-center justify-between mb-2"><span className="text-xs text-slate-500">{p.tasks.length} tasks</span><span className="text-xs text-slate-400">{p.progress}%</span></div>
            <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${p.progress}%` }} /></div>
            {p.start_date && <p className="text-xs text-slate-600 mt-2">{p.start_date} → {p.end_date || '...'}</p>}
          </div>
        ))}</div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || 'Project'} width="max-w-4xl">
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><StateBadge state={selected.status} size="md" /><span className="text-sm text-slate-400">{selected.progress}% complete</span></div>
              <div className="flex bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
                <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>List</button>
                <button onClick={() => setViewMode('kanban')} className={`px-3 py-1 text-xs rounded-md ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Kanban</button>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${selected.progress}%` }} /></div>

            {/* Add Task */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">Add Task</h4>
              <div className="flex gap-2 flex-wrap">
                <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" />
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as ProjectTask['priority'] }))} className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
                <button onClick={addTask} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500">Add</button>
              </div>
            </div>

            {/* Tasks */}
            {selected.tasks.length === 0 ? <EmptyState title="No tasks yet" description="Add tasks above." icon={Target} /> : viewMode === 'kanban' ? (
              <div className="flex gap-3 overflow-x-auto pb-4">{taskStatuses.map(status => (
                <div key={status} className="flex-shrink-0 w-60 bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-800/50"><h4 className="text-xs font-semibold text-slate-400 uppercase">{status.replace(/_/g, ' ')}</h4></div>
                  <div className="p-2 space-y-2 max-h-[50vh] overflow-y-auto">{selected.tasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} className="p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                      <p className="text-sm text-slate-200 mb-1">{task.title}</p>
                      <div className="flex items-center justify-between"><StateBadge state={task.priority} />
                        {status !== 'done' && (
                          <button onClick={() => updateTaskStatus(task.id, taskStatuses[taskStatuses.indexOf(status) + 1] || 'done')} className="text-[10px] text-blue-400 hover:text-blue-300">→ Next</button>
                        )}
                      </div>
                    </div>
                  ))}</div>
                </div>
              ))}</div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Task</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Priority</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Action</th>
              </tr></thead><tbody className="divide-y divide-slate-800/30">{selected.tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-800/20">
                  <td className="px-4 py-2 text-sm text-slate-200">{task.title}</td>
                  <td className="px-4 py-2"><StateBadge state={task.priority} /></td>
                  <td className="px-4 py-2"><StateBadge state={task.status} /></td>
                  <td className="px-4 py-2">
                    <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value as ProjectTask['status'])} className="px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300 outline-none">
                      {taskStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </td>
                </tr>))}</tbody></table></div>
            )}
          </div>
        )}
      </Drawer>

      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Project</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Name *</label><input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Description</label><textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Start</label><input type="date" value={newForm.start_date} onChange={e => setNewForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
                <div><label className="text-xs text-slate-400 mb-1.5 block">End</label><input type="date" value={newForm.end_date} onChange={e => setNewForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}