import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  LayoutGrid,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Boxes,
  AlertTriangle,
  Eye,
} from "lucide-react";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { ordersStore } from "../../utils/ordersStore";
import type { OrderType } from "../../utils/ordersStore";
import { inventoryStore, type InventoryItem } from "../../utils/inventoryStore";
import { useAuth } from "../../contexts/AuthContext";

const menuItems = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: <LayoutGrid className="w-5 h-5" />,
  },
  {
    label: "Clock-In & Timesheet",
    path: "/staff/timesheet",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    label: "Walk-in Transactions",
    path: "/staff/walk-in",
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    label: "Payment Verification",
    path: "/staff/payment-verification",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    label: "Orders",
    path: "/staff/queue",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Inventory",
    path: "/staff/inventory",
    icon: <Boxes className="w-5 h-5" />,
  },
];

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-lg bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center font-semibold text-xs flex-shrink-0">
      {initials}
    </div>
  );
};

const getStatusBadgeClass = (status: OrderType["status"]) => {
  switch (status) {
    case "completed":
      return "bg-[#E8F7D8] text-[#3B7A1E] border-[#55A630]/40";
    case "printing":
      return "bg-[#F0EAFE] text-[#6D28D9] border-[#7C3AED]/40";
    case "inQueue":
      return "bg-[#FFF5D6] text-[#92400E] border-[#F59E0B]/40";
    case "received":
      return "bg-[#F1F3F5] text-[#374151] border-[#6B7280]/40";
    case "onHold":
      return "bg-[#FFF0E6] text-[#C2410C] border-[#F97316]/40";
    case "released":
      return "bg-[#E0F7F5] text-[#0F766E] border-[#159A9C]/40";
    case "canceled":
      return "bg-[#FDE8E8] text-[#B91C1C] border-[#DC2626]/40";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusLabel = (status: OrderType["status"]) => {
  if (status === "inQueue") return "In Queue";
  if (status === "onHold") return "On Hold";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const timeAgo = (date?: Date): string => {
  if (!date) return "\u2014";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
};

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [allOrders, setAllOrders] = useState<OrderType[]>(() =>
    ordersStore.getOrders(),
  );
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() =>
    inventoryStore.getItems(),
  );

  useEffect(() => {
    setAllOrders(ordersStore.getOrders());
    setInventoryItems(inventoryStore.getItems());
    const unsubOrders = ordersStore.subscribe(() => {
      setAllOrders(ordersStore.getOrders());
    });
    const unsubInv = inventoryStore.subscribe(() => {
      setInventoryItems(inventoryStore.getItems());
    });
    return () => {
      unsubOrders();
      unsubInv();
    };
  }, []);

  const stats = useMemo(() => {
    const received = allOrders.filter((o) => o.status === "received").length;
    const inQueue = allOrders.filter((o) => o.status === "inQueue").length;
    const printing = allOrders.filter((o) => o.status === "printing").length;
    const completed = allOrders.filter((o) => o.status === "completed").length;
    const released = allOrders.filter((o) => o.status === "released").length;
    const onHold = allOrders.filter((o) => o.status === "onHold").length;
    const inProgress = received + inQueue + printing;
    const total = onHold + inProgress + completed + released;
    return {
      total,
      received,
      inQueue,
      printing,
      completed,
      released,
      onHold,
      inProgress,
    };
  }, [allOrders]);

  const attentionOrders = useMemo(() => {
    return [...allOrders]
      .filter(
        (o) =>
          o.status === "onHold" ||
          (o.status === "awaitingPayment" && !o.paymentVerified),
      )
      .sort(
        (a, b) =>
          (b.statusUpdatedAt ?? b.submittedAt).getTime() -
          (a.statusUpdatedAt ?? a.submittedAt).getTime(),
      )
      .slice(0, 5);
  }, [allOrders]);

  const activeOrders = useMemo(() => {
    return [...allOrders]
      .filter(
        (o) =>
          o.status === "received" ||
          o.status === "inQueue" ||
          o.status === "printing" ||
          o.status === "onHold",
      )
      .sort(
        (a, b) =>
          (b.statusUpdatedAt ?? b.submittedAt).getTime() -
          (a.statusUpdatedAt ?? a.submittedAt).getTime(),
      )
      .slice(0, 8);
  }, [allOrders]);

  const inventorySummary = useMemo(() => {
    const active = inventoryItems.filter((i) => !i.archived);
    const low = active.filter(
      (i) => inventoryStore.getInventoryStatus(i) === "low",
    );
    const out = active.filter(
      (i) => inventoryStore.getInventoryStatus(i) === "out",
    );
    return {
      total: active.length,
      low,
      out,
    };
  }, [inventoryItems]);

  const recentActivity = useMemo(() => {
    return [...allOrders]
      .filter(
        (o) =>
          o.status !== "canceled" &&
          (o.statusUpdatedAt ?? o.submittedAt),
      )
      .sort(
        (a, b) =>
          (b.statusUpdatedAt ?? b.submittedAt).getTime() -
          (a.statusUpdatedAt ?? a.submittedAt).getTime(),
      )
      .slice(0, 5);
  }, [allOrders]);

  return (
    <Layout menuItems={menuItems} title="Staff Dashboard">
      <div className="space-y-6 max-w-7xl mx-auto pb-10">

        {/* Welcome */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] || "Staff"}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's what needs your attention today.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: "Total Orders",
              value: stats.total,
              desc: "All active + completed",
              icon: Package,
              color: "text-[#1D73EC]",
              bg: "bg-blue-50",
            },
            {
              label: "On Hold",
              value: stats.onHold,
              desc: "Needs action",
              icon: AlertCircle,
              color: "text-orange-600",
              bg: "bg-orange-50",
            },
            {
              label: "In Progress",
              value: stats.inProgress,
              desc: `${stats.printing} printing \u00b7 ${stats.inQueue} queued`,
              icon: Clock,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Ready for Pickup",
              value: stats.completed,
              desc: "Awaiting collection",
              icon: CheckCircle,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((kpi) => (
            <Card
              key={kpi.label}
              onClick={() => navigate("/staff/queue")}
              className="p-4 sm:p-5 cursor-pointer border border-gray-100 bg-white hover:border-gray-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 leading-none mt-1">
                      {kpi.value}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-2">
                {kpi.desc}
              </p>
            </Card>
          ))}
        </div>

        {/* Orders Requiring Attention */}
        {attentionOrders.length > 0 && (
          <Card className="border border-orange-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Orders Requiring Attention
                </h2>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-semibold">
                  {attentionOrders.length}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => navigate("/staff/queue")}
                className="text-xs font-semibold text-[#1D73EC] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-50/50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Customer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attentionOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate("/staff/queue")}
                      className="hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 sm:px-6 py-3">
                        <span className="text-sm font-bold text-gray-900">
                          {order.id}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {order.customer}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <Badge
                          className={`text-[10px] font-semibold ${getStatusBadgeClass(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                          {order.holdReason
                            ? ` \u2014 ${order.holdReason}`
                            : ""}
                        </Badge>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="text-xs text-gray-500">
                          {timeAgo(
                            order.statusUpdatedAt ?? order.submittedAt,
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Active Orders Queue */}
        <Card className="border border-gray-100 bg-white overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Active Orders
            </h2>
            <button
              type="button"
              onClick={() => navigate("/staff/queue")}
              className="text-xs font-semibold text-[#1D73EC] hover:underline flex items-center gap-1"
            >
              View Full Queue
            </button>
          </div>
          <div className="overflow-x-auto">
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-600">
                  No active orders
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  All caught up!
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <table className="w-full hidden sm:table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {activeOrders.map((order, idx) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate("/staff/queue")}
                        className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                      >
                        <td className="px-4 sm:px-6 py-3">
                          <div className="w-7 h-7 rounded-full bg-[#1D73EC] text-white flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={order.customer} />
                            <span className="text-sm font-medium text-gray-900">
                              {order.customer}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <span className="text-sm font-medium text-gray-700">
                            {order.id}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium border-gray-200 bg-gray-50"
                          >
                            {order.type}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <Badge
                            className={`text-[10px] font-semibold ${getStatusBadgeClass(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${
                              order.orderSource === "online"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-gray-50 text-gray-600"
                            }`}
                          >
                            {order.orderSource === "online"
                              ? "Online"
                              : "Walk-in"}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-3">
                          <span className="text-xs text-gray-500">
                            {timeAgo(
                              order.statusUpdatedAt ?? order.submittedAt,
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile stacked list */}
                <div className="sm:hidden divide-y divide-gray-50">
                  {activeOrders.map((order, idx) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate("/staff/queue")}
                      className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#1D73EC] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">
                            {order.id}
                          </span>
                          <Badge
                            className={`text-[10px] font-semibold ${getStatusBadgeClass(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {order.customer} \u2022 {order.type}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium ${
                              order.orderSource === "online"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-gray-50 text-gray-600"
                            }`}
                          >
                            {order.orderSource === "online"
                              ? "Online"
                              : "Walk-in"}
                          </Badge>
                          <span className="text-[11px] text-gray-500">
                            {timeAgo(
                              order.statusUpdatedAt ?? order.submittedAt,
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Bottom Row: Inventory Status + Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          {/* Inventory Status */}
          <Card className="border border-gray-100 bg-white flex flex-col">
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Inventory Status
              </h2>
              <button
                type="button"
                onClick={() => navigate("/staff/inventory")}
                className="text-xs font-semibold text-[#1D73EC] hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                View Inventory
              </button>
            </div>
            <div className="p-4 sm:p-5 flex-1 flex flex-col">
              {/* Summary chips */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-gray-900">
                    {inventorySummary.total}
                  </span>
                  <span className="text-gray-500">Total</span>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-amber-600">
                    {inventorySummary.low.length}
                  </span>
                  <span className="text-gray-500">Low Stock</span>
                </div>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-bold text-red-600">
                    {inventorySummary.out.length}
                  </span>
                  <span className="text-gray-500">Out of Stock</span>
                </div>
              </div>

              {/* Problem items */}
              {inventorySummary.low.length === 0 &&
              inventorySummary.out.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-4">
                  <p className="text-sm text-gray-500">
                    All inventory levels are healthy.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...inventorySummary.out, ...inventorySummary.low]
                    .slice(0, 4)
                    .map((item) => {
                      const isOut =
                        inventoryStore.getInventoryStatus(item) === "out";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isOut ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {item.name}
                            </span>
                          </div>
                          <Badge
                            className={`text-[10px] font-semibold flex-shrink-0 ${
                              isOut
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {isOut ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-gray-100 bg-white flex flex-col">
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Recent Activity
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No recent activity
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentActivity.map((order) => (
                    <div
                      key={order.id}
                      className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate("/staff/queue")}
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-[#1D73EC]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">
                            {order.id}
                          </span>
                          <Badge
                            className={`text-[10px] font-semibold ${getStatusBadgeClass(order.status)}`}
                          >
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {order.customer} \u2022 {order.type}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {timeAgo(
                          order.statusUpdatedAt ?? order.submittedAt,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
