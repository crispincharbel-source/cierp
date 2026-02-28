
// CI ERP — Sales & CRM Module (Flagship)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getSalesOrders, createSalesOrder, updateSalesOrder, addSalesOrderLine, updateSalesOrderLine, deleteSalesOrderLine, 
  confirmSalesOrder, cancelSalesOrder, validateSalesDelivery, createSalesInvoice, deleteSalesOrder,
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getLeads, createLead, updateLead,
  getSalesDashboard,
  type SalesOrder, type SalesOrderLine, type Customer, type Lead, type Paginated
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, TableSkeleton, Drawer, ConfirmModal, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, X, Filter, Trash2, FileText, Truck, Receipt, Ban, ShoppingCart, Users, TrendingUp, Target, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from '@/lib/utils';

// ===== SALES ORDERS =====
function SalesOrdersPage() {
  const { showToast } = useAuth();
  const [data, setData] = useState<Paginated<SalesOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof SalesOrder>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [selCustId, setSelCustId] = useState('');
  const [kpis, setKpis] = useState<any>(null);

  const pageSize = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ordData, custData, kpiData] = await Promise.all([
          getSalesOrders(page, pageSize, stateFilter || undefined),
          getCustomers(1, 1000), // fetch all for selection
          getSalesDashboard(),
      ]);
      setData(ordData);
      setCustomers(custData.items);
      setKpis(kpiData);
    } catch (err: any) {
      showToast('error', err.detail || 'Could not load data');
    }
    setLoading(false);
  }, [page, stateFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const openOrder = async (id: string) => {
      setDrawerOpen(true);
      setSelectedOrder(null);
      try {
        const order = await getSalesOrder(id);
        setSelectedOrder(order);
      } catch (err: any) {
        showToast('error', 'Could not load order');
        setDrawerOpen(false);
      }
  }

  const handleCreateOrder = async () => {
    if (!selCustId) { toast.error('Please select a customer'); return; }
    try {
        const order = await createSalesOrder({ customer_id: selCustId });
        setShowNewModal(false);
        await openOrder(order.id);
        refresh();
        showToast('success', `Order ${order.number} created`);
    } catch (err: any) {
        showToast('error', err.detail || 'Could not create order');
    }
  };

  const handleCreateCust = async () => {
    if (!custForm.name.trim()) { toast.error('Name required'); return; }
    try {
        const c = await createCustomer(custForm);
        setSelCustId(c.id);
        setShowNewCustModal(false);
        setCustForm({ name: '', email: '', phone: '', address: '' });
        const custData = await getCustomers(1, 1000);
        setCustomers(custData.items);
        showToast('success', `Customer "${c.name}" created`);
    } catch (err: any) {
        showToast('error', err.detail || 'Could not create customer');
    }
  };

  const handleConfirm = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.lines.length === 0) { toast.error('Add at least one line item'); return; }
    try {
        const u = await confirmSalesOrder(selectedOrder.id);
        setSelectedOrder(u);
        refresh();
        showToast('success', `${u.number} confirmed`);
    } catch (err: any) {
        showToast('error', err.detail || 'Could not confirm order');
    }
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    try {
        await cancelSalesOrder(selectedOrder.id);
        setShowCancelModal(false);
        const newSel = await getSalesOrder(selectedOrder.id);
        setSelectedOrder(newSel);
        refresh();
        showToast('success', `${newSel.number} cancelled`);
    } catch(err: any) {
        showToast('error', err.detail || 'Could not cancel order');
    }
  };

  const handleDeliver = async () => {
    if (!selectedOrder) return;
    try {
        const u = await validateSalesDelivery(selectedOrder.id);
        setSelectedOrder(u);
        refresh();
        showToast('success', `Delivery created`);
    } catch (err: any) {
        showToast('error', err.detail || 'Could not create delivery');
    }
  };

  const handleInvoice = async () => {
    if (!selectedOrder) return;
    try {
        const inv = await createSalesInvoice(selectedOrder.id);
        const u = await getSalesOrder(selectedOrder.id);
        setSelectedOrder(u);
        refresh();
        showToast('success', `Invoice ${inv.number} created`);
    } catch (err: any) {
        showToast('error', err.detail || 'Could not create invoice');
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    try {
        await deleteSalesOrder(selectedOrder.id);
        setDrawerOpen(false);
        setSelectedOrder(null);
        refresh();
        showToast('success', 'Deleted');
    } catch (err: any) {
        showToast('error', err.detail || 'Could not delete order');
    }
  };

  const addLine = async () => {
    if (!selectedOrder || selectedOrder.state !== 'draft') return;
    try {
        const nl = await addSalesOrderLine(selectedOrder.id, { product_name: 'New Item', quantity: 1, unit_price: 0 });
        setSelectedOrder(ord => ord ? ({...ord, lines: [...ord.lines, nl]}) : null);
    } catch (err: any) {
        showToast('error', 'Could not add line');
    }
  };

  const debouncedUpdateLine = useCallback(debounce(async (lineId: string, updates: Partial<SalesOrderLine>) => {
      try {
        await updateSalesOrderLine(lineId, updates);
        // Silent success, re-fetch for accuracy
        if (selectedOrder) {
            const freshOrder = await getSalesOrder(selectedOrder.id);
            setSelectedOrder(freshOrder);
        }
      } catch (err: any) {
          showToast('error', 'Could not update line');
      }
  }, 500), [selectedOrder]);

  const updateLine = (lid: string, field: string, val: string | number) => {
    if (!selectedOrder) return;
    const lines = selectedOrder.lines.map(l => (l.id !== lid) ? l : { ...l, [field]: val });
    setSelectedOrder(ord => ord ? ({...ord, lines}) : null); // Optimistic update
    debouncedUpdateLine(lid, { [field]: val });
  };
  
  const removeLine = async (lid: string) => {
    if (!selectedOrder) return;
    try {
        await deleteSalesOrderLine(lid);
        setSelectedOrder(ord => ord ? ({...ord, lines: ord.lines.filter(l => l.id !== lid)}) : null);
    } catch(err: any) {
        showToast('error', 'Could not remove line');
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  if (loading && !data && !kpis) return <div className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />)}</div><TableSkeleton /></div>;
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Sales Orders</h1><p className="text-sm text-slate-400 mt-0.5">Manage your sales pipeline</p></div>
        <PermButton permission="sales.orders.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Order</PermButton>
      </div>

      {kpis && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Draft" value={kpis.total_orders} color="slate" onClick={() => { setStateFilter(stateFilter === 'draft' ? null : 'draft'); setPage(1); }} active={stateFilter === 'draft'} />
        <KPICard label="Confirmed" value={kpis.confirmed_orders} color="blue" onClick={() => { setStateFilter(stateFilter === 'confirmed' ? null : 'confirmed'); setPage(1); }} active={stateFilter === 'confirmed'} />
        <KPICard label="Revenue" value={`$${(kpis.revenue || 0).toLocaleString()}`} color="purple" />
        <KPICard label="Pipeline" value={`$${(kpis.pipeline_value || 0).toLocaleString()}`} color="orange" />
      </div>}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search orders..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-slate-500" /></button>}
        </div>
        {stateFilter && (
          <button onClick={() => setStateFilter(null)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-lg text-xs text-blue-400 hover:bg-blue-600/20">
            <Filter className="h-3 w-3" /> {stateFilter} <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {loading && !data?.items ? <TableSkeleton /> : (data?.items.length || 0) === 0 ? (
        stateFilter || search ? <EmptyState title="No orders match" description="Try adjusting your filters." actionLabel="Clear" onAction={() => { setSearch(''); setStateFilter(null); }} icon={ShoppingCart} />
        : <EmptyState title="No sales orders yet" description="Create your first order." actionLabel="Create Order" onAction={() => setShowNewModal(true)} icon={ShoppingCart} />
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800/30">
                {data?.items.map(o => (
                  <tr key={o.id} onClick={() => openOrder(o.id)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-400">{o.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{o.customer_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(o.order_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StateBadge state={o.state} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 text-right">${o.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{(data?.total || 0)} orders · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedOrder?.number || 'Order'} width="max-w-3xl">
        {selectedOrder ? (
          <div className="space-y-6">
            <WorkflowRibbon states={['draft', 'confirmed', 'done']} currentState={selectedOrder.state === 'cancelled' ? 'draft' : selectedOrder.state} />
            {selectedOrder.state === 'cancelled' && <div className="px-3 py-2 bg-red-600/10 border border-red-600/20 rounded-lg text-sm text-red-400">Cancelled</div>}

            <div className="flex flex-wrap gap-2">
              {selectedOrder.state === 'draft' && (<>
                <PermButton permission="sales.orders.confirm" onClick={handleConfirm} disabled={selectedOrder.lines.length === 0}><FileText className="h-3.5 w-3.5" /> Confirm</PermButton>
                <PermButton permission="sales.orders.cancel" onClick={() => setShowCancelModal(true)} variant="danger"><Ban className="h-3.5 w-3.5" /> Cancel</PermButton>
                <PermButton permission="sales.orders.edit" onClick={handleDelete} variant="ghost"><Trash2 className="h-3.5 w-3.5" /> Delete</PermButton>
              </>)}
              {selectedOrder.state === 'confirmed' && (<>
                <PermButton permission="sales.orders.deliver" onClick={handleDeliver}><Truck className="h-3.5 w-3.5" /> Validate Delivery</PermButton>
                <PermButton permission="sales.orders.cancel" onClick={() => setShowCancelModal(true)} variant="danger"><Ban className="h-3.5 w-3.5" /> Cancel</PermButton>
              </>)}
              {selectedOrder.state === 'done' && !selectedOrder.invoice_id && <PermButton permission="sales.orders.invoice" onClick={handleInvoice}><Receipt className="h-3.5 w-3.5" /> Create Invoice</PermButton>}
              {selectedOrder.invoice_id && <span className="text-xs text-green-400 bg-green-600/10 px-3 py-1.5 rounded-lg">✓ Invoice created</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Customer</label><p className="text-sm text-slate-200 font-medium">{selectedOrder.customer_name || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Order Date</label><p className="text-sm text-slate-200">{new Date(selectedOrder.order_date).toLocaleDateString()}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Currency</label><p className="text-sm text-slate-200">{selectedOrder.currency}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Salesperson</label>
                {selectedOrder.state === 'draft' ? <input value={selectedOrder.salesperson} onChange={e => { updateSalesOrder(selectedOrder.id, { salesperson: e.target.value }); setSelectedOrder(s => s ? ({...s, salesperson: e.target.value}) : null)}} className="w-full px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-sm text-slate-200 outline-none focus:border-blue-500/50" />
                : <p className="text-sm text-slate-200">{selectedOrder.salesperson}</p>}
              </div>
            </div>

            {selectedOrder.state === 'draft' && (
              <div><label className="text-xs text-slate-500 mb-1 block">Notes</label>
                <textarea value={selectedOrder.notes} onChange={e => { updateSalesOrder(selectedOrder.id, { notes: e.target.value }); setSelectedOrder(s => s ? ({...s, notes: e.target.value}) : null)}} rows={2} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none focus:border-blue-500/50" placeholder="Add notes..." />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">Line Items</h3>
                {selectedOrder.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"><Plus className="h-3 w-3" /> Add Line</button>}
              </div>
              {selectedOrder.lines.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-2">No line items</p>
                  {selectedOrder.state === 'draft' && <button onClick={addLine} className="text-xs text-blue-400">+ Add first line</button>}
                </div>
              ) : (
                <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="bg-slate-800/30">
                      <th className="text-left px-3 py-2 text-[11px] font-medium text-slate-500 uppercase">Product</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Qty</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Price</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-16">Disc%</th>
                      <th className="text-right px-3 py-2 text-[11px] font-medium text-slate-500 uppercase w-24">Total</th>
                      {selectedOrder.state === 'draft' && <th className="w-8" />}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {selectedOrder.lines.map(line => (
                        <tr key={line.id} className="hover:bg-slate-800/10">
                          <td className="px-3 py-2">{selectedOrder.state === 'draft' ? <input value={line.product_name} onChange={e => updateLine(line.id, 'product_name', e.target.value)} placeholder="Product" className="w-full bg-transparent text-sm text-slate-200 outline-none" /> : <span className="text-sm text-slate-200">{line.product_name}</span>}</td>
                          <td className="px-3 py-2 text-right">{selectedOrder.state === 'draft' ? <input type="number" value={line.quantity} onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" /> : <span className="text-sm text-slate-200">{line.quantity}</span>}</td>
                          <td className="px-3 py-2 text-right">{selectedOrder.state === 'draft' ? <input type="number" value={line.unit_price} onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" step="0.01" /> : <span className="text-sm text-slate-200">${line.unit_price.toFixed(2)}</span>}</td>
                          <td className="px-3 py-2 text-right">{selectedOrder.state === 'draft' ? <input type="number" value={line.discount} onChange={e => updateLine(line.id, 'discount', parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-sm text-slate-200 outline-none text-right" min="0" max="100" /> : <span className="text-sm text-slate-200">{line.discount}%</span>}</td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-slate-200">${line.total.toFixed(2)}</td>
                          {selectedOrder.state === 'draft' && <td className="px-1 py-2"><button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-600/10 rounded text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 bg-slate-800/30 rounded-lg p-4">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">${selectedOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-400">Tax</span><span className="text-slate-200">${selectedOrder.tax_amount.toFixed(2)}</span></div>
                <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-semibold"><span className="text-slate-200">Grand Total</span><span className="text-blue-400">${selectedOrder.total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        ) : <div className='py-12 flex justify-center text-slate-500'>Loading...</div>}
      </Drawer>

      {/* New Order Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Sales Order</h3>
            {customers.length === 0 ? (
              <div className="text-center py-4"><p className="text-sm text-slate-400 mb-3">No customers yet — Create one first</p>
                <button onClick={() => setShowNewCustModal(true)} className="text-sm text-blue-400 hover:text-blue-300 font-medium">+ Create Customer</button></div>
            ) : (
              <div className="space-y-4">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Select Customer</label>
                  <select value={selCustId} onChange={e => setSelCustId(e.target.value)} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none">
                    <option value="">Choose...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <button onClick={() => setShowNewCustModal(true)} className="text-xs text-blue-400 hover:text-blue-300">+ New Customer</button>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
              {customers.length > 0 && <button onClick={handleCreateOrder} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Mini Modal */}
      {showNewCustModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center"><div className="absolute inset-0 bg-black/60" onClick={() => setShowNewCustModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-slate-100 mb-4">Create Customer</h3>
            <div className="space-y-3">
              <input value={custForm.name} onChange={e => setCustForm(f => ({ ...f, name: e.target.value }))} placeholder="Name *" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              <input value={custForm.email} onChange={e => setCustForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              <input value={custForm.phone} onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" />
              <input value={custForm.address} onChange={e => setCustForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewCustModal(false)} className="px-3 py-1.5 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreateCust} className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancel}
        title={`Cancel ${selectedOrder?.number}?`} description="This cannot be undone." confirmLabel="Cancel Order" danger>
      </ConfirmModal>
    </div>
  );
}

// ===== CUSTOMERS =====
function CustomersPage() {
  const { showToast } = useAuth();
  const [data, setData] = useState<Paginated<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', country: '' });
  const pageSize = 20;

  const debouncedSearch = useCallback(debounce((val: string) => {
      setSearch(val);
      setPage(1);
  }, 300), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomers(page, pageSize, search || undefined);
      setData(res);
    } catch (err: any) { showToast('error', err.detail || 'Could not load data'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => { setForm({ name: '', email: '', phone: '', address: '', country: '' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (c: Customer) => { setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address_line1, country: c.country }); setSelected(c); setIsNew(false); setDrawerOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    try {
        if (isNew) { 
            await createCustomer(form); showToast('success', `"${form.name}" created`); 
        } else if (selected) { 
            await updateCustomer(selected.id, form); showToast('success', `"${form.name}" updated`); 
        }
        setDrawerOpen(false); refresh();
    } catch (err: any) {
        showToast('error', err.detail || 'Could not save customer');
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Customers</h1><p className="text-sm text-slate-400 mt-0.5">Manage your customer database</p></div>
        <PermButton permission="sales.customers.create" onClick={openNew}><Plus className="h-4 w-4" /> Add Customer</PermButton></div>
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 max-w-sm"><Search className="h-4 w-4 text-slate-500" /><input onChange={e => debouncedSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" /></div>
      
      {loading && !data?.items ? <TableSkeleton/> : (data?.items.length || 0) === 0 ? <EmptyState title="No customers yet" description="Add your first customer." actionLabel="Add Customer" onAction={openNew} icon={Users} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Phone</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Country</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{data?.items.map(c => (
          <tr key={c.id} onClick={() => openEdit(c)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-slate-200">{c.name}</td><td className="px-4 py-3 text-sm text-slate-400">{c.email || '—'}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{c.phone || '—'}</td><td className="px-4 py-3 text-sm text-slate-400">{c.country || '—'}</td>
          </tr>))}</tbody></table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{(data?.total || 0)} customers · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
          </div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Customer' : `Edit: ${selected?.name || ''}`}>
        <div className="space-y-4">
          <div><label className="text-xs text-slate-400 mb-1 block">Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500/50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Country</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          
          <div className="flex justify-between pt-4 border-t border-slate-700/50">
            {!isNew && selected && <PermButton permission="sales.customers.delete" onClick={async () => { await deleteCustomer(selected.id); setDrawerOpen(false); refresh(); showToast('success', 'Deleted'); }} variant="danger"><Trash2 className="h-3.5 w-3.5" /> Delete</PermButton>}
            <div className="flex gap-2 ml-auto"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <PermButton permission={isNew ? 'sales.customers.create' : 'sales.customers.edit'} onClick={handleSave}>Save</PermButton></div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== LEADS =====
function LeadsPage() {
  const { showToast } = useAuth();
  const [data, setData] = useState<Paginated<Lead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<string|null>(null);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({ title: '', customer_name: '', expected_revenue: 0, probability: 20, source: 'website' });
  const pageSize = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads(page, pageSize, stateFilter || undefined);
      setData(res);
    } catch (err: any) { showToast('error', err.detail || 'Could not load data'); }
    setLoading(false);
  }, [page, stateFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => { setForm({ title: '', customer_name: '', expected_revenue: 0, probability: 20, source: 'website' }); setSelected(null); setIsNew(true); setDrawerOpen(true); };
  const openEdit = (l: Lead) => { setForm(l); setSelected(l); setIsNew(false); setDrawerOpen(true); };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title required'); return; }
    try {
        if (isNew) { await createLead(form); showToast('success', 'Lead created'); }
        else if (selected) { await updateLead(selected.id, form); showToast('success', 'Lead updated'); }
        setDrawerOpen(false); refresh();
    } catch (err: any) {
        showToast('error', err.detail || 'Could not save lead');
    }
  };

  const changeState = async (id: string, state: Lead['state']) => { 
      try {
        await updateLead(id, { state }); 
        refresh(); 
        showToast('success', `Lead → ${state}`);
      } catch (err: any) {
        showToast('error', `Could not update state`);
      }
  };

  const kpis = useMemo(() => {
      if (!data) return {new:0, qualified: 0, proposal: 0, won: 0, lost: 0};
      const counts = (data?.items || []).reduce((acc, l) => ({...acc, [l.state]: (acc[l.state] || 0) + 1}), {} as Record<string, number>);
      return counts;
  }, [data]);

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold text-slate-100">Leads</h1><p className="text-sm text-slate-400 mt-0.5">Capture and qualify leads</p></div>
        <PermButton permission="crm.leads.create" onClick={openNew}><Plus className="h-4 w-4" /> New Lead</PermButton></div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(['new', 'qualified', 'proposal', 'won', 'lost'] as const).map(s => <KPICard key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} value={kpis[s] || 0} color={s === 'won' ? 'green' : s === 'lost' ? 'red' : s === 'new' ? 'slate' : 'blue'} onClick={() => setStateFilter(f => f === s ? null : s)} active={stateFilter===s} />)}
      </div>
      {loading && !data ? <TableSkeleton/> : (data?.items.length || 0) === 0 ? <EmptyState title="No leads yet" description="Start capturing leads." actionLabel="New Lead" onAction={openNew} icon={Target} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Title</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Source</th><th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Revenue</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{data?.items.map(l => (
          <tr key={l.id} onClick={() => openEdit(l)} className="hover:bg-slate-800/20 cursor-pointer"><td className="px-4 py-3 text-sm font-medium text-slate-200">{l.title}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{l.customer_name || '—'}</td><td className="px-4 py-3 text-sm text-slate-400 capitalize">{l.source}</td>
            <td className="px-4 py-3"><StateBadge state={l.state} /></td><td className="px-4 py-3 text-sm text-slate-300 text-right">${l.expected_revenue.toLocaleString()}</td>
          </tr>))}</tbody></table></div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{(data?.total || 0)} leads · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
          </div>
      )}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={isNew ? 'New Lead' : `Lead: ${selected?.title || ''}`}>
        <div className="space-y-4">
          {!isNew && selected && (<div className="mb-4"><WorkflowRibbon states={['new', 'qualified', 'proposal', 'won', 'lost']} currentState={selected.state} />
            <div className="flex gap-2 mt-3">
              {selected.state === 'new' && <button onClick={() => { changeState(selected.id, 'qualified'); setDrawerOpen(false); }} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg">Qualify</button>}
              {selected.state === 'qualified' && <button onClick={() => { changeState(selected.id, 'proposal'); setDrawerOpen(false); }} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg">→ Proposal</button>}
              {!['won', 'lost'].includes(selected.state) && (<><button onClick={() => { changeState(selected.id, 'won'); setDrawerOpen(false); }} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg">Won</button>
                <button onClick={() => { changeState(selected.id, 'lost'); setDrawerOpen(false); }} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg">Lost</button></>)}
            </div></div>)}
          <div><label className="text-xs text-slate-400 mb-1 block">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Customer</label><input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Contact</label><input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 mb-1 block">Source</label><select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none">
              <option value="website">Website</option><option value="referral">Referral</option><option value="social">Social</option><option value="email">Email</option><option value="phone">Phone</option><option value="other">Other</option></select></div>
             <div><label className="text-xs text-slate-400 mb-1 block">Probability %</label><input type="number" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: parseInt(e.target.value) || 0 }))} min="0" max="100" className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-slate-400 mb-1 block">Expected Revenue</label><input type="number" value={form.expected_revenue} onChange={e => setForm(f => ({ ...f, expected_revenue: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 outline-none resize-none" /></div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50"><button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
            <PermButton permission={isNew ? 'crm.leads.create' : 'crm.leads.edit'} onClick={handleSave}>Save</PermButton></div>
        </div>
      </Drawer>
    </div>
  );
}

// ===== ROUTER =====
export default function SalesModule() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/sales/customers')) return <CustomersPage />;
  if (pathname.startsWith('/sales/leads')) return <LeadsPage />;
  return <SalesOrdersPage />;
}
