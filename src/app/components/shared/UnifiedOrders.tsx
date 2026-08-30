import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Kanban,
  LayoutDashboard,
  ShoppingCart,
  User,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Package,
  LayoutGrid,
  Users,
  UserPlus,
  Briefcase,
  File,
  Settings,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import StaffTimeInGate from "./StaffTimeInGate";
import { ordersStore } from "../../utils/ordersStore";
import { notificationStore } from "../../utils/notificationStore";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { FileAttachments } from "../ui/file-attachments";
import { generateInvoiceData, generateInvoiceHTML, InvoiceData } from "../../utils/invoiceUtils";
import { pricingStore } from "../../utils/pricingStore";
import { ORDER_STATUS_STYLES, getStatusBadgeClasses } from "../../utils/orderStatusPalette";

// Fallback estimate when an order has no stored cost breakdown, using the
// shared centralized pricing so admin/staff estimates stay in lockstep.
function fallbackPrintTotal(pages: number, copies: number, type: string): number {
  const pricing = pricingStore.getPricing();
  return (
    pages *
    copies *
    (type === 'Colored' ? pricing.colorHigh : pricing.bw)
  );
}

type OrderType = {
  id: string;
  customer: string;
  pages: number;
  type: string;
  notes: string;
  status:
    | "received"
    | "inQueue"
    | "printing"
    | "completed"
    | "released"
    | "canceled"
    | "onHold";
  time: string;
  paperSize: string;
  copies: number;
  submittedAt: Date;
  holdReason?: string;
  attachedFiles?: {
    name: string;
    size: string;
    type: string;
    url?: string;
  }[];
  paymentVerified?: boolean;
  paymentReferenceNumber?: string;
  orderSource: "online" | "walkin";
  orientation?: "portrait" | "landscape";
  twoSided?: "yes" | "no";
  pagesPerSheet?: "1" | "2" | "4";
  margins?: string;
  scale?: string;
  customScale?: number;
  colorMode?: "bw" | "color";
  pageRange?: "all" | "specific";
  specificPages?: string;
  addons?: { name: string; quantity: number; price: number }[];
  costBreakdown?: {
    printingCost: number;
    addonsCost: number;
    total: number;
  };
  statusUpdatedAt?: Date;
  createdAt?: Date;
  lastUpdatedAt?: Date;
};


const initialOrders: OrderType[] = [];

// Avatar component for initials
const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-blue-100 text-blue-700",
    "bg-blue-100 text-blue-700",
    "bg-blue-50 text-blue-700",
    "bg-[#F2F7FF] text-[#1D73EC]",
    "bg-blue-200 text-blue-800",
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm ${colors[colorIndex]}`}
    >
      {initials}
    </div>
  );
};

interface UnifiedOrdersProps {
  menuItems: Array<{
    label: string;
    path: string;
    icon: React.ReactNode;
  }>;
  userRole: "admin" | "staff";
}

export default function UnifiedOrders({ menuItems, userRole }: UnifiedOrdersProps) {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] =
    useState<OrderType | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(
    null,
  );
  const [sortDirection, setSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    | "received"
    | "inQueue"
    | "printing"
    | "completed"
    | "released"
    | "canceled"
    | "onHold"
    | null
  >(null);
  const [statusFormData, setStatusFormData] = useState({
    estimatedTime: "",
    completionTime: "",
    releaseRecipient: "",
    releaseIdNumber: "",
    cancellationReason: "",
    holdReason: "",
  });
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Live clock + date (Philippine time, UTC+8) for the Orders header
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pinTime = (d: Date) =>
    new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const phTime = pinTime(now);
  const headerTime = phTime.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const headerDate = phTime.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Initialize and subscribe to orders store
  useEffect(() => {
    // Initialize store with initial orders if empty
    if (ordersStore.getOrders().length === 0) {
      ordersStore.setOrders(initialOrders);
    }
    setOrders(ordersStore.getOrders());

    // Subscribe to changes
    const unsubscribe = ordersStore.subscribe(() => {
      setOrders(ordersStore.getOrders());
    });

    return unsubscribe;
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(
        sortDirection === "asc" ? "desc" : "asc",
      );
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleOpenDetails = (order: OrderType) => {
    setSelectedOrder(order);
    setShowDialog(true);

    // Generate invoice data if order is completed or released
    if (order.status === 'completed' || order.status === 'released') {
      try {
        const invoice = generateInvoiceData({
          ...order,
          id: order.id,
          customerName: order.customer,
          date: order.submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          fileName: order.attachedFiles?.[0]?.name || 'document.pdf',
          status: order.status === 'completed' ? 'Completed' : order.status === 'released' ? 'Released' : order.status,
          total: `₱${((order.costBreakdown?.total || fallbackPrintTotal(order.pages, order.copies, order.type))).toFixed(2)}`,
          printType: order.type,
          paymentMethod: order.orderSource === 'walkin' ? 'Cash' : 'GCash',
          paymentVerified: order.paymentVerified || false,
          colorMode: order.colorMode || (order.type === 'Colored' ? 'colored' : 'bw'),
        });
        setInvoiceData(invoice);
      } catch (error) {
        console.error('Error generating invoice:', error);
        setInvoiceData(null);
      }
    } else {
      setInvoiceData(null);
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoiceData) {
      toast.error("Invoice data is not available");
      return;
    }

    const invoiceContent = generateInvoiceHTML(invoiceData);
    const blob = new Blob([invoiceContent], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice-${invoiceData.orderId}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Invoice downloaded successfully!");
  };

  const handleUpdateStatus = (
    newStatus:
      | "received"
      | "inQueue"
      | "printing"
      | "completed"
      | "released"
      | "canceled"
      | "onHold",
  ) => {
    if (!selectedOrder) return;

    // PAYMENT VERIFICATION LOGIC - System-wide restriction
    // Orders with unverified payment can only move to: Received, On Hold, or Canceled
    // Once in "In Queue" to "Released", payment MUST be verified
    const hasUnverifiedPayment = selectedOrder.paymentReferenceNumber && !selectedOrder.paymentVerified;

    // Check if trying to move to a status that requires payment verification
    const progressStatuses = ["inQueue", "printing", "completed", "released"];
    const isMovingToProgress = progressStatuses.includes(newStatus);

    if (hasUnverifiedPayment && isMovingToProgress) {
      setErrorMessage(
        "Payment verification is pending. This order can only be set to 'Received', 'On Hold', or 'Canceled' until payment is verified by Admin or Staff.",
      );
      return;
    }

    // Additional check: if order is already in progress statuses, payment must be verified
    const currentIsInProgress = progressStatuses.includes(selectedOrder.status);
    if (currentIsInProgress && !selectedOrder.paymentVerified) {
      // This shouldn't happen, but if it does, restrict further progress
      if (isMovingToProgress && newStatus !== selectedOrder.status) {
        setErrorMessage(
          "Payment must be verified before changing status. Please verify payment in the Payment Verification page.",
        );
        return;
      }
    }

    // Validation check before showing form (skip for completed->released and canceled/onHold)
    if (
      newStatus !== "canceled" &&
      newStatus !== "onHold" &&
      !(
        selectedOrder.status === "completed" &&
        newStatus === "released"
      )
    ) {
      const sortedOrders = [...queueOrders].sort(
        (a, b) =>
          a.submittedAt.getTime() - b.submittedAt.getTime(),
      );
      const currentOrderIndex = sortedOrders.findIndex(
        (o) => o.id === selectedOrder.id,
      );
      const earlierOrders = sortedOrders.slice(
        0,
        currentOrderIndex,
      );

      const statusHierarchy: Record<string, number> = {
        received: 1,
        inQueue: 2,
        printing: 3,
        completed: 4,
        released: 5,
        canceled: 0,
        onHold: 0,
      };

      const newStatusLevel = statusHierarchy[newStatus];

      for (const earlierOrder of earlierOrders) {
        // SKIP ON HOLD ORDERS - They should be bypassed in queue validation
        if (earlierOrder.status === "canceled" || earlierOrder.status === "onHold") continue;

        const earlierStatusLevel =
          statusHierarchy[earlierOrder.status];

        if (earlierStatusLevel < newStatusLevel) {
          const earlierOrderPosition =
            sortedOrders.findIndex(
              (o) => o.id === earlierOrder.id,
            ) + 1;
          const currentOrderPosition = currentOrderIndex + 1;

          setErrorMessage(
            `Cannot update to "${newStatus === "inQueue" ? "In Queue" : newStatus}". Order #${currentOrderPosition} (${selectedOrder.customer}) cannot skip ahead of Order #${earlierOrderPosition} (${earlierOrder.customer}) who is still in "${earlierOrder.status === "inQueue" ? "In Queue" : earlierOrder.status}" status. Please process orders in sequence.`,
          );
          return;
        }
      }
    }

    // Auto-populate date/time fields with current date and time
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDateTime = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format

    setStatusFormData({
      estimatedTime: currentTime,
      completionTime: currentDateTime,
      releaseRecipient:
        newStatus === "released" ? selectedOrder.customer : "",
      releaseIdNumber:
        newStatus === "released" ? selectedOrder.id : "",
      cancellationReason: "",
      holdReason: "",
    });

    // Show form for status update
    setPendingStatus(newStatus);
    setShowStatusForm(true);
    setErrorMessage("");
  };

  const confirmStatusUpdate = () => {
    if (!selectedOrder || !pendingStatus) return;

    // Update the status with form data (including hold reason if applicable)
    const updatedOrders = orders.map((o) =>
      o.id === selectedOrder.id
        ? {
            ...o,
            status: pendingStatus,
            holdReason:
              pendingStatus === "onHold"
                ? statusFormData.holdReason
                : o.holdReason,
            statusUpdatedAt: new Date(), // Update timestamp
          }
        : o,
    );
    ordersStore.setOrders(updatedOrders);

    const updatedSelectedOrder = {
      ...selectedOrder,
      status: pendingStatus,
      holdReason:
        pendingStatus === "onHold"
          ? statusFormData.holdReason
          : selectedOrder.holdReason,
      statusUpdatedAt: new Date(),
    };

    setSelectedOrder(updatedSelectedOrder);

    // Regenerate invoice data if order is now completed or released
    if (pendingStatus === 'completed' || pendingStatus === 'released') {
      try {
        const invoice = generateInvoiceData({
          ...updatedSelectedOrder,
          id: updatedSelectedOrder.id,
          customerName: updatedSelectedOrder.customer,
          date: updatedSelectedOrder.submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          fileName: updatedSelectedOrder.attachedFiles?.[0]?.name || 'document.pdf',
          status: pendingStatus === 'completed' ? 'Completed' : 'Released',
          total: `₱${((updatedSelectedOrder.costBreakdown?.total || fallbackPrintTotal(updatedSelectedOrder.pages, updatedSelectedOrder.copies, updatedSelectedOrder.type))).toFixed(2)}`,
          printType: updatedSelectedOrder.type,
          paymentMethod: updatedSelectedOrder.orderSource === 'walkin' ? 'Cash' : 'GCash',
          paymentVerified: updatedSelectedOrder.paymentVerified || false,
          colorMode: updatedSelectedOrder.colorMode || (updatedSelectedOrder.type === 'Colored' ? 'colored' : 'bw'),
        });
        setInvoiceData(invoice);
      } catch (error) {
        console.error('Error generating invoice:', error);
      }
    }

    // Send notification to customer about status update
    const statusMessages: Record<string, string> = {
      received: 'Your order has been received and is awaiting processing.',
      inQueue: 'Your order is now in the print queue.',
      printing: 'Your order is currently being printed.',
      completed: 'Your order has been completed and is ready for pickup.',
      released: 'Your order has been released.',
      onHold: `Your order has been placed on hold. Reason: ${statusFormData.holdReason || 'Please contact staff for details.'}`,
      canceled: `Your order has been canceled. Reason: ${statusFormData.cancellationReason || 'Please contact staff for details.'}`,
    };

    const statusTitle = pendingStatus === "inQueue" ? "In Queue" : pendingStatus.charAt(0).toUpperCase() + pendingStatus.slice(1);

    notificationStore.addNotification(
      'status_update',
      `Order ${statusTitle}`,
      statusMessages[pendingStatus] || `Your order status has been updated to ${statusTitle}.`,
      {
        clickable: true,
        relatedOrderId: selectedOrder.id,
        relatedRoute: `/customer/track/${selectedOrder.id}`,
        recipientEmail: selectedOrder.customer,
        recipientRole: 'customer',
      }
    );

    if (pendingStatus === "completed") {
      toast.success(
        `Order ${selectedOrder.id} completed!`,
      );
    } else {
      toast.success(
        `Order ${selectedOrder.id} updated to ${pendingStatus === "inQueue" ? "In Queue" : pendingStatus} successfully!`,
      );
    }

    // Reset form and close dialogs
    setShowStatusForm(false);
    setShowDialog(false); // Close Order Details dialog
    setPendingStatus(null);
    setStatusFormData({
      estimatedTime: "",
      completionTime: "",
      releaseRecipient: "",
      releaseIdNumber: "",
      cancellationReason: "",
      holdReason: "",
    });
  };

  // Helper function to categorize orders by time period
  const getTimePeriod = (date: Date) => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12)
      return "Morning (6:00 AM - 11:59 AM)";
    if (hour >= 12 && hour < 18)
      return "Afternoon (12:00 PM - 5:59 PM)";
    if (hour >= 18 && hour < 24)
      return "Evening (6:00 PM - 11:59 PM)";
    return "Late Night (12:00 AM - 5:59 AM)";
  };

  const getTimePeriodIcon = (period: string) => {
    return "";
  };

  // QUEUE-VISIBLE ORDERS: orders still awaiting payment verification are excluded
  // from the Orders/queue list until staff/admin verifies them (they then enter as Received).
  const queueOrders = useMemo(
    () => orders.filter((o) => o.status !== "awaitingPayment"),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    let filtered = queueOrders;

    // SYSTEM-WIDE SORTING: Sort by most recent status update (newest first)
    // This ensures orders with recent updates appear at the top
    filtered = [...filtered].sort((a, b) => {
      const aTime = a.statusUpdatedAt?.getTime() || a.submittedAt.getTime();
      const bTime = b.statusUpdatedAt?.getTime() || b.submittedAt.getTime();
      // Sort descending (newest first) - 8:02 AM appears above 8:00 AM
      return bTime - aTime;
    });

    // Filter by search query
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(lowerQ) ||
          o.customer.toLowerCase().includes(lowerQ) ||
          o.type.toLowerCase().includes(lowerQ),
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (o) => o.status === statusFilter,
      );
    }

    // Only apply custom sorting if explicitly requested
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortColumn as keyof OrderType];
        let bVal = b[sortColumn as keyof OrderType];

        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();

        if (aVal < bVal)
          return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal)
          return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    queueOrders,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
  ]);

  // Group orders by time period
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: OrderType[] } = {};

    filteredOrders.forEach((order) => {
      // Use statusUpdatedAt for grouping if available, otherwise use submittedAt
      const relevantDate = order.statusUpdatedAt || order.submittedAt;
      const period = getTimePeriod(relevantDate);
      if (!groups[period]) {
        groups[period] = [];
      }
      groups[period].push(order);
    });

    return groups;
  }, [filteredOrders]);

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      inQueue: orders.filter((o) => o.status === "inQueue")
        .length,
      printing: orders.filter((o) => o.status === "printing")
        .length,
      completed: orders.filter((o) => o.status === "completed")
        .length,
      released: orders.filter((o) => o.status === "released")
        .length,
      canceled: orders.filter((o) => o.status === "canceled")
        .length,
      received: orders.filter((o) => o.status === "received")
        .length,
      onHold: orders.filter((o) => o.status === "onHold")
        .length,
    };
  }, [orders]);

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column &&
          (sortDirection === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          ))}
      </div>
    </th>
  );

  return (
    <Layout menuItems={menuItems} title="Orders" showBackButton>
      <StaffTimeInGate>
        <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500 mt-0.5">
                Monitor and manage all print jobs
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-[#2F6FD6]" />
                <span className="font-semibold tabular-nums">
                  {headerTime}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{headerDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for anything"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus-visible:ring-[#1D73EC] rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards - 2 Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 shrink-0">
          {([
            ["all", "All Orders", "Total orders", LayoutGrid, queueOrders.length],
            ["received", "Received", "Orders received", FileText, stats.received],
            ["inQueue", "In Queue", "Waiting to be printed", Clock, stats.inQueue],
            ["printing", "Printing", "Currently printing", Printer, stats.printing],
            ["completed", "Completed", "Successfully completed", CheckCircle, stats.completed],
            ["onHold", "On Hold", "Temporarily on hold", AlertCircle, stats.onHold],
            ["released", "Released", "Ready for pickup", CheckCircle, stats.released],
            ["canceled", "Canceled", "Canceled orders", XCircle, stats.canceled],
          ] as const).map(([key, label, description, Icon, count]) => {
            const s = ORDER_STATUS_STYLES[key];
            return (
              <div
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                className={`flex flex-col p-5 rounded-[22px] border-2 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${s.hover} ${s.hoverBg} ${
                  statusFilter === key ? `${s.bg} ${s.accent} shadow-md` : "border-gray-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s.chip}`}>
                    <Icon className={`w-5 h-5 ${s.icon}`} />
                  </div>
                  <p className={`text-sm font-medium leading-tight ${s.label}`}>
                    {label}
                  </p>
                </div>
                <p className="mt-4 pl-[52px] text-3xl font-bold leading-none text-[#1c1f26]">
                  {count}
                </p>
                <p className={`mt-2 pl-[52px] text-xs font-medium ${s.icon} opacity-80`}>
                  {description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                    #
                  </th>
                  <SortableHeader column="customer">
                    Customer
                  </SortableHeader>
                  <SortableHeader column="id">
                    Order ID
                  </SortableHeader>
                  <SortableHeader column="submittedAt">
                    Date
                  </SortableHeader>
                  <SortableHeader column="time">
                    Time
                  </SortableHeader>
                  <SortableHeader column="type">
                    Type
                  </SortableHeader>
                  <SortableHeader column="pages">
                    Pages
                  </SortableHeader>
                  <SortableHeader column="copies">
                    Copies
                  </SortableHeader>
                  <SortableHeader column="status">
                    Status
                  </SortableHeader>
                  <SortableHeader column="orderSource">
                    Source
                  </SortableHeader>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {Object.entries(groupedOrders).map(
                  ([period, periodOrders]) => {
                    const periodStartIndex =
                      filteredOrders.findIndex(
                        (o) => o.id === periodOrders[0].id,
                      );
                    return (
                      <React.Fragment key={period}>
                        <tr className="bg-gray-50 border-y border-gray-200">
                          <td
                            colSpan={11}
                            className="px-6 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">
                                {getTimePeriodIcon(period)}
                              </span>
                              <span className="font-bold text-sm text-gray-700 uppercase tracking-wide">
                                {period}
                              </span>
                              <span className="ml-auto text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-300">
                                {periodOrders.length}{" "}
                                {periodOrders.length === 1
                                  ? "order"
                                  : "orders"}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {periodOrders.map((order, index) => {
                          // Use statusUpdatedAt if available, otherwise submittedAt
                          const displayDate = order.statusUpdatedAt || order.submittedAt;

                          return (
                            <tr
                              key={order.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
                              onClick={() =>
                                handleOpenDetails(order)
                              }
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-8 h-8 rounded-full bg-[#1D73EC] text-white flex items-center justify-center font-bold text-sm">
                                  {periodStartIndex + index + 1}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <Avatar name={order.customer} />
                                  <div>
                                    <p className="font-semibold text-sm text-[#1c1f26]">
                                      {order.customer}
                                    </p>
                                    {order.notes && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <AlertCircle className="w-3 h-3 text-blue-500" />
                                        Has notes
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {order.id}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {displayDate.toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {displayDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium border-gray-200 bg-gray-50"
                                >
                                  {order.type}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {order.pages}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {order.copies}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium capitalize ${getStatusBadgeClasses(order.status)}`}
                                >
                                  {order.status === "inQueue"
                                    ? "In Queue"
                                    : order.status === "onHold"
                                      ? "On Hold"
                                      : order.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-medium ${
                                    order.orderSource === "online"
                                      ? "bg-white border-2 border-blue-200 text-blue-700 border-blue-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {order.orderSource === "online"
                                    ? "Online"
                                    : "Walk-in"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs hover:bg-[#1D73EC] hover:text-white hover:border-[#1D73EC] transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetails(order);
                                  }}
                                >
                                  Details
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  },
                )}
                {Object.keys(groupedOrders).length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Search className="w-12 h-12 mb-3" />
                        <p className="text-sm font-medium">
                          No orders found
                        </p>
                        <p className="text-xs mt-1">
                          Try adjusting your search or filter
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Order Details Dialog - Continues in next part due to length */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#10316B] font-poppins flex items-center justify-between">
              Order Details
              <Badge
                variant="outline"
                className="text-xs bg-gray-50 font-mono"
              >
                {selectedOrder?.id}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Manage and update print job information
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="py-4 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <Avatar name={selectedOrder.customer} />
                <div className="flex-1">
                  <p className="font-bold text-[#1c1f26] text-lg">
                    {selectedOrder.customer}
                  </p>
                  <p className="text-sm text-gray-500">
                    Order placed at {selectedOrder.time}
                  </p>
                </div>
              </div>

              {/* Print Job Details Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-bold text-[#10316B] uppercase tracking-wider">
                    Print Job Details
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Print job details fields */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Paper Size
                    </p>
                    <p className="font-semibold text-[#1c1f26]">
                      {selectedOrder.paperSize}
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Number of Copies
                    </p>
                    <p className="font-semibold text-[#1c1f26]">
                      {selectedOrder.copies}
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Total Pages
                    </p>
                    <p className="font-semibold text-[#1c1f26]">
                      {selectedOrder.pages}
                    </p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Order Source
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-sm font-medium ${
                        selectedOrder.orderSource === "online"
                          ? "bg-white border-2 border-blue-200 text-blue-700 border-blue-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {selectedOrder.orderSource === "online"
                        ? "🌐 Online"
                        : "🏪 Walk-in"}
                    </Badge>
                  </div>
                </div>

                {/* Attached Files */}
                {selectedOrder.attachedFiles &&
                  selectedOrder.attachedFiles.length > 0 && (
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Attached Files
                      </p>
                      <FileAttachments
                        files={selectedOrder.attachedFiles}
                        orderId={selectedOrder.id}
                        showDownload={true}
                        onView={(file) => {
                          // Live file preview is currently unavailable/being rebuilt.
                        }}
                      />
                    </div>
                  )}
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-bold text-[#10316B] uppercase tracking-wider">
                    Additional Information
                  </h3>
                </div>

                {/* Status */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-sm font-medium capitalize ${getStatusBadgeClasses(selectedOrder.status)}`}
                  >
                    {selectedOrder.status === "inQueue"
                      ? "In Queue"
                      : selectedOrder.status === "onHold"
                        ? "On Hold"
                        : selectedOrder.status}
                  </Badge>
                </div>
                {!selectedOrder.paymentVerified && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`${userRole === "admin" ? "/admin" : "/staff"}/payment-verification?orderId=${encodeURIComponent(selectedOrder.id)}`)}
                    className="border-[#1D73EC] text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Verify Payment
                  </Button>
                </div>
                )}

                {/* Payment Status */}
                <div className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Payment Status
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-sm font-medium ${
                      selectedOrder.paymentVerified
                        ? "bg-white border-2 border-blue-200 text-blue-700 border-blue-200"
                        : "bg-white border-2 border-blue-200 text-yellow-700 border-blue-200"
                    }`}
                  >
                    {selectedOrder.paymentVerified
                      ? "✓ Verified"
                      : "⚠ Not Verified"}
                  </Badge>
                </div>

                {/* Hold Reason */}
                {selectedOrder.holdReason && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Hold
                      Reason
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {selectedOrder.holdReason}
                    </p>
                  </div>
                )}

                {selectedOrder.cancellationReason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Cancellation Reason
                    </p>
                    <p className="text-sm text-red-900 leading-relaxed">
                      {selectedOrder.cancellationReason}
                    </p>
                  </div>
                )}

                {/* Special Instructions */}
                {selectedOrder.notes && (
                  <div className="bg-white border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Special
                      Instructions
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Invoice Section - Only show when order is Completed or Released */}
              {(selectedOrder.status === 'completed' || selectedOrder.status === 'released') && invoiceData && (
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-bold text-[#10316B] uppercase tracking-wider flex items-center justify-between">
                      <span>Invoice</span>
                      <Badge className="bg-blue-100 text-blue-700 font-mono text-xs">
                        {invoiceData.invoiceNumber}
                      </Badge>
                    </h3>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Invoice Date
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {invoiceData.date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Total Amount
                        </p>
                        <p className="text-lg font-bold text-[#2F6FD6]">
                          {invoiceData.totalAmount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Payment Method
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {invoiceData.paymentMethod}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Payment Status
                        </p>
                        <Badge
                          className={`text-xs font-medium ${
                            invoiceData.paymentStatus === 'verified'
                              ? "bg-blue-100 text-blue-700"
                              : invoiceData.paymentStatus === 'cash'
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {invoiceData.paymentStatus === 'verified' ? '✓ Verified' :
                           invoiceData.paymentStatus === 'cash' ? 'Cash on Pickup' : '⚠ Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Cost Breakdown
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Printing ({invoiceData.totalPages} pages × {invoiceData.copies} copies)
                          </span>
                          <span className="font-medium text-gray-900">
                            ₱{invoiceData.costBreakdown.printingCost.toFixed(2)}
                          </span>
                        </div>
                        {invoiceData.addons.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Add-ons</span>
                            <span className="font-medium text-gray-900">
                              ₱{invoiceData.costBreakdown.addonsCost.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInvoicePreview(true)}
                      className="flex-1 border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#F2F7FF]"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Invoice
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownloadInvoice}
                      className="flex-1 bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Update Status
                </p>

                {errorMessage && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "received"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "received"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-blue-50 hover:border-blue-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("received")
                    }
                  >
                    Received
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "inQueue"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "inQueue"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-white hover:text-slate-700 border-2 border-blue-200 hover:border-blue-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("inQueue")
                    }
                  >
                    In Queue
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "printing"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "printing"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-white hover:text-slate-700 border-2 border-blue-200 hover:border-blue-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("printing")
                    }
                  >
                    Printing
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "completed"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "completed"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-white hover:text-slate-700 border-2 border-blue-200 hover:border-blue-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("completed")
                    }
                  >
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "onHold"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "onHold"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-blue-50 hover:border-blue-300"
                    }
                    onClick={() => handleUpdateStatus("onHold")}
                  >
                    On Hold
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "released"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "released"
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "hover:bg-gray-50 hover:border-gray-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("released")
                    }
                  >
                    Released
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      selectedOrder.status === "canceled"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedOrder.status === "canceled"
                        ? "bg-red-600 text-white border-2 border-red-600 hover:bg-red-700"
                        : "hover:bg-red-50 border-2 border-blue-200 hover:border-red-300"
                    }
                    onClick={() =>
                      handleUpdateStatus("canceled")
                    }
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Form Dialog */}
      <Dialog
        open={showStatusForm}
        onOpenChange={setShowStatusForm}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              Update Status to{" "}
              {pendingStatus === "inQueue"
                ? "In Queue"
                : pendingStatus === "onHold"
                  ? "On Hold"
                  : pendingStatus}
            </DialogTitle>
            <DialogDescription>
              Fill in the required information for this status
              update
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Form Content */}
            {pendingStatus === "onHold" && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Put this order on hold with a reason for the
                    customer.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="holdReason">
                    Hold Reason *
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setStatusFormData((prev) => ({
                          ...prev,
                          holdReason: "Waiting for customer payment",
                        }))
                      }
                    >
                      Waiting for payment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setStatusFormData((prev) => ({
                          ...prev,
                          holdReason: "Out of stock - awaiting supplies",
                        }))
                      }
                    >
                      Out of stock
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setStatusFormData((prev) => ({
                          ...prev,
                          holdReason: "Customer requested delay",
                        }))
                      }
                    >
                      Customer delay
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setStatusFormData((prev) => ({
                          ...prev,
                          holdReason: "Technical issue - equipment malfunction",
                        }))
                      }
                    >
                      Technical issue
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setStatusFormData((prev) => ({
                          ...prev,
                          holdReason: "Awaiting customer approval",
                        }))
                      }
                    >
                      Awaiting approval
                    </Button>
                  </div>
                  <Textarea
                    id="holdReason"
                    placeholder="Enter the reason for hold..."
                    value={statusFormData.holdReason}
                    onChange={(e) =>
                      setStatusFormData((prev) => ({
                        ...prev,
                        holdReason: e.target.value,
                      }))
                    }
                    rows={3}
                    required
                  />
                </div>
              </div>
            )}

            {pendingStatus === "canceled" && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Cancel this order. This action cannot be
                    undone.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="cancellationReason">
                    Cancellation Reason *
                  </Label>
                  <Textarea
                    id="cancellationReason"
                    placeholder="Enter the reason for cancellation..."
                    value={statusFormData.cancellationReason}
                    onChange={(e) =>
                      setStatusFormData((prev) => ({
                        ...prev,
                        cancellationReason: e.target.value,
                      }))
                    }
                    rows={3}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStatusForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusUpdate}
              className={
                pendingStatus === "onHold"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : pendingStatus === "canceled"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
              }
              disabled={
                (pendingStatus === "canceled" &&
                  !statusFormData.cancellationReason) ||
                (pendingStatus === "onHold" &&
                  !statusFormData.holdReason)
              }
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Invoice Preview - {invoiceData?.orderId || selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              View and download invoice for order {invoiceData?.orderId || selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] p-6 bg-white">
            {invoiceData ? (
              <>
                {/* Invoice Header */}
                <div className="text-center mb-8 border-b-2 border-[#2F6FD6] pb-6">
                  <h1 className="text-3xl font-bold text-[#2F6FD6]">
                    Docufy
                  </h1>
                  <p className="text-gray-600">Printing Services</p>
                  <p className="text-sm text-gray-500">
                    Room 4, Palawan State University - Main Campus,
                    TBI Building, Puerto Princesa City, 5300 Palawan
                  </p>
                </div>

                <h2 className="text-2xl font-bold text-[#2F6FD6] mb-6">
                  INVOICE
                </h2>

                <div className="mb-6 space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Invoice Number:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Order ID:
                    </span>
                    <span className="text-gray-900">{invoiceData.orderId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Date:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.date}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Customer:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Payment Method:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Payment Status:
                    </span>
                    <Badge
                      className={
                        invoiceData.paymentStatus === 'verified'
                          ? "bg-blue-100 text-blue-700"
                          : invoiceData.paymentStatus === 'cash'
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {invoiceData.paymentStatus === 'verified' ? '✓ Verified' :
                       invoiceData.paymentStatus === 'cash' ? 'Cash on Pickup' : '⚠ Pending'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Order Source:
                    </span>
                    <Badge
                      className={
                        invoiceData.orderSource === 'online'
                          ? "bg-blue-100 text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    >
                      {invoiceData.orderSource === 'online' ? 'Online' : 'Walk-in'}
                    </Badge>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#2F6FD6] mt-8 mb-4">
                  Order Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Document:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.fileName}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Total Pages:
                    </span>
                    <span className="text-gray-900">{invoiceData.totalPages} pages</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Copies:
                    </span>
                    <span className="text-gray-900">{invoiceData.copies}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Color Mode:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.colorMode}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Paper Size:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.paperSizeDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Orientation:
                    </span>
                    <span className="text-gray-900 capitalize">
                      {invoiceData.orientation}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold text-gray-600">
                      Two-Sided:
                    </span>
                    <span className="text-gray-900">
                      {invoiceData.twoSided}
                    </span>
                  </div>
                  {invoiceData.notes && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-semibold text-gray-600">
                        Special Instructions:
                      </span>
                      <span className="text-gray-900">
                        {invoiceData.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Add-ons Section */}
                {invoiceData.addons.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold text-[#2F6FD6] mt-8 mb-4">
                      Add-ons
                    </h3>
                    <div className="space-y-3">
                      {invoiceData.addons.map((addon, index) => (
                        <div key={index} className="flex justify-between py-2 border-b">
                          <span className="font-semibold text-gray-600">
                            {addon.name} × {addon.quantity}:
                          </span>
                          <span className="text-gray-900">
                            ₱{addon.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-3 border-t-2 border-[#2F6FD6]">
                        <span className="font-bold text-gray-900">
                          Add-ons Subtotal:
                        </span>
                        <span className="font-bold text-gray-900">
                          ₱{invoiceData.costBreakdown.addonsCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Cost Breakdown */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xl font-bold text-[#2F6FD6] mb-4">
                    Cost Breakdown
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-600">
                        Printing Cost ({invoiceData.totalPages} pages × {invoiceData.copies} copies):
                      </span>
                      <span className="text-gray-900">
                        ₱{invoiceData.costBreakdown.printingCost.toFixed(2)}
                      </span>
                    </div>
                    {invoiceData.addons.length > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="font-semibold text-gray-600">
                          Add-ons:
                        </span>
                        <span className="text-gray-900">
                          ₱{invoiceData.costBreakdown.addonsCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-[#2F6FD6]">
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#2F6FD6]">
                      Total: {invoiceData.totalAmount}
                    </p>
                  </div>
                </div>

                <div className="mt-12 text-center text-sm text-gray-600">
                  <p>Thank you for choosing Docufy!</p>
                  <p>
                    For inquiries, please contact us at
                    support@docufy.com
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Invoice data is not available</p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowInvoicePreview(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleDownloadInvoice}
              className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </StaffTimeInGate>
    </Layout>
  );
}
