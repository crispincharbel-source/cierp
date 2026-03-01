import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { downloadPDF } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Plus, CheckCircle, DollarSign, Users, TrendingUp, Calculator } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATE_COLOR: Record<string,string> = {
  draft: "secondary", confirmed: "default", paid: "outline"
};

interface PayrollEntry {
  id: string; employee_name: string; period_label: string;
  gross_pay: number; net_pay: number; nssf_employee: number;
  income_tax: number; state: string; currency: string;
  total_deductions: number; total_employer_contribution: number;
}

export default function PayrollModule() {
  const { toast } = useToast();
  const now = new Date();
  const [year,  setYear]    = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const [form, setForm] = useState({
    employee_id: "", basic_salary: "", cost_of_living: "", transport_allowance: "",
    housing_allowance: "", meal_allowance: "", phone_allowance: "",
    overtime_amount: "", bonus: "", other_allowances: "",
    absence_deduction: "", advance_deduction: "", other_deductions: "",
    currency: "USD", usd_to_lbp_rate: "89500", working_days: "22", absent_days: "0",
  });

  async function load() {
    setLoading(true);
    try {
      const [ent, sum] = await Promise.all([
        api.get<any>(`/payroll/entries?year=${year}&month=${month}&limit=100`),
        api.get<any>(`/payroll/summary?year=${year}&month=${month}`),
      ]);
      setEntries(ent.entries || []);
      setSummary(sum);
    } catch (e: any) {
      toast({ title: "Error", description: e.detail || "Load failed", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function loadEmployees() {
    try {
      const r = await api.get<any>("/hr/employees?limit=200");
      setEmployees(r.employees || []);
    } catch {}
  }

  useEffect(() => { load(); }, [year, month]);
  useEffect(() => { loadEmployees(); }, []);

  async function createEntry() {
    try {
      const payload = {
        ...form,
        period_year: year,
        period_month: month,
        basic_salary: parseFloat(form.basic_salary) || 0,
        cost_of_living: parseFloat(form.cost_of_living) || 0,
        transport_allowance: parseFloat(form.transport_allowance) || 0,
        housing_allowance: parseFloat(form.housing_allowance) || 0,
        meal_allowance: parseFloat(form.meal_allowance) || 0,
        phone_allowance: parseFloat(form.phone_allowance) || 0,
        overtime_amount: parseFloat(form.overtime_amount) || 0,
        bonus: parseFloat(form.bonus) || 0,
        other_allowances: parseFloat(form.other_allowances) || 0,
        absence_deduction: parseFloat(form.absence_deduction) || 0,
        advance_deduction: parseFloat(form.advance_deduction) || 0,
        other_deductions: parseFloat(form.other_deductions) || 0,
        usd_to_lbp_rate: parseFloat(form.usd_to_lbp_rate) || 89500,
        working_days: parseInt(form.working_days) || 22,
        absent_days: parseInt(form.absent_days) || 0,
      };
      await api.post("/payroll/entries", payload);
      toast({ title: "Payroll entry created" });
      setShowCreate(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.detail || "Create failed", variant: "destructive" });
    }
  }

  async function confirmEntry(id: string) {
    try {
      await api.patch(`/payroll/entries/${id}/confirm`, {});
      toast({ title: "Entry confirmed" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.detail, variant: "destructive" });
    }
  }

  async function markPaid(id: string) {
    try {
      await api.patch(`/payroll/entries/${id}/mark-paid`, {});
      toast({ title: "Marked as paid" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.detail, variant: "destructive" });
    }
  }

  function fmt(n: number) { return (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Payroll</h1>
          <p className="text-slate-500 text-sm mt-1">Lebanese NSSF & income tax compliant</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800"><Plus className="w-4 h-4 mr-2"/>Create Payslip</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Payroll Entry — {MONTHS[month-1]} {year}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Employee *</Label>
                <Select value={form.employee_id} onValueChange={v => setForm(f => ({...f, employee_id: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select employee"/></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {[
                ["basic_salary","Basic Salary"],["cost_of_living","Cost of Living (COLA)"],
                ["transport_allowance","Transport Allowance"],["housing_allowance","Housing"],
                ["meal_allowance","Meal Allowance"],["phone_allowance","Phone Allowance"],
                ["overtime_amount","Overtime Amount"],["bonus","Bonus"],
                ["other_allowances","Other Allowances"],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input type="number" value={(form as any)[key]}
                    onChange={e => setForm(f => ({...f, [key]: e.target.value}))} placeholder="0.00"/>
                </div>
              ))}
              <div className="col-span-2 border-t pt-3"><p className="text-sm font-semibold text-red-600 mb-2">Deductions</p></div>
              {[
                ["absence_deduction","Absence Deduction"],["advance_deduction","Advance Recovery"],
                ["other_deductions","Other Deductions"],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input type="number" value={(form as any)[key]}
                    onChange={e => setForm(f => ({...f, [key]: e.target.value}))} placeholder="0.00"/>
                </div>
              ))}
              <div className="col-span-2 border-t pt-3"><p className="text-sm font-semibold mb-2">Settings</p></div>
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({...f, currency: v}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="LBP">LBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>USD → LBP Rate</Label>
                <Input value={form.usd_to_lbp_rate} onChange={e => setForm(f => ({...f, usd_to_lbp_rate: e.target.value}))}/>
              </div>
              <div>
                <Label>Working Days</Label>
                <Input type="number" value={form.working_days} onChange={e => setForm(f => ({...f, working_days: e.target.value}))}/>
              </div>
              <div>
                <Label>Absent Days</Label>
                <Input type="number" value={form.absent_days} onChange={e => setForm(f => ({...f, absent_days: e.target.value}))}/>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={createEntry} className="bg-blue-900 hover:bg-blue-800">
                  <Calculator className="w-4 h-4 mr-2"/>Compute & Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Period selector */}
      <div className="flex gap-3 items-center">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue/></SelectTrigger>
          <SelectContent>{MONTHS.map((m,i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
          <SelectContent>{[2023,2024,2025,2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Employees", value: summary.employee_count, icon: Users, color: "text-blue-600" },
            { label: "Total Gross", value: `$${fmt(summary.total_gross)}`, icon: TrendingUp, color: "text-green-600" },
            { label: "Total Net Pay", value: `$${fmt(summary.total_net)}`, icon: DollarSign, color: "text-blue-900" },
            { label: "NSSF + Tax", value: `$${fmt(summary.total_nssf_employee + summary.total_income_tax)}`, icon: Calculator, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 flex items-center gap-3">
                <Icon className={`w-8 h-8 ${color}`}/>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Entries table */}
      <Card>
        <CardHeader><CardTitle>Payroll Entries — {MONTHS[month-1]} {year}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No entries for this period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {["Employee","Gross","Deductions","Net Pay","NSSF","Tax","State","Actions"].map(h => (
                      <th key={h} className="text-left p-3 font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium">{e.employee_name}</td>
                      <td className="p-3 text-green-700 font-semibold">{e.currency} {fmt(e.gross_pay)}</td>
                      <td className="p-3 text-red-600">({fmt(e.total_deductions)})</td>
                      <td className="p-3 text-blue-900 font-bold">{e.currency} {fmt(e.net_pay)}</td>
                      <td className="p-3 text-slate-600">{fmt(e.nssf_employee)}</td>
                      <td className="p-3 text-slate-600">{fmt(e.income_tax)}</td>
                      <td className="p-3">
                        <Badge variant={STATE_COLOR[e.state] as any}>{e.state}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {e.state === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => confirmEntry(e.id)}
                              className="text-green-600 border-green-200 hover:bg-green-50">
                              <CheckCircle className="w-3 h-3 mr-1"/>Confirm
                            </Button>
                          )}
                          {e.state === "confirmed" && (
                            <Button size="sm" variant="outline" onClick={() => markPaid(e.id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50">
                              <DollarSign className="w-3 h-3 mr-1"/>Paid
                            </Button>
                          )}
                          <Button size="sm" variant="ghost"
                            onClick={() => downloadPDF(`/reports/pdf/payslip/${e.id}`, `payslip_${e.employee_name}_${e.period_label}.pdf`)}>
                            <FileDown className="w-3 h-3 mr-1"/>PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
