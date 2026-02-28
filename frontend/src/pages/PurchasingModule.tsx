// CI ERP — Purchasing Module
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, transitionPurchaseOrder,
  getVendors, createVendor, updateVendor,
  type PurchaseOrder, type Vendor,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, TableSkeleton, Drawer, ConfirmModal, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, X, Filter, Trash2, Package, Truck, FileText, ArrowUpDown, Send, CheckCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

// ===== PURCHASE ORDERS =====
function PurchaseOrdersPage() {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'order_date' | 'grand_total' | 'po_number'>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selVendorId, setSelVendorId] = useState('');
  const pageSize = 20;

  const refresh = useCallback(() => { setOrders(getPurchaseOrders()); setLoading(false); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const vendors = getVendors();
  const kpis = {
    draft: orders.filter(o => o.state === 'draft').length,
    sent: orders.filter(o => o.state === 'sent').length,
    confirmed: orders.filter(o => o.state === 'confirmed').length,
    received: orders.filter(o => o.state === 'received').length,
    total_spend: orders.filter(o => ['received', 'billed'].includes(o.state)).reduce((s, o) => s + o.grand_total, 0),
  };

  const filtered = orders.filter(o => {
    if (stateFilter && o.state !== stateFilter) return false;
    if (search) { const q = search.toLowerCase(); return o.po_number.toLowerCase().includes(q) || o.vendor_name.toLowerCase().includes(q); }
    return true;
  });
  filtered.sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'grand_total') return (a.grand_total - b.grand_total) * mul;
    return (a[sortField] || '').localeCompare(b[sortField] || '') * mul;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (f: typeof sortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } };

  const handleCreate = () => {
    if (!selVendorId) { toast.error('Select a vendor'); return; }
    const v = vendors.find(x => x.id === selVendorId);
    const po = createPurchaseOrder({ vendor_id: selVendorId, vendor_name: v?.name || '' });
    setShowNewModal(false); setSelected(po); setDrawerOpen(true); refresh();
    showToast('success', `${po.po_number} created`);
  };

  const transition = (newState: PurchaseOrder['state']) => {
    if (!selected) return;
    const u = transitionPurchaseOrder(selected.id, newState);
    if (u) { setSelected(u); refresh(); showToast('success', `→ ${newState}`); }
  };

  const addLine = () => {
    if (!selected || selected.state !== 'draft') return;
    const nl = { id: 'pln-' + Date.now(), product_name: '', qty: 1, unit_price: 0, line_total: 0 };
    const u = updatePurchaseOrder(selected.id, { lines: [...selected.lines, nl] }); if (u) setSelected(u);
  };
  const updateLine = (lid: string, field: string, val: string | number) => {
    if (!selected) return;
    const lines = selected.lines.map(l => {
      if (l.id !== lid) return l;
      const up = { ...l, [field]: val };
      up.line_total = Math.round(up.qty * up.unit_price * 100) / 100;
      return up;
    });
    const u = updatePurchaseOrder(selected.id, { lines }); if (u) setSelected(u);
  };
  const removeLine = (lid: string) => { if (!selected) return; const u = updatePurchaseOrder(selected.id, { lines: selected.lines.filter(l => l.id !== lid) }); if (u) setSelected(u); };

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />)}</div><TableSkeleton /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Purchase Orders</h1><p className="text-sm text-slate-400 mt-0.5">Manage procurement</p></div>
        <PermButton permission="purchasing.orders.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New PO</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Draft" value={kpis.draft} color="slate" onClick={() => { setStateFilter(stateFilter === 'draft' ? null : 'draft'); setPage(1); }} active={stateFilter === 'draft'} />
        <KPICard label="Sent" value={kpis.sent} color="blue" onClick={() => { setStateFilter(stateFilter === 'sent' ? null : 'sent'); setPage(1); }} active={stateFilter === 'sent'} />
        <KPICard label="Confirmed" value={kpis.confirmed} color="amber" onClick={() => { setStateFilter(stateFilter === 'confirmed' ? null : 'confirmed'); setPage(1); }} active={stateFilter === 'confirmed'} />
        <KPICard label="Received" value={kpis.received} color="green" onClick={() => { setStateFilter(stateFilter === 'received' ? null : 'received'); setPage(1); }} active={stateFilter === 'received'} />
        <KPICard label="Total Spend" value={`$${kpis.total_spend.toLocaleString()}`} color="purple" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search POs..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-slate-500" /></button>}
        </div>
        {stateFilter && (
          <button onClick={() => setStateFilter(null)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-lg text-xs text-blue-400 hover:bg-blue-600/20">
            <Filter className="h-3 w-3" /> {stateFilter} <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        stateFilter || search ? <EmptyState title="No POs match" description="Try adjusting filters." actionLabel="Clear" onAction={() => { setSearch(''); setStateFilter(null); }} icon={Package} />
        : <EmptyState title="No purchase orders yet" description="Create your first PO." actionLabel="Create PO" onAction={() => setShowNewModal(true)} icon={Package} />
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase"><button onClick={() => toggleSort('po_number')} className="flex items-center gap-1 hover:text-slate-300">PO # <ArrowUpDown className="h-3 w-3" /></button></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase"><button onClick={() => toggleSort('order_date')} className="flex items-center gap-1 hover:text-slate-300">Date <ArrowUpDown className="h-3 w-3" /></button></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase"><button onClick={() => toggleSort('grand_total')} className="flex items-center gap-1 hover:text-slate-300 ml-auto">Total <ArrowUpDown className="h-3 w-3" /></button></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800/30">
                {paginated.map(o => (
                  <tr key={o.id} onClick={() => { setSelected(o); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-400">{o.po_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{o.vendor_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{o.order_date}</td>
                    <td className="px-4 py-3"><StateBadge state={o.state} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 text-right">${o.grand_total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{filtered.length} POs · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.po_number || 'PO'} width="max-w-3xl">
        {selected && (
          <div className="space-y-6">
            <WorkflowRibbon states={['draft', 'sent', 'confirmed', 'received', 'billed']} currentState={selected.state === 'cancelled' ? 'draft' : selected.state} />
            {selected.state === 'cancelled' && <div className="px-3 py-2 bg-red-600/10 border border-red-600/20 rounded-lg text-sm text-red-400">Cancelled</div>}

            <div className="flex flex-wrap gap-2">
              {selected.state === 'draft' && (<>
                <PermButton permission="purchasing.orders.confirm" onClick={() => transition('sent')} disabled={selected.lines.length === 0}><Send className="h-3.5 w-3.5" /> Send to Vendor</PermButton>
                <PermButton permission="purchasing.orders.cancel" onClick={() => setShowCancelModal(true)} variant="danger">Cancel</PermButton>
              </>)}
              {selected.state === 'sent' && <PermButton permission="purchasing.orders.confirm" onClick={() => transition('confirmed')}><CheckCircle className="h-3.5 w-3.5" /> Confirm PO</PermButton>}
              {selected.state === 'confirmed' && <PermButton permission="purchasing.orders.receive" onClick={() => transition('received')}><Truck className="h-3.5 w-3.5" /> Receive Goods</PermButton>}
              {selected.state === 'received' && <PermButton permission="purchasing.orders.bill" onClick={() => transition('billed')}><Receipt className="h-3.5 w-3.5" /> Create Bill</PermButton>}
              {selected.state === 'billed' && <span className="text-xs text-green-400 bg-green-600/10 px-3 py-1.5 rounded-lg">✓ Billed</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Vendor</label><p className="text-sm text-slate-200 font-medium">{selected.vendor_name || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Order Date</label><p className="text-sm text-slate-200">{selected.order_date}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Expected Date</label>
                {selected.state === 'draft' ? <input type="date" value={selected.expected_date} onChange={e => { const u = updatePurchaseOrder(selected.id, { expected_date: e.target.value }); if (u) setSelected(u); }} className="w-full px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-sm text-slate-200 outline-none" />
                : <p className="text-sm text-slate-200">{selected.expected_date || '—'}</p>}
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">Currency</label><p className="text-sm text-slate-200">{selected.currency}</p></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">Line Items</h3>
                {selected.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"><Plus className="h-3 w-3" /> Add Line</button>}
              </div>
              {selected.lines.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">No line items</p>
                  {selected.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400">+ Add first line</button>}
                </div>
              ) : (
                <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="bg-slate-800/30">
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Product</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Qty</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Price</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Total</th>
                      {selected.state === 'draft' && <th className="w-8" />}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {selected.lines.map(line => (
                        <tr key={line.id} className="hover:bg-slate-800/10">
                          <td className="px-3 py-2">{selected.state === 'draft' ? <input value={line.product_name} onChange={e => updateLine(line.id, 'product_name', e.target.value)} placeholder="Product" className="w-full bg-transparent text-sm text-slate-200 outline-none" /> : <span className="text-sm text-slate-200">{line.product_name}</span>}</td>
                          <td className="px-3 py-2 text-right">{selected.state === 'draft' ? <input type="number" value={line.qty} onChange={e => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" /> : <span className="text-sm text-slate-200">{line.qty}</span>}</td>
                          <td className="px-3 py-2 text-right">{selected.state === 'draft' ? <input type="number" value={line.unit_price} onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" step="0.01" /> : <span className="text-sm text-slate-200">${line.unit_price.toFixed(2)}</span>}</td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-slate-200">${line.line_total.toFixed(2)}</td>
                          {selected.state === 'draft' && <td className="px-1 py-2"><button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-600/10 rounded text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 bg-slate-800/30 rounded-lg p-4">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">${selected.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Tax (10%)</span><span className="text-slate-200">${selected.tax_total.toFixed(2)}</span></div>
                <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-semibold"><span className="text-slate-200">Grand Total</span><span className="text-blue-400">${selected.grand_total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* New PO Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Purchase Order</h3>
            {vendors.length === 0 ? (
              <div className="text-center py-4"><p className="text-sm text-slate-400 mb-3">No vendors yet — Create one first</p>
                <p className="text-xs text-slate-500">Go to Vendors page to add vendors</p></div>
            ) : (
              <div className="space-y-4">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Select Vendor</label>
                  <select value={selVendorId} onChange={e => setSelVendorId(e.target.value)} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
                    <option value="">Choose...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>)}
                  </select></div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
              {vendors.length > 0 && <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={() => { transition('cancelled'); setShowCancelModal(false); }}
        title={`Cancel ${selected?.po_number}?`} description="This cannot be undone." confirmLabel="Cancel PO" danger />
    </div>
  );
}

// ===== VENDORS =====
function VendorsPage() {
  const { showToast } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', city: '', country: '', payment_terms: 'Net 30', notes: '' });

  const refresh = () => setVendors(getVendors());
  useEffect(() => { refresh(); }, []);
  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.company.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: '', email: '', phone: '', company: '', address: '', city: '', country: '', payment_terms: 'Net 30', notes: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (v: Vendor) => { setForm({ name: v.name, email: v.email, phone: v.phone, company: v.company, address: v.address, city: v.city, country: v.country, payment_terms: v.payment_terms, notes: v.notes }); setSelected(v); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createVendor(form); showToast('success', `"${form.name}" created`); }
    else if (selected) { updateVendor(selected.id, form); showToast('success', `"${form.name}" updated`); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Vendors</h1><p className="text-sm text-slate-400 mt-0.5">Manage your suppliers</p></div>
        <PermButton permission="purchasing.vendors.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Vendor</PermButton></div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No vendors yet" description="Add your first vendor." actionLabel="Add Vendor" onAction={openNew} icon={Truck} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Company</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Terms</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(v => (
          <tr key={v.id} onClick={() => openEdit(v)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{v.name}</td><td className="px-4 py-3 text-sm text-slate-400">{v.email || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{v.phone || '—'}</td><td className="px-4 py-3 text-sm text-slate-400">{v.company || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{v.payment_terms}</td>
          </tr>))}</tbody></table></div></div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Vendor' : `Edit: ${selected?.name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Company</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Payment Terms</label>
            <select value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
              <option>Net 30</option><option>Net 60</option><option>Net 90</option><option>Due on Receipt</option><option>Prepaid</option>
            </select></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'purchasing.vendors.create' : 'purchasing.vendors.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== ROUTER =====
export default function PurchasingModule() {
  const { pathname } = useLocation();
  if (pathname === '/purchasing/vendors') return <VendorsPage />;
  return <PurchaseOrdersPage />;
}