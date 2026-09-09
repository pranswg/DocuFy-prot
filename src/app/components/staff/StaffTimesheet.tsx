import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Clock,
  CalendarDays,
  LogIn,
  LogOut,
  TrendingUp,
  History,
  ChevronDown,
  ChevronUp,
  Timer,
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
import { SummaryCard } from "../ui/summary-card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { useAuth } from "../../contexts/AuthContext";
import {
  attendanceStore,
  getWeekStartKey,
  sessionTotalMs,
  overtimeMs,
  hasActiveSession,
  isExceeded,
  STANDARD_DAILY_HOURS,
  STANDARD_WEEKLY_HOURS,
  formatPHT,
  todayPHTKey,
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

  const isOnClock = todayRecord ? hasActiveSession(todayRecord) : false;
  const curDone = !!todayRecord?.timeIn && !!todayRecord?.timeOut && !isOnClock;
  const exceeded = isExceeded(todayRecord);

  const activeSession =
    todayRecord && todayRecord.timeIn && !todayRecord.timeOut
      ? { timeIn: todayRecord.timeIn }
      : todayRecord?.extraSessions?.find((s) => s.timeIn && !s.timeOut) ?? null;
  const activeStart = activeSession?.timeIn;

  const todayTotalMs = todayRecord ? sessionTotalMs(todayRecord, now) : 0;
  const todayOvertimeMs = overtimeMs(todayTotalMs);

  const weekStartKey = getWeekStartKey(phtNow);
  const weekRecords = logs.filter((l) => l.date >= weekStartKey);
  const weekTotalMs = weekRecords.reduce((sum, r) => sum + sessionTotalMs(r, now), 0);
  const weekOvertimeMs = overtimeMs(weekTotalMs, STANDARD_WEEKLY_HOURS);

  const sessionMs = isOnClock && activeStart ? now.getTime() - activeStart.getTime() : 0;
  const displayTime = isOnClock ? fmtTimer(sessionMs) : formatPHT(now, true);

  const statusMeta = isOnClock
    ? { label: "Clocked In", cls: "bg-green-100 text-green-700 border-green-200" }
    : curDone && exceeded
      ? { label: "Exceeded for the Day", cls: "bg-amber-100 text-amber-700 border-amber-200" }
      : curDone
        ? { label: "Shift Complete", cls: "bg-green-100 text-green-700 border-green-200" }
        : { label: "Not Started", cls: "bg-gray-100 text-gray-500 border-gray-200" };

  const description = isOnClock
    ? `Shift started at ${fmtShortTime(activeStart)}${exceeded ? " · extra clock-in after the day was done" : ""}`
    : curDone && exceeded
      ? "Time in and time out are done for today, but an extra clock-in was recorded — logged as exceeded for the day."
      : curDone
        ? "Time in and time out are recorded for today."
        : "Clock in to start your shift.";

  const handleClock = () => {
    if (!email) return;
    try {
      if (isOnClock) {
        attendanceStore.timeOut(email);
        toast.success(`Time Out recorded at ${fmtShortTime(new Date(internetUtcMs()))}. See you next shift!`);
      } else if (curDone) {
        const name = user?.name || email.split("@")[0];
        attendanceStore.timeIn(email, name, "staff");
        toast.success("Extra time-in recorded — today is logged as exceeded.");
      } else {
        const name = user?.name || email.split("@")[0];
        attendanceStore.timeIn(email, name, "staff");
        toast.success(`Time In recorded at ${fmtShortTime(new Date(internetUtcMs()))}.`);
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {isOnClock
                ? "Session Timer"
                : curDone && exceeded
                  ? "Exceeded — Day Done"
                  : curDone
                    ? "Today Complete"
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
              onClick={() => setShowClockConfirm(true)}
              disabled={false}
              className={`mt-6 h-14 w-full max-w-sm rounded-xl text-base font-bold transition-all disabled:opacity-100 ${
                isOnClock
                  ? "bg-[#2557b8] hover:bg-[#1d4e99] text-white"
                  : curDone
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
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
                  <LogIn className="h-5 w-5 mr-2" />
                  Time In Again (Extra)
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Time In
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            {
              id: "mt-tot",
              label: "Total Hours",
              icon: Timer,
              today: fmtCompact(todayTotalMs),
              week: fmtCompact(weekTotalMs),
            },
            {
              id: "mt-ovt",
              label: "Overtime",
              icon: TrendingUp,
              today: fmtCompact(todayOvertimeMs),
              week: fmtCompact(weekOvertimeMs),
            },
          ].map(({ id, label, icon, today, week }) => (
            <SummaryCard
              key={id}
              label={label}
              value={today}
              icon={icon}
              iconBg="bg-[#F2F7FF]"
              iconColor="text-[#1D73EC]"
              subtitle={
                <>
                  Today · This week:{" "}
                  <span className="font-semibold text-slate-600">{week}</span>
                </>
              }
            />
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
              <p className="text-xs text-slate-500 mt-0.5">
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock-In</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock-Out</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Overtime</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {logs.length > 0 ? (
                    logs.map((record) => {
                      const total = sessionTotalMs(record, now);
                      const ot = overtimeMs(total);
                      const recExceeded = isExceeded(record);
                      const activeToday = record.date === todayKey && isOnClock;
                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors border-b border-gray-100 ${activeToday ? "bg-blue-50/40" : "hover:bg-gray-50"}`}
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
                            {fmtShortTime(record.timeIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                            {activeToday ? (
                              <span className="font-semibold text-green-700">On Clock</span>
                            ) : (
                              record.timeOut ? fmtShortTime(record.timeOut) : "—"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 tabular-nums">
                            {fmtCompact(total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-semibold tabular-nums">
                            {fmtCompact(ot)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {recExceeded ? (
                              <Badge className="border border-amber-200 bg-amber-100 text-amber-700">
                                Exceeded
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-14 text-gray-500">
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
                    In {fmtShortTime(todayRecord.timeIn)} → Out {fmtShortTime(todayRecord.timeOut)}
                    {todayRecord.exceeded && (
                      <span className="ml-1 font-semibold text-amber-600">· Exceeded</span>
                    )}
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
            <p className="text-xs text-gray-500 font-medium">
              Timesheet is stored on this device (demo). Standard shift: {STANDARD_DAILY_HOURS}h/day · {STANDARD_WEEKLY_HOURS}h/week. One Time In / Time Out per day — clocking back in after the day is complete is logged as Exceeded.
            </p>
          </div>
        </Card>
      </div>

      {showClockConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowClockConfirm}
          onConfirm={() => { handleClock(); setShowClockConfirm(false); }}
          title={isOnClock ? "Time Out?" : curDone ? "Clock In Again?" : "Time In?"}
          description={
            isOnClock
              ? `End your shift now? Your clock-out time will be recorded at ${fmtShortTime(new Date(internetUtcMs()))}.`
              : curDone
                ? 'Your time in and time out are already done for today. Clock in again anyway? This will be recorded as exceeded time for today and will show up in your logs and the admin monitoring view.'
                : `Start your shift now? Your clock-in time will be recorded at ${fmtShortTime(new Date(internetUtcMs()))} and this session will count toward today's hours.`
          }
          confirmLabel={isOnClock ? "Time Out" : curDone ? "Yes, Clock In Again" : "Time In"}
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </Layout>
  );
}