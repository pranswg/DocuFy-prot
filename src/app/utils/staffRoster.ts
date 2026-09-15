// ── Staff roster for the Admin Attendance & Staff Monitoring view ───────────
// Roster = seeded mock staff (matching the Staff management page demo) PLUS
// any additional staff who have clocked in via attendanceStore (e.g. accounts
// created through "Register New Staff"), so the monitoring page always shows
// the people who actually exist in the system.
import { attendanceStore } from "./attendanceStore";
import { nowPHT } from "./attendanceStore";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  position: string;
  role?: "Staff" | "Admin";
  shift?: string;
  attendanceStatus?: "active" | "on-leave";
  onLeaveReason?: string;
};

export const DEFAULT_STAFF_SHIFT = "8:00 AM - 5:00 PM";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export const toDateKey = (d: Date = nowPHT()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const SEEDED_STAFF: StaffMember[] = [
  { id: "EMP-001", name: "Heaven Rica", email: "staff@test.com", position: "Print Operator", role: "Staff", shift: "8:00 AM - 5:00 PM", attendanceStatus: "on-leave", onLeaveReason: "On scheduled annual leave" },
  { id: "EMP-002", name: "Robert Chen", email: "robert.chen@docufy.com", position: "Print Operator", role: "Staff", shift: "8:00 AM - 5:00 PM" },
  { id: "EMP-003", name: "Katie Perry", email: "katie.perry@docufy.com", position: "Front Desk", role: "Staff", shift: "9:00 AM - 6:00 PM" },
  { id: "EMP-004", name: "Miguel Santos", email: "miguel.santos@docufy.com", position: "Bindery Lead", role: "Staff", shift: "8:00 AM - 6:00 PM" },
  { id: "EMP-005", name: "Ana Dela Cruz", email: "ana.delacruz@docufy.com", position: "Cashier", role: "Staff", shift: "8:30 AM - 5:30 PM" },
];

export const getStaffRoster = (): StaffMember[] => {
  const roster: StaffMember[] = [...SEEDED_STAFF];
  const known = new Set(roster.map(s => s.email.toLowerCase()));

  attendanceStore
    .getAllLogs()
    .filter(log => log.role === "staff")
    .forEach(log => {
      if (known.has(log.userId.toLowerCase())) return;
      roster.push({
        id: log.id,
        name: log.userName,
        email: log.userId,
        position: "Staff",
        role: "Staff",
        shift: DEFAULT_STAFF_SHIFT,
      });
      known.add(log.userId.toLowerCase());
    });

  return roster;
};

// ── Demo seed (today only, idempotent) ──────────────────────────────────────
// Paints a realistic monitoring snapshot on first load so the dashboard is not
// empty: one staff On Leave (Heaven — persistent on-leave status), one Automatically
// Absent (Ana — no clock-in), one Overtime, and two still on the clock (so the
// "Currently Working" strip has live rows).
// Skips staff@test.com (the staff test account)'s clock flow — leaving that untouched.
export const seedDemoAttendance = (): void => {
  const today = toDateKey();
  // Times are expressed as PHT wall-clock times (seeded demo mirrors PH shift).
  // Build the real UTC instant whose Manila wall-clock equals (today, h:m) — done
  // via Date.UTC with the −8h offset so it is correct on ANY device timezone.
  const at = (h: number, m: number): Date => {
    const base = nowPHT();
    return new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate(), h - 8, m, 0, 0));
  };

  const seedDay = (member: StaffMember, timeIn: Date, timeOut: Date) => {
    if (attendanceStore.getRecord(member.email, today)) return;
    attendanceStore.upsertTime(member.email, member.name, "staff", today, "timeIn", timeIn);
    attendanceStore.upsertTime(member.email, member.name, "staff", today, "timeOut", timeOut);
  };

  // Clock-in only (no time-out) so the record stays live on the monitor.
  const seedLive = (member: StaffMember, timeIn: Date) => {
    if (attendanceStore.getRecord(member.email, today)) return;
    attendanceStore.upsertTime(member.email, member.name, "staff", today, "timeIn", timeIn);
  };

  // Robert Chen — Present, On Time, still on the clock (8:00 start)
  seedLive(SEEDED_STAFF[1], at(8, 0));

  // Katie Perry — Present, Late, still on the clock (9:42 start)
  seedLive(SEEDED_STAFF[2], at(9, 42));

  // Miguel Santos — Present, Overtime (8:05 start, 10h total, clocked out)
  seedDay(SEEDED_STAFF[3], at(8, 5), at(18, 5));

  // Heaven Rica is On Leave via her persistent roster status; Ana Dela Cruz
  // has no clock-in, so she shows as Absent automatically. No per-day absence
  // mark is seeded here — an admin's Edit-dialog choice is never overwritten.
};