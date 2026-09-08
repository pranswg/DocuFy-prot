import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  LogIn,
  Lock,
  CalendarDays,
  CreditCard,
  Package,
  ShoppingCart,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceStore, formatPHT } from "../../utils/attendanceStore";
import type { NextAction } from "../../utils/attendanceStore";
import { internetUtcMs, subscribeInternetTime, toPHT } from "../../utils/pht";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

interface StaffTimeInGateProps {
  children: React.ReactNode;
}

const LOCKED_ACTIONS = [
  { icon: CreditCard, label: "Payment verification" },
  { icon: Package, label: "Order processing" },
  { icon: ShoppingCart, label: "Walk-in transactions" },
  { icon: Boxes, label: "Inventory management" },
];

// Gives every staff-facing page a single, consistent time-in lockout.
// While staff haven't clocked in, the page content stays rendered beneath a
// blurred backdrop (unmodified) and a centered Time-In modal sits on top.
export default function StaffTimeInGate({ children }: StaffTimeInGateProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [nextAction, setNextAction] = useState<NextAction>(() =>
    user ? attendanceStore.getNextAction(user.email) : "time-in",
  );
  const [now, setNow] = useState(() => new Date(internetUtcMs()));
  const [showExtraConfirm, setShowExtraConfirm] = useState(false);

  // Admin / customer flows are never locked out.
  const staffUser = user?.role === "staff" ? user : null;

  // Currently "on the clock" only while a session is active.
  const locked = !!staffUser && nextAction !== "time-out";

  // Live clock (internet GMT+8) — tick only while a lockout panel is visible.
  useEffect(() => {
    if (!locked) return;
    const tick = () => setNow(new Date(internetUtcMs()));
    const t = setInterval(tick, 1_000);
    const unsubscribe = subscribeInternetTime(tick);
    return () => {
      clearInterval(t);
      unsubscribe();
    };
  }, [locked]);

  useEffect(() => {
    if (!user) return;
    const unsub = attendanceStore.subscribe(() => {
      setNextAction(attendanceStore.getNextAction(user.email));
    });
    return unsub;
  }, [user]);

  if (!staffUser || !locked) {
    return <>{children}</>;
  }

  const phtNow = toPHT(now);

  const doTimeIn = () => {
    try {
      const userName = staffUser.name || staffUser.email.split("@")[0];
      attendanceStore.timeIn(staffUser.email, userName, "staff");
      toast.success(
        nextAction === "complete"
          ? "Time In Again recorded — today is logged as exceeded."
          : `Time In recorded at ${formatPHT(new Date(internetUtcMs()), true)}. Staff functions unlocked!`,
      );
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    }
  };

  const handleTimeIn = () => {
    if (nextAction === "complete") {
      setShowExtraConfirm(true);
      return;
    }
    doTimeIn();
  };

  return (
    <>
      {children}

      {/* Lockout overlay — fixed modal over a blurred backdrop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-lockout-title"
        className="fixed inset-0 z-50 overflow-y-auto bg-[#1D73EC]/25 backdrop-blur-[3px]"
      >
        <div className="flex min-h-full w-full items-center justify-center p-3 sm:p-6">
          <Card className="w-full max-w-md border-slate-100 bg-white p-5 shadow-xl sm:p-8">
            {/* Header icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F7FF] sm:h-16 sm:w-16">
              <Lock className="h-7 w-7 text-[#1D73EC] sm:h-8 sm:w-8" />
            </div>

            {/* Title / description */}
            <div className="text-center">
              <h2
                id="staff-lockout-title"
                className="text-lg font-bold text-[#1c1f26] sm:text-xl"
              >
                Time In to Unlock Staff Functions
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                You're not currently clocked in. Please record your time-in to start your shift
                and unlock staff actions.
              </p>
            </div>

            {/* Live date / time */}
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-[#f0f4f8] px-4 py-3">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-[#1D73EC]" />
              <span className="text-xs font-semibold text-slate-600 sm:text-sm">
                {phtNow.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="ml-auto font-mono text-sm font-bold text-[#1D73EC] sm:text-base">
                {formatPHT(now, true)}
              </span>
            </div>

            {/* Locked actions */}
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                Locked until you time in
              </p>
              <ul className="space-y-2">
                {LOCKED_ACTIONS.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#1D73EC]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <Lock className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  </li>
                ))}
              </ul>
            </div>

            {/* Time-in button */}
            <Button
              onClick={handleTimeIn}
              className={`mt-6 h-12 w-full text-sm font-bold transition-all ${
                nextAction === "complete"
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-[#1D73EC] hover:bg-[#1659c4] text-white"
              }`}
            >
              {nextAction === "complete" ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Time In Again (Extra)
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Time In — Start Shift
                </>
              )}
            </Button>

            {/* Secondary link */}
            <button
              type="button"
              onClick={() => navigate("/staff/timesheet")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#1D73EC] transition-colors hover:bg-[#F2F7FF]"
            >
              Open Clock-In & Timesheet
              <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
        </div>
      </div>

      {showExtraConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowExtraConfirm}
          onConfirm={() => {
            setShowExtraConfirm(false);
            doTimeIn();
          }}
          title="Clock In Again?"
          description="Your time in and time out are already done for today. Clock in again anyway? This will be recorded as exceeded time for today and will show up in your logs and the admin monitoring view."
          confirmLabel="Yes, Clock In Again"
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </>
  );
}