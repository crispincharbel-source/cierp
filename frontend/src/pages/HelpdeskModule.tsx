
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getTickets, getTicket, addTicketReply, updateLead,
  getHelpdeskDashboard,
  type HelpdeskTicket, type TicketReply, type Paginated
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, TableSkeleton, Drawer, ConfirmModal, WorkflowRibbon, PermButton, useAuth } from '@/components/Layout';
import { Plus, Search, X, Filter, Trash2, FileText, Send, MessageSquare, ArrowLeft, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { debounce } from '@/lib/utils';


function HelpdeskPage() {
  const { showToast, user } = useAuth();
  const [data, setData] = useState<Paginated<HelpdeskTicket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [kpis, setKpis] = useState<any>(null);

  const pageSize = 20;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketData, kpiData] = await Promise.all([
          getTickets(page, pageSize, stateFilter || undefined),
          getHelpdeskDashboard(),
      ]);
      setData(ticketData);
      setKpis(kpiData);
    } catch (err: any) {
      showToast('error', err.detail || 'Could not load data');
    }
    setLoading(false);
  }, [page, stateFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const openTicket = async (id: string) => {
      setDrawerOpen(true);
      setSelectedTicket(null);
      try {
        const ticket = await getTicket(id);
        setSelectedTicket(ticket);
      } catch (err: any) {
        showToast('error', 'Could not load ticket');
        setDrawerOpen(false);
      }
  }

  const handleAddReply = async () => {
      if (!selectedTicket || !replyText.trim()) return;
      try {
          const newReply = await addTicketReply(selectedTicket.id, replyText);
          setSelectedTicket(t => t ? ({...t, replies: [...t.replies, newReply]}) : null);
          setReplyText('');
          showToast('success', 'Reply sent');
      } catch (err: any) {
          showToast('error', 'Could not send reply');
      }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / pageSize));

  if (loading && !data && !kpis) return <div className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-slate-800/30 rounded-xl animate-pulse" />)}</div><TableSkeleton /></div>;
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Helpdesk</h1><p className="text-sm text-slate-400 mt-0.5">Manage customer support tickets</p></div>
        <PermButton permission="helpdesk.tickets.create"><Plus className="h-4 w-4" /> New Ticket</PermButton>
      </div>

      {kpis && <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Total Tickets" value={kpis.total_tickets} color="slate" onClick={() => { setStateFilter(null); setPage(1); }} />
        <KPICard label="Open Tickets" value={kpis.open_tickets} color="blue" onClick={() => { setStateFilter('open'); setPage(1); }} active={stateFilter === 'open'} />
        <KPICard label="Urgent" value={kpis.urgent_tickets} color="red" />
      </div>}

      {loading && !data?.items ? <TableSkeleton /> : (data?.items.length || 0) === 0 ? (
        <EmptyState title="No tickets here" description="All caught up!" icon={Inbox} />
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Update</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800/30">
                {data?.items.map(t => (
                  <tr key={t.id} onClick={() => openTicket(t.id)} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-400">{t.number}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-xs">{t.subject}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{t.customer_name || '—'}</td>
                    <td className="px-4 py-3"><StateBadge state={t.state} /></td>
                    <td className="px-4 py-3 text-sm text-slate-400 capitalize">{t.priority}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(t.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">{(data?.total || 0)} tickets · Page {page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs bg-slate-800 text-slate-400 rounded disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width="max-w-2xl">
        {selectedTicket ? (
            <div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div>
                        <p className="text-xs text-slate-500">{selectedTicket.number}</p>
                        <h2 className="text-lg font-semibold text-slate-100">{selectedTicket.subject}</h2>
                    </div>
                    <button onClick={() => setDrawerOpen(false)}><X className='h-5 w-5 text-slate-500'/></button>
                </div>
          <div className="space-y-6 p-6">
            <WorkflowRibbon states={['new', 'open', 'resolved', 'closed']} currentState={selectedTicket.state} />
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {selectedTicket.replies.map(reply => (
                    <div key={reply.id} className={`flex gap-3 items-start ${reply.author === user?.email ? 'flex-row-reverse' : ''}`}>
                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-400">{reply.author.slice(0,1).toUpperCase()}</div>
                        <div className={`p-3 rounded-xl max-w-md ${reply.author === user?.email ? 'bg-blue-600/20 text-blue-100' : 'bg-slate-800/60'}`}>
                            <p className="text-sm">{reply.body}</p>
                            <p className="text-[11px] text-slate-500 mt-2">{new Date(reply.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-start gap-3 pt-4 border-t border-slate-800">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-400">{user?.email.slice(0,1).toUpperCase()}</div>
                <div className="flex-1">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Type your reply..." className="w-full bg-slate-800/50 p-3 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500/50" />
                    <div className="flex justify-end mt-2">
                        <button onClick={handleAddReply} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2"><Send className='h-4 w-4'/> Reply</button>
                    </div>
                </div>
            </div>

          </div>
          </div>
        ) : <div className='py-12 flex justify-center text-slate-500'>Loading...</div>}
      </Drawer>
    </div>
  );
}

// ===== ROUTER =====
export default function HelpdeskModule() {
  return <HelpdeskPage />;
}
