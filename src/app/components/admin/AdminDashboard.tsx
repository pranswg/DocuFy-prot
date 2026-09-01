import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Users,
  FileText,
  UserPlus,
  Briefcase,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Settings,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  Info,
  Eye,
  ShoppingCart,
  BarChart3,
  PieChart as PieChartIcon,
  DollarSign,
  Truck,
  Clock,
  ArrowRight,
  ChevronRight,
  Minus,
  AlertTriangle,
} from "lucide-react";
import Layout from "../Layout";
import { Card } from "../ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { dataStore, Order } from "../../utils/dataStore";
import { adminMenuItems } from "../../utils/adminMenuItems";
import { inventoryStore, InventoryItem } from "../../utils/inventoryStore";

// ─── helpers ──────────────────────────────────────────────────────────────────
const TABS = ["Overview", "Sales", "Services"] as const;
type Tab = (typeof TABS)[number];

const DATE_RANGES = [
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "this-quarter", label: "This Quarter" },
  { id: "this-year", label: "This Year" },
  { id: "all-time", label: "All Time" },
  { id: "custom", label: "Custom Range" },
] as const;

function parseTotal(order: Order): number {
  if (order.costBreakdown && typeof order.costBreakdown.total === "number")
    return order.costBreakdown.total;
  if (!order.total) return 0;
  const cleaned = String(order.total).replace(/[₱,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number): string {
  if (n >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₱${(n / 1000).toFixed(1)}K`;
  return fmt(n);
}

function fmtShortPlain(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-PH");
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = todayStart.getTime() - dDate.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  const timeStr = d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) return `${diffDays}d ago, ${timeStr}`;
  return `${d.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}, ${timeStr}`;
}

function getDateRange(id: string, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let start: Date;
  let end: Date;
  let label: string;

  switch (id) {
    case "last-month": {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      start = new Date(ly, lm, 1);
      end = new Date(ly, lm + 1, 0, 23, 59, 59, 999);
      label = `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
      break;
    }
    case "this-quarter": {
      const qStart = Math.floor(m / 3) * 3;
      start = new Date(y, qStart, 1);
      end = new Date(y, qStart + 3, 0, 23, 59, 59, 999);
      label = `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
      break;
    }
    case "this-year":
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
      label = `Jan 1, ${y} – Dec 31, ${y}`;
      break;
    case "all-time":
      start = new Date(2020, 0, 1);
      end = new Date(9999, 11, 31, 23, 59, 59, 999);
      label = "All Time";
      break;
    case "custom": {
      const s = customStart ? new Date(customStart) : new Date(y, m, 1);
      const e = customEnd ? new Date(customEnd + "T23:59:59") : new Date();
      start = s;
      end = e;
      label = `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
      break;
    }
    default: {
      // this-month
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      label = `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
      break;
    }
  }
  return { start, end, label };
}

function getPrevPeriod(range: { start: Date; end: Date }) {
  const ms = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - ms - 86400000),
    end: new Date(range.start.getTime() - 1),
  };
}

function ordersInRange(orders: Order[], range: { start: Date; end: Date }): Order[] {
  return orders.filter((o) => {
    const d = new Date(o.createdAt || o.date);
    return !isNaN(d.getTime()) && d >= range.start && d <= range.end;
  });
}

function totalSales(orders: Order[]): number {
  return orders.reduce((s, o) => s + (o.status !== "Canceled" ? parseTotal(o) : 0), 0);
}

const SERVICE_NAMES = ["Black & White Printing", "Colored Printing", "Photocopy", "School Supplies", "Others"] as const;

function deriveService(order: Order): string {
  const pt = (order.printType || "").toLowerCase();
  const cm = (order.colorMode || "").toLowerCase();
  if (cm === "bw" || pt.includes("bw") || pt.includes("black")) return "Black & White Printing";
  if (cm === "color" || pt.includes("color") || pt.includes("coloured")) return "Colored Printing";
  if (pt.includes("photocopy") || pt.includes("photo")) return "Photocopy";
  if (order.addons && order.addons.length > 0) return "School Supplies";
  return "Others";
}

const PIECE_COLORS = ["#2F6FD6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"];

// ─── types for metrics ────────────────────────────────────────────────────────
interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  walkInCount: number;
  activeCustomers: number;
  prevTotalSales: number;
  prevTotalOrders: number;
  prevWalkInCount: number;
  prevActiveCustomers: number;
  salesTrend: { name: string; sales: number }[];
  serviceStats: { name: string; count: number; revenue: number }[];
  paperStats: { name: string; count: number; total: number }[];
  recentOrders: Order[];
  // sales tab
  dailySales: { name: string; sales: number }[];
  weeklySales: { name: string; sales: number }[];
  monthlySales: { name: string; sales: number }[];
  highestMonth: { name: string; sales: number } | null;
  lowestMonth: { name: string; sales: number } | null;
}

function computeMetrics(orders: Order[], dateRange: { start: Date; end: Date }): DashboardMetrics {
  const filtered = ordersInRange(orders, dateRange);
  const prevRange = getPrevPeriod(dateRange);
  const prevFiltered = ordersInRange(orders, prevRange);

  const tSales = totalSales(filtered);
  const tOrders = filtered.length;
  const walkIns = filtered.filter((o) => o.orderSource === "walkin").length;
  const customers = new Set(filtered.filter((o) => o.customerEmail).map((o) => o.customerEmail)).size;

  const prevTSales = totalSales(prevFiltered);
  const prevTOrders = prevFiltered.length;
  const prevWalkIns = prevFiltered.filter((o) => o.orderSource === "walkin").length;
  const prevCustomers = new Set(prevFiltered.filter((o) => o.customerEmail).map((o) => o.customerEmail)).size;

  // sales trend: monthly aggregation over all orders
  const monthMap = new Map<string, number>();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const o of orders) {
    if (o.status === "Canceled") continue;
    const d = new Date(o.createdAt || o.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + parseTotal(o));
  }
  const sortedKeys = [...monthMap.keys()].sort();
  const last12 = sortedKeys.slice(-12);
  const salesTrend = last12.map((k) => {
    const [yr, mo] = k.split("-").map(Number);
    return { name: `${monthNames[mo]} ${yr}`, sales: monthMap.get(k) || 0 };
  });

  // service stats (within date range)
  const svcMap = new Map<string, { count: number; revenue: number }>();
  for (const o of filtered) {
    if (o.status === "Canceled") continue;
    const svc = deriveService(o);
    const prev = svcMap.get(svc) || { count: 0, revenue: 0 };
    prev.count += 1;
    prev.revenue += parseTotal(o);
    svcMap.set(svc, prev);
  }
  const serviceStats = SERVICE_NAMES.map((n) => ({
    name: n,
    count: svcMap.get(n)?.count || 0,
    revenue: svcMap.get(n)?.revenue || 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // paper stats
  const paperMap = new Map<string, number>();
  for (const o of filtered) {
    const ps = o.paperSize || "Unknown";
    paperMap.set(ps, (paperMap.get(ps) || 0) + 1);
  }
  const paperTotal = [...paperMap.values()].reduce((a, b) => a + b, 0);
  const paperStats = [...paperMap.entries()]
    .map(([name, count]) => ({ name, count, total: paperTotal }))
    .sort((a, b) => b.count - a.count);

  // recent orders
  const recentOrders = [...filtered].sort((a, b) => {
    const da = new Date(a.createdAt || a.date).getTime();
    const db = new Date(b.createdAt || b.date).getTime();
    return db - da;
  }).slice(0, 8);

  // daily sales (last 30 days of range)
  const dailyMap = new Map<string, number>();
  for (const o of filtered) {
    if (o.status === "Canceled") continue;
    const d = new Date(o.createdAt || o.date);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    dailyMap.set(key, (dailyMap.get(key) || 0) + parseTotal(o));
  }
  const dailySales = [...dailyMap.entries()].map(([name, sales]) => ({ name, sales }));

  // weekly aggregation
  const weeklyMap = new Map<string, number>();
  for (const o of filtered) {
    if (o.status === "Canceled") continue;
    const d = new Date(o.createdAt || o.date);
    if (isNaN(d.getTime())) continue;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    weeklyMap.set(key, (weeklyMap.get(key) || 0) + parseTotal(o));
  }
  const weeklySales = [...weeklyMap.entries()].map(([name, sales]) => ({ name, sales }));

  // monthly aggregation (for the selected range)
  const monthlyMap = new Map<string, number>();
  for (const o of filtered) {
    if (o.status === "Canceled") continue;
    const d = new Date(o.createdAt || o.date);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString("en-PH", { month: "short", year: "numeric" });
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + parseTotal(o));
  }
  const monthlySales = [...monthlyMap.entries()].map(([name, sales]) => ({ name, sales }));

  // highest / lowest months
  const monthEntries = monthlySales.filter((m) => m.sales > 0);
  const highestMonth = monthEntries.length > 0 ? monthEntries.reduce((a, b) => (a.sales > b.sales ? a : b)) : null;
  const lowestMonth = monthEntries.length > 0 ? monthEntries.reduce((a, b) => (a.sales < b.sales ? a : b)) : null;

  return {
    totalSales: tSales,
    totalOrders: tOrders,
    walkInCount: walkIns,
    activeCustomers: customers,
    prevTotalSales: prevTSales,
    prevTotalOrders: prevTOrders,
    prevWalkInCount: prevWalkIns,
    prevActiveCustomers: prevCustomers,
    salesTrend,
    serviceStats,
    paperStats,
    recentOrders,
    dailySales,
    weeklySales,
    monthlySales,
    highestMonth,
    lowestMonth,
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  iconBg: string;
  iconColor: string;
}) {
  const isUp = trend >= 0;
  return (
    <Card className="p-5 bg-white shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}>
            {isUp ? "↗" : "↘"} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-400">{trendLabel}</span>
        </div>
      </div>
    </Card>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  actionLabel,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-white shadow-sm border border-slate-100 ${className}`}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && actionLabel && (
          <button onClick={action} className="text-xs font-semibold text-[#2F6FD6] hover:underline flex items-center gap-1">
            {actionLabel} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="px-6 pb-5">{children}</div>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Icon className="w-10 h-10 mb-3 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

function TrendBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const isUp = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {isUp ? "↗" : "↘"} {Math.abs(value).toFixed(1)}%{suffix}
    </span>
  );
}

// ─── Inventory Snapshot ───────────────────────────────────────────────────────
function InventorySnapshot({ items, navigate }: { items: InventoryItem[]; navigate: ReturnType<typeof useNavigate> }) {
  const activeItems = items.filter((i) => !i.archived);
  const lowStockItems = activeItems.filter((i) => i.currentStock > 0 && i.currentStock <= i.minimumStock);
  const outOfStockItems = activeItems.filter((i) => i.currentStock === 0);
  const urgentItems = [...outOfStockItems, ...lowStockItems].slice(0, 5);

  return (
    <SectionCard
      title="Inventory Snapshot"
      subtitle="Quick visibility into stock levels"
      action={() => navigate("/admin/inventory")}
      actionLabel="View Inventory"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-medium text-slate-500">Total Items</p>
          <p className="text-2xl font-bold text-[#2F6FD6] mt-1">{activeItems.length}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-medium text-slate-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems.length}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs font-medium text-slate-500">Out of Stock Items</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockItems.length}</p>
        </div>
      </div>

      {urgentItems.length === 0 ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-700">All inventory levels are currently healthy.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Needs Attention</p>
          {urgentItems.map((item) => {
            const isOut = item.currentStock === 0;
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${isOut ? "text-red-500" : "text-amber-500"}`} />
                  <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${isOut ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                  {isOut ? "Out of Stock" : "Low Stock"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ metrics, navigate, items }: { metrics: DashboardMetrics; navigate: ReturnType<typeof useNavigate>; items: InventoryItem[] }) {
  const {
    totalSales, totalOrders, walkInCount, activeCustomers,
    prevTotalSales, prevTotalOrders, prevWalkInCount, prevActiveCustomers,
    salesTrend, serviceStats, paperStats, recentOrders,
  } = metrics;

  const salesTrendPct = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;
  const ordersTrendPct = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
  const walkInTrendPct = prevWalkInCount > 0 ? ((walkInCount - prevWalkInCount) / prevWalkInCount) * 100 : 0;
  const customerTrendPct = prevActiveCustomers > 0 ? ((activeCustomers - prevActiveCustomers) / prevActiveCustomers) * 100 : 0;

  const paperTotal = paperStats.reduce((s, p) => s + p.count, 0);
  const donutData = paperStats.slice(0, 5).map((p) => ({
    name: p.name,
    value: p.count,
    pct: paperTotal > 0 ? ((p.count / paperTotal) * 100).toFixed(1) : "0",
  }));

  const salesComparisonPct = prevTotalSales > 0 ? (totalSales / prevTotalSales) * 100 : 0;
  const salesDiff = totalSales - prevTotalSales;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Sales" value={fmtShort(totalSales)} trend={salesTrendPct} trendLabel="vs previous period" iconBg="bg-blue-50" iconColor="text-[#2F6FD6]" />
        <StatCard icon={Package} label="Total Orders" value={totalOrders.toLocaleString()} trend={ordersTrendPct} trendLabel="vs previous period" iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={ShoppingCart} label="Walk-in Transactions" value={walkInCount.toLocaleString()} trend={walkInTrendPct} trendLabel="vs previous period" iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard icon={Users} label="Active Customers" value={activeCustomers.toLocaleString()} trend={customerTrendPct} trendLabel="vs previous period" iconBg="bg-orange-50" iconColor="text-orange-500" />
      </div>

      {/* Sales Trend + Sales Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Sales Trend" subtitle="Monthly revenue overview" className="lg:col-span-2">
          {salesTrend.length === 0 ? (
            <EmptyState icon={TrendingUp} message="No sales data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2F6FD6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2F6FD6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: number) => fmtShortPlain(v)} />
                <Tooltip formatter={(v: number) => [fmt(v), "Sales"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="sales" stroke="#2F6FD6" strokeWidth={2.5} fill="url(#salesGradient)" dot={{ r: 4, fill: "#2F6FD6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Sales Comparison" subtitle="Current vs previous period">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">This Period</p>
              <p className="text-2xl font-bold text-slate-900">{fmtShort(totalSales)}</p>
              <TrendBadge value={salesTrendPct} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Previous Period</p>
              <p className="text-2xl font-bold text-slate-500">{fmtShort(prevTotalSales)}</p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="bg-[#2F6FD6] h-full rounded-full transition-all" style={{ width: `${Math.min(salesComparisonPct, 100)}%` }} />
            </div>
            {salesDiff !== 0 && (
              <p className="text-sm text-slate-600">
                {salesDiff > 0
                  ? <>You earned <span className="font-semibold text-green-600">{fmt(salesDiff)}</span> more than the previous period.</>
                  : <>You earned <span className="font-semibold text-red-500">{fmt(Math.abs(salesDiff))}</span> less than the previous period.</>
                }
              </p>
            )}
            {salesDiff === 0 && totalSales === 0 && prevTotalSales === 0 && (
              <p className="text-sm text-slate-400">No sales data available for comparison.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Best Selling + Top Paper Sizes + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Best Selling Services" subtitle="Ranked by revenue">
          {serviceStats.filter((s) => s.revenue > 0).length === 0 ? (
            <EmptyState icon={BarChart3} message="No service data yet" />
          ) : (
            <div className="space-y-3">
              {serviceStats.filter((s) => s.revenue > 0).slice(0, 5).map((svc, i) => (
                <div key={svc.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#2F6FD6]">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{svc.name}</p>
                    <p className="text-xs text-slate-400">{svc.count.toLocaleString()} orders</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 shrink-0">{fmt(svc.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top Used Paper Sizes" subtitle="Distribution by order count">
          {paperStats.length === 0 ? (
            <EmptyState icon={PieChartIcon} message="No paper data yet" />
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative" style={{ width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                      {donutData.map((_, idx) => (
                        <Cell key={idx} fill={PIECE_COLORS[idx % PIECE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Total</p>
                  <p className="text-xl font-bold text-slate-800">{paperTotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="w-full mt-3 space-y-1.5">
                {donutData.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIECE_COLORS[idx % PIECE_COLORS.length] }} />
                    <span className="text-slate-600 flex-1">{p.name}</span>
                    <span className="font-semibold text-slate-800">{p.value.toLocaleString()}</span>
                    <span className="text-slate-400 w-10 text-right">{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Transactions" action={() => navigate("/admin/orders")} actionLabel="View All">
          {recentOrders.length === 0 ? (
            <EmptyState icon={Clock} message="No transactions yet" />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => {
                const isPaid = o.status !== "Awaiting Payment" && o.status !== "Canceled";
                const isWalkIn = o.orderSource === "walkin";
                return (
                  <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50/80">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{o.id}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isWalkIn ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-[#2F6FD6]"}`}>
                          {isWalkIn ? "Walk-in" : "Print Order"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{o.customerName || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{fmt(parseTotal(o))}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPaid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Inventory Snapshot */}
      <InventorySnapshot items={items} navigate={navigate} />
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────
function SalesTab({ metrics }: { metrics: DashboardMetrics }) {
  const { dailySales, weeklySales, monthlySales, totalSales, highestMonth, lowestMonth } = metrics;
  const [salesView, setSalesView] = useState<"daily" | "weekly" | "monthly">("monthly");

  const chartData = salesView === "daily" ? dailySales : salesView === "weekly" ? weeklySales : monthlySales;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(totalSales)}</p>
        </Card>
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Highest Sales</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{highestMonth ? highestMonth.name : "—"}</p>
          {highestMonth && <p className="text-xs text-slate-500 mt-0.5">{fmt(highestMonth.sales)}</p>}
        </Card>
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Lowest Sales</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{lowestMonth ? lowestMonth.name : "—"}</p>
          {lowestMonth && <p className="text-xs text-slate-500 mt-0.5">{fmt(lowestMonth.sales)}</p>}
        </Card>
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Sales Periods</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{monthlySales.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">months with data</p>
        </Card>
      </div>

      {/* Sales chart */}
      <SectionCard
        title="Sales Trend"
        subtitle={salesView === "daily" ? "Daily sales" : salesView === "weekly" ? "Weekly sales" : "Monthly sales"}
      >
        <div className="flex items-center gap-2 mb-4">
          {(["daily", "weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setSalesView(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${salesView === v ? "bg-[#2F6FD6] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        {chartData.length === 0 ? (
          <EmptyState icon={TrendingUp} message="No sales data for this period" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6FD6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2F6FD6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: number) => fmtShortPlain(v)} />
              <Tooltip formatter={(v: number) => [fmt(v), "Sales"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Area type="monotone" dataKey="sales" stroke="#2F6FD6" strokeWidth={2.5} fill="url(#salesGrad2)" dot={{ r: 4, fill: "#2F6FD6", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab({ metrics }: { metrics: DashboardMetrics }) {
  const { serviceStats, totalOrders } = metrics;
  const activeServices = serviceStats.filter((s) => s.count > 0);
  const topService = activeServices.length > 0 ? activeServices[0] : null;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Most-Used Service</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{topService ? topService.name : "—"}</p>
          {topService && <p className="text-xs text-slate-500 mt-0.5">{topService.count.toLocaleString()} orders</p>}
        </Card>
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Best-Selling by Revenue</p>
          <p className="text-lg font-bold text-[#2F6FD6] mt-1">{topService ? topService.name : "—"}</p>
          {topService && <p className="text-xs text-slate-500 mt-0.5">{fmt(topService.revenue)}</p>}
        </Card>
        <Card className="p-5 bg-white shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase">Total Orders</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrders.toLocaleString()}</p>
        </Card>
      </div>

      {/* Service breakdown */}
      <SectionCard title="Service Breakdown" subtitle="Orders and revenue per service type">
        {activeServices.length === 0 ? (
          <EmptyState icon={BarChart3} message="No service data yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-500">Service</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500">Orders</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {activeServices.map((svc, i) => {
                  const totalRev = activeServices.reduce((s, x) => s + x.revenue, 0);
                  const pct = totalRev > 0 ? (svc.revenue / totalRev) * 100 : 0;
                  return (
                    <tr key={svc.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-[#2F6FD6]">{i + 1}</span>
                          {svc.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">{svc.count.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{fmt(svc.revenue)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Service chart */}
      {activeServices.length > 0 && (
        <SectionCard title="Revenue by Service" subtitle="Visual comparison">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activeServices} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: number) => fmtShortPlain(v)} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="revenue" fill="#2F6FD6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [dateRangeId, setDateRangeId] = useState("this-month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [orders, setOrders] = useState(dataStore.getOrders());
  const [inventoryItems, setInventoryItems] = useState(inventoryStore.getActiveItems());

  const dateRange = useMemo(() => getDateRange(dateRangeId, customStart, customEnd), [dateRangeId, customStart, customEnd]);

  useEffect(() => {
    const unsubOrders = dataStore.subscribe(() => setOrders(dataStore.getOrders()));
    const unsubInv = inventoryStore.subscribe(() => setInventoryItems(inventoryStore.getActiveItems()));
    return () => { unsubOrders(); unsubInv(); };
  }, []);

  const metrics = useMemo(() => computeMetrics(orders, dateRange), [orders, dateRange]);

  const selectedRangeLabel = DATE_RANGES.find((r) => r.id === dateRangeId)?.label || "This Month";

  return (
    <Layout menuItems={adminMenuItems} title="Admin Dashboard">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back, admin! Here's what's happening with Docufy today.</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-[#2F6FD6] transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-[#2F6FD6]" />
              <span>{selectedRangeLabel}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dateDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDateDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                  {DATE_RANGES.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => { setDateRangeId(range.id); if (range.id !== "custom") setDateDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${dateRangeId === range.id ? "bg-blue-50 text-[#2F6FD6] font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {range.label}
                    </button>
                  ))}
                  {dateRangeId === "custom" && (
                    <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 uppercase">From</label>
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#2F6FD6]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 uppercase">To</label>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#2F6FD6]" />
                      </div>
                      <button onClick={() => setDateDropdownOpen(false)} className="w-full py-1.5 bg-[#2F6FD6] text-white rounded-lg text-xs font-semibold hover:bg-[#1e5bb8]">Apply</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-0 -mb-px">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? "border-[#2F6FD6] text-[#2F6FD6]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "Overview" && <OverviewTab metrics={metrics} navigate={navigate} items={inventoryItems} />}
        {activeTab === "Sales" && <SalesTab metrics={metrics} />}
        {activeTab === "Services" && <ServicesTab metrics={metrics} />}
      </div>
    </Layout>
  );
}
