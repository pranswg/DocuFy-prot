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
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

export const toDateKey = (d: Date = nowPHT()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const SEEDED_STAFF: StaffMember[] = [
  { id: "EMP-001", name: "Heaven Rica", email: "staff@test.com", position: "Print Operator" },
  { id: "EMP-002", name: "Robert Chen", email: "robert.chen@docufy.com", position: "Print Operator" },
  { id: "EMP-003", name: "Katie Perry", email: "katie.perry@docufy.com", position: "Front Desk" },
  { id: "EMP-004", name: "Miguel Santos", email: "miguel.santos@docufy.com", position: "Bindery Lead" },
  { id: "EMP-005", name: "Ana Dela Cruz", email: "ana.delacruz@docufy.com", position: "Cashier" },
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
      });
      known.add(log.userId.toLowerCase());
    });

  return roster;
};

// ── Demo seed (today only, idempotent) ──────────────────────────────────────
// Paints a realistic monitoring snapshot on first load so the dashboard is not
// empty: one staff On Leave, one Absent, one On Time, one Late, one Overtime.
// Skips staff@test.com (the staff test account) — leaving that flow untouched.
export const seedDemoAttendance = (): void => {
  const today = toDateKey();
  // Times are expressed as PHT wall-clock times (seeded demo mirrors PH shift).
  const at = (h: number, m: number): Date => {
    const base = nowPHT();
    const phtWallClock = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    return new Date(phtWallClock.getTime() - 8 * 60 * 60 * 1000);
  };

  const seedSession = (
    member: StaffMember,
    session: "morning" | "afternoon",
    timeIn: Date,
    timeOut: Date,
  ) => {
    if (attendanceStore.getRecord(member.email, today)) return;
    attendanceStore.upsertSession(member.email, member.name, "staff", today, session, "timeIn", timeIn);
    attendanceStore.upsertSession(member.email, member.name, "staff", today, session, "timeOut", timeOut);
  };

  // Heaven Rica — On Leave (never touch her clock flow)
  if (!attendanceStore.getAbsence("staff@test.com", today)) {
    attendanceStore.setAbsence("staff@test.com", today, "on-leave");
  }

  // Robert Chen — Present, On Time (8:00–12:00 / 13:00–17:00 = 8h)
  seedSession(SEEDED_STAFF[1], "morning", at(8, 0), at(12, 0));
  seedSession(SEEDED_STAFF[1], "afternoon", at(13, 0), at(17, 0));

  // Katie Perry — Present, Late (9:42 start, 7h18m total)
  seedSession(SEEDED_STAFF[2], "morning", at(9, 42), at(12, 0));
  seedSession(SEEDED_STAFF[2], "afternoon", at(13, 0), at(18, 0));

  // Miguel Santos — Present, Overtime (8:05 start, 10h05m total)
  seedSession(SEEDED_STAFF[3], "morning", at(8, 5), at(12, 0));
  seedSession(SEEDED_STAFF[3], "afternoon", at(13, 0), at(19, 5));

  // Ana Dela Cruz — Absent
  if (!attendanceStore.getAbsence("ana.delacruz@docufy.com", today)) {
    attendanceStore.setAbsence("ana.delacruz@docufy.com", today, "absent");
  }
};