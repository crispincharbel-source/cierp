import React, { useState, useEffect } from "react";
import { api, downloadPDF } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, FileDown, Box, Layers, Printer, Truck, Factory, Scissors, Package, ChevronDown, ChevronUp } from "lucide-react";

const TAB_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  cutting:              { label: "Cutting",              icon: Scissors },
  lamination:           { label: "Lamination",           icon: Layers },
  printing:             { label: "Printing",             icon: Printer },
  warehouseToDispatch:  { label: "Warehouse → Dispatch", icon: Package },
  dispatchToProduction: { label: "Dispatch → Production",icon: Truck },
  extruder:             { label: "Extruder",             icon: Factory },
  rawSlitting:          { label: "Raw Slitting",         icon: Scissors },
  pvc:                  { label: "PVC",                  icon: Box },
  slitting:             { label: "Slitting",             icon: Scissors },
};

function DataCard({ section, data }: { section: string; data: any[] }) {
  const [open, setOpen] = useState(true);
  const meta = TAB_LABELS[section] || { label: section, icon: Box };
  const Icon = meta.icon;
  if (!data || data.length === 0) return null;
  const keys = Object.keys(data[0]).filter(k => !["id","tenant_id","is_deleted","created_at","updated_at"].includes(k));

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-900"/>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            <Badge variant="secondary">{data.length} record{data.length !== 1 ? "s" : ""}</Badge>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-900 text-white">
                {keys.map(k => <th key={k} className="px-3 py-2 text-left whitespace-nowrap font-medium">{k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                  {keys.map(k => (
                    <td key={k} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {row[k] == null ? <span className="text-slate-300">—</span> :
                        typeof row[k] === "number" ? row[k].toLocaleString() : String(row[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}

export default function OrderTrackingModule() {
  const { toast } = useToast();
  const [query,     setQuery]     = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [results,   setResults]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [searching, setSearching] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true); setOrderData(null);
    try {
      const r = await api.get<any>(`/order-tracking/track/${encodeURIComponent(query.trim())}`);
      setOrderData(r.orderData);
    } catch (e: any) {
      toast({ title: "Order not found", description: e.detail || "No data for this order.", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function suggest(val: string) {
    setQuery(val);
    if (val.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await api.get<any>(`/order-tracking/search?query=${encodeURIComponent(val)}`);
      setResults(r.results || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  const activeSections = orderData
    ? Object.keys(TAB_LABELS).filter(k => orderData[k] && orderData[k].length > 0)
    : [];

  const totalRecords = activeSections.reduce((sum, k) => sum + (orderData?.[k]?.length || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Order Tracking</h1>
        <p className="text-slate-500 text-sm mt-1">Track production orders across all manufacturing stages</p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-3 items-start">
            <div className="relative flex-1">
              <Input
                value={query}
                onChange={e => suggest(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Enter order number…"
                className="pr-10"
              />
              {searching && (
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 animate-pulse">searching…</span>
              )}
              {results.length > 0 && query.length >= 2 && !orderData && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {results.map((r, i) => (
                    <button key={i} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex items-center justify-between"
                      onClick={() => { setQuery(r.order_number); setResults([]); }}>
                      <span className="font-medium">{r.order_number}</span>
                      <div className="flex gap-1">
                        {(r.sources || []).slice(0, 3).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={search} disabled={loading || !query.trim()} className="bg-blue-900 hover:bg-blue-800">
              <Search className="w-4 h-4 mr-2"/>
              {loading ? "Searching…" : "Track Order"}
            </Button>
            {orderData && (
              <Button variant="outline" onClick={() => downloadPDF(
                `/reports/pdf/order/${encodeURIComponent(orderData.orderNumber)}`,
                `order_${orderData.orderNumber}.pdf`
              )}>
                <FileDown className="w-4 h-4 mr-2"/>Export PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {orderData && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Order: {orderData.orderNumber}</h2>
            <Badge className="bg-blue-900">{activeSections.length} stages</Badge>
            <Badge variant="secondary">{totalRecords} records total</Badge>
          </div>
          {activeSections.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-slate-500 py-12">No production data found for this order.</CardContent></Card>
          ) : (
            activeSections.map(section => (
              <DataCard key={section} section={section} data={orderData[section]}/>
            ))
          )}
        </div>
      )}

      {!orderData && !loading && (
        <Card>
          <CardContent className="pt-6 text-center py-16 text-slate-400">
            <Factory className="w-16 h-16 mx-auto mb-4 opacity-30"/>
            <p className="text-lg font-medium">Enter an order number to start tracking</p>
            <p className="text-sm mt-1">Data spans: Cutting, Lamination, Printing, Extruder, Slitting, and more</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
