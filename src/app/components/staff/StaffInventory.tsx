import React, { useState, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  FileText,
  LayoutDashboard,
  Clock,
  Package,
  ShoppingCart,
  CreditCard,
  Bell,
} from "lucide-react";
import Layout from "../Layout";
import {
  inventoryStore,
  type InventoryItem,
} from "../../utils/inventoryStore";
import { formatNumber } from "../../utils/formatNumber";
import { Card } from "../ui/card";

const staffMenuItems = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Clock-In & Timesheet",
    path: "/staff/timesheet",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    label: "Orders",
    path: "/staff/queue",
    icon: <Package className="w-5 h-5" />,
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
    label: "Inventory",
    path: "/staff/inventory",
    icon: <Boxes className="w-5 h-5" />,
  },
  {
    label: "Notifications",
    path: "/staff/notifications",
    icon: <Bell className="w-5 h-5" />,
  },
];

export default function StaffInventory() {
  const [items, setItems] = useState<InventoryItem[]>(inventoryStore.getActiveItems());
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    const load = () => setItems(inventoryStore.getActiveItems());
    load();
    const unsubscribe = inventoryStore.subscribe(load);
    return unsubscribe;
  }, []);

  const lowStockItems = items.filter(
    (i) => inventoryStore.getInventoryStatus(i) === "low",
  );
  const outOfStockItems = items.filter(
    (i) => inventoryStore.getInventoryStatus(i) === "out",
  );
  const paperItems = items.filter((i) => i.category === "Paper");
  const totalPieces = paperItems.reduce(
    (sum, i) => sum + inventoryStore.getItemPieces(i),
    0,
  );

  const filtered = filter === "all"
    ? items
    : filter === "low"
      ? lowStockItems
      : outOfStockItems;

  return (
    <Layout menuItems={staffMenuItems} title="Inventory">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#10316B]">Inventory</h2>
              <p className="text-gray-600 mt-1">
                Read-only stock levels and material availability.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-medium text-slate-500">Total Items</p>
            <p className="text-2xl font-bold text-[#2F6FD6] mt-1">{items.length}</p>
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

        {paperItems.length > 0 && (
          <Card className="p-4 flex items-center gap-3 bg-blue-50 rounded-xl border border-blue-100">
            <FileText className="w-6 h-6 text-[#2F6FD6]" />
            <div>
              <p className="text-sm font-medium text-slate-700 text-[#2F6FD6]">
                {formatNumber(totalPieces, 0)} pcs of paper left
              </p>
              <p className="text-sm text-slate-500">
                Across {paperItems.length} paper item{paperItems.length === 1 ? "" : "s"} (1 ream = 500 pcs).
              </p>
            </div>
          </Card>
        )}

        {items.length === 0 ? (
          <Card className="p-16 text-center">
            <div className="w-16 h-16 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Boxes className="w-8 h-8 text-[#1D73EC]/40" />
            </div>
            <p className="text-gray-600 font-medium">No inventory items yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Inventory items managed by the administrator will appear here.
            </p>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  filter === "all"
                    ? "bg-[#2F6FD6] text-white"
                    : "bg-gray-100 text-slate-600 hover:bg-[#F2F7FF]"
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("low")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  filter === "low"
                    ? "bg-[#2F6FD6] text-white"
                    : "bg-gray-100 text-slate-600 hover:bg-[#F2F7FF]"
                }`}
              >
                Low Stock ({lowStockItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("out")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  filter === "out"
                    ? "bg-[#2F6FD6] text-white"
                    : "bg-gray-100 text-slate-600 hover:bg-[#F2F7FF]"
                }`}
              >
                Out of Stock ({outOfStockItems.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400 uppercase text-[11px] tracking-wide">
                      Item
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400 uppercase text-[11px] tracking-wide">
                      Category
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400 uppercase text-[11px] tracking-wide">
                      Stock
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400 uppercase text-[11px] tracking-wide">
                      Min
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400 uppercase text-[11px] tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const status = inventoryStore.getInventoryStatus(item);
                    const isOut = status === "out";
                    const isLow = status === "low";
                    return (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-[#F2F7FF]/50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {item.name}
                          {item.brand && (
                            <span className="text-slate-400 text-xs ml-1">({item.brand})</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {item.category === "Paper"
                            ? <>{item.category} {item.paperSize}</>
                            : item.category}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {formatNumber(inventoryStore.getItemPieces(item), 0)} pcs
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {formatNumber(item.minimumStock * (item.pcsPerUnit || 1), 0)} pcs
                        </td>
                        <td className="px-4 py-2.5">
                          {isOut ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                              In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No inventory items match the current filter.</p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}