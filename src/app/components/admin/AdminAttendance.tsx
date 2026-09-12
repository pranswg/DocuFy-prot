import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  UserCheck,
  UserX,
  PlaneTakeoff,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Clock,
  AlarmClock,
  Trash2,
  X,
  CalendarDays,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { SummaryCard } from "../ui/summary-card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ZoomSafeDropdown } from "../ui/zoom-safe-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  attendanceStore,
  sessionTotalMs,
  hasActiveSession,
  STANDARD_DAILY_HOURS,
  formatPHT,
  PHT_OFFSET_MS,
} from "../../utils/attendanceStore";
import type {
  AbsenceType,
  DailyAttendanceRecord,
} from "../../utils/attendanceStore";
import {
  getStaffRoster,
  seedDemoAttendance,
  toDateKey,
  DEFAULT_STAFF_SHIFT,
} from "../../utils/staffRoster";
import type { StaffMember } from "../../utils/staffRoster";

type Presence = "present" | "no-clock-in" | "absent" | "on-leave";
type AdminRow = {
  key: string;
  member: StaffMember;
  date: string;
  record: DailyAttendanceRecord | null;
  clockIn?: Date;
  clockOut?: Date;
  isLive: boolean;
  totalMs: number;
  onTime: boolean;
  late: boolean;
  overtime: boolean;
  exceeded: boolean;
  absence: AbsenceType | null;
  presence: Presence;
};

const LATE_CUTOFF = { hour: 8, minute: 30 };
const MS_PER_HOUR = 3_600_000;

// Fallbacks for staff who lack the (optional) roster metadata.
const roleOf = (m: StaffMember): "Staff" | "Admin" => m.role ?? "Staff";
const scheduleOf = (m: StaffMember): string => m.shift ?? DEFAULT_STAFF_SHIFT;

// ── Row builders ────────────────────────────────────────────────────────────
function buildRow(
  member: StaffMember,
  dateKey: string,
  now: Date,
  override?: DailyAttendanceRecord | null,
): AdminRow {
  const rec = override ?? attendanceStore.getRecord(member.email, dateKey);
  const absence = attendanceStore.getAbsence(member.email, dateKey);

  const clockIn = rec?.timeIn;
  const clockOut = rec?.timeOut;

  const isLive = !!(
    rec &&
    dateKey === toDateKey(new Date(now.getTime() + PHT_OFFSET_MS)) &&
    hasActiveSession(rec)
  );

  const totalMs = rec ? sessionTotalMs(rec, now) : 0;

  // The 8:30 AM cutoff is a PHT wall-clock time, so interpret it as PHT.
  const lateCutKey = `${dateKey}T${String(LATE_CUTOFF.hour).padStart(2, "0")}:${String(
    LATE_CUTOFF.minute,
  ).padStart(2, "0")}:00`;
  const lateCutInstant = new Date(new Date(lateCutKey).getTime() - PHT_OFFSET_MS);
  const onTime = !!clockIn && clockIn.getTime() <= lateCutInstant.getTime();
  const late = !!clockIn && !onTime;
  const overtime = totalMs > STANDARD_DAILY_HOURS * MS_PER_HOUR;

  let presence: Presence = "no-clock-in";
  if (absence === "on-leave") presence = "on-leave";
  else if (absence === "absent") presence = "absent";
  else if (clockIn) presence = "present";

  return {
    key: `${dateKey}-${member.email}`,
    member,
    date: dateKey,
    record: rec,
    clockIn,
    clockOut,
    isLive,
    totalMs,
    onTime,
    late,
    overtime,
    exceeded: rec?.exceeded === true,
    absence,
    presence,
  };
}

function buildDayRows(members: StaffMember[], dateKey: string, now: Date): AdminRow[] {
  return members.map(m => buildRow(m, dateKey, now));
}

function buildRangeRows(
  members: StaffMember[],
  from: string,
  to: string,
  now: Date,
): AdminRow[] {
  const byEmail = new Map(members.map(m => [m.email.toLowerCase(), m]));
  return attendanceStore
    .getAllLogs()
    .filter(l => l.role === "staff" && l.date >= from && l.date <= to)
    .map(l => {
      const member =
        byEmail.get(l.userId.toLowerCase()) ??
        { id: l.id, name: l.userName, email: l.userId, position: "Staff", role: "Staff", shift: DEFAULT_STAFF_SHIFT };
      return buildRow(member, l.date, now, l);
    });
}

// ── Formatting helpers ──────────────────────────────────────────────────────
// Times render in Philippines time (PHT, UTC+8) regardless of device timezone.
const fmtTime = (d?: Date): string => formatPHT(d);

const fmtHms = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes === 0) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const fmtDay = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const fmtLongDay = (dateKey: string): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dateKey : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

// datetime-local input is expressed in PHT so what the admin picks matches the
// timezone the whole system reports in.
const toLocalInput = (d: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const p = new Date(d.getTime() + PHT_OFFSET_MS);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}T${pad(p.getHours())}:${pad(p.getMinutes())}`;
};

// Reverse of toLocalInput — treat the picked PHT string as a real UTC instant.
const fromPHTInput = (iso: string): Date =>
  new Date(new Date(iso).getTime() - PHT_OFFSET_MS);

const initialsOf = (name: string): string =>
  name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();

type AdjustTarget = { row: AdminRow; field: "timeIn" | "timeOut" } | null;

export default function AdminAttendancePage() {
  const todayKey = toDateKey();
  const [now, setNow] = useState(new Date());
  const [version, setVersion] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(todayKey);
  const [dateTo, setDateTo] = useState(todayKey);

  const [adjust, setAdjust] = useState<AdjustTarget>(null);
  const [adjValue, setAdjValue] = useState("");
  const [showSaveAdjustConfirm, setShowSaveAdjustConfirm] = useState(false);
  const [absenceTarget, setAbsenceTarget] = useState<{ row: AdminRow; type: AbsenceType } | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminRow | null>(null);

  // Live refresh + store reactivity
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const unsubscribe = attendanceStore.subscribe(() => setVersion(v => v + 1));
    seedDemoAttendance();
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const isRange = dateFrom !== dateTo;

  const members = useMemo(() => getStaffRoster(), [version]);

  // Distinct filter option sets derived from the roster (today's rows only, so
  // the lists match what the records can actually show).
  const filterOptions = useMemo(() => {
    const roles = new Set<"Staff" | "Admin">();
    const shifts = new Set<string>();
    for (const m of members) {
      roles.add(roleOf(m));
      shifts.add(scheduleOf(m));
    }
    return {
      roles: [...roles].sort((a, b) => a.localeCompare(b)),
      shifts: [...shifts].sort((a, b) => a.localeCompare(b)),
    };
  }, [members]);

  const todayRows = useMemo(
    () => buildDayRows(members, todayKey, now),
    [members, todayKey, now],
  );

  const kpis = useMemo(() => {
    const present = todayRows.filter(r => r.presence === "present");
    const onTime = present.filter(r => r.onTime).length;
    const late = present.filter(r => r.late).length;
    const absent = todayRows.filter(r => r.presence === "absent").length;
    const noClock = todayRows.filter(r => r.presence === "no-clock-in").length;
    const away = todayRows.filter(r => r.presence === "on-leave").length;
    const live = todayRows.filter(r => r.isLive).length;
    return { total: todayRows.length, present: present.length, onTime, late, absent, noClock, away, live };
  }, [todayRows]);

  const baseRows = useMemo(() => {
    if (isRange) return buildRangeRows(members, dateFrom, dateTo, now);
    return buildDayRows(members, dateFrom, now);
  }, [members, isRange, dateFrom, dateTo, now]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = baseRows.filter(r => {
      const matchSearch =
        !q ||
        r.member.name.toLowerCase().includes(q) ||
        r.member.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || roleOf(r.member) === roleFilter;
      const matchShift = shiftFilter === "all" || scheduleOf(r.member) === shiftFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "on-time" && r.onTime) ||
        (statusFilter === "late" && r.late) ||
        (statusFilter === "overtime" && r.overtime) ||
        (statusFilter === "no-clock-in" && r.presence === "no-clock-in") ||
        (statusFilter === "absent" && r.presence === "absent") ||
        (statusFilter === "on-leave" && r.presence === "on-leave");
      return matchSearch && matchRole && matchShift && matchStatus;
    });
    if (isRange) {
      rows.sort((a, b) =>
        a.date === b.date
          ? a.member.name.localeCompare(b.member.name)
          : b.date.localeCompare(a.date),
      );
    }
    return rows;
  }, [baseRows, searchQuery, roleFilter, shiftFilter, statusFilter, isRange]);

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setShiftFilter("all");
    setDateFrom(todayKey);
    setDateTo(todayKey);
  };

  // ── Row actions ────────────────────────────────────────────────────────────
  const openAdjust = (row: AdminRow, field: "timeIn" | "timeOut") => {
    const current = row.record?.[field];
    setAdjust({ row, field });
    setAdjValue(current ? toLocalInput(current) : toLocalInput(new Date()));
  };

  const saveAdjust = () => {
    if (!adjust) return;
    const { row, field } = adjust;
    const parsed = adjValue ? fromPHTInput(adjValue) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      toast.error("Please choose a valid date and time.");
      return;
    }
    try {
      attendanceStore.upsertTime(
        row.member.email,
        row.member.name,
        "staff",
        row.date,
        field,
        parsed,
      );
      toast.success(
        `Updated ${field === "timeIn" ? "clock-in" : "clock-out"} for ${row.member.name} (${fmtLongDay(row.date)}).`,
      );
      setAdjust(null);
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
    }
  };

  const toggleAbsence = (row: AdminRow, type: AbsenceType) => {
    if (row.absence === type) {
      attendanceStore.setAbsence(row.member.email, row.date, null);
      toast.success(`Cleared ${type === "on-leave" ? "On Leave" : "Absent"} for ${row.member.name}.`);
    } else {
      attendanceStore.setAbsence(row.member.email, row.date, type);
      toast.success(`${row.member.name} marked ${type === "on-leave" ? "On Leave" : "Absent"} for ${fmtLongDay(row.date)}.`);
    }
  };

  const resetDay = (row: AdminRow) => {
    attendanceStore.upsertTime(row.member.email, row.member.name, "staff", row.date, "timeIn", null);
    attendanceStore.setAbsence(row.member.email, row.date, null);
    toast.success(`Attendance reset for ${row.member.name} on ${fmtLongDay(row.date)}.`);
  };

  // ── Status badge rendering ─────────────────────────────────────────────────
  const renderStatus = (row: AdminRow) => {
    if (row.presence !== "present") {
      const style =
        row.presence === "on-leave"
          ? "bg-orange-100 text-orange-700 border-orange-200"
          : row.presence === "absent"
            ? "bg-red-100 text-red-700 border-red-200"
            : "bg-gray-100 text-gray-500 border-gray-200";
      const label =
        row.presence === "on-leave"
          ? "On Leave"
          : row.presence === "absent"
            ? "Absent"
            : "No Clock-In";
      return <Badge className={`border ${style}`}>{label}</Badge>;
    }
    return (
      <span className="flex flex-wrap gap-1">
        {row.onTime && <Badge className="border border-green-200 bg-green-100 text-green-700">On Time</Badge>}
        {row.late && <Badge className="border border-amber-200 bg-amber-100 text-amber-700">Late</Badge>}
        {row.overtime && <Badge className="border border-purple-200 bg-purple-100 text-purple-700">Overtime</Badge>}
        {row.exceeded && (
          <Badge className="border border-amber-200 bg-amber-100 text-amber-700">Exceeded</Badge>
        )}
        {row.isLive && (
          <Badge className="border border-green-200 bg-green-50 text-green-700">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            On Clock
          </Badge>
        )}
      </span>
    );
  };

  // Staff who are on the clock right now (drives the "Currently Working" strip).
  const liveRows = useMemo(
    () => todayRows.filter(r => r.isLive),
    [todayRows],
  );

  const renderTable = () => (
    <Card className="gap-0 overflow-hidden border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2F6FD6]" />
            Staff Attendance Records
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRange ? fmtLongDay(dateFrom) + " → " + fmtLongDay(dateTo) : fmtLongDay(dateFrom)}
            {" · "}
            {filteredRows.length} of {baseRows.length} staff shown
          </p>
        </div>
        {kpis.live > 0 && (
          <Badge className="border border-green-200 bg-green-50 text-green-700 shrink-0">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            {kpis.live} on clock now
          </Badge>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {isRange && (
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              )}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Member</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock In</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock Out</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hours Worked</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredRows.length > 0 ? (
              filteredRows.map(row => (
                <tr key={row.key} className="transition-colors border-b border-gray-100 hover:bg-gray-50">
                  {isRange && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-sm text-[#1c1f26]">{fmtDay(row.date)}</span>
                      {row.date === todayKey && (
                        <Badge variant="outline" className="ml-2 border-blue-200 bg-white text-[11px] font-bold text-[#2F6FD6]">
                          Today
                        </Badge>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1D73EC] text-xs font-bold text-white">
                        {initialsOf(row.member.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1c1f26] whitespace-nowrap">{row.member.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      className={
                        roleOf(row.member) === "Admin"
                          ? "bg-[#1D73EC]/10 text-[#1D73EC] border border-[#1D73EC]/20"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                      }
                    >
                      {roleOf(row.member) === "Admin" ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <span className="w-3 h-3" />
                      )}
                      {roleOf(row.member)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{scheduleOf(row.member)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                    {row.clockIn ? fmtTime(row.clockIn) : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                    {row.isLive ? (
                      <span className="font-semibold text-green-700">On Clock</span>
                    ) : (
                      row.clockOut ? fmtTime(row.clockOut) : "—"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.totalMs > 0 ? (
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{fmtHms(row.totalMs)}</span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{renderStatus(row)}</td>
                  <td className="px-6 py-4 text-right">
                    <RowActionsMenu
                      row={row}
                      onAdjustTimeIn={() => openAdjust(row, "timeIn")}
                      onAdjustTimeOut={() => openAdjust(row, "timeOut")}
                      onMarkLeave={() => setAbsenceTarget({ row, type: "on-leave" })}
                      onMarkAbsent={() => setAbsenceTarget({ row, type: "absent" })}
                      onResetDay={() => setResetTarget(row)}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isRange ? 10 : 9}>
                  <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                    <Users className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-sm font-medium">No staff match these filters</p>
                    <p className="text-xs mt-1">Try changing the date range, search keyword, or status filter.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-medium">
          Model: one Time In / Time Out per day. Standard day {STANDARD_DAILY_HOURS}h —
          On Time cutoff is 8:30 AM and totals beyond {STANDARD_DAILY_HOURS}h count as Overtime.
          Staff who clock back in after the day is complete are flagged Exceeded.
          Records persist locally on this device (demo).
        </p>
      </div>
    </Card>
  );

  return (
    <Layout menuItems={adminMenuItems} title="Attendance & Staff Monitoring">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <p className="text-gray-600">
            Monitor staff clock-ins, attendance status, schedules, and time-off records.
          </p>
          {kpis.live > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {kpis.live} staff currently on clock
            </div>
          )}
        </div>

        {/* Overview KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 @min-[980px]:grid-cols-4">
          {[
            {
              id: "kpi-total",
              label: "Total Staff",
              val: kpis.total,
              icon: Users,
              iconBg: "bg-blue-50",
              iconCls: "text-[#2F6FD6]",
              desc: `${kpis.live} on clock now · ${kpis.away} on leave`,
            },
            {
              id: "kpi-ontime",
              label: "On Time Today",
              val: kpis.onTime,
              icon: UserCheck,
              iconBg: "bg-green-50",
              iconCls: "text-green-600",
              desc: `${kpis.present} staff present today`,
            },
            {
              id: "kpi-late",
              label: "Late Today",
              val: kpis.late,
              icon: AlarmClock,
              iconBg: "bg-amber-50",
              iconCls: "text-amber-600",
              desc: "Arrived after 8:30 AM",
            },
            {
              id: "kpi-absent",
              label: "Absent Today",
              val: kpis.absent,
              icon: UserX,
              iconBg: "bg-red-50",
              iconCls: "text-red-600",
              desc: `${kpis.noClock} no clock-in · ${kpis.away} on leave`,
            },
          ].map(kpi => (
            <SummaryCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.val}
              icon={kpi.icon}
              iconBg={kpi.iconBg}
              iconColor={kpi.iconCls}
              subtitle={kpi.desc}
            />
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4 border border-slate-100 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-4">
            <div className="w-full sm:max-w-xs lg:flex-1 lg:min-w-[200px]">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search Staff</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  aria-label="Search by staff name or email"
                  placeholder="Search by staff name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 rounded-lg"
                />
              </div>
            </div>
            <div className="w-full lg:w-44">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</Label>
              <ZoomSafeDropdown
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="All Roles"
                icon={<Users className="w-4 h-4 text-gray-500" />}
                className="mt-1.5"
                options={[
                  { value: "all", label: "All Roles" },
                  ...filterOptions.roles.map(r => ({ value: r, label: r })),
                ]}
              />
            </div>
            <div className="w-full lg:w-44">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
              <ZoomSafeDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Statuses"
                icon={<Filter className="w-4 h-4 text-gray-500" />}
                className="mt-1.5"
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "on-time", label: "On Time" },
                  { value: "late", label: "Late" },
                  { value: "overtime", label: "Overtime" },
                  { value: "no-clock-in", label: "No Clock-In" },
                  { value: "absent", label: "Absent" },
                  { value: "on-leave", label: "On Leave" },
                ]}
              />
            </div>
            <div className="w-full lg:w-48">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shift</Label>
              <ZoomSafeDropdown
                value={shiftFilter}
                onChange={setShiftFilter}
                placeholder="All Shifts"
                icon={<Clock className="w-4 h-4 text-gray-500" />}
                className="mt-1.5"
                options={[
                  { value: "all", label: "All Shifts" },
                  ...filterOptions.shifts.map(s => ({ value: s, label: s })),
                ]}
              />
            </div>
            <div className="w-full lg:w-40">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date From</Label>
              <div className="relative mt-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={e => setDateFrom(e.target.value || todayKey)}
                  className="pr-10"
                />
                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="w-full lg:w-40">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date To</Label>
              <div className="relative mt-1.5">
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={e => setDateTo(e.target.value || todayKey)}
                  className="pr-10"
                />
                <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <Button
              variant="outline"
              className="h-10 border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white"
              onClick={resetFilters}
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Currently Working */}
<Card className="gap-0 overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                Currently Working
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff clocked in right now — live working time
              </p>
            </div>
            <Badge className="border border-green-200 bg-green-50 text-green-700 shrink-0">
              {liveRows.length} on clock now
            </Badge>
          </div>
          <div className="p-4">
            {liveRows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 @min-[980px]:grid-cols-3 gap-3">
                {liveRows.map(r => (
                  <div
                    key={r.key}
                    className="flex items-center gap-3 rounded-xl border border-green-200/70 bg-green-50/40 p-3"
                  >
                    <div className="relative shrink-0">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D73EC] text-xs font-bold text-white">
                        {initialsOf(r.member.name)}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1c1f26]">{r.member.name}</p>
                      <p className="truncate text-xs text-gray-500">{roleOf(r.member)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Clocked In:{" "}
                          <span className="font-semibold text-slate-700">{r.clockIn ? fmtTime(r.clockIn) : "—"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <AlarmClock className="h-3 w-3" />
                          Working:{" "}
                          <span className="font-semibold text-green-700 tabular-nums">{fmtHms(r.totalMs)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Users className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium text-gray-500">No staff are currently clocked in</p>
                <p className="text-xs mt-1">Staff appear here the moment they clock in.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Attendance records table */}
        {renderTable()}

        {/* Adjust dialog */}
        <Dialog open={!!adjust} onOpenChange={open => !open && setAdjust(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Adjust {adjust?.field === "timeIn" ? "Clock-In" : "Clock-Out"} Time
              </DialogTitle>
              <DialogDescription>
                {adjust ? `${adjust.row.member.name} · ${fmtLongDay(adjust.row.date)}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</Label>
                <Input
                  type="datetime-local"
                  value={adjValue}
                  onChange={e => setAdjValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500">
                Saving will overwrite this staff member's{" "}
                {adjust?.field === "timeIn" ? "clock-in" : "clock-out"} timestamp for the day.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjust(null)}>
                Cancel
              </Button>
              <Button data-primary-action className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white" onClick={() => setShowSaveAdjustConfirm(true)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Save Adjust Confirmation */}
        {showSaveAdjustConfirm && adjust && (
          <ConfirmationDialog
            open={showSaveAdjustConfirm}
            onOpenChange={setShowSaveAdjustConfirm}
            onConfirm={saveAdjust}
            title="Adjust Time?"
            description={`Overwrite ${adjust.row.member.name}'s ${adjust.field === "timeIn" ? "clock-in" : "clock-out"} for ${fmtLongDay(adjust.row.date)} to ${adjValue}? This changes their recorded hours and status.`}
            confirmLabel="Save Changes"
            cancelLabel="Go Back"
            destructive={false}
          />
        )}

        {/* Absence Confirmation */}
        {absenceTarget && (
          <ConfirmationDialog
            open
            onOpenChange={() => setAbsenceTarget(null)}
            onConfirm={() => { toggleAbsence(absenceTarget.row, absenceTarget.type); setAbsenceTarget(null); }}
            title={absenceTarget.row.absence === absenceTarget.type ? "Clear Absence?" : (absenceTarget.type === "on-leave" ? "Mark On Leave?" : "Mark Absent?")}
            description={
              absenceTarget.row.absence === absenceTarget.type
                ? `Clear the ${absenceTarget.type === "on-leave" ? "On Leave" : "Absent"} status for ${absenceTarget.row.member.name} on ${fmtLongDay(absenceTarget.row.date)}?`
                : `Mark ${absenceTarget.row.member.name} as ${absenceTarget.type === "on-leave" ? "On Leave" : "Absent"} for ${fmtLongDay(absenceTarget.row.date)}? This updates their attendance status and the Time Off report.`
            }
            confirmLabel={absenceTarget.row.absence === absenceTarget.type ? "Clear" : (absenceTarget.type === "on-leave" ? "Mark On Leave" : "Mark Absent")}
            cancelLabel="Go Back"
            destructive={absenceTarget.type === "absent"}
          />
        )}

        {/* Reset Day Confirmation */}
        {resetTarget && (
          <ConfirmationDialog
            open
            onOpenChange={() => setResetTarget(null)}
            onConfirm={() => { resetDay(resetTarget); setResetTarget(null); }}
            title="Reset Day's Record?"
            description={`Delete all attendance data for ${resetTarget.member.name} on ${fmtLongDay(resetTarget.date)}? This removes their clock-in/out times, hours rendered, and any leave/absence flag. This cannot be undone.`}
            confirmLabel="Reset Record"
            cancelLabel="Keep Record"
            destructive
            requirePhrase
          />
        )}
      </div>
    </Layout>
  );
}

// Row actions menu: rendered through a portal with `position: fixed`
// coordinates taken from the trigger button's own rect, so it always opens
// right under the ⋮ button even inside the scrollable table.
function RowActionsMenu({
  row,
  onAdjustTimeIn,
  onAdjustTimeOut,
  onMarkLeave,
  onMarkAbsent,
  onResetDay,
}: {
  row: AdminRow;
  onAdjustTimeIn: () => void;
  onAdjustTimeOut: () => void;
  onMarkLeave: () => void;
  onMarkAbsent: () => void;
  onResetDay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Clamp so the menu never extends past the right or bottom edge of the
    // visible viewport (used when a row sits at the far-right/bottom).
    const menuW = 200;
    const menuH = 232;
    const left = rect.left;
    const topBelow = rect.bottom + 4;
    setPos({
      left: Math.min(left, Math.max(0, window.innerWidth - menuW - 8)),
      top:
        topBelow + menuH > window.innerHeight
          ? rect.top - menuH - 4
          : topBelow,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onDocDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMove = () => updatePosition();
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <Button
        ref={triggerRef as React.Ref<HTMLButtonElement>}
        variant="ghost"
        size="icon"
        className="h-8 w-8 cursor-pointer text-gray-500 hover:text-white"
        aria-label="Actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 min-w-[200px] origin-top-left rounded-md border border-gray-200 bg-white p-1 shadow-lg"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
              onClick={run(onAdjustTimeIn)}
            >
              <Pencil className="h-4 w-4 shrink-0 text-gray-500" />
              Adjust Clock-In Time
            </button>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100"
              onClick={run(onAdjustTimeOut)}
            >
              <Clock className="h-4 w-4 shrink-0 text-gray-500" />
              Adjust Clock-Out Time
            </button>
            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100 ${
                row.absence === "on-leave" ? "text-amber-600" : ""
              }`}
              onClick={run(onMarkLeave)}
            >
              <PlaneTakeoff className="h-4 w-4 shrink-0 text-gray-500" />
              {row.absence === "on-leave" ? "Clear On Leave" : "Mark On Leave"}
            </button>
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-gray-100 ${
                row.absence === "absent" ? "text-red-600" : ""
              }`}
              onClick={run(onMarkAbsent)}
            >
              <UserX className="h-4 w-4 shrink-0 text-gray-500" />
              {row.absence === "absent" ? "Clear Absent" : "Mark Absent"}
            </button>
            <div className="my-1 h-px bg-gray-100" />
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-gray-100"
              onClick={run(onResetDay)}
            >
              <Trash2 className="h-4 w-4 shrink-0 text-gray-500" />
              Reset Day's Record
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}