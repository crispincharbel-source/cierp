// CI ERP — Manufacturing Module (Enhanced)
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, transitionWorkOrder,
  getBOMs, createBOM, updateBOM,
  type WorkOrder, type BOM,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, Factory, Wrench, ClipboardCheck, Layers, Settings, Shield, AlertTriangle, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// ===== WORK ORDERS =====
function WorkOrdersPage() {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ product_name: '', quantity: 1, planned_start: '', planned_end: '', priority: 'medium' as WorkOrder['priority'], workcenter: '', assigned_to: '' });

  const refresh = () => setOrders(getWorkOrders());
  useEffect(() => { refresh(); }, []);

  const filtered = orders.filter(o => {
    if (stateFilter && o.state !== stateFilter) return false;
    if (search) { const q = search.toLowerCase(); return o.wo_number.toLowerCase().includes(q) || o.product_name.toLowerCase().includes(q); }
    return true;
  });

  const kpis = {
    draft: orders.filter(o => o.state === 'draft').length,
    planned: orders.filter(o => o.state === 'planned').length,
    inProgress: orders.filter(o => o.state === 'in_progress').length,
    done: orders.filter(o => o.state === 'done').length,
    total: orders.length,
  };

  const handleCreate = () => {
    if (!newForm.product_name.trim()) { toast.error('Product name required'); return; }
    const wo = createWorkOrder(newForm);
    setShowNewModal(false); setSelected(wo); setDrawerOpen(true); refresh();
    showToast('success', `${wo.wo_number} created`);
    setNewForm({ product_name: '', quantity: 1, planned_start: '', planned_end: '', priority: 'medium', workcenter: '', assigned_to: '' });
  };

  const transition = (newState: WorkOrder['state']) => {
    if (!selected) return;
    const u = transitionWorkOrder(selected.id, newState);
    if (u) { setSelected(u); refresh(); showToast('success', `→ ${newState}`); }
  };

  const updateStep = (stepIdx: number, status: 'pending' | 'in_progress' | 'done') => {
    if (!selected) return;
    const steps = selected.routing_steps.map((s, i) => i === stepIdx ? { ...s, status } : s);
    const u = updateWorkOrder(selected.id, { routing_steps: steps });
    if (u) setSelected(u);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Work Orders</h1><p className="text-sm text-slate-400 mt-0.5">Manufacturing execution</p></div>
        <PermButton permission="manufacturing.workorders.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Work Order</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Draft" value={kpis.draft} color="slate" onClick={() => { setStateFilter(stateFilter === 'draft' ? null : 'draft'); }} active={stateFilter === 'draft'} />
        <KPICard label="Planned" value={kpis.planned} color="cyan" onClick={() => { setStateFilter(stateFilter === 'planned' ? null : 'planned'); }} active={stateFilter === 'planned'} />
        <KPICard label="In Progress" value={kpis.inProgress} color="amber" onClick={() => { setStateFilter(stateFilter === 'in_progress' ? null : 'in_progress'); }} active={stateFilter === 'in_progress'} />
        <KPICard label="Done" value={kpis.done} color="green" onClick={() => { setStateFilter(stateFilter === 'done' ? null : 'done'); }} active={stateFilter === 'done'} />
        <KPICard label="Total" value={kpis.total} color="blue" icon={Factory} />
      </div>

      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search work orders..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
      </div>

      {filtered.length === 0 ? <EmptyState title="No work orders" description="Create a work order to start manufacturing." actionLabel="New Work Order" onAction={() => setShowNewModal(true)} icon={Factory} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">WO #</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Priority</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Planned</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(o => (
          <tr key={o.id} onClick={() => { setSelected(o); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{o.wo_number}</td>
            <td className="px-4 py-3 text-sm text-slate-200">{o.product_name}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">{o.quantity}</td>
            <td className="px-4 py-3"><StateBadge state={o.priority} /></td>
            <td className="px-4 py-3"><StateBadge state={o.state} /></td>
            <td className="px-4 py-3 text-sm text-slate-400">{o.planned_start || '—'}</td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.wo_number || 'Work Order'} width="max-w-3xl">
        {selected && (
          <div className="space-y-6">
            <WorkflowRibbon states={['draft', 'planned', 'in_progress', 'done']} currentState={selected.state === 'cancelled' ? 'draft' : selected.state} />
            <div className="flex flex-wrap gap-2">
              {selected.state === 'draft' && <PermButton permission="manufacturing.workorders.create" onClick={() => transition('planned')}><ClipboardCheck className="h-3.5 w-3.5" /> Plan</PermButton>}
              {selected.state === 'planned' && <PermButton permission="manufacturing.workorders.start" onClick={() => transition('in_progress')}><Play className="h-3.5 w-3.5" /> Start</PermButton>}
              {selected.state === 'in_progress' && <PermButton permission="manufacturing.workorders.complete" onClick={() => transition('done')}><CheckCircle className="h-3.5 w-3.5" /> Complete</PermButton>}
              {selected.state === 'done' && <span className="text-xs text-green-400 bg-green-600/10 px-3 py-1.5 rounded-lg">✓ Completed</span>}
              {!['done', 'cancelled'].includes(selected.state) && <PermButton permission="manufacturing.workorders.create" onClick={() => transition('cancelled')} variant="danger">Cancel</PermButton>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Product</label><p className="text-sm text-slate-200">{selected.product_name}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Quantity</label><p className="text-sm text-slate-200">{selected.quantity}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Priority</label><StateBadge state={selected.priority} size="md" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Workcenter</label><p className="text-sm text-slate-200">{selected.workcenter || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Planned Start</label><p className="text-sm text-slate-200">{selected.planned_start || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Planned End</label><p className="text-sm text-slate-200">{selected.planned_end || '—'}</p></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Routing Steps</h3>
              <div className="space-y-2">
                {selected.routing_steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step.status === 'done' ? 'bg-green-600/20 text-green-400' : step.status === 'in_progress' ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-700 text-slate-500'}`}>{step.step}</div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-200">{step.name}</p>
                      <p className="text-xs text-slate-500">{step.duration} min</p>
                    </div>
                    <StateBadge state={step.status} />
                    {selected.state === 'in_progress' && step.status !== 'done' && (
                      <div className="flex gap-1">
                        {step.status === 'pending' && <button onClick={() => updateStep(idx, 'in_progress')} className="px-2 py-1 text-xs bg-amber-600/20 text-amber-400 rounded hover:bg-amber-600/30">Start</button>}
                        {step.status === 'in_progress' && <button onClick={() => updateStep(idx, 'done')} className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30">Done</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Work Order</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Product *</label><input value={newForm.product_name} onChange={e => setNewForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Quantity</label><input type="number" value={newForm.quantity} onChange={e => setNewForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" min="1" /></div>
                <div><label className="text-xs text-slate-400 mb-1.5 block">Priority</label>
                  <select value={newForm.priority} onChange={e => setNewForm(f => ({ ...f, priority: e.target.value as WorkOrder['priority'] }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Start</label><input type="date" value={newForm.planned_start} onChange={e => setNewForm(f => ({ ...f, planned_start: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
                <div><label className="text-xs text-slate-400 mb-1.5 block">End</label><input type="date" value={newForm.planned_end} onChange={e => setNewForm(f => ({ ...f, planned_end: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Workcenter</label><input value={newForm.workcenter} onChange={e => setNewForm(f => ({ ...f, workcenter: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
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

// ===== BOM =====
function BOMPage() {
  const { showToast } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<BOM | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ product_name: '', version: '1.0' });

  const refresh = () => setBoms(getBOMs());
  useEffect(() => { refresh(); }, []);

  const handleCreate = () => {
    if (!newForm.product_name.trim()) { toast.error('Product name required'); return; }
    const bom = createBOM(newForm);
    setShowNewModal(false); setSelected(bom); setDrawerOpen(true); refresh();
    showToast('success', 'BOM created');
    setNewForm({ product_name: '', version: '1.0' });
  };

  const addComponent = () => {
    if (!selected) return;
    const comps = [...selected.components, { name: '', qty: 1, unit: 'pcs', cost: 0 }];
    const totalCost = comps.reduce((s, c) => s + c.qty * c.cost, 0);
    const u = updateBOM(selected.id, { components: comps, total_cost: totalCost }); if (u) setSelected(u);
  };

  const updateComponent = (idx: number, field: string, val: string | number) => {
    if (!selected) return;
    const comps = selected.components.map((c, i) => i === idx ? { ...c, [field]: val } : c);
    const totalCost = comps.reduce((s, c) => s + c.qty * c.cost, 0);
    const u = updateBOM(selected.id, { components: comps, total_cost: totalCost }); if (u) setSelected(u);
  };

  const removeComponent = (idx: number) => {
    if (!selected) return;
    const comps = selected.components.filter((_, i) => i !== idx);
    const totalCost = comps.reduce((s, c) => s + c.qty * c.cost, 0);
    const u = updateBOM(selected.id, { components: comps, total_cost: totalCost }); if (u) setSelected(u);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Bill of Materials</h1><p className="text-sm text-slate-400 mt-0.5">Product component structures</p></div>
        <PermButton permission="manufacturing.boms.edit" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New BOM</PermButton></div>
      {boms.length === 0 ? <EmptyState title="No BOMs yet" description="Create a bill of materials." actionLabel="New BOM" onAction={() => setShowNewModal(true)} icon={Layers} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{boms.map(b => (
          <div key={b.id} onClick={() => { setSelected(b); setDrawerOpen(true); }} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5 cursor-pointer hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-slate-200">{b.product_name}</h3><StateBadge state={b.status} /></div>
            <p className="text-xs text-slate-500 mb-2">v{b.version} · {b.components.length} components</p>
            <p className="text-sm font-medium text-blue-400">${b.total_cost.toFixed(2)} total cost</p>
          </div>))}</div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`BOM: ${selected?.product_name || ''}`} width="max-w-3xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Product</label><p className="text-sm text-slate-200">{selected.product_name}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Version</label><p className="text-sm text-slate-200">{selected.version}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Total Cost</label><p className="text-sm font-medium text-blue-400">${selected.total_cost.toFixed(2)}</p></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-slate-200">Components</h3>
                <button onClick={addComponent} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button></div>
              {selected.components.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-lg"><p className="text-sm text-slate-500">No components</p></div>
              ) : (
                <div className="border border-slate-700/50 rounded-lg overflow-hidden"><table className="w-full"><thead><tr className="bg-slate-800/30">
                  <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Component</th>
                  <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Qty</th>
                  <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Unit</th>
                  <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Cost</th>
                  <th className="w-8" />
                </tr></thead><tbody className="divide-y divide-slate-800/30">{selected.components.map((c, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2"><input value={c.name} onChange={e => updateComponent(idx, 'name', e.target.value)} className="w-full bg-transparent text-sm text-slate-200 outline-none" placeholder="Name" /></td>
                    <td className="px-3 py-2"><input type="number" value={c.qty} onChange={e => updateComponent(idx, 'qty', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" /></td>
                    <td className="px-3 py-2"><input value={c.unit} onChange={e => updateComponent(idx, 'unit', e.target.value)} className="w-full bg-transparent text-sm text-slate-200 outline-none" /></td>
                    <td className="px-3 py-2"><input type="number" value={c.cost} onChange={e => updateComponent(idx, 'cost', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" step="0.01" /></td>
                    <td className="px-1 py-2"><button onClick={() => removeComponent(idx)} className="p-1 hover:bg-red-600/10 rounded text-slate-500 hover:text-red-400 text-xs">✕</button></td>
                  </tr>))}</tbody></table></div>
              )}
            </div>
          </div>
        )}
      </Drawer>
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New BOM</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Product *</label><input value={newForm.product_name} onChange={e => setNewForm(f => ({ ...f, product_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Version</label><input value={newForm.version} onChange={e => setNewForm(f => ({ ...f, version: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
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

// ===== MRP =====
function MRPPage() {
  const workOrders = getWorkOrders();
  const boms = getBOMs();
  const planned = workOrders.filter(w => ['planned', 'in_progress'].includes(w.state));

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Material Requirements Planning</h1><p className="text-sm text-slate-400 mt-0.5">Capacity & material planning</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Active WOs" value={planned.length} color="blue" icon={Factory} />
        <KPICard label="Total BOMs" value={boms.length} color="purple" icon={Layers} />
        <KPICard label="Total Qty Planned" value={planned.reduce((s, w) => s + w.quantity, 0)} color="amber" />
        <KPICard label="Capacity Util." value={`${planned.length > 0 ? Math.min(100, Math.round(planned.length / 10 * 100)) : 0}%`} color="green" />
      </div>
      {planned.length === 0 ? <EmptyState title="No planned work orders" description="Plan work orders to see MRP data." icon={Settings} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">WO</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Start</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">End</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{planned.map(w => (
          <tr key={w.id} className="hover:bg-slate-800/20"><td className="px-4 py-3 text-sm text-blue-400">{w.wo_number}</td>
            <td className="px-4 py-3 text-sm text-slate-200">{w.product_name}</td><td className="px-4 py-3 text-sm text-slate-300 text-right">{w.quantity}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{w.planned_start || '—'}</td><td className="px-4 py-3 text-sm text-slate-400">{w.planned_end || '—'}</td>
            <td className="px-4 py-3"><StateBadge state={w.state} /></td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== MES =====
function MESPage() {
  const workOrders = getWorkOrders().filter(w => w.state === 'in_progress');
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Manufacturing Execution</h1><p className="text-sm text-slate-400 mt-0.5">Real-time production tracking</p></div>
      {workOrders.length === 0 ? <EmptyState title="No active production" description="Start work orders to see MES data." icon={Factory} /> : (
        <div className="space-y-4">{workOrders.map(wo => (
          <div key={wo.id} className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-sm font-semibold text-slate-200">{wo.wo_number} — {wo.product_name}</h3><p className="text-xs text-slate-500">Qty: {wo.quantity} · {wo.workcenter || 'Default'}</p></div>
              <StateBadge state={wo.priority} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">{wo.routing_steps.map((step, idx) => {
              const width = `${(step.duration / wo.routing_steps.reduce((s, st) => s + st.duration, 0)) * 100}%`;
              return (
                <div key={idx} style={{ width, minWidth: '80px' }} className={`rounded-lg p-2 text-center ${step.status === 'done' ? 'bg-green-600/10 border border-green-600/20' : step.status === 'in_progress' ? 'bg-amber-600/10 border border-amber-600/20' : 'bg-slate-800/50 border border-slate-700/30'}`}>
                  <p className="text-[10px] font-medium text-slate-400 truncate">{step.name}</p>
                  <p className="text-xs text-slate-500">{step.duration}m</p>
                </div>
              );
            })}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

// ===== QUALITY =====
function QualityPage() {
  const workOrders = getWorkOrders().filter(w => w.state === 'done');
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Quality Control</h1><p className="text-sm text-slate-400 mt-0.5">Inspection & defect tracking</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Completed WOs" value={workOrders.length} color="green" icon={CheckCircle} />
        <KPICard label="Pass Rate" value="100%" color="green" icon={Shield} />
        <KPICard label="Defects" value={0} color="red" icon={AlertTriangle} />
        <KPICard label="Inspections" value={workOrders.length} color="blue" icon={ClipboardCheck} />
      </div>
      {workOrders.length === 0 ? <EmptyState title="No completed work orders" description="Quality checks appear after work orders are completed." icon={Shield} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">WO</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Qty</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Result</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{workOrders.map(w => (
          <tr key={w.id} className="hover:bg-slate-800/20"><td className="px-4 py-3 text-sm text-blue-400">{w.wo_number}</td>
            <td className="px-4 py-3 text-sm text-slate-200">{w.product_name}</td><td className="px-4 py-3 text-sm text-slate-300 text-right">{w.quantity}</td>
            <td className="px-4 py-3"><span className="text-xs text-green-400 bg-green-600/10 px-2 py-0.5 rounded-full">✓ Pass</span></td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== SHOP FLOOR =====
function ShopFloorPage() {
  const workOrders = getWorkOrders().filter(w => ['planned', 'in_progress'].includes(w.state));
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Shop Floor</h1><p className="text-sm text-slate-400 mt-0.5">Tablet-optimized production view</p></div>
      {workOrders.length === 0 ? <EmptyState title="No active work orders" description="Active work orders will appear here." icon={Factory} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{workOrders.map(wo => (
          <div key={wo.id} className={`rounded-xl border p-5 ${wo.state === 'in_progress' ? 'bg-amber-600/5 border-amber-600/20' : 'bg-slate-900/30 border-slate-800/50'}`}>
            <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold text-blue-400">{wo.wo_number}</span><StateBadge state={wo.priority} /></div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">{wo.product_name}</h3>
            <p className="text-sm text-slate-400 mb-3">Qty: {wo.quantity} · {wo.workcenter || 'Default'}</p>
            <div className="flex items-center gap-2 mb-3"><StateBadge state={wo.state} size="md" /></div>
            <div className="space-y-1.5">{wo.routing_steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${s.status === 'done' ? 'bg-green-600/20 text-green-400' : s.status === 'in_progress' ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-700 text-slate-500'}`}>{s.step}</div>
                <span className={`text-xs ${s.status === 'done' ? 'text-green-400 line-through' : s.status === 'in_progress' ? 'text-amber-400' : 'text-slate-500'}`}>{s.name}</span>
              </div>
            ))}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

// ===== MAINTENANCE =====
function MaintenancePage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Maintenance</h1><p className="text-sm text-slate-400 mt-0.5">Equipment & preventive maintenance</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Equipment" value={0} color="blue" icon={Wrench} />
        <KPICard label="Scheduled" value={0} color="amber" />
        <KPICard label="Completed" value={0} color="green" />
        <KPICard label="Overdue" value={0} color="red" />
      </div>
      <EmptyState title="No maintenance records" description="Add equipment and schedule preventive maintenance." icon={Wrench} />
    </div>
  );
}

// ===== ROUTER =====
export default function ManufacturingModule() {
  const { pathname } = useLocation();
  if (pathname === '/manufacturing/bom') return <BOMPage />;
  if (pathname === '/manufacturing/mrp') return <MRPPage />;
  if (pathname === '/manufacturing/mes') return <MESPage />;
  if (pathname === '/manufacturing/quality') return <QualityPage />;
  if (pathname === '/manufacturing/shopfloor') return <ShopFloorPage />;
  if (pathname === '/manufacturing/maintenance') return <MaintenancePage />;
  return <WorkOrdersPage />;
}