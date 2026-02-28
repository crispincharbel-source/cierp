// CI ERP — Operations Module: Purchasing, Inventory, Accounting
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, transitionPurchaseOrder,
  getVendors, createVendor, updateVendor,
  getProducts, createProduct, updateProduct,
  getInvoices, createInvoice, transitionInvoice,
  type PurchaseOrder, type Vendor, type Product, type Invoice,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, Trash2, Package, Warehouse, Receipt, ArrowUpDown, DollarSign, FileText, CreditCard, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// ===== PURCHASE ORDERS =====
function PurchaseOrdersPage() {
  const { showToast } = useAuth();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selVendorId, setSelVendorId] = useState('');
  const vendors = getVendors();

  const refresh = () => setPos(getPurchaseOrders());
  useEffect(() => { refresh(); }, []);

  const filtered = pos.filter(p => !search || p.po_number.toLowerCase().includes(search.toLowerCase()) || p.vendor_name.toLowerCase().includes(search.toLowerCase()));
  const kpis = { draft: pos.filter(p => p.state === 'draft').length, confirmed: pos.filter(p => p.state === 'confirmed').length, received: pos.filter(p => p.state === 'received').length, billed: pos.filter(p => p.state === 'billed').length };

  const handleCreate = () => {
    if (!selVendorId && vendors.length > 0) { toast.error('Select a vendor'); return; }
    const v = vendors.find(x => x.id === selVendorId);
    const po = createPurchaseOrder({ vendor_id: selVendorId, vendor_name: v?.name || 'Direct' });
    setShowNewModal(false); setSelected(po); setDrawerOpen(true); refresh(); showToast('success', `${po.po_number} created`);
  };

  const addLine = () => {
    if (!selected || selected.state !== 'draft') return;
    const nl = { id: 'pln-' + Date.now(), product_name: '', qty: 1, unit_price: 0, line_total: 0 };
    const u = updatePurchaseOrder(selected.id, { lines: [...selected.lines, nl] }); if (u) setSelected(u);
  };

  const updateLine = (lid: string, field: string, val: string | number) => {
    if (!selected) return;
    const lines = selected.lines.map(l => { if (l.id !== lid) return l; const up = { ...l, [field]: val }; up.line_total = Math.round(up.qty * up.unit_price * 100) / 100; return up; });
    const u = updatePurchaseOrder(selected.id, { lines }); if (u) setSelected(u);
  };

  const removeLine = (lid: string) => { if (!selected) return; const u = updatePurchaseOrder(selected.id, { lines: selected.lines.filter(l => l.id !== lid) }); if (u) setSelected(u); };

  const transition = (state: PurchaseOrder['state']) => {
    if (!selected) return;
    if (state === 'confirmed' && selected.lines.length === 0) { toast.error('Add lines first'); return; }
    const u = transitionPurchaseOrder(selected.id, state); if (u) { setSelected(u); refresh(); showToast('success', `${u.po_number} → ${state}`); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Purchase Orders</h1><p className="text-sm text-slate-400 mt-0.5">Manage procurement</p></div>
        <PermButton permission="purchasing.orders.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New PO</PermButton>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Draft" value={kpis.draft} color="slate" /><KPICard label="Confirmed" value={kpis.confirmed} color="blue" />
        <KPICard label="Received" value={kpis.received} color="orange" /><KPICard label="Billed" value={kpis.billed} color="green" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search POs..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No purchase orders" description="Create your first purchase order." actionLabel="New PO" onAction={() => setShowNewModal(true)} icon={Package} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">PO #</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Vendor</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(p => (
          <tr key={p.id} onClick={() => { setSelected(p); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{p.po_number}</td><td className="px-4 py-3 text-sm text-slate-300">{p.vendor_name || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.order_date}</td><td className="px-4 py-3"><StateBadge state={p.state} /></td>
            <td className="px-4 py-3 text-sm font-medium text-slate-200 text-right">${p.grand_total.toLocaleString()}</td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.po_number || 'PO'} width="max-w-3xl">
        {selected && (<div className="space-y-6">
          <WorkflowRibbon states={['draft', 'sent', 'confirmed', 'received', 'billed']} currentState={selected.state === 'cancelled' ? 'draft' : selected.state} />
          <div className="flex flex-wrap gap-2">
            {selected.state === 'draft' && <><PermButton permission="purchasing.orders.confirm" onClick={() => transition('sent')}><FileText className="h-3.5 w-3.5" /> Send to Vendor</PermButton><PermButton permission="purchasing.orders.cancel" onClick={() => transition('cancelled')} variant="danger">Cancel</PermButton></>}
            {selected.state === 'sent' && <PermButton permission="purchasing.orders.confirm" onClick={() => transition('confirmed')}>Confirm PO</PermButton>}
            {selected.state === 'confirmed' && <PermButton permission="purchasing.orders.receive" onClick={() => transition('received')}>Receive Goods</PermButton>}
            {selected.state === 'received' && <PermButton permission="purchasing.orders.bill" onClick={() => transition('billed')}>Create Bill</PermButton>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Vendor</label><p className="text-sm text-slate-200">{selected.vendor_name || '—'}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Date</label><p className="text-sm text-slate-200">{selected.order_date}</p></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold text-slate-200">Lines</h3>
              {selected.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>}</div>
            {selected.lines.length === 0 ? <div className="text-center py-6 border border-dashed border-slate-700/50 rounded-lg"><p className="text-sm text-slate-500">No lines</p>{selected.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400 mt-1">+ Add line</button>}</div> : (
              <div className="border border-slate-700/50 rounded-lg overflow-hidden"><table className="w-full"><thead><tr className="bg-slate-800/30">
                <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Product</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Qty</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Price</th>
                <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Total</th>
                {selected.state === 'draft' && <th className="w-8" />}
              </tr></thead><tbody className="divide-y divide-slate-800/30">{selected.lines.map(l => (
                <tr key={l.id}>
                  <td className="px-3 py-2">{selected.state === 'draft' ? <input value={l.product_name} onChange={e => updateLine(l.id, 'product_name', e.target.value)} placeholder="Product" className="w-full bg-transparent text-sm text-slate-200 outline-none" /> : <span className="text-sm text-slate-200">{l.product_name}</span>}</td>
                  <td className="px-3 py-2 text-right">{selected.state === 'draft' ? <input type="number" value={l.qty} onChange={e => updateLine(l.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" /> : <span className="text-sm text-slate-200">{l.qty}</span>}</td>
                  <td className="px-3 py-2 text-right">{selected.state === 'draft' ? <input type="number" value={l.unit_price} onChange={e => updateLine(l.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" step="0.01" /> : <span className="text-sm text-slate-200">${l.unit_price.toFixed(2)}</span>}</td>
                  <td className="px-3 py-2 text-right text-sm font-medium text-slate-200">${l.line_total.toFixed(2)}</td>
                  {selected.state === 'draft' && <td className="px-1"><button onClick={() => removeLine(l.id)} className="p-1 hover:bg-red-600/10 rounded text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                </tr>))}</tbody></table></div>
            )}
          </div>
          <div className="flex justify-end"><div className="w-56 space-y-2 bg-slate-800/30 rounded-lg p-4">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">${selected.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Tax</span><span className="text-slate-200">${selected.tax_total.toFixed(2)}</span></div>
            <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-semibold"><span className="text-slate-200">Total</span><span className="text-blue-400">${selected.grand_total.toFixed(2)}</span></div>
          </div></div>
        </div>)}
      </Drawer>

      {showNewModal && (<div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">New Purchase Order</h3>
          {vendors.length > 0 ? (<div><label className="text-xs text-slate-400 mb-1.5 block">Vendor</label>
            <select value={selVendorId} onChange={e => setSelVendorId(e.target.value)} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
              <option value="">Choose...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          ) : <p className="text-sm text-slate-400">No vendors yet. Create one in Vendors page first, or proceed without.</p>}
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button></div>
        </div></div>)}
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
  const filtered = vendors.filter(v => !search || v.name.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: '', email: '', phone: '', company: '', address: '', city: '', country: '', payment_terms: 'Net 30', notes: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (v: Vendor) => { setForm({ name: v.name, email: v.email, phone: v.phone, company: v.company, address: v.address, city: v.city, country: v.country, payment_terms: v.payment_terms, notes: v.notes }); setSelected(v); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createVendor(form); showToast('success', 'Vendor created'); } else if (selected) { updateVendor(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Vendors</h1><p className="text-sm text-slate-400 mt-0.5">Manage suppliers</p></div>
        <PermButton permission="purchasing.vendors.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Vendor</PermButton></div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No vendors" description="Add your first vendor." actionLabel="Add Vendor" onAction={openNew} icon={Package} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">City</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Terms</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(v => (
          <tr key={v.id} onClick={() => openEdit(v)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{v.name}</td><td className="px-4 py-3 text-sm text-slate-400">{v.email || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{v.phone || '—'}</td><td className="px-4 py-3 text-sm text-slate-400">{v.city || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{v.payment_terms}</td>
          </tr>))}</tbody></table></div></div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Vendor' : selected?.name || ''}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Payment Terms</label><input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'purchasing.vendors.create' : 'purchasing.vendors.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== PRODUCTS =====
function ProductsPage() {
  const { showToast } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_qty: 0, reorder_level: 0, location: 'Main Warehouse', unit: 'pcs', description: '' });

  const refresh = () => setProducts(getProducts());
  useEffect(() => { refresh(); }, []);
  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_qty: 0, reorder_level: 0, location: 'Main Warehouse', unit: 'pcs', description: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setForm({ name: p.name, sku: p.sku, category: p.category, unit_price: p.unit_price, cost_price: p.cost_price, stock_qty: p.stock_qty, reorder_level: p.reorder_level, location: p.location, unit: p.unit, description: p.description }); setSelected(p); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createProduct(form); showToast('success', 'Product created'); } else if (selected) { updateProduct(selected.id, form); showToast('success', 'Updated'); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Products</h1><p className="text-sm text-slate-400 mt-0.5">Product catalog</p></div>
        <PermButton permission="inventory.products.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Product</PermButton></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Products" value={products.length} color="blue" icon={Package} />
        <KPICard label="Low Stock" value={products.filter(p => p.stock_qty <= p.reorder_level && p.stock_qty > 0).length} color="amber" />
        <KPICard label="Out of Stock" value={products.filter(p => p.stock_qty === 0).length} color="red" />
        <KPICard label="Total Value" value={`$${products.reduce((s, p) => s + p.stock_qty * p.cost_price, 0).toLocaleString()}`} color="green" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No products" description="Add products to your catalog." actionLabel="Add Product" onAction={openNew} icon={Package} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">SKU</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Stock</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(p => (
          <tr key={p.id} onClick={() => openEdit(p)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{p.name}</td><td className="px-4 py-3 text-sm text-slate-400 font-mono">{p.sku || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.category || '—'}</td><td className="px-4 py-3 text-sm text-slate-300 text-right">${p.unit_price.toFixed(2)}</td>
            <td className="px-4 py-3 text-right"><span className={`text-sm font-medium ${p.stock_qty <= p.reorder_level ? (p.stock_qty === 0 ? 'text-red-400' : 'text-amber-400') : 'text-slate-200'}`}>{p.stock_qty}</span></td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.location}</td>
          </tr>))}</tbody></table></div></div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Product' : selected?.name || ''}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">SKU</label><input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none font-mono" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Category</label><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Sell Price</label><input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" step="0.01" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Cost Price</label><input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" step="0.01" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Stock</label><input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Reorder Level</label><input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Unit</label><input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Location</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'inventory.products.create' : 'inventory.products.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== STOCK LEVELS =====
function StockPage() {
  const products = getProducts();
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Stock Levels</h1><p className="text-sm text-slate-400 mt-0.5">Current inventory across locations</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total Items" value={products.reduce((s, p) => s + p.stock_qty, 0)} color="blue" />
        <KPICard label="Locations" value={[...new Set(products.map(p => p.location))].length || 0} color="purple" />
        <KPICard label="Low Stock Alerts" value={products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.reorder_level).length} color="amber" />
        <KPICard label="Out of Stock" value={products.filter(p => p.stock_qty === 0).length} color="red" />
      </div>
      {products.length === 0 ? <EmptyState title="No stock data" description="Add products to see stock levels." icon={Warehouse} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">SKU</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">In Stock</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reorder</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{products.map(p => (
          <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{p.name}</td><td className="px-4 py-3 text-sm text-slate-400 font-mono">{p.sku || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.location}</td><td className="px-4 py-3 text-sm text-right font-medium text-slate-200">{p.stock_qty}</td>
            <td className="px-4 py-3 text-sm text-right text-slate-400">{p.reorder_level}</td>
            <td className="px-4 py-3"><StateBadge state={p.stock_qty === 0 ? 'cancelled' : p.stock_qty <= p.reorder_level ? 'pending' : 'active'} /></td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== INVOICES =====
function InvoicesPage() {
  const { showToast } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ partner_name: '', subtotal: 0, tax_total: 0, due_date: '', type: 'invoice' as 'invoice' | 'bill' });

  const refresh = () => setInvoices(getInvoices());
  useEffect(() => { refresh(); }, []);
  const filtered = invoices.filter(i => !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.partner_name.toLowerCase().includes(search.toLowerCase()));
  const kpis = { draft: invoices.filter(i => i.state === 'draft').length, confirmed: invoices.filter(i => i.state === 'confirmed').length, paid: invoices.filter(i => i.state === 'paid').length, total_due: invoices.filter(i => ['draft', 'confirmed', 'sent'].includes(i.state)).reduce((s, i) => s + i.amount_due, 0) };

  const handleCreate = () => {
    if (!newForm.partner_name.trim()) { toast.error('Partner name required'); return; }
    createInvoice({ partner_name: newForm.partner_name, type: newForm.type, subtotal: newForm.subtotal, tax_total: newForm.tax_total, amount_due: newForm.subtotal + newForm.tax_total, due_date: newForm.due_date });
    setShowNewModal(false); refresh(); showToast('success', 'Invoice created');
  };

  const transition = (state: Invoice['state']) => {
    if (!selected) return;
    const u = transitionInvoice(selected.id, state); if (u) { setSelected(u); refresh(); showToast('success', `→ ${state}`); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Invoices & Bills</h1><p className="text-sm text-slate-400 mt-0.5">Financial documents</p></div>
        <PermButton permission="accounting.invoices.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Invoice</PermButton>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Draft" value={kpis.draft} color="slate" /><KPICard label="Confirmed" value={kpis.confirmed} color="blue" />
        <KPICard label="Paid" value={kpis.paid} color="green" /><KPICard label="Total Due" value={`$${kpis.total_due.toLocaleString()}`} color="red" />
      </div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      {filtered.length === 0 ? <EmptyState title="No invoices" description="Invoices are created from sales orders or manually." actionLabel="New Invoice" onAction={() => setShowNewModal(true)} icon={Receipt} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoice #</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Partner</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Due</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Paid</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(inv => (
          <tr key={inv.id} onClick={() => { setSelected(inv); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{inv.invoice_number}</td><td className="px-4 py-3 text-sm text-slate-300">{inv.partner_name}</td>
            <td className="px-4 py-3 text-sm text-slate-400 capitalize">{inv.type}</td><td className="px-4 py-3"><StateBadge state={inv.state} /></td>
            <td className="px-4 py-3 text-sm text-slate-200 text-right">${inv.amount_due.toLocaleString()}</td><td className="px-4 py-3 text-sm text-green-400 text-right">${inv.amount_paid.toLocaleString()}</td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.invoice_number || 'Invoice'}>
        {selected && (<div className="space-y-6">
          <WorkflowRibbon states={['draft', 'confirmed', 'sent', 'paid']} currentState={selected.state === 'cancelled' ? 'draft' : selected.state} />
          <div className="flex flex-wrap gap-2">
            {selected.state === 'draft' && <PermButton permission="accounting.invoices.confirm" onClick={() => transition('confirmed')}>Confirm</PermButton>}
            {selected.state === 'confirmed' && <PermButton permission="accounting.invoices.confirm" onClick={() => transition('sent')}>Send</PermButton>}
            {['confirmed', 'sent'].includes(selected.state) && <PermButton permission="accounting.invoices.pay" onClick={() => transition('paid')} variant="secondary"><CreditCard className="h-3.5 w-3.5" /> Record Payment</PermButton>}
            {['draft', 'confirmed'].includes(selected.state) && <PermButton permission="accounting.invoices.confirm" onClick={() => transition('cancelled')} variant="danger">Cancel</PermButton>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Partner</label><p className="text-sm text-slate-200">{selected.partner_name}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Type</label><p className="text-sm text-slate-200 capitalize">{selected.type}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Date</label><p className="text-sm text-slate-200">{selected.invoice_date}</p></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Due Date</label><p className="text-sm text-slate-200">{selected.due_date || '—'}</p></div>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">${selected.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Tax</span><span className="text-slate-200">${selected.tax_total.toFixed(2)}</span></div>
            <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-semibold"><span className="text-slate-200">Amount Due</span><span className="text-blue-400">${selected.amount_due.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Paid</span><span className="text-green-400">${selected.amount_paid.toFixed(2)}</span></div>
          </div>
        </div>)}
      </Drawer>

      {showNewModal && (<div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">New Invoice</h3>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Type</label><select value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value as 'invoice' | 'bill' }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none"><option value="invoice">Invoice</option><option value="bill">Bill</option></select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Partner *</label><input value={newForm.partner_name} onChange={e => setNewForm(f => ({ ...f, partner_name: e.target.value }))} placeholder="Customer or vendor name" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-400 mb-1 block">Subtotal</label><input type="number" value={newForm.subtotal} onChange={e => setNewForm(f => ({ ...f, subtotal: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" step="0.01" /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Tax</label><input type="number" value={newForm.tax_total} onChange={e => setNewForm(f => ({ ...f, tax_total: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" step="0.01" /></div>
            </div>
            <div><label className="text-xs text-slate-400 mb-1 block">Due Date</label><input type="date" value={newForm.due_date} onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button></div>
        </div></div>)}
    </div>
  );
}

// ===== PAYMENTS =====
function PaymentsPage() {
  const invoices = getInvoices();
  const paid = invoices.filter(i => i.state === 'paid');
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Payments</h1><p className="text-sm text-slate-400 mt-0.5">Payment records</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Total Payments" value={paid.length} color="green" icon={CreditCard} />
        <KPICard label="Total Received" value={`$${paid.filter(i => i.type === 'invoice').reduce((s, i) => s + i.amount_paid, 0).toLocaleString()}`} color="blue" />
        <KPICard label="Total Paid Out" value={`$${paid.filter(i => i.type === 'bill').reduce((s, i) => s + i.amount_paid, 0).toLocaleString()}`} color="orange" />
      </div>
      {paid.length === 0 ? <EmptyState title="No payments" description="Payments are recorded when invoices are marked as paid." icon={CreditCard} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoice</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Partner</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th><th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{paid.map(p => (
          <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{p.invoice_number}</td><td className="px-4 py-3 text-sm text-slate-300">{p.partner_name}</td>
            <td className="px-4 py-3 text-sm text-slate-400 capitalize">{p.type}</td><td className="px-4 py-3 text-sm font-medium text-green-400 text-right">${p.amount_paid.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.invoice_date}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== JOURNAL =====
function JournalPage() {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Journal Entries</h1><p className="text-sm text-slate-400 mt-0.5">Accounting journal</p></div>
      <EmptyState title="No journal entries" description="Journal entries will be auto-generated from transactions. Manual entries coming soon." icon={BookOpen} />
    </div>
  );
}

// ===== ROUTER =====
export default function OperationsModule() {
  const { pathname } = useLocation();
  if (pathname === '/purchasing/orders') return <PurchaseOrdersPage />;
  if (pathname === '/purchasing/vendors') return <VendorsPage />;
  if (pathname === '/inventory/products') return <ProductsPage />;
  if (pathname === '/inventory/stock') return <StockPage />;
  if (pathname === '/accounting/invoices') return <InvoicesPage />;
  if (pathname === '/accounting/payments') return <PaymentsPage />;
  if (pathname === '/accounting/journal') return <JournalPage />;
  return <PurchaseOrdersPage />;
}