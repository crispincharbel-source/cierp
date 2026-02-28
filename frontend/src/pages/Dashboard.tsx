import React, { useEffect, useState } from "react";
import { getDashboardKPIs, type DashboardKPIs } from "@/lib/store";
import { KPICard } from "@/components/Layout";
import { ShoppingCart, TrendingUp, Users, Headset } from 'lucide-react';

export default function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      // local in-memory KPIs for now (UI-first). Later replace with backend KPIs endpoint.
      const data = await getDashboardKPIs();
      setKpis(data);
    };
    fetchKpis();
  }, []);

  if (!kpis) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Total Orders" value={kpis.total_orders} icon={ShoppingCart} color="blue" />
        <KPICard label="Active Orders" value={kpis.active_orders} icon={TrendingUp} color="amber" />
        <KPICard label="Customers" value={kpis.total_customers} icon={Users} color="green" />
        <KPICard label="Open Tickets" value={kpis.open_tickets} icon={Headset} color="purple" />
      </div>
    </div>
  );
}
