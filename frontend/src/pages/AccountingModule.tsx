// CI ERP — Accounting Module
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getInvoices, createInvoice, transitionInvoice, type Invoice } from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, X, Filter, Receipt, DollarSign, FileText, CreditCard, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// ===== INVOICES =====
function InvoicesPage() {
  const { showToast } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'bill'>('all');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ type: 'invoice' as 'invoice' | 'bill', partner_name: '', subtotal: 0, due_date: '', reference: '', notes: '' });
  const pageSize = 20;

  const refresh = () => setInvoices(getInvoices());
  useEffect(() => { refresh(); }, []);

  const filtered = invoices.filter(i => {
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    if (stateFilter && i.state !== stateFilter) return false;
    if (search) { const q = search.toLowerCase(); return i.invoice_number.toLowerCase().includes(q) || i.partner_name.toLowerCase().includes(q); }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const kpis = {
    draft: invoices.filter(i => i.state === 'draft').length,
    confirmed: invoices.filter(i => i.state === 'confirmed' || i.state === 'sent').length,
    paid: invoices.filter(i => i.state === 'paid').length,
    overdue: invoices.filter(i => ['draft', 'confirmed', 'sent'].includes(i.state) && i.due_date && new Date(i.due_date) < new Date()).length,
    totalReceivable: invoices.filter(i => i.type === 'invoice' && ['draft', 'confirmed', 'sent'].includes(i.state)).reduce((s, i) => s + i.amount_due, 0),
  };

  const handleCreate = () => {
    if (!newForm.partner_name.trim()) { toast.error('Partner name required'); return; }
    const taxTotal = Math.round(newForm.subtotal * 0.1 * 100) / 100;
    const inv = createInvoice({ ...newForm, tax_total: taxTotal, amount_due: newForm.subtotal + taxTotal });
    setShowNewModal(false); setSelected(inv); setDrawerOpen(true); refresh();
    showToast('success', `${inv.invoice_number} created`);
    setNewForm({ type: 'invoice', partner_name: '', subtotal: 0, due_date: '', reference: '', notes: '' });
  };

  const handleTransition = (newState: Invoice['state']) => {
    if (!selected) return;
    const u = transitionInvoice(selected.id, newState);
    if (u) { setSelected(u); refresh(); showToast('success', `→ ${newState}`); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Invoices & Bills</h1><p className="text-sm text-slate-400 mt-0.5">Manage receivables and payables</p></div>
        <PermButton permission="accounting.invoices.create" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /> New Invoice</PermButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Draft" value={kpis.draft} color="slate" onClick={() => { setStateFilter(stateFilter === 'draft' ? null : 'draft'); setPage(1); }} active={stateFilter === 'draft'} />
        <KPICard label="Confirmed" value={kpis.confirmed} color="blue" onClick={() => { setStateFilter(stateFilter === 'confirmed' ? null : 'confirmed'); setPage(1); }} active={stateFilter === 'confirmed'} />
        <KPICard label="Paid" value={kpis.paid} color="green" onClick={() => { setStateFilter(stateFilter === 'paid' ? null : 'paid'); setPage(1); }} active={stateFilter === 'paid'} />
        <KPICard label="Overdue" value={kpis.overdue} color="red" />
        <KPICard label="Receivable" value={`$${kpis.totalReceivable.toLocaleString()}`} color="purple" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search invoices..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full" />
          {search && <button onClick={() => setSearch('')}><X className="h-3.5 w-3.5 text-slate-500" /></button>}
        </div>
        <div className="flex bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
          {(['all', 'invoice', 'bill'] as const).map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }} className={`px-3 py-1 text-xs rounded-md transition-colors ${typeFilter === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {t === 'all' ? 'All' : t === 'invoice' ? 'Invoices' : 'Bills'}
            </button>
          ))}
        </div>
        {stateFilter && (
          <button onClick={() => setStateFilter(null)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 border border-blue-600/20 rounded-lg text-xs text-blue-400">
            <Filter className="h-3 w-3" /> {stateFilter} <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? <EmptyState title="No invoices yet" description="Create your first invoice." actionLabel="New Invoice" onAction={() => setShowNewModal(true)} icon={Receipt} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Number</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Partner</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Due</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
          </tr></thead><tbody className="divide-y divide-slate-800/30">{paginated.map(i => (
            <tr key={i.id} onClick={() => { setSelected(i); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-blue-400">{i.invoice_number}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${i.type === 'invoice' ? 'bg-blue-600/10 text-blue-400' : 'bg-orange-600/10 text-orange-400'}`}>{i.type}</span></td>
              <td className="px-4 py-3 text-sm text-slate-300">{i.partner_name || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{i.invoice_date}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{i.due_date || '—'}</td>
              <td className="px-4 py-3"><StateBadge state={i.state} /></td>
              <td className="px-4 py-3 text-sm font-medium text-slate-200 text-right">${i.amount_due.toLocaleString()}</td>
            </tr>))}</tbody></table></div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{filtered.length} records · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.invoice_number || 'Invoice'}>
        {selected && (
          <div className="space-y-6">
            <WorkflowRibbon states={['draft', 'confirmed', 'sent', 'paid']} currentState={selected.state === 'cancelled' ? 'draft' : selected.state} />
            <div className="flex flex-wrap gap-2">
              {selected.state === 'draft' && <PermButton permission="accounting.invoices.confirm" onClick={() => handleTransition('confirmed')}><FileText className="h-3.5 w-3.5" /> Confirm</PermButton>}
              {selected.state === 'confirmed' && <PermButton permission="accounting.invoices.confirm" onClick={() => handleTransition('sent')}>Send</PermButton>}
              {(selected.state === 'confirmed' || selected.state === 'sent') && <PermButton permission="accounting.invoices.pay" onClick={() => handleTransition('paid')}><CreditCard className="h-3.5 w-3.5" /> Register Payment</PermButton>}
              {selected.state === 'paid' && <span className="text-xs text-green-400 bg-green-600/10 px-3 py-1.5 rounded-lg">✓ Paid</span>}
              {selected.state !== 'paid' && selected.state !== 'cancelled' && <PermButton permission="accounting.invoices.confirm" onClick={() => handleTransition('cancelled')} variant="danger">Cancel</PermButton>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Type</label><p className="text-sm text-slate-200 capitalize">{selected.type}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Partner</label><p className="text-sm text-slate-200">{selected.partner_name || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Invoice Date</label><p className="text-sm text-slate-200">{selected.invoice_date}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Due Date</label><p className="text-sm text-slate-200">{selected.due_date || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Reference</label><p className="text-sm text-slate-200">{selected.reference || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Currency</label><p className="text-sm text-slate-200">{selected.currency}</p></div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-200">${selected.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Tax</span><span className="text-slate-200">${selected.tax_total.toFixed(2)}</span></div>
              <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm font-semibold"><span className="text-slate-200">Amount Due</span><span className="text-blue-400">${selected.amount_due.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Amount Paid</span><span className="text-green-400">${selected.amount_paid.toFixed(2)}</span></div>
            </div>
          </div>
        )}
      </Drawer>

      {/* New Invoice Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Invoice / Bill</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Type</label>
                <div className="flex bg-slate-700/50 rounded-lg p-0.5">
                  <button onClick={() => setNewForm(f => ({ ...f, type: 'invoice' }))} className={`flex-1 px-3 py-1.5 text-xs rounded-md ${newForm.type === 'invoice' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Invoice</button>
                  <button onClick={() => setNewForm(f => ({ ...f, type: 'bill' }))} className={`flex-1 px-3 py-1.5 text-xs rounded-md ${newForm.type === 'bill' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Bill</button>
                </div></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">{newForm.type === 'invoice' ? 'Customer' : 'Vendor'} *</label>
                <input value={newForm.partner_name} onChange={e => setNewForm(f => ({ ...f, partner_name: e.target.value }))} placeholder="Name" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-400 mb-1.5 block">Amount</label>
                  <input type="number" value={newForm.subtotal} onChange={e => setNewForm(f => ({ ...f, subtotal: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" min="0" step="0.01" /></div>
                <div><label className="text-xs text-slate-400 mb-1.5 block">Due Date</label>
                  <input type="date" value={newForm.due_date} onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Reference</label>
                <input value={newForm.reference} onChange={e => setNewForm(f => ({ ...f, reference: e.target.value }))} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== PAYMENTS =====
function PaymentsPage() {
  const invoices = getInvoices();
  const paid = invoices.filter(i => i.state === 'paid');
  const pending = invoices.filter(i => ['confirmed', 'sent'].includes(i.state));

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Payments</h1><p className="text-sm text-slate-400 mt-0.5">Track payments and receivables</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Paid Invoices" value={paid.length} color="green" icon={CreditCard} />
        <KPICard label="Total Received" value={`$${paid.reduce((s, i) => s + i.amount_paid, 0).toLocaleString()}`} color="green" />
        <KPICard label="Pending" value={pending.length} color="amber" />
        <KPICard label="Outstanding" value={`$${pending.reduce((s, i) => s + i.amount_due, 0).toLocaleString()}`} color="red" />
      </div>
      {paid.length === 0 && pending.length === 0 ? <EmptyState title="No payments yet" description="Payments appear when invoices are paid." icon={DollarSign} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoice</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Partner</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Paid</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{[...paid, ...pending].map(i => (
          <tr key={i.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-blue-400">{i.invoice_number}</td>
            <td className="px-4 py-3 text-sm text-slate-300">{i.partner_name}</td>
            <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${i.type === 'invoice' ? 'bg-blue-600/10 text-blue-400' : 'bg-orange-600/10 text-orange-400'}`}>{i.type}</span></td>
            <td className="px-4 py-3"><StateBadge state={i.state} /></td>
            <td className="px-4 py-3 text-sm text-slate-200 text-right">${i.amount_due.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-green-400 text-right">${i.amount_paid.toLocaleString()}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== JOURNAL ENTRIES =====
function JournalPage() {
  const invoices = getInvoices().filter(i => i.state !== 'draft');
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-slate-100">Journal Entries</h1><p className="text-sm text-slate-400 mt-0.5">Accounting journal from confirmed transactions</p></div>
      {invoices.length === 0 ? <EmptyState title="No journal entries" description="Journal entries are created from confirmed invoices." icon={BookOpen} /> : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Reference</th>
          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Account</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Debit</th>
          <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Credit</th>
        </tr></thead><tbody className="divide-y divide-slate-800/30">{invoices.flatMap(i => [
          { id: i.id + '-dr', date: i.invoice_date, ref: i.invoice_number, account: i.type === 'invoice' ? 'Accounts Receivable' : 'Expense', debit: i.amount_due, credit: 0 },
          { id: i.id + '-cr', date: i.invoice_date, ref: i.invoice_number, account: i.type === 'invoice' ? 'Revenue' : 'Accounts Payable', debit: 0, credit: i.amount_due },
        ]).map(j => (
          <tr key={j.id} className="hover:bg-slate-800/20 transition-colors">
            <td className="px-4 py-3 text-sm text-slate-400">{j.date}</td>
            <td className="px-4 py-3 text-sm text-blue-400">{j.ref}</td>
            <td className="px-4 py-3 text-sm text-slate-200">{j.account}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">{j.debit > 0 ? `$${j.debit.toFixed(2)}` : ''}</td>
            <td className="px-4 py-3 text-sm text-slate-300 text-right">{j.credit > 0 ? `$${j.credit.toFixed(2)}` : ''}</td>
          </tr>))}</tbody></table></div></div>
      )}
    </div>
  );
}

// ===== ROUTER =====
export default function AccountingModule() {
  const { pathname } = useLocation();
  if (pathname === '/accounting/payments') return <PaymentsPage />;
  if (pathname === '/accounting/journal') return <JournalPage />;
  return <InvoicesPage />;
}