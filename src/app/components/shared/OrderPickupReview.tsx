import React, { useEffect, useState } from "react";
import {
  PackageCheck,
  Clock,
  BellRing,
  ClipboardCheck,
  PackageX,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  CalendarClock,
  ChevronRight,
  Info,
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
import { formatPHDateTime } from "../../utils/pht";
import { formatCurrency } from "../../utils/formatNumber";
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
// Rendered inside the staff/admin Order Details dialog (and the Pickup
// Monitoring / Unclaimed Orders modals). It surfaces the pickup lifecycle and
// the proposed incident-review workflow. Every action here is PRESENTATIONAL:
// it updates an in-memory preview map (utils/pickupReview.ts) only — no penalty,
// restriction, notification, or database write happens.
//
// ROLE PERMISSIONS (enforced in the UI — the server must enforce them later):
//   Admin  → Keep Under Review, Confirm Unclaimed Order, Excuse Incident, choose
//            the 2nd-offence advance-payment arrangement, modify/remove a
//            restriction. Admin makes the final decision.
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

function paymentBadgeClasses(status: string): string {
  if (status === "Paid")
    return "bg-[#E8F7D8] text-[#3B7A1E] border-[#55A630]/40";
  if (status === "Partially Paid")
    return "bg-[#FFF5D6] text-[#92400E] border-[#F59E0B]/40";
  return "bg-[#FDE8E8] text-[#B91C1C] border-[#DC2626]/40";
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  subtitle,
  badge,
  badgeClasses,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  badge?: string;
  badgeClasses?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#2F6FD6]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-[#10316B]">{value}</span>
        {badge && (
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold ${badgeClasses ?? ""}`}
          >
            {badge}
          </Badge>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

type DecisionTone = "blue" | "green" | "slate";

const DECISION_TONES: Record<
  DecisionTone,
  { iconBg: string; iconColor: string; selected: string }
> = {
  blue: {
    iconBg: "bg-[#EAF3FF]",
    iconColor: "text-[#2F6FD6]",
    selected: "border-[#2F6FD6] bg-[#F2F7FF] ring-1 ring-[#2F6FD6]/20",
  },
  green: {
    iconBg: "bg-[#E8F7D8]",
    iconColor: "text-[#3B7A1E]",
    selected: "border-[#55A630] bg-[#F3FBEA] ring-1 ring-[#55A630]/20",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    selected: "border-slate-400 bg-slate-50 ring-1 ring-slate-400/20",
  },
};

function DecisionCard({
  icon: Icon,
  title,
  description,
  tone,
  selected = false,
  disabled = false,
  title_attr,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tone: DecisionTone;
  selected?: boolean;
  disabled?: boolean;
  title_attr?: string;
  onClick: () => void;
}) {
  const t = DECISION_TONES[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      title={title_attr}
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6FD6]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? t.selected
          : "border-gray-200 bg-white hover:border-[#2F6FD6]/40 hover:bg-[#F8FAFF]"
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${t.iconBg} ${t.iconColor}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1c1f26]">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-[#2F6FD6]" />
    </button>
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
  const [arrangementOpen, setArrangementOpen] = useState(false);

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
  const disabled = readOnly;

  const previewNote = "Preview only — no penalty or customer restriction is applied.";

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
    toast.info(message ?? previewNote, {
      description: "Sample workflow — nothing was saved.",
    });
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
      description:
        "Staff cannot make the final decision — this is a sample workflow.",
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
    toast.info(
      `Advance-payment arrangement set: ${PAYMENT_ARRANGEMENT_LABELS[arrangement]} (preview).`,
      {
        description: "Preview only — no restriction is applied to the customer.",
      },
    );
  };

  const handleRemoveRestriction = () => {
    pickupReview.setRestriction(key, {
      active: false,
      arrangement: restriction.arrangement,
      reason:
        removeReason.trim() || "Restriction removed after payment settlement",
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

  const readyText = isReady ? "Ready" : "Not ready";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Order Overview */}
      <section className="p-5">
        <h3 className="text-base font-semibold text-[#10316B]">
          Order Overview
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            icon={Wallet}
            label="Payment & Balance"
            value={formatCurrency(payment.remaining)}
            subtitle={
              payment.remaining > 0
                ? "Outstanding balance"
                : "No outstanding balance"
            }
            badge={payment.remaining > 0 ? "Payment Due" : "Paid"}
            badgeClasses={paymentBadgeClasses(payment.status)}
          />
          <OverviewCard
            icon={PackageCheck}
            label="Pickup Readiness"
            value={readyText}
            subtitle={
              isReady ? "Marked ready for pickup" : "Not marked for pickup"
            }
          />
          <OverviewCard
            icon={CalendarClock}
            label="Pickup Deadline"
            value="Not configured"
            subtitle="Pending approval"
          />
          <OverviewCard
            icon={BellRing}
            label="Pickup Reminders"
            value="0 sent"
            subtitle="No reminders yet"
          />
        </div>
      </section>

      {/* Unclaimed-order Review */}
      <section className="border-t border-gray-100 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[#2F6FD6]" />
          <h3 className="text-base font-semibold text-[#10316B]">
            Unclaimed-order Review
          </h3>
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold ${incidentBadgeClasses(status)}`}
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

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-[#10316B]">
            {confirmedCount}
          </span>
          <span className="text-sm text-gray-500">
            confirmed incident{confirmedCount === 1 ? "" : "s"} on account
          </span>
        </div>

        <div
          className={`mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-100 ${
            isAdmin ? "sm:grid-cols-2" : ""
          }`}
        >
          <div className="bg-[#F8FAFF] p-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Customer Explanation
            </p>
            {incident?.customerExplanation ? (
              <p className="text-sm leading-relaxed text-gray-700">
                {incident.customerExplanation}
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                No explanation provided yet
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="bg-[#F8FAFF] p-4">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Flag className="h-3.5 w-3.5" /> Staff Note
              </p>
              {incident?.staffNote ? (
                <p className="text-sm leading-relaxed text-gray-700">
                  {incident.staffNote}
                  {incident.flaggedBy && (
                    <span className="ml-1 text-xs text-gray-400">
                      — {incident.flaggedBy}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400">No staff note submitted</p>
              )}
            </div>
          )}
        </div>

        {incident?.reason && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/70 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {status === "excused" ? "Excuse reason" : "Review note"}
            </p>
            <p className="mt-0.5 text-sm text-gray-700">{incident.reason}</p>
          </div>
        )}
      </section>

      {/* Preview-mode banner */}
      <div className="border-t border-gray-100 px-5 py-3">
        <div className="flex items-start gap-2 rounded-lg bg-[#EAF3FF] px-3 py-2 text-xs text-[#10316B]">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#2F6FD6]" />
          <p>
            <strong>Preview mode.</strong> Decisions update temporary preview
            state only. No restrictions or penalties are applied to the customer
            account.
          </p>
        </div>
      </div>

      {/* Decision section — role-gated */}
      <section className="border-t border-gray-100 p-5">
        {isAdmin ? (
          <>
            <h3 className="text-base font-semibold text-[#10316B]">
              Admin Decision
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose the appropriate outcome after reviewing the incident.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DecisionCard
                icon={Clock}
                tone="blue"
                title="Keep under review"
                description="The incident needs further review."
                selected={status === "pending_review"}
                disabled={disabled}
                title_attr={
                  readOnly ? "Another staff member is managing this order" : undefined
                }
                onClick={() => setKeepOpen(true)}
              />
              <DecisionCard
                icon={CheckCircle}
                tone="green"
                title="Confirm unclaimed order"
                description="Record the incident as confirmed."
                selected={status === "confirmed_unclaimed"}
                disabled={disabled || status === "confirmed_unclaimed"}
                title_attr={
                  readOnly ? "Another staff member is managing this order" : undefined
                }
                onClick={() => setConfirmOpen(true)}
              />
              <DecisionCard
                icon={ShieldCheck}
                tone="slate"
                title="Excuse incident"
                description="Record an excused outcome."
                selected={status === "excused"}
                disabled={disabled || status === "excused"}
                title_attr={
                  readOnly ? "Another staff member is managing this order" : undefined
                }
                onClick={() => setExcuseOpen(true)}
              />
            </div>

            {showArrangementChooser && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      {restriction.active
                        ? "Advance-payment restriction active"
                        : "Second confirmed unclaimed order"}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800">
                      {restriction.active
                        ? PAYMENT_ARRANGEMENT_LABELS[restriction.arrangement ?? "deposit_50"]
                        : "A repeat-offence arrangement may be required."}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => setArrangementOpen(true)}
                  className="bg-white text-amber-700 border-2 border-amber-300 hover:bg-amber-600 hover:text-white disabled:opacity-40"
                >
                  Manage arrangement
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-[#10316B]">
              Staff Actions
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Flag the order for Admin review or add a private note.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DecisionCard
                icon={Flag}
                tone="blue"
                title="Flag for review"
                description="Move this order to Pending Review."
                selected={status === "pending_review"}
                disabled={disabled || status === "confirmed_unclaimed"}
                title_attr={
                  readOnly ? "Another staff member is managing this order" : undefined
                }
                onClick={() => setReviewOpen(true)}
              />
              <DecisionCard
                icon={MessageSquarePlus}
                tone="slate"
                title="Add note for Admin"
                description="Share context privately with Admin."
                disabled={disabled}
                title_attr={
                  readOnly ? "Another staff member is managing this order" : undefined
                }
                onClick={() => setStaffNoteOpen(true)}
              />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" />
              Final incident decisions are made by Admin.
            </p>
          </>
        )}
      </section>

      {/* Review Incident / Flag for Review (staff) */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              Flag for Review
            </DialogTitle>
            <DialogDescription>
              Flag order {order.displayId ?? order.id} for Admin review. It will
              move to <strong>Pending Review</strong>; only Admin can make the
              final decision.
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
              Mark {order.displayId ?? order.id} ({order.customer}) as a
              confirmed unclaimed order. In the proposed policy this would count
              toward the customer's incident history and may lead to a payment
              restriction — the exact rules are not yet approved, so this is a
              preview and nothing is applied.
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
            <DialogTitle className="text-[#10316B]">
              Excuse Incident
            </DialogTitle>
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
            <DialogTitle className="text-[#10316B]">
              Keep Under Review
            </DialogTitle>
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
            <DialogTitle className="text-[#10316B]">
              Add Note for Admin
            </DialogTitle>
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

      {/* Advance-payment arrangement (Admin, progressive disclosure) */}
      <Dialog open={arrangementOpen} onOpenChange={setArrangementOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-xl text-[#10316B]">
                Advance-payment arrangement
              </DialogTitle>
            </div>
            <DialogDescription>
              A repeat confirmed unclaimed order may require an advance-payment
              arrangement for future orders. Preview only — the customer is not
              restricted and the duration is still pending policy approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-xs text-gray-500">
              {confirmedCount} confirmed incident{confirmedCount === 1 ? "" : "s"}{" "}
              on this account.
              {restriction.active && restriction.arrangement
                ? ` Current restriction: ${PAYMENT_ARRANGEMENT_LABELS[restriction.arrangement]}.`
                : " No restriction currently active."}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(["deposit_50", "full_advance"] as PaymentArrangement[]).map(
                (opt) => {
                  const selected =
                    restriction.arrangement === opt && restriction.active;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSetArrangement(opt)}
                      className={`rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                        selected
                          ? "border-[#2F6FD6] bg-[#F2F7FF] text-[#10316B]"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#2F6FD6]"
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
                },
              )}
            </div>
            {restriction.active && (
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setArrangementOpen(false);
                  setRemoveRestrictionOpen(true);
                }}
                className="bg-white text-red-600 border-2 border-red-200 hover:bg-red-600 hover:text-white disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove Restriction
              </Button>
            )}
            <div className="rounded-lg border border-[#1D73EC]/20 bg-[#F2F7FF] p-3 text-sm text-[#10316B]">
              Preview only — restriction duration and enforcement are pending
              policy approval; nothing is applied to the customer account.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setArrangementOpen(false)}
              className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              Done
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
