import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Smartphone,
  Banknote,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import StaffTimeInGate from "./StaffTimeInGate";
import { Card } from "../ui/card";
import { SummaryCard } from "../ui/summary-card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { dataStore } from "../../utils/dataStore";
import { formatPHTime, formatPHDate, formatPHDateTime } from "../../utils/pht";
import {
  paymentMethodsStore,
} from "../../utils/paymentMethodsStore";
import PaymentMethodQRPanel from "./PaymentMethodQR";
import { PaymentDeadlineCountdown } from "./PaymentDeadlineCountdown";
import { PriorityBadge, StartHereTag } from "../ui/priority-badge";

// --- Types ---

type PaymentType = {
  id: string;
  orderId: string;
  customer: string;
  amount: number;
  method: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: Date;
  time: string;
  reference?: string;
  proofImageUrl?: string;
  // Payment-kind-aware fields (see generatePaymentsFromOrders):
  //  - cash        → Cash on Pickup: paid at the shop, Amount to Pay + Deadline
  //  - online      → Online payment (full amount, incl. high-value orders)
  //  - online-down → Online down payment (Total / Paid / Remaining Balance)
  kind: "cash" | "online" | "online-down";
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  deadline?: string;
  fullPaymentRequired?: boolean;
  downPaymentRequired?: boolean;
};

function parseOrderTotal(order: {
  total?: string;
  fullPaymentRequired?: boolean;
  fullPaymentAmount?: number;
  downPaymentRequired?: boolean;
  downPaymentAmount?: number;
}): number {
  return parseFloat((order.total || '₱0').replace('₱', '').replace(',', ''));
}

const SAMPLE_PROOF_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGF5bWVudCBQcm9vZiBTY3JlZW5zaG90PC90ZXh0Pjwvc3ZnPg==";

// Helper function to generate payments from orders
// SYSTEM-WIDE: This pulls data directly from dataStore to ensure sync with Order List
function generatePaymentsFromOrders(): PaymentType[] {
  const orders = dataStore.getOrders();

  // Show ALL orders in payment verification, not just GCash
  return orders
    .map((order, index) => {
      const orderDate = order.statusUpdatedAt ? new Date(order.statusUpdatedAt) : new Date(order.date);
      const totalAmount = parseOrderTotal(order);

      // Determine status based on paymentVerified field (SINGLE SOURCE OF TRUTH)
      // A payment only shows "Verified" once staff/admin actually approves it.
      // Everything else (cash-on-pickup, GCash, down payment) stays "Pending"
      // until verified, so an unverified customer submission never auto-verifies.
      let paymentStatus: "pending" | "verified" | "rejected" = "pending";
      if (order.paymentVerified === true) {
        paymentStatus = "verified";
      } else if (order.status === 'Canceled') {
        paymentStatus = "rejected";
      }

      // Determine payment method from order (display name stored on the order)
      const paymentMethod = order.paymentMethod
        ? order.paymentMethod
        : order.orderSource === "walkin"
          ? "Cash"
          : "GCash";

      // Payment-kind-aware display: which amount column means what.
      const isCashOnPickup = paymentMethod === "Cash";
      const kind: PaymentType["kind"] = isCashOnPickup
        ? "cash"
        : order.downPaymentRequired
          ? "online-down"
          : "online";

      // For online payments the customer reports the amount they paid; for
      // down payments that's the down-payment amount, for full payments the
      // full amount (falling back to the required amount when not recorded).
      const amountPaid = isCashOnPickup
        ? 0
        : order.paymentAmountPaid !== undefined
          ? order.paymentAmountPaid
          : order.fullPaymentRequired
            ? (order.fullPaymentAmount ?? totalAmount)
            : order.downPaymentRequired
              ? (order.downPaymentAmount ?? totalAmount * 0.5)
              : totalAmount;
      const remainingBalance = Math.max(0, totalAmount - amountPaid);

      return {
        id: `PAY-${order.id.split('-')[1]}`,
        orderId: order.id,
        customer: order.customerName,
        amount: totalAmount,
        method: paymentMethod,
        status: paymentStatus,
        submittedAt: orderDate,
        time: formatPHTime(orderDate).toLowerCase(),
        reference: order.paymentReferenceNumber || (isCashOnPickup ? 'Cash on Pickup' : ''),
        proofImageUrl: order.paymentProofUrl || SAMPLE_PROOF_IMAGE,
        kind,
        totalAmount,
        amountPaid,
        remainingBalance,
        deadline: order.paymentDeadline,
        fullPaymentRequired: order.fullPaymentRequired,
        downPaymentRequired: order.downPaymentRequired,
      };
    })
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

// --- Main Component ---

interface UnifiedPaymentVerificationProps {
  menuItems: any[];
  userRole: 'admin' | 'staff';
}

export default function UnifiedPaymentVerification({ menuItems, userRole }: UnifiedPaymentVerificationProps) {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentType | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [showRejectDialog, setShowRejectDialog] =
    useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showProofImage, setShowProofImage] = useState(false);
  const [pendingVerifyAction, setPendingVerifyAction] = useState<
    "verified" | "rejected" | null
  >(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load payments from dataStore
  useEffect(() => {
    const loadPayments = () => {
      setPayments(generatePaymentsFromOrders());
    };

    loadPayments();
    const unsubscribe = dataStore.subscribe(loadPayments);
    return unsubscribe;
  }, []);

  // Re-render whenever payment methods are added/edited (QR + account details)
  const [, setMethodsTick] = useState(0);
  useEffect(() => {
    const unsubscribe = paymentMethodsStore.subscribe(() =>
      setMethodsTick((t) => t + 1),
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (!orderId || payments.length === 0) return;

    const payment = payments.find((item) => item.orderId === orderId);
    if (payment) {
      setStatusFilter("all");
      setSelectedPayment(payment);
      setShowDialog(true);
    }
  }, [payments, searchParams]);

  const handleVerifyPayment = (
    status: "verified" | "rejected",
  ) => {
    if (selectedPayment) {
      // SYSTEM-WIDE SYNC: Update the actual order in dataStore
      // This ensures Order List and Payment Verification are connected
      const orderRecords = dataStore.getOrders();
      const targetOrder = orderRecords.find(
        (o) => o.id === selectedPayment.orderId,
      );
      dataStore.updateOrder(selectedPayment.orderId, {
        paymentVerified: status === "verified",
        downPaymentVerified: status === "verified",
        fullPaymentVerified:
          status === "verified" && !!targetOrder?.fullPaymentRequired,
        paymentReferenceNumber: selectedPayment.reference,
        paymentDeadline: undefined,
        // Auto-update order status to "In Queue" when payment is verified so
        // the order enters the queue automatically (staff never add it).
        ...(status === "verified" ? { status: "In Queue" as const } : {}),
      });

      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id ? { ...p, status } : p,
        ),
      );
      setSelectedPayment({ ...selectedPayment, status });
      toast.success(
        status === "verified"
          ? "Payment verified! Order has been added to the queue."
          : `Payment marked as ${status}`
      );

      // Close dialog after verification
      setShowDialog(false);
    }
  };

  const handleOpenDetails = (payment: PaymentType) => {
    setSelectedPayment(payment);
    setShowDialog(true);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleStatusFilterCycle = () => {
    const statuses = ["all", "pending", "verified", "rejected"];
    const currentIndex = statuses.indexOf(statusFilter);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatusFilter(statuses[nextIndex]);
  };

  const filteredPayments = payments
    .filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter)
        return false;
      const query = searchQuery.toLowerCase();
      return (
        p.id.toLowerCase().includes(query) ||
        p.customer.toLowerCase().includes(query) ||
        p.reference?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (!sortColumn) {
        // DEFAULT (verification order): pending items first, oldest first (FIFO)
        // so the next payment to verify sits at the top; verified/rejected follow
        // newest-first for convenience.
        const rank: Record<PaymentType["status"], number> = {
          pending: 0,
          verified: 1,
          rejected: 2,
        };
        const aRank = rank[a.status];
        const bRank = rank[b.status];
        if (aRank !== bRank) return aRank - bRank;
        if (a.status === "pending" && b.status === "pending") {
          return a.submittedAt.getTime() - b.submittedAt.getTime();
        }
        return b.submittedAt.getTime() - a.submittedAt.getTime();
      }

      let aVal: any = a[sortColumn as keyof PaymentType];
      let bVal: any = b[sortColumn as keyof PaymentType];

      if (sortColumn === "submittedAt") {
        aVal = a.submittedAt.getTime();
        bVal = b.submittedAt.getTime();
      } else if (sortColumn === "time") {
        aVal = a.submittedAt.getTime();
        bVal = b.submittedAt.getTime();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // VERIFICATION SEQUENCE: pending payments ranked oldest-first (FIFO). The
  // numbers staff see (1, 2, 3...) are the order in which payments should be
  // verified — the first pending record is always "next to verify".
  const pendingSequenceById = useMemo(() => {
    const map = new Map<string, number>();
    const pending = payments
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
    pending.forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [payments]);
  const nextToVerifyId = useMemo(() => {
    const pending = payments
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
    return pending[0]?.id;
  }, [payments]);

  const stats = {
    pending: payments.filter((p) => p.status === "pending")
      .length,
    verified: payments.filter((p) => p.status === "verified")
      .length,
    rejected: payments.filter((p) => p.status === "rejected")
      .length,
    totalAmount: payments
      .filter((p) => p.status === "verified")
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <Layout menuItems={menuItems} title="Payment Verification" showBackButton>
      <StaffTimeInGate>
        <div className="flex flex-col h-full max-w-[1800px] mx-auto font-poppins">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-[#1c1f26]">
              Payment Verification
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review and verify customer payments
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 focus-visible:ring-[#1D73EC] rounded-lg h-10 text-sm font-medium"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 shrink-0">
          <SummaryCard
            label="All Transactions"
            value={payments.length}
            icon={CreditCard}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <SummaryCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />
          <SummaryCard
            label="Verified"
            value={stats.verified}
            icon={CheckCircle}
            active={statusFilter === "verified"}
            onClick={() => setStatusFilter("verified")}
          />
          <SummaryCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            active={statusFilter === "rejected"}
            onClick={() => setStatusFilter("rejected")}
          />
          <SummaryCard
            highlight
            label="Total Verified"
            value={`?${stats.totalAmount.toLocaleString()}`}
            icon={CreditCard}
          />
        </div>

        {/* Payments Table */}
        <Card className="flex-1 border-none shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F2F7FF] border-b border-[#1D73EC]/10">
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider w-14">
                    Priority
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    <div className="flex flex-col leading-tight">
                      Customer
                      <span className="text-[10px] font-medium text-gray-400 normal-case tracking-normal">
                        Order ID
                      </span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th
                    className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleSort("submittedAt")}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortColumn === "submittedAt" && (
                        sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleSort("time")}
                  >
                    <div className="flex items-center gap-1">
                      Time
                      {sortColumn === "time" && (
                        sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Amount
                  </th>
                  <th
                    className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={handleStatusFilterCycle}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {statusFilter !== "all" && (
                        <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full ml-1">
                          {statusFilter}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#10316B] uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#F2F7FF]">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <CreditCard className="mx-auto mb-3 h-10 w-10 text-[#1D73EC]/35" />
                      <p className="text-sm font-semibold text-gray-500">No payments to verify</p>
                      <p className="mt-1 text-xs text-gray-400">Payment records will appear here when customers place orders.</p>
                    </td>
                  </tr>
                ) : filteredPayments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-[#F2F7FF]/50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetails(payment)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        {payment.status === "pending" ? (
                          <>
                            <PriorityBadge
                              number={
                                pendingSequenceById.get(payment.id) ??
                                index + 1
                              }
                              active={payment.id === nextToVerifyId}
                            />
                            {payment.id === nextToVerifyId && (
                              <StartHereTag label="Next to Verify" />
                            )}
                          </>
                        ) : payment.status === "verified" ? (
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                            <X className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={payment.customer} />
                        <div>
                          <p className="text-sm font-semibold text-[#1c1f26]">
                            {payment.customer}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {payment.orderId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-[#10316B]">
                        {payment.id}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatPHDate(payment.submittedAt, "short")}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payment.time}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="text-xs font-medium border-[#1D73EC]/20 bg-[#F2F7FF] py-1 text-[#1D73EC]"
                      >
                        {payment.method !== "Cash" ? (
                          <Smartphone
                            size={12}
                            className="mr-1 inline"
                          />
                        ) : (
                          <Banknote
                            size={12}
                            className="mr-1 inline"
                          />
                        )}
                        {payment.method}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[#1c1f26]">
                        ?{payment.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs hover:bg-[#1D73EC] hover:text-white transition-colors h-8 border-[#1D73EC] text-[#1D73EC]"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto border-none">
          <DialogHeader>
            <DialogTitle className="text-[#10316B] font-poppins flex items-center justify-between pr-6">
              <span>Payment Details</span>
              <Badge
                variant="outline"
                className="text-xs bg-[#F2F7FF] text-[#1D73EC] border-[#1D73EC]/20 font-mono"
              >
                {selectedPayment?.id}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Review and verify payment information
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="py-4 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-[#F2F7FF] rounded-xl border border-[#1D73EC]/10">
                <Avatar name={selectedPayment.customer} />
                <div className="flex-1">
                  <p className="font-bold text-[#1c1f26] text-lg">
                    {selectedPayment.customer}
                  </p>
                  <p className="text-sm text-gray-500">
                    Payment submitted at {selectedPayment.time}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl col-span-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Verification Status
                  </p>
                  <StatusBadge
                    status={selectedPayment.status}
                    className="text-sm"
                  />
                </div>

                <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Order ID
                  </p>
                  <p className="font-semibold text-[#1c1f26]">
                    {selectedPayment.orderId}
                  </p>
                </div>

                <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </p>
                  <p className="font-semibold text-[#1D73EC]">
                    {selectedPayment.method}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 col-span-2">
                  {selectedPayment.kind === "cash" ? (
                    <>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Amount to Pay
                        </p>
                        <p className="text-2xl font-bold text-[#1D73EC]">
                          ₱
                          {selectedPayment.amountPaid > 0
                            ? selectedPayment.amountPaid.toLocaleString()
                            : selectedPayment.totalAmount.toLocaleString()}
                        </p>
                        {selectedPayment.downPaymentRequired && (
                          <p className="text-[11px] text-amber-600 font-medium mt-1">
                            50% down payment (cash at shop)
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Payment Deadline
                        </p>
                        <p className="text-sm font-bold text-[#1c1f26]">
                          {selectedPayment.deadline
                            ? formatPHDateTime(selectedPayment.deadline)
                            : "No deadline set"}
                        </p>
                        {selectedPayment.deadline && (
                          <PaymentDeadlineCountdown
                            deadline={selectedPayment.deadline}
                            className="mt-1"
                          />
                        )}
                      </div>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl col-span-2 sm:col-span-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Confirmation Status
                        </p>
                        <p className="text-sm font-semibold text-amber-600">
                          Awaiting Payment at Shop
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Confirm only once the customer has paid in cash
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Order Total
                        </p>
                        <p className="text-2xl font-bold text-[#1D73EC]">
                          ₱{selectedPayment.totalAmount.toLocaleString()}
                        </p>
                        {selectedPayment.fullPaymentRequired && (
                          <p className="text-[11px] text-amber-600 font-medium mt-1">
                            Full payment required (100% upfront)
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Amount Paid
                        </p>
                        <p className="text-xl font-bold text-[#1c1f26]">
                          ₱{selectedPayment.amountPaid.toLocaleString()}
                        </p>
                        {selectedPayment.downPaymentRequired && (
                          <p className="text-[11px] text-amber-600 font-medium mt-1">
                            50% down payment
                          </p>
                        )}
                      </div>
                      <div className="p-4 bg-white border border-[#F2F7FF] rounded-xl">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Remaining Balance
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            selectedPayment.remainingBalance > 0
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          ₱{selectedPayment.remainingBalance.toLocaleString()}
                        </p>
                        {selectedPayment.remainingBalance > 0 && (
                          <p className="text-[11px] text-gray-500 mt-1">
                            Balance due on pickup
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Corresponding Payment Method QR / details for online payments */}
                {selectedPayment.method !== "Cash" && (
                  <div className="col-span-2">
                    {(() => {
                      const methodDetails = paymentMethodsStore.findByName(
                        selectedPayment.method,
                      );
                      return methodDetails ? (
                        <PaymentMethodQRPanel method={methodDetails} />
                      ) : (
                        <div className="p-4 bg-white border-2 border-[#1D73EC]/10 rounded-xl text-sm">
                          <p className="text-xs font-semibold text-[#1D73EC] uppercase tracking-wider mb-1">
                            Payment Instructions
                          </p>
                          <p className="text-gray-600">
                            No QR code is set for this payment
                            method. Verify the payment using the
                            customer's reference number and proof
                            of payment below.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedPayment.reference && (
                  <div className="p-4 bg-white border-2 border-[#1D73EC]/10 rounded-xl col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[#1D73EC] uppercase tracking-wider flex items-center gap-1.5">
                        {selectedPayment.method !== "Cash" ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Banknote className="w-4 h-4" />
                        )}{" "}
                        {selectedPayment.method} Reference Number
                      </p>
                      {selectedPayment.proofImageUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setShowProofImage(true)
                          }
                           className="text-[#1D73EC] border-2 border-[#1D73EC]/30 hover:bg-[#1D73EC] hover:text-white h-7 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />{" "}
                          View Proof
                        </Button>
                      )}
                    </div>
                    <p className="text-sm font-mono font-semibold text-[#10316B]">
                      {selectedPayment.reference}
                    </p>
                  </div>
                )}
              </div>

              {selectedPayment.status === "pending" && (
                <div className="pt-4 border-t border-[#F2F7FF]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Verification Action
                  </p>
                  <div className="flex gap-3">
                    <Button
                       className="flex-1 bg-green-600 text-white hover:bg-green-700 transition-all"
                      onClick={() => setPendingVerifyAction("verified")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Payment
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      onClick={() => {
                        setShowDialog(false);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
      >
        <DialogContent className="sm:max-w-[500px] font-poppins border-none">
          <DialogHeader>
            <DialogTitle className="text-[#10316B] font-bold">
              Reject Payment
            </DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Please provide a reason for rejecting this
              payment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label
              htmlFor="rejection-reason"
              className="text-[#10316B] font-semibold mb-2 block"
            >
              Rejection Reason
            </Label>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium"
                onClick={() =>
                  setRejectionReason("Invalid reference number")
                }
              >
                Invalid reference number
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium"
                onClick={() =>
                  setRejectionReason("Payment amount mismatch")
                }
              >
                Amount mismatch
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium"
                onClick={() =>
                  setRejectionReason("Unclear payment proof - please resubmit with clearer image")
                }
              >
                Unclear proof
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium"
                onClick={() =>
                  setRejectionReason("Duplicate payment submission")
                }
              >
                Duplicate submission
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-medium"
                onClick={() =>
                  setRejectionReason("Payment not found in system")
                }
              >
                Not found
              </Button>
            </div>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) =>
                setRejectionReason(e.target.value)
              }
              className="min-h-[120px] bg-[#F2F7FF]/50 border-[#1D73EC]/10 focus:bg-white focus:border-[#1D73EC] rounded-lg resize-none font-medium"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              className="font-semibold text-[#10316B] border-[#1D73EC]/20"
            >
              Cancel
            </Button>
            <Button
              className="bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white font-bold"
              onClick={() => {
                if (!rejectionReason.trim())
                  return toast.error("Please provide a reason");
                setPendingVerifyAction("rejected");
              }}
            >
              <XCircle className="w-4 h-4 mr-2" /> Confirm
              Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Preview */}
      <Dialog
        open={showProofImage}
        onOpenChange={setShowProofImage}
      >
        <DialogContent className="max-w-4xl font-poppins border-none">
          <DialogHeader>
            <DialogTitle className="font-bold text-[#10316B]">
              Payment Proof
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              View uploaded payment proof image
            </DialogDescription>
          </DialogHeader>
          <img
            src={selectedPayment?.proofImageUrl}
            alt="Proof"
            className="w-full h-auto rounded-lg border border-[#1D73EC]/10"
          />
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowProofImage(false)}
               className="font-semibold border-2 border-[#1D73EC] text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white transition-all"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Payment Confirmation */}
      {pendingVerifyAction === "verified" && selectedPayment && (
        <ConfirmationDialog
          open
          onOpenChange={() => setPendingVerifyAction(null)}
          onConfirm={() => {
            handleVerifyPayment("verified");
            setShowDialog(false);
            setPendingVerifyAction(null);
          }}
          title="Approve Payment?"
          description={`Verify the ${selectedPayment.method} payment of ?${selectedPayment.amount.toFixed(2)} for order ${selectedPayment.orderId} from ${selectedPayment.customer}. This will mark the payment verified and immediately move the order into the print queue.`}
          confirmLabel="Approve Payment"
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
      {pendingVerifyAction === "rejected" && selectedPayment && (
        <ConfirmationDialog
          open
          onOpenChange={() => setPendingVerifyAction(null)}
          onConfirm={() => {
            handleVerifyPayment("rejected");
            setShowRejectDialog(false);
            setRejectionReason("");
            setPendingVerifyAction(null);
          }}
          title="Reject Payment?"
          description={`The ${selectedPayment.method} payment of ?${selectedPayment.amount.toFixed(2)} for order ${selectedPayment.orderId} from ${selectedPayment.customer} will be marked Rejected${
            rejectionReason.trim() ? ` (${rejectionReason.trim()})` : ""
          }. The customer will be notified. This cannot be undone.`}
          confirmLabel="Reject Payment"
          cancelLabel="Keep Payment"
          destructive
          requirePhrase
        />
      )}
      </StaffTimeInGate>
    </Layout>
  );
}

// --- Helper Components ---

function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const styles: any = {
    verified: "bg-[#F2F7FF] text-[#1D73EC] border-[#1D73EC]/20",
    pending: "bg-white text-[#10316B] border-gray-200",
    rejected:
      "bg-white text-[#10316B] border-gray-10 opacity-60",
  };
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold capitalize py-1 ${styles[status]} ${className}`}
    >
      {status}
    </Badge>
  );
}

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-[#F2F7FF] text-[#1D73EC] border border-[#1D73EC]/10">
      {initials}
    </div>
  );
};
