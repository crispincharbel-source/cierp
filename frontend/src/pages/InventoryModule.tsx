// CI ERP — Inventory Module
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts, createProduct, updateProduct, type Product } from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, Package, Warehouse, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ===== PRODUCTS =====
function ProductsPage() {
  const { showToast } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_qty: 0, reorder_level: 0, location: 'Main Warehouse', unit: 'pcs', description: '' });

  const refresh = () => setProducts(getProducts());
  useEffect(() => { refresh(); }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    if (catFilter && p.category !== catFilter) return false;
    if (search) { const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q); }
    return true;
  });

  const kpis = {
    total: products.length,
    inStock: products.filter(p => p.stock_qty > p.reorder_level).length,
    lowStock: products.filter(p => p.stock_qty > 0 && p.stock_qty <= p.reorder_level).length,
    outOfStock: products.filter(p => p.stock_qty === 0).length,
    totalValue: products.reduce((s, p) => s + p.stock_qty * p.cost_price, 0),
  };

  const openNew = () => { setForm({ name: '', sku: '', category: '', unit_price: 0, cost_price: 0, stock_qty: 0, reorder_level: 0, location: 'Main Warehouse', unit: 'pcs', description: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (p: Product) => { setForm({ name: p.name, sku: p.sku, category: p.category, unit_price: p.unit_price, cost_price: p.cost_price, stock_qty: p.stock_qty, reorder_level: p.reorder_level, location: p.location, unit: p.unit, description: p.description }); setSelected(p); setIsNew(false); setDrawerOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (isNew) { createProduct(form); showToast('success', `"${form.name}" created`); }
    else if (selected) { updateProduct(selected.id, form); showToast('success', `"${form.name}" updated`); }
    setDrawerOpen(false); refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Products</h1><p className="text-sm text-slate-400 mt-0.5">Product catalog & inventory</p></div>
        <PermButton permission="inventory.products.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Product</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Total Products" value={kpis.total} color="blue" icon={Package} />
        <KPICard label="In Stock" value={kpis.inStock} color="green" />
        <KPICard label="Low Stock" value={kpis.lowStock} color="amber" icon={AlertTriangle} />
        <KPICard label="Out of Stock" value={kpis.outOfStock} color="red" />
        <KPICard label="Inventory Value" value={`$${kpis.totalValue.toLocaleString()}`} color="purple" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
        </div>
        {categories.length > 0 && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 outline-none">
            <option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? <EmptyState title="No products yet" description="Add your first product." actionLabel="Add Product" onAction={openNew} icon={Package} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">SKU</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Price</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Stock</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(p => (
          <tr key={p.id} onClick={() => openEdit(p)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{p.name}</td>
            <td className="px-4 py-3 text-sm text-slate-400 font-mono">{p.sku || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.category || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">${p.unit_price.toFixed(2)}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">{p.stock_qty} {p.unit}</td>
            <td className="px-4 py-3">
              <StateBadge state={p.stock_qty === 0 ? 'urgent' : p.stock_qty <= p.reorder_level ? 'low' : 'active'} />
            </td>
          </tr>))}</tbody></table></div></div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Product' : `Edit: ${selected?.name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">SKU</label><input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Category</label><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Unit Price</label><input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" min="0" step="0.01" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Cost Price</label><input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" min="0" step="0.01" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Stock Qty</label><input type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" min="0" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Reorder Level</label><input type="number" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" min="0" /></div>
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
function StockLevelsPage() {
  const products = getProducts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filtered = products.filter(p => {
    if (filter === 'low' && !(p.stock_qty > 0 && p.stock_qty <= p.reorder_level)) return false;
    if (filter === 'out' && p.stock_qty !== 0) return false;
    if (search) { const q = search.toLowerCase(); return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q); }
    return true;
  });

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Stock Levels</h1><p className="text-sm text-slate-400 mt-0.5">Monitor inventory levels across locations</p></div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
        </div>
        <div className="flex bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
          {(['all', 'low', 'out'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs rounded-md transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState title="No products" description="Add products in the Products page." icon={Warehouse} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Product</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">SKU</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Location</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">On Hand</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reorder</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Value</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{filtered.map(p => (
          <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{p.name}</td>
            <td className="px-4 py-3 text-sm text-slate-400 font-mono">{p.sku || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{p.location}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right font-medium">{p.stock_qty} {p.unit}</td>
            <td className="px-4 py-3 text-sm text-slate-400 text-right">{p.reorder_level}</td>
            <td className="px-4 py-3">
              {p.stock_qty === 0 ? <span className="text-xs text-red-400 bg-red-600/10 px-2 py-0.5 rounded-full">Out of Stock</span>
              : p.stock_qty <= p.reorder_level ? <span className="text-xs text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><AlertTriangle className="h-3 w-3" /> Low</span>
              : <span className="text-xs text-green-400 bg-green-600/10 px-2 py-0.5 rounded-full">OK</span>}
            </td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">${(p.stock_qty * p.cost_price).toLocaleString()}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== ROUTER =====
export default function InventoryModule() {
  const { pathname } = useLocation();
  if (pathname === '/inventory/stock') return <StockLevelsPage />;
  return <ProductsPage />;
}