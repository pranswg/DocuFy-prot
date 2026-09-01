import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  PlaneTakeoff,
  CalendarDays,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Clock,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  attendanceStore,
  sessionTotalMs,
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
  absence: AbsenceType | null;
  presence: Presence;
};

const LATE_CUTOFF = { hour: 8, minute: 30 };
const MS_PER_HOUR = 3_600_000;

// ── Row builders ────────────────────────────────────────────────────────────
function buildRow(
  member: StaffMember,
  dateKey: string,
  now: Date,
  override?: DailyAttendanceRecord | null,
): AdminRow {
  const rec = override ?? attendanceStore.getRecord(member.email, dateKey);
  const absence = attendanceStore.getAbsence(member.email, dateKey);

  const morningIn = rec?.morning.timeIn;
  const morningOut = rec?.morning.timeOut;
  const afternoonIn = rec?.afternoon.timeIn;
  const afternoonOut = rec?.afternoon.timeOut;
  const clockIn = morningIn ?? afternoonIn;
  const clockOut = afternoonOut ?? morningOut;

  const isLive =
    !!rec &&
    dateKey === toDateKey(new Date(now.getTime() + PHT_OFFSET_MS)) &&
    ((rec.morning.timeIn && !rec.morning.timeOut) ||
      (rec.afternoon.timeIn && !rec.afternoon.timeOut));

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
        { id: l.id, name: l.userName, email: l.userId, position: "Staff" };
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

  const [activeTab, setActiveTab] = useState("attendance");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(todayKey);
  const [dateTo, setDateTo] = useState(todayKey);

  const [adjust, setAdjust] = useState<AdjustTarget>(null);
  const [adjSession, setAdjSession] = useState<"morning" | "afternoon">("morning");
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
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "on-time" && r.onTime) ||
        (statusFilter === "late" && r.late) ||
        (statusFilter === "overtime" && r.overtime) ||
        (statusFilter === "no-clock-in" && r.presence === "no-clock-in") ||
        (statusFilter === "absent" && r.presence === "absent") ||
        (statusFilter === "on-leave" && r.presence === "on-leave");
      const matchTab =
        activeTab === "attendance"
          ? true
          : activeTab === "overtime"
            ? r.overtime
            : activeTab === "time-off"
              ? r.absence !== null
              : r.presence === "present";
      return matchSearch && matchStatus && matchTab;
    });
    if (isRange) {
      rows.sort((a, b) =>
        a.date === b.date
          ? a.member.name.localeCompare(b.member.name)
          : b.date.localeCompare(a.date),
      );
    }
    return rows;
  }, [baseRows, searchQuery, statusFilter, activeTab, isRange]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFrom(todayKey);
    setDateTo(todayKey);
  };

  // ── Row actions ────────────────────────────────────────────────────────────
  const openAdjust = (row: AdminRow, field: "timeIn" | "timeOut") => {
    const session: "morning" | "afternoon" = "morning";
    const current = row.record?.[session]?.[field];
    setAdjust({ row, field });
    setAdjSession(session);
    setAdjValue(current ? toLocalInput(current) : toLocalInput(new Date()));
  };

  const onAdjSessionChange = (s: "morning" | "afternoon") => {
    setAdjSession(s);
    const current = adjust?.row.record?.[s]?.[adjust.field];
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
      attendanceStore.upsertSession(
        row.member.email,
        row.member.name,
        "staff",
        row.date,
        adjSession,
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
    attendanceStore.upsertSession(row.member.email, row.member.name, "staff", row.date, "morning", "timeIn", null);
    attendanceStore.upsertSession(row.member.email, row.member.name, "staff", row.date, "afternoon", "timeIn", null);
    attendanceStore.setAbsence(row.member.email, row.date, null);
    toast.success(`Attendance reset for ${row.member.name} on ${fmtLongDay(row.date)}.`);
  };

  // ── Status badge rendering ─────────────────────────────────────────────────
  const renderStatus = (row: AdminRow) => {
    if (row.presence !== "present") {
      const style =
        row.presence === "on-leave"
          ? "bg-amber-100 text-amber-700 border-amber-200"
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
        {row.overtime && <Badge className="border border-blue-200 bg-blue-100 text-blue-700">Overtime</Badge>}
        {row.isLive && (
          <Badge className="border border-green-200 bg-green-50 text-green-700">
            <span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            On Clock
          </Badge>
        )}
      </span>
    );
  };

  const renderTable = () => (
    <Card className="overflow-hidden border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-gray-100">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#2F6FD6]" />
            {isRange ? "Attendance Log" : "Daily Attendance Log"}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock-In</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Clock-Out</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hours Rendered</th>
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
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">{row.member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.member.position}</td>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-gray-500 hover:text-[#2F6FD6]"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[200px]">
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => openAdjust(row, "timeIn")}>
                          <Pencil className="h-4 w-4" />
                          Adjust Clock-In Time
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onSelect={() => openAdjust(row, "timeOut")}>
                          <Clock className="h-4 w-4" />
                          Adjust Clock-Out Time
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={`cursor-pointer ${row.absence === "on-leave" ? "text-amber-600" : ""}`}
                          onSelect={() => setAbsenceTarget({ row, type: "on-leave" })}
                        >
                          <PlaneTakeoff className="h-4 w-4" />
                          {row.absence === "on-leave" ? "Clear On Leave" : "Mark On Leave"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={`cursor-pointer ${row.absence === "absent" ? "text-red-600" : ""}`}
                          onSelect={() => setAbsenceTarget({ row, type: "absent" })}
                        >
                          <UserX className="h-4 w-4" />
                          {row.absence === "absent" ? "Clear Absent" : "Mark Absent"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600" onSelect={() => setResetTarget(row)}>
                          <Trash2 className="h-4 w-4" />
                          Reset Day's Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isRange ? 9 : 8}>
                  <div className="flex flex-col items-center justify-center py-14 text-gray-400">
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
        <p className="text-xs text-gray-400 font-medium">
          Session model: Morning + Afternoon shifts. Standard day {STANDARD_DAILY_HOURS}h —
          On Time cutoff is 8:30 AM and totals beyond {STANDARD_DAILY_HOURS}h count as Overtime.
          Records persist locally on this device (demo).
        </p>
      </div>
    </Card>
  );

  return (
    <Layout menuItems={adminMenuItems} title="Attendance & Staff Monitoring">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <p className="text-gray-600">
            Monitoring of staff clock-in logs, attendance status, and time-off records.
          </p>
          {kpis.live > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              {kpis.live} staff currently on clock
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <Tabs defaultValue="attendance" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="time-off">Time Off</TabsTrigger>
            <TabsTrigger value="work-time">Work Time</TabsTrigger>
          </TabsList>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              {
                id: "kpi-total",
                label: "Total Staff",
                val: kpis.total,
                icon: Users,
                iconCls: "text-[#2F6FD6] group-hover:text-white",
                desc: `${kpis.live} on clock now`,
              },
              {
                id: "kpi-present",
                label: "Present",
                val: kpis.present,
                icon: UserCheck,
                iconCls: "text-green-600 group-hover:text-white",
                desc: `${kpis.onTime} on time · ${kpis.late} late`,
              },
              {
                id: "kpi-nonpresent",
                label: "Non-Present",
                val: kpis.absent + kpis.noClock,
                icon: UserX,
                iconCls: "text-red-600 group-hover:text-white",
                desc: `${kpis.absent} absent · ${kpis.noClock} no clock-in`,
              },
              {
                id: "kpi-away",
                label: "Away (On Leave)",
                val: kpis.away,
                icon: PlaneTakeoff,
                iconCls: "text-amber-600 group-hover:text-white",
                desc: `${kpis.away} staff on approved leave`,
              },
            ].map(kpi => (
              <Card
                key={kpi.id}
                className="border border-slate-100 bg-white p-5 shadow-sm transition-all group hover:-translate-y-0.5 hover:bg-[#2F6FD6] hover:text-white hover:shadow-md"
              >
                <div className="flex justify-between items-start">
                  <p className="text-base font-bold text-slate-700 group-hover:text-white">{kpi.label}</p>
                  <kpi.icon className={`h-5 w-5 opacity-60 transition-all group-hover:scale-110 group-hover:opacity-100 ${kpi.iconCls}`} />
                </div>
                <p className="text-3xl font-bold text-slate-900 group-hover:text-white mt-2 tabular-nums">{kpi.val}</p>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 font-medium uppercase mt-1">{kpi.desc}</p>
              </Card>
            ))}
          </div>

          {/* Filter & Search bar */}
          <Card className="p-4 border border-slate-100 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by staff name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="w-full lg:w-40">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</Label>
                <div className="relative mt-1.5">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={e => setDateFrom(e.target.value || todayKey)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full lg:w-40">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</Label>
                <div className="relative mt-1.5">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={e => setDateTo(e.target.value || todayKey)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full lg:w-48">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="on-time">On Time</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="no-clock-in">No Clock-In</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="h-10 border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white"
                onClick={resetFilters}
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </Card>

          {/* Table per tab */}
          <TabsContent value="attendance">{renderTable()}</TabsContent>
          <TabsContent value="overtime">{renderTable()}</TabsContent>
          <TabsContent value="time-off">{renderTable()}</TabsContent>
          <TabsContent value="work-time">{renderTable()}</TabsContent>
        </Tabs>

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
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</Label>
                <Select value={adjSession} onValueChange={v => onAdjSessionChange(v as "morning" | "afternoon")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning Shift</SelectItem>
                    <SelectItem value="afternoon">Afternoon Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</Label>
                <Input
                  type="datetime-local"
                  value={adjValue}
                  onChange={e => setAdjValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">
                Saving will overwrite the {adjSession === "morning" ? "Morning" : "Afternoon"} session's{" "}
                {adjust?.field === "timeIn" ? "clock-in" : "clock-out"} timestamp for this staff member.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjust(null)}>
                Cancel
              </Button>
              <Button className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white" onClick={() => setShowSaveAdjustConfirm(true)}>
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
            description={`Overwrite ${adjust.row.member.name}'s ${adjust.field === "timeIn" ? "clock-in" : "clock-out"} for ${fmtLongDay(adjust.row.date)} (${adjSession === "morning" ? "Morning" : "Afternoon"} session) to ${adjValue}? This changes their recorded hours and status.`}
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