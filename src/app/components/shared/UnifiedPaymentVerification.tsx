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
  Check,
  X,
  ListOrdered,
  QrCode,
  Lock,
  Unlock,
  UserCheck,
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
import { pricingStore } from "../../utils/pricingStore";
import { formatPHTime, formatPHDate, formatPHDateTime, toPHTKey, todayPHTKey } from "../../utils/pht";
import {
  paymentMethodsStore,
} from "../../utils/paymentMethodsStore";
import {
  getLock,
  claimLock,
  releaseLock,
  stillHoldsLock,
  subscribeToLocks,
} from "../../utils/orderLocks";
import { useAuth } from "../../contexts/AuthContext";
import { PaymentDeadlineCountdown } from "./PaymentDeadlineCountdown";
import { StartHereTag } from "../ui/priority-badge";

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
  canceled?: boolean;
  expired?: boolean;
  cancellationReason?: string;
  // Low-value Cash on Pickup order (total under the down-payment threshold):
  // auto-queued at checkout, so it shows as "Pending Payment · In Queue" with
  // no reference number / proof of payment to review.
  isLowValueCash?: boolean;
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
      const canceled = order.status === 'Canceled';
      const expired = canceled && /deadline|expired?/i.test(order.cancellationReason || '');

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

      // Low-value Cash on Pickup order (below the down-payment threshold) —
      // these are auto-queued at checkout with the cash collected on pickup.
      const isLowValueCash =
        isCashOnPickup &&
        totalAmount < pricingStore.getPricing().downPaymentThreshold;

      return {
        id: order.id,
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
        canceled,
        expired,
        cancellationReason: order.cancellationReason,
        isLowValueCash,
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "verified" | "rejected" | "cancelled" | "expired"
  >("pending");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "cash" | "online" | "online-down"
  >("all");
  const [methodFilter, setMethodFilter] = useState<"all" | string>("all");
  const [showRejectDialog, setShowRejectDialog] =
    useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showProofImage, setShowProofImage] = useState(false);
  const [pendingVerifyAction, setPendingVerifyAction] = useState<
    "verified" | "rejected" | null
  >(null);

  const { user } = useAuth();
  const myName = user?.name || "Staff";

  // Session lock awareness: a badge tick that re-renders whenever lock state
  // changes (in THIS tab or another — see orderLocks.ts). Used to show who is
  // "viewing" an order and to disable Confirm while someone else holds the lock.
  const [, setLocksTick] = useState(0);
  useEffect(() => {
    const bump = () => setLocksTick((t) => t + 1);
    const unsub = subscribeToLocks(bump);
    const iv = setInterval(bump, 5000);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, []);

  // The current lock for the order being viewed (null if none / expired).
  const selectedLock = selectedPayment ? getLock(selectedPayment.orderId) : null;
  // Name of whoever holds it (could be a different tab / different user).
  const lockHolder = selectedLock?.heldBy ?? null;
  // Do WE hold it right now?
  const iHoldLock = !!selectedLock && selectedLock.heldBy === myName;

  // HEARTBEAT: while our details dialog is open on an actionable row, keep
  // renewing OUR lock so it persists for as long as we keep viewing — it never
  // vanishes mid-review. A dead tab stops beating and expires on its own.
  useEffect(() => {
    if (
      !selectedPayment ||
      !showDialog ||
      !(selectedPayment.status === "pending" || selectedPayment.status === "rejected")
    ) {
      return;
    }
    const beat = () => {
      if (stillHoldsLock(selectedPayment.orderId, myName)) {
        claimLock(selectedPayment.orderId, myName);
      }
    };
    const iv = setInterval(beat, 30000);
    return () => clearInterval(iv);
  }, [selectedPayment?.id, selectedPayment?.status, showDialog, myName]);

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
      // Auto-claim when arriving via deep link (e.g. from a notification).
      if (payment.status === "pending" || payment.status === "rejected") {
        const existing = getLock(payment.orderId);
        if (existing && existing.heldBy !== myName) {
          toast.info(`${existing.heldBy} is viewing this order`);
        } else {
          claimLock(payment.orderId, myName);
        }
      }
      setShowDialog(true);
    }
  }, [payments, searchParams, myName]);

  const handleVerifyPayment = (
    status: "verified" | "rejected",
  ) => {
    if (selectedPayment) {
      // ===== SESSION LOCK GUARD =====
      // Re-check ownership at the FINAL confirm moment (a second tab might have
      // claimed the order after we opened the modal). Only the lock holder may
      // act. NOTE (Supabase later): this check must be a transactional
      // conditional update (WHERE id = ? AND held_by = ?) on the shared table,
      // not a client-side localStorage read.
      if (!stillHoldsLock(selectedPayment.orderId, myName)) {
        const other = getLock(selectedPayment.orderId);
        toast.error(other ? `${other.heldBy} is currently viewing this order` : "This order is no longer available", {
          description: "Only the current reviewer can verify. Refresh to see the latest status.",
        });
        return;
      }

      // ===== CONFLICT GUARD (Option B) =====
      // Defensive re-read: if someone already verified/rejected this order in
      // another tab while we were looking, abort before writing.
      const orderRecords = dataStore.getOrders();
      const latestOrder = orderRecords.find(
        (o) => o.id === selectedPayment.orderId,
      );
      if (latestOrder && latestOrder.paymentVerified) {
        toast.error("This payment has already been verified", {
          description: "Refresh the page to see the latest status.",
        });
        releaseLock(selectedPayment.orderId, myName);
        setShowDialog(false);
        return;
      }

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

      // The order is processed — release our hold so it's free for anyone.
      releaseLock(selectedPayment.orderId, myName);

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
    // Auto-claim the lock when opening the details (only for actionable rows).
    // NOTE (Supabase later): this claim must be written to the shared
    // session_locks table / broadcast over Realtime so OTHER machines see it,
    // not just this tab's localStorage.
    const existing = getLock(payment.orderId);
    if (payment.status === "pending" || payment.status === "rejected") {
      if (existing && existing.heldBy !== myName) {
        toast.info(`${existing.heldBy} is viewing this order`, {
          description: "You can review it, but only the current reviewer can verify.",
        });
      } else {
        claimLock(payment.orderId, myName);
      }
    }
    setShowDialog(true);
  };

  const filteredPayments = payments
    .filter((p) => {
      const query = searchQuery.toLowerCase();
      if (
        query &&
        !p.id.toLowerCase().includes(query) &&
        !p.customer.toLowerCase().includes(query) &&
        !p.reference?.toLowerCase().includes(query)
      )
        return false;
      if (statusFilter === "pending" && p.status !== "pending")
        return false;
      if (statusFilter === "verified" && p.status !== "verified")
        return false;
      if (statusFilter === "rejected" && !(p.status === "rejected" && !p.canceled))
        return false;
      if (
        statusFilter === "cancelled" &&
        !(p.status === "rejected" && p.canceled && !p.expired)
      )
        return false;
      if (statusFilter === "expired" && !(p.status === "rejected" && p.expired))
        return false;
      if (typeFilter === "cash" && p.kind !== "cash") return false;
      if (typeFilter === "online" && p.kind !== "online") return false;
      if (typeFilter === "online-down" && p.kind !== "online-down")
        return false;
      if (methodFilter !== "all" && p.method !== methodFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      // AUTOMATIC FIFO (verification order): pending items first, oldest
      // first, so the next payment to verify always sits at the top;
      // verified/rejected follow newest-first for convenience.
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

  // Distinct payment methods present in the list (for the Method filter)
  const methodsInList = useMemo(
    () => Array.from(new Set(payments.map((p) => p.method))).sort(),
    [payments],
  );

  const stats = {
    pending: payments.filter((p) => p.status === "pending")
      .length,
    verifiedToday: payments.filter(
      (p) =>
        p.status === "verified" &&
        toPHTKey(p.submittedAt) === todayPHTKey(),
    ).length,
    inQueue: dataStore.getOrders().filter(
      (o) => o.status === "In Queue",
    ).length,
    canceled: dataStore.getOrders().filter(
      (o) => o.status === "Canceled",
    ).length,
    totalVerifiedToday: payments
      .filter(
        (p) =>
          p.status === "verified" &&
          toPHTKey(p.submittedAt) === todayPHTKey(),
      )
      .reduce((sum, p) => sum + p.amount, 0),
  };

  return (
    <Layout menuItems={menuItems} title="Payment Verification" showBackButton>
      <StaffTimeInGate>
        <div className="flex flex-col h-full max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#1c1f26]">
              Payment Verification
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Review and verify customer payments
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200 shadow-sm rounded-lg h-9 text-sm"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-4 shrink-0">
          <SummaryCard
            label="Pending Verification"
            value={stats.pending}
            icon={Clock}
            active={statusFilter === "pending"}
            onClick={() =>
              setStatusFilter((f) => (f === "pending" ? "all" : "pending"))
            }
          />
          <SummaryCard
            label="Verified Today"
            value={stats.verifiedToday}
            icon={CheckCircle}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            label="In Queue"
            value={stats.inQueue}
            icon={ListOrdered}
          />
          <SummaryCard
            label="Cancelled / Expired"
            value={stats.canceled}
            icon={XCircle}
            iconBg="bg-red-50"
            iconColor="text-red-500"
          />
          <SummaryCard
            highlight
            label="Total Verified Today"
            value={`₱${stats.totalVerifiedToday.toLocaleString()}`}
            icon={Banknote}
          />
        </div>

        {/* Payment Filter / Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target
                  .value as "all" | "pending" | "verified" | "rejected" | "cancelled" | "expired",
              )
            }
            className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73EC]/30 focus:border-[#1D73EC]/40 cursor-pointer"
          >
            <option value="pending">Status · Pending</option>
            <option value="all">Status · All</option>
            <option value="verified">Status · Verified</option>
            <option value="rejected">Status · Rejected</option>
            <option value="cancelled">Status · Cancelled</option>
            <option value="expired">Status · Expired</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value as "all" | "cash" | "online" | "online-down",
              )
            }
            className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73EC]/30 focus:border-[#1D73EC]/40 cursor-pointer"
          >
            <option value="all">Type · All</option>
            <option value="cash">Type · Cash on Pickup</option>
            <option value="online">Type · Full Payment</option>
            <option value="online-down">Type · Down Payment</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73EC]/30 focus:border-[#1D73EC]/40 cursor-pointer"
          >
            <option value="all">Method · All</option>
            {methodsInList.map((m) => (
              <option key={m} value={m}>
                Method · {m}
              </option>
            ))}
          </select>
        </div>

        {/* Payments Table */}
        <Card className="flex-1 border border-gray-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F2F7FF] border-b border-[#1D73EC]/10">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider w-24">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Payment Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-[#10316B] uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <CreditCard className="mx-auto mb-3 h-10 w-10 text-[#1D73EC]/35" />
                      <p className="text-sm font-semibold text-gray-500">No payments to verify</p>
                      <p className="mt-1 text-xs text-gray-500">Payment records will appear here when customers place orders.</p>
                    </td>
                  </tr>
                ) : filteredPayments.map((payment, index) => {
                  const isNext =
                    payment.status === "pending" &&
                    payment.id === nextToVerifyId;
                  const priority = pendingSequenceById.get(payment.id);
                  // Live lock for this row (recomputed on every locksTick).
                  const rowLock = getLock(payment.orderId);
                  const rowLockedByMe = !!rowLock && rowLock.heldBy === myName;
                  return (
                  <tr
                    key={payment.id}
                    className="hover:bg-[#F2F7FF]/60 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetails(payment)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap align-top">
                      <div className="flex flex-col items-center gap-1">
                        {payment.status === "pending" ? (
                          <>
                            <span
                              className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0 ${
                                isNext
                                  ? "bg-[#1D73EC] text-white shadow-[0_0_0_3px_rgba(29,115,236,0.15)]"
                                  : "bg-[#F2F7FF] text-[#10316B] border border-[#1D73EC]/10"
                              }`}
                            >
                              {priority ?? index + 1}
                            </span>
                            {isNext && (
                              <StartHereTag label="Next to Verify" />
                            )}
                          </>
                        ) : payment.status === "verified" ? (
                          <span className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-green-50 text-green-600 shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-red-50 text-red-500 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={payment.customer} />
                        <div className="leading-tight">
                          <p className="text-sm font-semibold text-[#1c1f26]">
                            {payment.customer}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {payment.orderId}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {formatPHDate(payment.submittedAt, "short")} · {payment.time}
                          </p>
                          {rowLock && (
                            <span
                              title={
                                rowLockedByMe
                                  ? "You are reviewing this order"
                                  : `${rowLock.heldBy} is reviewing this order`
                              }
                              className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
                                rowLockedByMe ? "text-green-600" : "text-amber-600"
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              {rowLockedByMe ? "Reviewing (you)" : `${rowLock.heldBy} is viewing`}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PaymentTypePill kind={payment.kind} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                        {payment.method !== "Cash" ? (
                          <Smartphone className="w-3.5 h-3.5 text-[#1D73EC]" />
                        ) : (
                          <Banknote className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {payment.kind === "cash" ? (
                        <div className="leading-tight">
                          <p className="text-sm font-bold text-[#1c1f26]">
                            ₱{payment.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Amount to pay at shop
                          </p>
                          {payment.deadline && (
                            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                              Due {formatPHDateTime(payment.deadline)}
                            </p>
                          )}
                        </div>
                      ) : payment.kind === "online-down" ? (
                        <div className="leading-tight">
                          <p className="text-sm font-bold text-[#1c1f26]">
                            ₱{payment.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Paid ₱{payment.amountPaid.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            Balance ₱{payment.remainingBalance.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <div className="leading-tight">
                          <p className="text-sm font-bold text-[#1c1f26]">
                            ₱{payment.totalAmount.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Paid ₱{payment.amountPaid.toLocaleString()}
                            <span className="text-green-600 font-semibold">
                              {" "}· Fully paid
                            </span>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge
                        status={payment.status}
                        canceled={payment.canceled}
                        expired={payment.expired}
                        lowValueCash={payment.isLowValueCash}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs text-gray-600 border-gray-200 hover:border-[#1D73EC]/30 hover:text-[#1D73EC] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Payment Details Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            // Release OUR hold when this details modal closes (reviewer done,
            // or closed via X / Reject flow). ONLY releases our own lock —
            // a different reviewer holding it is left untouched. The lock then
            // expires on its own if a tab dies without cleanup.
            if (selectedPayment) releaseLock(selectedPayment.orderId, myName);
            setShowDialog(false);
          } else {
            setShowDialog(true);
          }
        }}
      >
<DialogContent className="sm:max-w-2xl max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 pt-4 pr-10 pb-3 border-b border-gray-200 flex-row items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-[#1c1f26]">
                Payment Details
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Review and verify payment information
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs bg-gray-100 text-gray-700 border-gray-200 font-mono"
            >
              {selectedPayment?.orderId}
            </Badge>
          </DialogHeader>

          {selectedPayment && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Session lock banner (demo: two tabs = two PCs) */}
                {selectedPayment.status === "pending" || selectedPayment.status === "rejected" ? (
                  iHoldLock ? (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-semibold text-green-700 flex-1 min-w-[160px]">
                        You are reviewing this order
                      </p>
                      <span className="text-[11px] font-medium text-green-600">
                        Only you can verify it right now
                      </span>
                    </div>
                  ) : lockHolder ? (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50">
                      <Eye className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-800 flex-1 min-w-[160px]">
                        {lockHolder} is reviewing this order
                      </p>
                      <span className="text-[11px] font-medium text-amber-700">
                        Verify is locked until they finish
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <p className="text-sm font-semibold text-gray-600 flex-1 min-w-[160px]">
                        This order is available
                      </p>
                      <span className="text-[11px] font-medium text-gray-500">
                        Claim it by opening the details
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50">
                    <Unlock className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-600 flex-1 min-w-[160px]">
                      This order is already processed
                    </p>
                    <span className="text-[11px] font-medium text-gray-500">
                      Read-only review
                    </span>
                  </div>
                )}

                {/* Customer */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <Avatar name={selectedPayment.customer} />
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-[#1c1f26] text-base">
                      {selectedPayment.customer}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted {formatPHDate(selectedPayment.submittedAt, "short")} ·{" "}
                      {formatPHTime(selectedPayment.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={selectedPayment.status}
                    lowValueCash={selectedPayment.isLowValueCash}
                    className="text-sm"
                  />
                </div>

                {/* Payment Summary */}
                <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-300 bg-gray-50/50">
                    <p className="text-xs font-bold text-[#1c1f26] uppercase tracking-wider">
                      Payment Summary
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-gray-100">
                    <div className="bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Order ID
                      </p>
                      <p className="font-semibold text-[#1c1f26] font-mono text-sm">
                        {selectedPayment.orderId}
                      </p>
                    </div>
                    <div className="bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Payment Type
                      </p>
                      <PaymentTypePill kind={selectedPayment.kind} />
                    </div>
                    <div className="bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Payment Method
                      </p>
                      <p className="font-semibold text-[#1c1f26]">
                        {selectedPayment.method}
                      </p>
                    </div>
                    <div className="bg-white p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Order Total
                      </p>
                      <p className="text-base font-semibold text-[#1c1f26]">
                        ₱{selectedPayment.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div
                  className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
                    selectedPayment.status === "verified"
                      ? "bg-green-50 border-green-200"
                      : selectedPayment.status === "rejected"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Verification Status
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      Payment submitted:{" "}
                      {formatPHDate(selectedPayment.submittedAt, "short")} ·{" "}
                      {formatPHTime(selectedPayment.submittedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={selectedPayment.status}
                    canceled={selectedPayment.canceled}
                    expired={selectedPayment.expired}
                    lowValueCash={selectedPayment.isLowValueCash}
                  />
                </div>

                {/* Payment Information (online methods only) */}
                {selectedPayment.method !== "Cash" &&
                  (() => {
                    const methodDetails =
                      paymentMethodsStore.findByName(selectedPayment.method);
                    return (
                      <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-gray-300 bg-gray-50/50">
                          <p className="text-xs font-bold text-[#1c1f26] uppercase tracking-wider">
                            Payment Information
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                          <div className="bg-white p-4 flex flex-col items-center justify-center gap-3">
                            {methodDetails?.qrCode ? (
                              <img
                                src={methodDetails.qrCode}
                                alt={`${selectedPayment.method} QR code`}
                                className="w-36 h-36 rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="w-36 h-36 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <QrCode className="w-10 h-10 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="bg-white divide-y divide-gray-100">
                            <div className="px-4 py-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                                Account Name
                              </p>
                              <p className="font-semibold text-[#1c1f26]">
                                {methodDetails?.accountName || "—"}
                              </p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                                Payment Number
                              </p>
                              <p className="font-semibold text-[#1c1f26]">
                                {methodDetails?.accountNumber || "—"}
                              </p>
                            </div>
                            <div className="px-4 py-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                                Payment Method
                              </p>
                              <p className="font-semibold text-[#1c1f26]">
                                {selectedPayment.method}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Reference Number */}
                {selectedPayment.reference &&
                  !selectedPayment.isLowValueCash && (
                    <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-300 bg-gray-50/50 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-[#1c1f26] uppercase tracking-wider">
                          {selectedPayment.method} Reference Number
                        </p>
                        {selectedPayment.proofImageUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowProofImage(true)}
                            className="h-7 border-2 border-[#2F6FD6]/30 text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Proof
                          </Button>
                        )}
                      </div>
                      <div className="px-4 py-3 bg-white">
                        <p className="text-sm font-mono font-semibold text-[#10316B]">
                          {selectedPayment.reference}
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Sticky action footer */}
              <div className="px-5 py-3 border-t border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
                {(selectedPayment.status === "pending" ||
                  selectedPayment.status === "rejected") && (
                  <>
                    <Button
                      data-primary-action
                      disabled={!iHoldLock}
                      title={
                        !iHoldLock && lockHolder
                          ? `${lockHolder} is reviewing this order`
                          : undefined
                      }
                      className="bg-[#2F6FD6] text-white hover:bg-[#2557b8] hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      onClick={() => setPendingVerifyAction("verified")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Payment
                    </Button>
                    {selectedPayment.status === "pending" && (
                      <Button
                        variant="outline"
                        disabled={!iHoldLock}
                        title={
                          !iHoldLock && lockHolder
                            ? `${lockHolder} is reviewing this order`
                            : undefined
                        }
                        className="border-2 border-red-300 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-40 disabled:pointer-events-none"
                        onClick={() => {
                          setShowDialog(false);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Payment
                      </Button>
                    )}
                  </>
                )}
                {selectedPayment.status !== "pending" &&
                  selectedPayment.status !== "rejected" && (
                    <p className="text-xs font-medium text-gray-400 ml-auto">
                      Read-only — this order is already processed
                    </p>
                  )}
              </div>
            </>
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
              className="border-2 border-[#1D73EC]/30 text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white font-bold"
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
className="font-semibold border-2 border-[#1D73EC]/30 text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white transition-all"
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
          title="Verify Payment?"
          description="Confirm that this payment has been reviewed and approved."
          confirmLabel="Verify Payment"
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
          description={`Confirm that this payment should be rejected${
            rejectionReason.trim() ? ` (${rejectionReason.trim()})` : ""
          }.`}
          confirmLabel="Reject Payment"
          cancelLabel="Go Back"
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
  canceled,
  expired,
  className,
  lowValueCash,
}: {
  status: string;
  canceled?: boolean;
  expired?: boolean;
  className?: string;
  lowValueCash?: boolean;
}) {
  const isPending = status === "pending";
  const label =
    status === "verified"
      ? "Verified"
      : isPending
        ? lowValueCash
          ? "Pending Payment"
          : "Pending"
        : expired
          ? "Expired"
          : canceled
            ? "Cancelled"
            : "Rejected";
  const styles =
    status === "verified"
      ? "bg-green-50 text-green-700 border-green-200"
      : isPending
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-600 border-red-200";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        variant="outline"
        className={`text-[11px] font-semibold py-0.5 px-2 rounded-full border ${styles} ${className}`}
      >
        {label}
      </Badge>
      {isPending && lowValueCash && (
        <Badge
          variant="outline"
          className="text-[10px] font-semibold py-0.5 px-1.5 rounded-full border bg-blue-50 text-[#1D73EC] border-blue-200"
        >
          In Queue
        </Badge>
      )}
    </span>
  );
}

function PaymentTypePill({
  kind,
}: {
  kind: PaymentType["kind"];
}) {
  const config =
    kind === "cash"
      ? {
          label: "Cash on Pickup",
          cls: "bg-blue-50 text-[#1D73EC] border-blue-200",
          icon: Banknote,
        }
      : kind === "online-down"
        ? {
            label: "Down Payment",
            cls: "bg-amber-50 text-amber-700 border-amber-200",
            icon: Smartphone,
          }
        : {
            label: "Full Payment",
            cls: "bg-green-50 text-green-700 border-green-200",
            icon: Smartphone,
          };
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium py-0.5 px-2 rounded-full border inline-flex items-center gap-1 ${config.cls}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
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
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#F2F7FF] text-[#1D73EC] border border-[#1D73EC]/10">
      {initials}
    </div>
  );
};
