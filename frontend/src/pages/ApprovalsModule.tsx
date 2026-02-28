// CI ERP — Approvals Module
import React, { useState, useEffect } from 'react';
import {
  getApprovalRules, createApprovalRule,
  getApprovalRequests, createApprovalRequest, transitionApprovalRequest,
  type ApprovalRule, type ApprovalRequest,
} from '@/lib/store';
import { KPICard, StateBadge, EmptyState, Drawer, PermButton, useAuth } from '@/components/Layout';
import { Plus, CheckSquare, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ApprovalsModule() {
  const { showToast } = useAuth();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [tab, setTab] = useState<'requests' | 'rules'>('requests');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [showNewReqModal, setShowNewReqModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ module: '', action: '' });
  const [reqForm, setReqForm] = useState({ module: '', resource_label: '', rule_id: '' });

  const refresh = () => { setRules(getApprovalRules()); setRequests(getApprovalRequests()); };
  useEffect(() => { refresh(); }, []);

  const kpis = {
    pending: requests.filter(r => r.state === 'pending').length,
    approved: requests.filter(r => r.state === 'approved').length,
    rejected: requests.filter(r => r.state === 'rejected').length,
    totalRules: rules.length,
  };

  const handleCreateRule = () => {
    if (!ruleForm.module.trim() || !ruleForm.action.trim()) { toast.error('Module and action required'); return; }
    createApprovalRule({ module: ruleForm.module, action: ruleForm.action, steps: [{ step: 1, approver_role: 'manager', required: true }] });
    setShowNewRuleModal(false); refresh(); showToast('success', 'Rule created');
    setRuleForm({ module: '', action: '' });
  };

  const handleCreateReq = () => {
    if (!reqForm.resource_label.trim()) { toast.error('Label required'); return; }
    createApprovalRequest({ module: reqForm.module, resource_label: reqForm.resource_label, rule_id: reqForm.rule_id });
    setShowNewReqModal(false); refresh(); showToast('success', 'Request submitted');
    setReqForm({ module: '', resource_label: '', rule_id: '' });
  };

  const handleDecision = (id: string, decision: 'approved' | 'rejected') => {
    transitionApprovalRequest(id, decision);
    refresh(); setDrawerOpen(false); showToast('success', `Request ${decision}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-slate-100">Approvals</h1><p className="text-sm text-slate-400 mt-0.5">Manage approval workflows</p></div>
        <div className="flex gap-2">
          {tab === 'requests' && <PermButton permission="approvals.requests.view" onClick={() => setShowNewReqModal(true)}><Plus className="h-4 w-4" /> New Request</PermButton>}
          {tab === 'rules' && <PermButton permission="approvals.rules.view" onClick={() => setShowNewRuleModal(true)}><Plus className="h-4 w-4" /> New Rule</PermButton>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Pending" value={kpis.pending} color="amber" icon={Clock} />
        <KPICard label="Approved" value={kpis.approved} color="green" icon={CheckCircle} />
        <KPICard label="Rejected" value={kpis.rejected} color="red" icon={XCircle} />
        <KPICard label="Rules" value={kpis.totalRules} color="blue" icon={CheckSquare} />
      </div>

      <div className="flex bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5 w-fit">
        <button onClick={() => setTab('requests')} className={`px-4 py-1.5 text-xs rounded-md transition-colors ${tab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Requests</button>
        <button onClick={() => setTab('rules')} className={`px-4 py-1.5 text-xs rounded-md transition-colors ${tab === 'rules' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Rules</button>
      </div>

      {tab === 'requests' ? (
        requests.length === 0 ? <EmptyState title="No approval requests" description="Submit a request for approval." actionLabel="New Request" onAction={() => setShowNewReqModal(true)} icon={CheckSquare} /> : (
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Label</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Module</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Requested By</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">State</th>
          </tr></thead><tbody className="divide-y divide-slate-800/30">{requests.map(r => (
            <tr key={r.id} onClick={() => { setSelectedReq(r); setDrawerOpen(true); }} className="hover:bg-slate-800/20 cursor-pointer transition-colors">
              <td className="px-4 py-3 text-sm font-medium text-slate-200">{r.resource_label}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{r.module || '—'}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{r.requested_by}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{new Date(r.requested_at).toLocaleDateString()}</td>
              <td className="px-4 py-3"><StateBadge state={r.state} /></td>
            </tr>))}</tbody></table></div></div>
        )
      ) : (
        rules.length === 0 ? <EmptyState title="No approval rules" description="Create rules to define approval workflows." actionLabel="New Rule" onAction={() => setShowNewRuleModal(true)} icon={CheckSquare} /> : (
          <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-800/50">
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Module</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Steps</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Active</th>
          </tr></thead><tbody className="divide-y divide-slate-800/30">{rules.map(r => (
            <tr key={r.id} className="hover:bg-slate-800/20">
              <td className="px-4 py-3 text-sm text-slate-200">{r.module}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{r.action}</td>
              <td className="px-4 py-3 text-sm text-slate-400">{r.steps.length} step(s)</td>
              <td className="px-4 py-3"><StateBadge state={r.is_active ? 'active' : 'archived'} /></td>
            </tr>))}</tbody></table></div></div>
        )
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`Approval: ${selectedReq?.resource_label || ''}`}>
        {selectedReq && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500 mb-1 block">Label</label><p className="text-sm text-slate-200">{selectedReq.resource_label}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Module</label><p className="text-sm text-slate-200">{selectedReq.module || '—'}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Requested By</label><p className="text-sm text-slate-200">{selectedReq.requested_by}</p></div>
              <div><label className="text-xs text-slate-500 mb-1 block">State</label><StateBadge state={selectedReq.state} size="md" /></div>
            </div>
            {selectedReq.state === 'pending' && (
              <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                <PermButton permission="approvals.requests.approve" onClick={() => handleDecision(selectedReq.id, 'approved')}><CheckCircle className="h-3.5 w-3.5" /> Approve</PermButton>
                <PermButton permission="approvals.requests.reject" onClick={() => handleDecision(selectedReq.id, 'rejected')} variant="danger"><XCircle className="h-3.5 w-3.5" /> Reject</PermButton>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {showNewRuleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewRuleModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Approval Rule</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Module *</label><input value={ruleForm.module} onChange={e => setRuleForm(f => ({ ...f, module: e.target.value }))} placeholder="e.g. purchasing" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Action *</label><input value={ruleForm.action} onChange={e => setRuleForm(f => ({ ...f, action: e.target.value }))} placeholder="e.g. confirm_po" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewRuleModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreateRule} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {showNewReqModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewReqModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">New Approval Request</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 mb-1.5 block">Label *</label><input value={reqForm.resource_label} onChange={e => setReqForm(f => ({ ...f, resource_label: e.target.value }))} placeholder="e.g. PO-00001 approval" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
              <div><label className="text-xs text-slate-400 mb-1.5 block">Module</label><input value={reqForm.module} onChange={e => setReqForm(f => ({ ...f, module: e.target.value }))} placeholder="e.g. purchasing" className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewReqModal(false)} className="px-4 py-2 text-sm text-slate-300 bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleCreateReq} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}