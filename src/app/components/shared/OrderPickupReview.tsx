import React, { useEffect, useState } from "react";
import {
  PackageCheck,
  Clock,
  BellRing,
  History,
  ClipboardCheck,
  PackageX,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Flag,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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
import { formatPHDate, formatPHTime, formatPHDateTime } from "../../utils/pht";
import { formatCurrency } from "../../utils/formatNumber";
import { getStatusBadgeClasses } from "../../utils/orderStatusPalette";
import { computeOrderPayment } from "./OrderPaymentSummary";
import {
  pickupReview,
  INCIDENT_STATUS_LABELS,
  PAYMENT_ARRANGEMENT_LABELS,
  type IncidentReviewStatus,
  type PaymentArrangement,
} from "../../utils/pickupReview";

// PREVIEW SECTION — "Pickup & Order Review".
//
// Rendered inside the staff/admin Order Details dialog. It surfaces the pickup
// lifecycle and the proposed incident-review workflow. Every action here is
// PRESENTATIONAL: it updates an in-memory preview map (utils/pickupReview.ts)
// only — no penalty, restriction, notification, or database write happens.
//
// ROLE PERMISSIONS (enforced in the UI — the server must enforce them later):
//   Admin  → Review Incident, Confirm Unclaimed Order, Excuse Incident, Keep
//            Under Review, choose the 2nd-offence advance-payment arrangement,
//            modify/remove a restriction. Admin makes the final decision.
//   Staff  → View status, flag for review, submit a note for Admin. Staff can
//            NEVER confirm/excuse an incident or touch a restriction.
//
// The pickup DEADLINE and restriction DURATION are intentionally shown as
// "not configured" / "pending policy approval" because those rules have not
// been confirmed by the client yet.

interface ReviewOrder {
  id: string;
  displayId?: string;
  customer: string;
  customerEmail?: string;
  status: string;
  submittedAt?: Date;
  statusUpdatedAt?: Date;
  total?: number;
  costBreakdown?: { total: number };
  paymentVerified?: boolean;
  paymentMethod?: string;
  downPaymentRequired?: boolean;
  downPaymentVerified?: boolean;
  downPaymentAmount?: number;
  fullPaymentRequired?: boolean;
  fullPaymentVerified?: boolean;
  fullPaymentAmount?: number;
}

interface OrderPickupReviewProps {
  order: ReviewOrder;
  fallbackTotal?: number;
  reviewerName: string;
  /** Reviewer's role — controls which decision controls are rendered. */
  role: "admin" | "staff";
  /** Per-customer key used to group incidents/restrictions. Defaults to email/name. */
  customerKey?: string;
  /** When another staff/admin holds the order's session lock. */
  readOnly?: boolean;
}

function incidentBadgeClasses(status: IncidentReviewStatus): string {
  switch (status) {
    case "confirmed_unclaimed":
      return "bg-[#FDE8E8] text-[#B91C1C] border-[#DC2626]/40";
    case "pending_review":
      return "bg-[#FFF5D6] text-[#92400E] border-[#F59E0B]/40";
    case "excused":
      return "bg-[#E0F7F5] text-[#0F766E] border-[#159A9C]/40";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </p>
      <div className="text-sm font-medium text-[#1c1f26]">{children}</div>
    </div>
  );
}

export default function OrderPickupReview({
  order,
  fallbackTotal = 0,
  reviewerName,
  role,
  customerKey,
  readOnly = false,
}: OrderPickupReviewProps) {
  const [, setTick] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [staffNoteOpen, setStaffNoteOpen] = useState(false);
  const [removeRestrictionOpen, setRemoveRestrictionOpen] = useState(false);

  const [stateReason, setStateReason] = useState("");
  const [excuseReason, setExcuseReason] = useState("");
  const [keepNote, setKeepNote] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [removeReason, setRemoveReason] = useState("");

  useEffect(() => {
    return pickupReview.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isAdmin = role === "admin";
  const key = customerKey || order.customerEmail || order.customer;
  const incident = pickupReview.getIncident(order.id);
  const status: IncidentReviewStatus = incident?.status ?? "not_reviewed";
  const payment = computeOrderPayment(order, fallbackTotal);
  const confirmedCount = pickupReview.getConfirmedCount(key);
  const restriction = pickupReview.getRestriction(key);

  const isReady = order.status === "Released" || order.status === "released";
  const readyAt = isReady ? order.statusUpdatedAt : undefined;

  const previewNote = "Preview only — no penalty or customer restriction is applied.";
  const disabled = readOnly;

  const applyPreview = (
    next: IncidentReviewStatus,
    reason?: string,
    message?: string,
  ) => {
    pickupReview.setIncident(order.id, {
      customerKey: key,
      status: next,
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
      reason,
    });
    toast.info(message ?? previewNote, { description: "Sample workflow — nothing was saved." });
  };

  const handleConfirmUnclaimed = () => {
    applyPreview(
      "confirmed_unclaimed",
      stateReason.trim(),
      "Marked as Confirmed Unclaimed (preview).",
    );
    setConfirmOpen(false);
    setStateReason("");
  };

  const handleExcuse = () => {
    applyPreview("excused", excuseReason.trim(), "Incident excused (preview).");
    setExcuseOpen(false);
    setExcuseReason("");
  };

  const handleStartReview = () => {
    applyPreview("pending_review", undefined, "Moved to Pending Review (preview).");
    setReviewOpen(false);
  };

  const handleKeepUnderReview = () => {
    applyPreview("pending_review", keepNote.trim(), "Kept under review (preview).");
    setKeepOpen(false);
    setKeepNote("");
  };

  const handleSubmitStaffNote = () => {
    pickupReview.setIncident(order.id, {
      customerKey: key,
      status: status === "not_reviewed" ? "pending_review" : status,
      staffNote: staffNote.trim(),
      flaggedForReview: true,
      flaggedBy: reviewerName,
    });
    toast.info("Note submitted to Admin (preview).", {
      description: "Staff cannot make the final decision — this is a sample workflow.",
    });
    setStaffNoteOpen(false);
    setStaffNote("");
  };

  const handleSetArrangement = (arrangement: PaymentArrangement) => {
    pickupReview.setRestriction(key, {
      arrangement,
      active: true,
      reason: "Second confirmed unclaimed order",
      updatedBy: reviewerName,
    });
    toast.info(`Advance-payment arrangement set: ${PAYMENT_ARRANGEMENT_LABELS[arrangement]} (preview).`, {
      description: "Preview only — no restriction is applied to the customer.",
    });
  };

  const handleRemoveRestriction = () => {
    pickupReview.setRestriction(key, {
      active: false,
      arrangement: restriction.arrangement,
      reason: removeReason.trim() || "Restriction removed after payment settlement",
      updatedBy: reviewerName,
    });
    toast.info("Restriction removed (preview).", {
      description: "Previous incidents stay in the history. Nothing was saved.",
    });
    setRemoveRestrictionOpen(false);
    setRemoveReason("");
  };

  // A restriction is only proposed from the SECOND confirmed offence on.
  const showArrangementChooser =
    isAdmin && (confirmedCount >= 2 || restriction.active);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50/50 px-4 py-2.5">
        <PackageCheck className="h-4 w-4 text-[#2F6FD6]" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1c1f26]">
          Pickup &amp; Order Review
        </h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2F6FD6] ring-1 ring-[#2F6FD6]/20">
          <AlertTriangle className="h-3 w-3" />
          Preview workflow
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-2">
        <Field icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Order">
          <span className="font-semibold">{order.customer}</span>
          <span className="ml-2 font-mono text-xs text-gray-500">
            {order.displayId ?? order.id}
          </span>
        </Field>

        <Field icon={<CheckCircle className="h-3.5 w-3.5" />} label="Order Status">
          <Badge
            variant="outline"
            className={`text-xs font-medium capitalize ${getStatusBadgeClasses(order.status)}`}
          >
            {order.status === "Released"
              ? "Ready for Pickup"
              : order.status === "inQueue"
                ? "In Queue"
                : order.status === "awaitingPayment"
                  ? "Awaiting Payment"
                  : order.status}
          </Badge>
        </Field>

        <Field icon={<PackageCheck className="h-3.5 w-3.5" />} label="Payment & Balance">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-medium ${
                payment.status === "Paid"
                  ? "bg-[#E8F7D8] text-[#3B7A1E] border-[#55A630]/40"
                  : payment.status === "Partially Paid"
                    ? "bg-[#FFF5D6] text-[#92400E] border-[#F59E0B]/40"
                    : "bg-[#FDE8E8] text-[#B91C1C] border-[#DC2626]/40"
              }`}
            >
              {payment.status}
            </Badge>
            <span className="text-xs text-gray-500">
              Outstanding:{" "}
              <span className="font-semibold text-gray-800">
                {formatCurrency(payment.remaining)}
              </span>
            </span>
          </div>
        </Field>

        <Field icon={<Clock className="h-3.5 w-3.5" />} label="Marked Ready for Pickup">
          {readyAt ? (
            `${formatPHDate(readyAt)} · ${formatPHTime(readyAt)}`
          ) : (
            <span className="text-gray-400">Not yet ready for pickup</span>
          )}
        </Field>

        <Field icon={<Clock className="h-3.5 w-3.5" />} label="Pickup Deadline">
          <span className="text-gray-400">
            Pickup deadline not configured
          </span>
          <p className="mt-1 text-[11px] font-normal text-gray-400">
            Proposed: Cash on Pickup collected the same day the order is ready
            (shop-closing cutoff pending approval). Fully paid pickup period
            pending confirmation.
          </p>
        </Field>

        <Field icon={<BellRing className="h-3.5 w-3.5" />} label="Pickup Reminders">
          <span className="text-gray-400">No reminders sent yet</span>
        </Field>

        <Field icon={<History className="h-3.5 w-3.5" />} label="Incident Review Status">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${incidentBadgeClasses(status)}`}
            >
              {INCIDENT_STATUS_LABELS[status]}
            </Badge>
            {incident?.reviewedAt && (
              <span className="text-xs text-gray-500">
                {incident.reviewedBy ? `${incident.reviewedBy} · ` : ""}
                {formatPHDateTime(incident.reviewedAt)}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-normal text-gray-500">
            {confirmedCount} confirmed unclaimed order{confirmedCount === 1 ? "" : "s"} on this
            account
          </p>
        </Field>

        <Field icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Restriction Outcome">
          {restriction.active && restriction.arrangement ? (
            <span className="text-amber-700">
              {PAYMENT_ARRANGEMENT_LABELS[restriction.arrangement]}
            </span>
          ) : (
            <span className="text-gray-400">
              No advance-payment restriction currently
            </span>
          )}
          <p className="mt-1 text-[11px] font-normal text-gray-400">
            Restriction duration pending policy approval
          </p>
        </Field>
      </div>

      {/* Customer explanation + staff note */}
      <div className="grid grid-cols-1 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-2">
        <div className="bg-white p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Customer Explanation
          </p>
          {incident?.customerExplanation ? (
            <p className="text-sm text-gray-700">{incident.customerExplanation}</p>
          ) : (
            <p className="text-sm text-gray-400">No explanation provided yet</p>
          )}
        </div>
        {isAdmin && (
          <div className="bg-white p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <Flag className="h-3.5 w-3.5" /> Staff Note
            </p>
            {incident?.staffNote ? (
              <p className="text-sm text-gray-700">
                {incident.staffNote}
                {incident.flaggedBy && (
                  <span className="ml-1 text-xs text-gray-400">— {incident.flaggedBy}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-400">No staff note submitted</p>
            )}
          </div>
        )}
      </div>

      {incident?.reason && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {status === "excused" ? "Excuse reason" : "Review note"}
          </p>
          <p className="mt-0.5 text-sm text-gray-700">{incident.reason}</p>
        </div>
      )}

      {/* 2nd-offence advance-payment arrangement (Admin only) */}
      {showArrangementChooser && (
        <div className="border-t border-amber-200 bg-amber-50/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">
              Second confirmed unclaimed order — choose the required arrangement
            </p>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            Cash on Pickup may be restricted. Admin selects the advance-payment
            arrangement for future orders (preview — the customer is not restricted).
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["deposit_50", "full_advance"] as PaymentArrangement[]).map((opt) => {
              const selected = restriction.arrangement === opt && restriction.active;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSetArrangement(opt)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                    selected
                      ? "border-[#2F6FD6] bg-white text-[#10316B]"
                      : "border-amber-200 bg-white text-gray-700 hover:border-[#2F6FD6]"
                  }`}
                >
                  <span className="block font-semibold">
                    {PAYMENT_ARRANGEMENT_LABELS[opt]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {opt === "deposit_50"
                      ? "Pay 50% upfront on future orders"
                      : "Pay the full amount before printing"}
                  </span>
                </button>
              );
            })}
          </div>
          {restriction.active && (
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setRemoveRestrictionOpen(true)}
              className="mt-2 bg-white text-red-600 border-2 border-red-200 hover:bg-red-600 hover:text-white disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove Restriction
            </Button>
          )}
        </div>
      )}

      {/* Action row — role-gated */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-4 py-3">
        {isAdmin ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setReviewOpen(true)}
              className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white disabled:opacity-40"
            >
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              Review Incident
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || status === "confirmed_unclaimed"}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setConfirmOpen(true)}
              className="bg-white text-red-600 border-2 border-red-200 hover:bg-red-600 hover:text-white disabled:opacity-40"
            >
              <PackageX className="h-4 w-4 mr-1.5" />
              Confirm Unclaimed Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || status === "excused"}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setExcuseOpen(true)}
              className="bg-white text-slate-600 border-2 border-gray-200 hover:bg-slate-600 hover:text-white disabled:opacity-40"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Excuse Incident
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setKeepOpen(true)}
              className="bg-white text-amber-700 border-2 border-amber-200 hover:bg-amber-600 hover:text-white disabled:opacity-40"
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Keep Under Review
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || status === "confirmed_unclaimed"}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setReviewOpen(true)}
              className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white disabled:opacity-40"
            >
              <Flag className="h-4 w-4 mr-1.5" />
              Flag for Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title={readOnly ? "Another staff member is managing this order" : undefined}
              onClick={() => setStaffNoteOpen(true)}
              className="bg-white text-slate-600 border-2 border-gray-200 hover:bg-slate-600 hover:text-white disabled:opacity-40"
            >
              <MessageSquarePlus className="h-4 w-4 mr-1.5" />
              Add Note for Admin
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              Final incident decisions are made by Admin.
            </span>
          </>
        )}
      </div>

      <div className="border-t border-gray-100 bg-[#F2F7FF] px-4 py-2.5">
        <p className="text-xs text-[#10316B]">
          <strong>Design preview.</strong> The pickup window, valid excuses, and
          penalty rules are still awaiting client approval, so these controls
          only update a local sample state — no penalty, payment restriction, or
          notification is applied.
        </p>
      </div>

      {/* Review Incident / Flag for Review */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              {isAdmin ? "Review Incident" : "Flag for Review"}
            </DialogTitle>
            <DialogDescription>
              {isAdmin ? (
                <>Start reviewing this pickup incident for order{" "}
                {order.displayId ?? order.id}. The order will move to{" "}
                <strong>Pending Review</strong>.</>
              ) : (
                <>Flag order {order.displayId ?? order.id} for Admin review. It
                will move to <strong>Pending Review</strong>; only Admin can
                make the final decision.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
            Preview only — marking an incident for review does not create a
            penalty or restrict the customer.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleStartReview}
              className="bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
            >
              Mark Pending Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Unclaimed Order (Admin) — captures a reason */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setStateReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-200">
                <PackageX className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle className="text-xl text-[#10316B]">
                Confirm Unclaimed Order?
              </DialogTitle>
            </div>
            <DialogDescription>
              Mark {order.displayId ?? order.id} ({order.customer}) as a confirmed
              unclaimed order. In the proposed policy this would count toward the
              customer's incident history and may lead to a payment restriction —
              the exact rules are not yet approved, so this is a preview and
              nothing is applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirmReason">Reason *</Label>
            <Textarea
              id="confirmReason"
              rows={3}
              value={stateReason}
              onChange={(e) => setStateReason(e.target.value)}
              placeholder="e.g. No pickup after the reminder window and no response from the customer."
            />
          </div>
          <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
            Preview only — no penalty is created and the confirmation count is
            local to this session.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleConfirmUnclaimed}
              disabled={!stateReason.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Confirm Unclaimed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excuse Incident (Admin) — requires a reason */}
      <Dialog
        open={excuseOpen}
        onOpenChange={(open) => {
          setExcuseOpen(open);
          if (!open) setExcuseReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">Excuse Incident</DialogTitle>
            <DialogDescription>
              Provide a reason for excusing this pickup incident. An excused
              incident does not increase the confirmed count and does not erase
              any outstanding balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="excuseReason">Reason *</Label>
            <Textarea
              id="excuseReason"
              rows={3}
              value={excuseReason}
              onChange={(e) => setExcuseReason(e.target.value)}
              placeholder="e.g. Customer informed the shop in advance and rescheduled pickup."
            />
            <p className="text-xs text-gray-500">
              What qualifies as a valid excuse is still pending client approval —
              Admin reviews the customer's explanation and decides.
            </p>
          </div>
          <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
            Preview only — no record is saved and no restriction is lifted.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setExcuseOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleExcuse}
              disabled={!excuseReason.trim()}
              className="bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
            >
              Excuse Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keep Under Review (Admin) */}
      <Dialog
        open={keepOpen}
        onOpenChange={(open) => {
          setKeepOpen(open);
          if (!open) setKeepNote("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">Keep Under Review</DialogTitle>
            <DialogDescription>
              Leave this incident in <strong>Pending Review</strong> with an
              optional note. The customer is neither confirmed unclaimed nor
              excused yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="keepNote">Note (optional)</Label>
            <Textarea
              id="keepNote"
              rows={3}
              value={keepNote}
              onChange={(e) => setKeepNote(e.target.value)}
              placeholder="e.g. Waiting on the customer's explanation before deciding."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setKeepOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleKeepUnderReview}
              className="bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
            >
              Keep Under Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff note for Admin */}
      <Dialog
        open={staffNoteOpen}
        onOpenChange={(open) => {
          setStaffNoteOpen(open);
          if (!open) setStaffNote("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">Add Note for Admin</DialogTitle>
            <DialogDescription>
              Submit relevant information or a note for Admin to review. Staff
              notes are private and are never shown to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="staffNote">Note *</Label>
            <Textarea
              id="staffNote"
              rows={3}
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="e.g. Customer called and said they were out of town this week."
            />
          </div>
          <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
            Preview only — no message is sent and nothing is saved.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setStaffNoteOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleSubmitStaffNote}
              disabled={!staffNote.trim()}
              className="bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
            >
              Submit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove restriction (Admin) */}
      <Dialog
        open={removeRestrictionOpen}
        onOpenChange={(open) => {
          setRemoveRestrictionOpen(open);
          if (!open) setRemoveReason("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 ring-1 ring-red-200">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle className="text-xl text-[#10316B]">
                Remove Restriction?
              </DialogTitle>
            </div>
            <DialogDescription>
              The proposed policy requires the outstanding payment to be settled
              first. Previous incidents stay in the history after removal. Only
              Admin may remove a restriction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="removeReason">Reason *</Label>
            <Textarea
              id="removeReason"
              rows={2}
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="e.g. Outstanding balance settled in full at the shop."
            />
          </div>
          <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
            Preview only — real customer eligibility is unchanged.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRemoveRestrictionOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Go Back
            </Button>
            <Button
              onClick={handleRemoveRestriction}
              disabled={!removeReason.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
