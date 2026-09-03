import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  CalendarDays,
  LogIn,
  LogOut,
  Coffee,
  TrendingUp,
  History,
  ChevronDown,
  ChevronUp,
  Timer,
  CheckCircle,
  ArrowRight,
  LayoutGrid,
  Package,
  ShoppingCart,
  CreditCard,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { useAuth } from "../../contexts/AuthContext";
import {
  attendanceStore,
  getWeekStartKey,
  sessionTotalMs,
  sessionBreakMs,
  overtimeMs,
  STANDARD_DAILY_HOURS,
  STANDARD_WEEKLY_HOURS,
  formatPHT,
  todayPHTKey,
  getCurrentPeriod,
} from "../../utils/attendanceStore";
import type { DailyAttendanceRecord } from "../../utils/attendanceStore";
import { internetUtcMs, subscribeInternetTime, toPHT } from "../../utils/pht";

const menuItems = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: <LayoutGrid className="w-5 h-5" />,
  },
  {
    label: "Timesheet",
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

// ── Formatting helpers ──────────────────────────────────────────────────────
const pad2 = (n: number): string => String(n).padStart(2, "0");

// Short clock times render in Philippines time (PHT, UTC+8).
const fmtShortTime = (d?: Date): string => formatPHT(d);

const fmtTimer = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1_000));
  const h = Math.floor(total / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
};

const fmtCompact = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDay = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export default function StaffTimesheet() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const email = user?.email ?? "";

  const [logs, setLogs] = useState<DailyAttendanceRecord[]>(() =>
    email ? attendanceStore.getUserLogs(email) : [],
  );
  const [now, setNow] = useState(() => new Date(internetUtcMs()));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showClockConfirm, setShowClockConfirm] = useState(false);

  // Live clock — ticks for timer + wall-clock display. Uses internet GMT+8 so
  // the clock reads true Philippines time even if the device clock is off.
  useEffect(() => {
    const tick = () => setNow(new Date(internetUtcMs()));
    const t = setInterval(tick, 1_000);
    const unsubscribe = subscribeInternetTime(tick);
    return () => {
      clearInterval(t);
      unsubscribe();
    };
  }, []);

  // React to clock-ins / clock-outs (this page + lockout modals elsewhere).
  useEffect(() => {
    if (!email) return;
    const unsub = attendanceStore.subscribe(() => {
      setLogs(attendanceStore.getUserLogs(email));
    });
    return unsub;
  }, [email]);

  if (!user) return null;

  // ── Derived state ─────────────────────────────────────────────────────────
  // Times/dates/periods are pinned to Philippines time (PHT, UTC+8). `now`
  // stays the real instant so session durations (timezone-neutral) are exact;
  // `phtNow` is the Manila wall-clock for PHT display.
  const phtNow = toPHT(now);
  const todayKey = todayPHTKey();
  const todayRecord = logs.find((l) => l.date === todayKey);

  const currentPeriod = getCurrentPeriod();
  const activePeriod = currentPeriod === "morning" ? "Morning" : "Afternoon";

  const curSession = currentPeriod === "morning"
    ? todayRecord?.morning
    : todayRecord?.afternoon;
  const curStarted = !!curSession?.timeIn;
  const curDone = !!curSession?.timeIn && !!curSession?.timeOut;
  const isOnClock = curStarted && !curDone;
  const activeStart = curSession?.timeIn;

  const todayTotalMs = todayRecord ? sessionTotalMs(todayRecord, now) : 0;
  const todayBreakMs = todayRecord ? sessionBreakMs(todayRecord) : 0;
  const todayOvertimeMs = overtimeMs(todayTotalMs);

  const weekStartKey = getWeekStartKey(phtNow);
  const weekRecords = logs.filter((l) => l.date >= weekStartKey);
  const weekTotalMs = weekRecords.reduce((sum, r) => sum + sessionTotalMs(r, now), 0);
  const weekBreakMs = weekRecords.reduce((sum, r) => sum + sessionBreakMs(r), 0);
  const weekOvertimeMs = overtimeMs(weekTotalMs, STANDARD_WEEKLY_HOURS);

  const sessionMs = isOnClock && activeStart ? now.getTime() - activeStart.getTime() : 0;
  const displayTime = isOnClock ? fmtTimer(sessionMs) : formatPHT(now, true);

  const statusMeta = curDone
    ? currentPeriod === "morning"
      ? { label: "Morning Complete", cls: "bg-green-100 text-green-700 border-green-200" }
      : { label: "Shift Complete", cls: "bg-green-100 text-green-700 border-green-200" }
    : curStarted
      ? { label: "Clocked In", cls: "bg-green-100 text-green-700 border-green-200" }
      : currentPeriod === "morning"
        ? { label: "Not Started", cls: "bg-gray-100 text-gray-500 border-gray-200" }
        : { label: "Not Started", cls: "bg-gray-100 text-gray-500 border-gray-200" };

  const description = isOnClock
    ? `${activePeriod} session · started at ${fmtShortTime(activeStart)}`
    : curDone
      ? currentPeriod === "morning"
        ? "Morning session complete. Time In for your Afternoon session unlocks in the PM."
        : "Both Morning and Afternoon sessions are recorded for today."
      : `Clock in to start your ${activePeriod} session.`;

  const handleClock = () => {
    if (!email) return;
    try {
      if (isOnClock) {
        attendanceStore.timeOut(email);
        toast.success(`${activePeriod} Time Out recorded at ${fmtShortTime(new Date(internetUtcMs()))}. See you next shift!`);
      } else if (curDone) {
        toast.info(
          currentPeriod === "morning"
            ? "Morning session is complete. Come back in the PM to clock in your Afternoon session."
            : "All sessions are already recorded for today. Come back tomorrow!",
        );
      } else {
        const name = user.name || email.split("@")[0];
        attendanceStore.timeIn(email, name, "staff");
        toast.success(`${activePeriod} Time In recorded at ${fmtShortTime(new Date(internetUtcMs()))}.`);
      }
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    }
  };

  return (
    <Layout menuItems={menuItems} title="Clock-In & Timesheet">
      <div className="space-y-6 pb-10">
        {/* ── Primary Clock-In Widget ─────────────────────────────────────── */}
        <Card className="overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarDays className="w-4 h-4 text-[#1D73EC]" />
              {phtNow.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <Badge variant="outline" className={`border text-xs font-bold ${statusMeta.cls}`}>
              {statusMeta.label}
            </Badge>
          </div>

          <div className="flex flex-col items-center px-6 pt-6 pb-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {isOnClock
                ? "Session Timer"
                : curDone
                  ? currentPeriod === "morning"
                    ? "Morning Complete"
                    : "Today Complete"
                  : "Current Time"}
            </p>
            <div
              className={`mt-2 font-mono font-bold tabular-nums tracking-tight ${
                isOnClock
                  ? "text-6xl sm:text-7xl text-[#1D73EC]"
                  : "text-5xl sm:text-6xl text-slate-900"
              }`}
            >
              {displayTime}
            </div>

            <p className="mt-3 text-sm text-slate-500 font-medium">{description}</p>

            <Button
              onClick={() => { if (!curDone) setShowClockConfirm(true); }}
              disabled={curDone}
              className={`mt-6 h-14 w-full max-w-sm rounded-xl text-base font-bold transition-all disabled:opacity-100 ${
                isOnClock
                  ? "bg-[#1c1f26] hover:bg-slate-800 text-white"
                  : curDone
                    ? "cursor-default bg-green-50 text-green-700 border border-green-200 hover:bg-green-50"
                    : "bg-[#1D73EC] hover:bg-[#1659c4] text-white"
              }`}
            >
              {isOnClock ? (
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  Time Out
                </>
              ) : curDone ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {currentPeriod === "morning"
                    ? "Morning Complete — Back in PM"
                    : "Attendance Complete for Today"}
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Time In — {activePeriod}
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/staff/dashboard")}
              className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#1D73EC] transition-colors hover:underline"
            >
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Card>

        {/* ── Personal Metrics — Today vs This Week ───────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              id: "mt-tot",
              label: "Total Hours",
              icon: Timer,
              today: fmtCompact(todayTotalMs),
              week: fmtCompact(weekTotalMs),
            },
            {
              id: "mt-brk",
              label: "Break Time",
              icon: Coffee,
              today: fmtCompact(todayBreakMs),
              week: fmtCompact(weekBreakMs),
            },
            {
              id: "mt-ovt",
              label: "Overtime",
              icon: TrendingUp,
              today: fmtCompact(todayOvertimeMs),
              week: fmtCompact(weekOvertimeMs),
            },
          ].map(({ id, label, icon: Icon, today, week }) => (
            <Card key={id} className="p-5 border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {label}
                </p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F7FF]">
                  <Icon className="h-5 w-5 text-[#1D73EC]" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{today}</p>
              <p className="mt-1 text-xs text-slate-400 font-medium">Today</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500 font-medium">This week</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">{week}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Personal History — collapsible log table ────────────────────── */}
        <Card className="overflow-hidden border border-slate-100 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-[#1D73EC]" />
                Personal Time Logs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {logs.length} day{logs.length === 1 ? "" : "s"} recorded
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1D73EC] text-[#1D73EC] hover:bg-[#1D73EC] hover:text-white shrink-0"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Full History
                </>
              )}
            </Button>
          </div>

          {historyOpen ? (
            /* Expanded table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Morning In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Morning Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Afternoon In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Afternoon Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Break</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Overtime</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {logs.length > 0 ? (
                    logs.map((record) => {
                      const total = sessionTotalMs(record, now);
                      const brk = sessionBreakMs(record);
                      const ot = overtimeMs(total);
                      const isToday = record.date === todayKey && isOnClock;
                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors border-b border-gray-100 ${isToday ? "bg-blue-50/40" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-[#1c1f26]">
                                {fmtDay(record.date)}
                              </span>
                              {record.date === todayKey && (
                                <Badge variant="outline" className="border-blue-200 bg-white text-[11px] font-bold text-[#1D73EC]">
                                  Today
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {fmtShortTime(record.morning.timeIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {fmtShortTime(record.morning.timeOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {fmtShortTime(record.afternoon.timeIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {fmtShortTime(record.afternoon.timeOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {fmtCompact(brk)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 tabular-nums">
                            {fmtCompact(total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-semibold tabular-nums">
                            {fmtCompact(ot)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                          <History className="w-10 h-10 mb-3 opacity-40" />
                          <p className="text-sm font-medium">No clock entries yet</p>
                          <p className="text-xs mt-1">Use the Time In button above to start your first shift.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Collapsed — today summary */
            <div className="px-6 py-5">
              {todayRecord ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="font-bold text-slate-800">Today</span>
                  <span className="text-slate-500">
                    Morning {fmtShortTime(todayRecord.morning.timeIn)}→{fmtShortTime(todayRecord.morning.timeOut)}{" "}
                    · Afternoon {fmtShortTime(todayRecord.afternoon.timeIn)}→{fmtShortTime(todayRecord.afternoon.timeOut)}
                  </span>
                  <span className="sm:ml-auto font-bold text-[#1D73EC] tabular-nums">
                    {fmtCompact(todayTotalMs)} total
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No clock entries yet for today. Click <span className="font-semibold text-[#1D73EC]">Full History</span> to review previous days.
                </p>
              )}
            </div>
          )}

          {/* Footnote */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium">
              Timesheet is stored on this device (demo). Standard shift: {STANDARD_DAILY_HOURS}h/day · {STANDARD_WEEKLY_HOURS}h/week. Break = gap between Morning and Afternoon sessions.
            </p>
          </div>
        </Card>
      </div>

      {showClockConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowClockConfirm}
          onConfirm={() => { handleClock(); setShowClockConfirm(false); }}
          title={isOnClock ? `Time Out of ${activePeriod} session?` : `Time In to ${activePeriod} session?`}
          description={
            isOnClock
              ? `End your ${activePeriod} session now? Your clock-out time will be recorded at ${fmtShortTime(new Date(internetUtcMs()))}. You can clock back in for your next session.`
              : `Start your ${activePeriod} session now? Your clock-in time will be recorded at ${fmtShortTime(new Date(internetUtcMs()))} and this session will count toward today's hours.`
          }
          confirmLabel={isOnClock ? "Time Out" : "Time In"}
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </Layout>
  );
}