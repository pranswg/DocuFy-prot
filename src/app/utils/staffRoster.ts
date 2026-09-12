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
};

export const DEFAULT_STAFF_SHIFT = "8:00 AM - 5:00 PM";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export const toDateKey = (d: Date = nowPHT()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const SEEDED_STAFF: StaffMember[] = [
  { id: "EMP-001", name: "Heaven Rica", email: "staff@test.com", position: "Print Operator", role: "Staff", shift: "8:00 AM - 5:00 PM" },
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
// empty: one staff On Leave, one Absent, one Overtime, and two still on the
// clock (so the "Currently Working" strip has live rows).
// Skips staff@test.com (the staff test account) — leaving that flow untouched.
export const seedDemoAttendance = (): void => {
  const today = toDateKey();
  // Times are expressed as PHT wall-clock times (seeded demo mirrors PH shift).
  const at = (h: number, m: number): Date => {
    const base = nowPHT();
    const phtWallClock = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    return new Date(phtWallClock.getTime() - 8 * 60 * 60 * 1000);
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

  // Heaven Rica — On Leave (never touch her clock flow)
  if (!attendanceStore.getAbsence("staff@test.com", today)) {
    attendanceStore.setAbsence("staff@test.com", today, "on-leave");
  }

  // Robert Chen — Present, On Time, still on the clock (8:00 start)
  seedLive(SEEDED_STAFF[1], at(8, 0));

  // Katie Perry — Present, Late, still on the clock (9:42 start)
  seedLive(SEEDED_STAFF[2], at(9, 42));

  // Miguel Santos — Present, Overtime (8:05 start, 10h total, clocked out)
  seedDay(SEEDED_STAFF[3], at(8, 5), at(18, 5));

  // Ana Dela Cruz — Absent
  if (!attendanceStore.getAbsence("ana.delacruz@docufy.com", today)) {
    attendanceStore.setAbsence("ana.delacruz@docufy.com", today, "absent");
  }
};