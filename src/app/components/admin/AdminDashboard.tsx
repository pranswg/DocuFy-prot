import React, { useState, useEffect } from "react";
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
} from "recharts";
import { dataStore } from "../../utils/dataStore";
import { adminMenuItems } from "../../utils/adminMenuItems";

const chartData = {
  Weekly: {
    sales: [],
    orders: [],
  },
  Yearly: {
    sales: [],
    orders: [],
  },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [salesTimeframe, setSalesTimeframe] = useState<"Weekly" | "Yearly">("Weekly");
  const [ordersTimeframe, setOrdersTimeframe] = useState<"Weekly" | "Yearly">("Weekly");
  const [stats, setStats] = useState(dataStore.getOrderStats());
  const activeStaffCount = 0;

  const EmptyChartState = ({ label }: { label: string }) => (
    <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400">
      <TrendingUp className="w-8 h-8 mb-3 text-[#2F6FD6]/35" />
      <p className="text-sm font-semibold text-slate-500">No {label.toLowerCase()} yet</p>
      <p className="text-xs mt-1">Activity will appear here once orders are recorded.</p>
    </div>
  );

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setStats(dataStore.getOrderStats());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <Layout menuItems={adminMenuItems} title="Admin Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
        {/* MAIN DASHBOARD CONTENT (Left) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Top Row: KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                id: "kpi-total",
                label: "Total Orders",
                val: stats.total,
                icon: Package,
                click: () => navigate("/admin/orders"),
                // total = onHold + inProgress + allCompleted — matches sum of the 3 status cards below
                desc: `${stats.onHold} on hold · ${stats.inProgress} in progress`,
              },
              {
                id: "kpi-hold",
                label: "On Hold",
                val: stats.onHold,
                icon: AlertCircle,
                click: () => navigate("/admin/orders"),
                desc: "Needs action",
              },
              {
                id: "kpi-progress",
                label: "In Progress",
                // received + inQueue + printing
                val: stats.inProgress,
                icon: TrendingUp,
                click: () => navigate("/admin/orders"),
                desc: `${stats.printing} printing · ${stats.inQueue} queued`,
              },
              {
                id: "kpi-completed",
                label: "Completed",
                // completed + released — all finished orders
                val: stats.allCompleted,
                icon: CheckCircle,
                click: () => navigate("/admin/orders"),
                desc: `${stats.released} released`,
              },
            ].map((kpi) => (
              <Card
                key={kpi.id}
                className="cursor-pointer border border-slate-100 bg-white p-5 shadow-sm transition-all group hover:-translate-y-0.5 hover:bg-[#2F6FD6] hover:text-white hover:shadow-md"
                onClick={kpi.click}
              >
                <div className="flex justify-between items-start">
                  <p className="text-base font-bold text-slate-700 group-hover:text-white">
                    {kpi.label}
                  </p>
                  <kpi.icon className="h-5 w-5 text-[#2F6FD6] opacity-50 transition-all group-hover:scale-110 group-hover:text-white group-hover:opacity-100" />
                </div>
                <p className="text-3xl font-bold text-slate-900 group-hover:text-white mt-2">
                  {kpi.val}
                </p>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 font-medium uppercase mt-1">
                  {kpi.desc}
                </p>
              </Card>
            ))}
          </div>

          {/* Middle Row: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5 bg-white shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Sales Trend
                </h3>
                <select
                  value={salesTimeframe}
                  onChange={(e) =>
                    setSalesTimeframe(e.target.value as any)
                  }
                  className="text-xs font-bold text-[#2F6FD6] bg-blue-50 rounded px-2 py-1 outline-none"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Yearly">Monthly</option>
                </select>
              </div>
              {chartData[salesTimeframe].sales.length === 0 ? <EmptyChartState label="sales" /> : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData[salesTimeframe].sales} key={`sales-chart-${salesTimeframe}`}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={true}
                    stroke="#f3f4f6"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#2F6FD6"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#2F6FD6",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>}
            </Card>

            <Card className="p-5 bg-white shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Order Volume
                </h3>
                <select
                  value={ordersTimeframe}
                  onChange={(e) =>
                    setOrdersTimeframe(e.target.value as any)
                  }
                  className="text-xs font-bold text-[#2F6FD6] bg-blue-50 rounded px-2 py-1 outline-none"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Yearly">Monthly</option>
                </select>
              </div>
              {chartData[ordersTimeframe].orders.length === 0 ? <EmptyChartState label="order volume" /> : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData[ordersTimeframe].orders} key={`orders-chart-${ordersTimeframe}`}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#f3f4f6"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip cursor={{ fill: "#f9fafb" }} />
                  <Bar
                    dataKey="orders"
                    fill="#2F6FD6"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>}
            </Card>
          </div>

          {/* Bottom Row: System Overview */}
          <Card className="p-6 bg-white shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              System Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Revenue",
                  val: "₱18.5K",
                  sub: "Monthly total",
                },
                {
                  label: "Active Staff",
                  val: activeStaffCount.toString(),
                  sub: "Currently on duty",
                },
                {
                  label: "Accounts",
                  val: "124",
                  sub: "Total customers",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-5 bg-slate-50 border border-slate-100 rounded-xl"
                >
                  <p className="text-xs text-slate-500 font-bold uppercase">
                    {item.label}
                  </p>
                  <p className="text-3xl font-bold text-[#2F6FD6] mt-2">
                    {item.val}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase">
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>
            </Card>
        </div>

        {/* SIDEBAR CONTENT (Right) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Actions Section */}
          <Card className="p-6 bg-white border border-slate-100 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {[
                {
                  id: "qa-pay",
                  label: "Verify Payments",
                  icon: CreditCard,
                  path: "/admin/payment-verification",
                },
                {
                  id: "qa-ord",
                  label: "View Orders",
                  icon: Package,
                  path: "/admin/orders",
                },
              ].map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-transparent rounded-xl hover:bg-[#2F6FD6] hover:text-white transition-all text-left group"
                >
                  <div className="p-2 bg-white rounded-lg group-hover:bg-blue-500 transition-colors">
                    <action.icon className="w-5 h-5 text-[#2F6FD6] group-hover:text-white" />
                  </div>
                  <span className="font-bold text-sm text-slate-800 group-hover:text-white">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      </Layout>
  );
}