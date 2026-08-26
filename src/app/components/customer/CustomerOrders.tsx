import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Package,
  X,
  Calendar,
  ChevronDown,
  Eye,
} from "lucide-react";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { dataStore, type Order } from "../../utils/dataStore";
import { useAuth } from "../../contexts/AuthContext";

const menuItems = [
  {
    label: "Dashboard",
    path: "/customer/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Print Request",
    path: "/customer/new-request",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    label: "My Orders",
    path: "/customer/orders",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Job Board",
    path: "/customer/job-board",
    icon: <Briefcase className="w-5 h-5" />,
  },
];

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Orders state ──────────────────────────────────────────────────
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    loadOrders();
    const unsubscribe = dataStore.subscribe(() => {
      loadOrders();
    });
    return unsubscribe;
  }, [user]);

  const loadOrders = () => {
    if (user?.email) {
      setOrders(dataStore.getOrdersByCustomer(user.email));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":   return "bg-blue-100 text-blue-700";
      case "Released":    return "bg-gray-100 text-gray-700";
      case "Printing":    return "bg-blue-100 text-blue-700";
      case "In Queue":    return "bg-yellow-100 text-yellow-700";
      case "On Hold":     return "bg-amber-100 text-amber-800";
      case "Received":    return "bg-purple-100 text-purple-700";
      case "Canceled":    return "bg-red-100 text-red-700";
      default:            return "bg-gray-100 text-gray-700";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      selectedStatus === "All" || order.status === selectedStatus;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.fileName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDateFrom = !dateFrom || order.date >= dateFrom;
    const matchesDateTo = !dateTo || order.date <= dateTo;
    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setSelectedStatus("All");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Layout menuItems={menuItems} title="My Orders" showBackButton>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">

        {/* ── Top Action Bar ─────────────────────────────────── */}
        <div className="flex items-center justify-end">
          <Button
            className="bg-[#2F6FD6] hover:bg-[#2557b8] text-white"
            onClick={() => navigate("/customer/new-request")}
          >
            Print Request
          </Button>
        </div>

        {/* ── Filters Card ───────────────────────────────────── */}
        <Card className="p-4 sm:p-6 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status */}
              <div className="hidden space-y-2 w-full sm:block sm:w-48">
                <Label
                  htmlFor="status-filter"
                  className="text-sm font-medium text-gray-700"
                >
                  Status
                </Label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2F6FD6] focus:border-transparent bg-white"
                >
                  <option value="All">All Status</option>
                  <option value="In Queue">🟡 In Queue</option>
                  <option value="Received">🟣 Received</option>
                  <option value="Printing">🔵 Printing</option>
                  <option value="Completed">🟢 Completed</option>
                  <option value="Released">⚪ Released</option>
                  <option value="On Hold">🟠 On Hold</option>
                  <option value="Canceled">🔴 Canceled</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowMoreFilters((isOpen) => !isOpen)}
                aria-expanded={showMoreFilters}
                className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#2F6FD6] sm:hidden"
              >
                {showMoreFilters ? "Show Less" : "See More"}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showMoreFilters ? "rotate-180" : ""}`} />
              </button>

              {/* Date From */}
              <div className={`space-y-2 w-full sm:w-48 ${showMoreFilters ? "" : "hidden sm:block"}`}>
                <Label
                  htmlFor="dateFrom"
                  className="text-sm font-medium text-gray-700"
                >
                  Date From
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className={`space-y-2 w-full sm:w-48 ${showMoreFilters ? "" : "hidden sm:block"}`}>
                <Label
                  htmlFor="dateTo"
                  className="text-sm font-medium text-gray-700"
                >
                  Date To
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search */}
              <div className={`space-y-2 flex-1 ${showMoreFilters ? "" : "hidden sm:block"}`}>
                <Label
                  htmlFor="search"
                  className="text-sm font-medium text-gray-700"
                >
                  Search
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Order ID or Document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="relative space-y-2 w-full sm:hidden">
                <Label htmlFor="mobile-status-filter">Status</Label>
                <button
                  id="mobile-status-filter"
                  type="button"
                  onClick={() => setShowStatusMenu((isOpen) => !isOpen)}
                  aria-expanded={showStatusMenu}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm"
                >
                  <span>{selectedStatus === "All" ? "All Status" : selectedStatus}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showStatusMenu ? "rotate-180" : ""}`} />
                </button>
                {showStatusMenu && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                    {["All", "In Queue", "Received", "Printing", "Completed", "Released", "On Hold", "Canceled"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(status);
                          setShowStatusMenu(false);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50 ${selectedStatus === status ? "bg-blue-50 font-semibold text-[#2F6FD6]" : "text-gray-700"}`}
                      >
                        {status === "All" ? "All Status" : status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Clear */}
              <div className={`flex items-end ${showMoreFilters ? "" : "hidden sm:flex"}`}>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {filteredOrders.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900">
                  {orders.length}
                </span>{" "}
                orders
              </p>
            </div>
          </div>
        </Card>

        {/* ── Orders Table ───────────────────────────────────── */}
        <Card className="p-6 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Order ID
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Document
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Status
                  </th>
                  <th className="hidden sm:table-cell text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Pages
                  </th>
                  <th className="hidden sm:table-cell text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Total
                  </th>
                  <th className="hidden sm:table-cell text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Date
                  </th>
                  <th className="hidden sm:table-cell text-left py-4 px-4 text-sm font-medium text-gray-700">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center text-sm text-gray-400"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer border-b hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/customer/track/${order.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/customer/track/${order.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        <div className="flex min-w-0 items-center gap-2">
                          <Eye className="h-5 w-5 shrink-0 text-[#1D73EC]" aria-hidden="true" />
                          <span className="max-w-[8rem] truncate sm:max-w-none">{order.fileName || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`${getStatusColor(order.status)} font-medium`}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="hidden sm:table-cell py-4 px-4 text-sm text-gray-600">
                        {order.pages || 0}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-4 text-sm font-medium text-gray-900">
                        {order.total}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-4 text-sm text-gray-600">
                        {new Date(order.date).toLocaleDateString()}
                      </td>
                      <td className="hidden sm:table-cell py-4 px-4 text-sm text-gray-600">
                        {new Date(order.date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </Layout>
  );
}