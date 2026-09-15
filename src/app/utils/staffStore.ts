// ── Staff directory store — persisted staff list ────────────────────────────
// The Staff Management page used to keep its roster in local component state,
// so any change was lost on refresh while the auth account (which controls the
// actual login role) was already updated — that mismatch made a Staff→Admin
// role change look like it reverted. This store persists the roster itself
// (localStorage), while AuthContext persists the matching staff/admin sign-in
// accounts, keeping the displayed role and the real login permission in sync.
import { attendanceStore } from "./attendanceStore";

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  attendanceStatus: "active" | "on-leave";
  onLeaveReason: string;
  joinDate: string;
  skillsMessage: string;
  portfolioLink: string;
  performanceNotes: {
    date: string;
    note: string;
    rating: number;
  }[];
  salary: number;
  allowances: { type: string; amount: number }[];
  paymentHistory: {
    date: string;
    amount: number;
    type: string;
  }[];
  permissions: string[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }[];
}

const STORAGE_KEY = "docufy_staff_list_v1";

export const DEFAULT_STAFF: Staff[] = [
  {
    id: "EMP-001",
    name: "Heaven Rica",
    email: "staff@test.com",
    phone: "0912 345 6789",
    role: "Staff",
    status: "Active",
    attendanceStatus: "on-leave",
    onLeaveReason: "On scheduled annual leave",
    joinDate: "2025-09-01",
    skillsMessage: "I have extensive experience in managing daily print operations, quality control, equipment maintenance, color management, and providing excellent customer service. Certified Print Professional with proven track record.",
    portfolioLink: "https://drive.google.com/heavenrica-portfolio",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Excellent performance, handled rush orders efficiently",
        rating: 5,
      },
      {
        date: "2026-03-01",
        note: "Successfully trained 2 new staffs",
        rating: 5,
      },
      {
        date: "2026-02-01",
        note: "Improved print quality standards",
        rating: 4,
      },
    ],
    salary: 18000,
    allowances: [
      { type: "Transportation", amount: 2000 },
      { type: "Meal", amount: 1500 },
    ],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 21500,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 21500,
        type: "Monthly Salary",
      },
      {
        date: "2026-02-15",
        amount: 21500,
        type: "Monthly Salary",
      },
    ],
    permissions: [
      "view_orders",
      "edit_orders",
      "view_reports",
    ],
    tasks: [
      {
        id: "TSK-001",
        title: "Quality check for color prints",
        status: "Completed",
        priority: "High",
        dueDate: "2026-04-20",
      },
      {
        id: "TSK-002",
        title: "Train new staff on binding",
        status: "In Progress",
        priority: "Medium",
        dueDate: "2026-04-25",
      },
      {
        id: "TSK-003",
        title: "Printer toner check",
        status: "Pending",
        priority: "Low",
        dueDate: "2026-04-30",
      },
    ],
  },
  {
    id: "EMP-002",
    name: "Robert Chen",
    email: "robert.chen@docufy.com",
    phone: "0923 456 7890",
    role: "Staff",
    status: "Active",
    attendanceStatus: "active",
    onLeaveReason: "",
    joinDate: "2025-10-15",
    skillsMessage: "Proficient in printing operations, equipment setup, document binding, and customer support. Quick learner with attention to detail.",
    portfolioLink: "https://linkedin.com/in/robertchen",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Good attendance and punctuality",
        rating: 4,
      },
      {
        date: "2026-03-01",
        note: "Needs improvement in color matching",
        rating: 3,
      },
    ],
    salary: 15000,
    allowances: [{ type: "Transportation", amount: 1500 }],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 16500,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 16500,
        type: "Monthly Salary",
      },
    ],
    permissions: ["view_orders", "edit_orders"],
    tasks: [
      {
        id: "TSK-004",
        title: "Process customer orders",
        status: "Completed",
        priority: "High",
        dueDate: "2026-04-21",
      },
      {
        id: "TSK-005",
        title: "Clean and maintain printers",
        status: "Completed",
        priority: "Medium",
        dueDate: "2026-04-22",
      },
    ],
  },
  {
    id: "EMP-003",
    name: "Katie Perry",
    email: "katie.perry@docufy.com",
    phone: "0934 567 8901",
    role: "Staff",
    status: "Active",
    attendanceStatus: "active",
    onLeaveReason: "",
    joinDate: "2026-01-10",
    skillsMessage: "Excellent customer service skills, experienced in payment processing, order management, and professional communication.",
    portfolioLink: "",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Excellent customer service skills",
        rating: 5,
      },
      {
        date: "2026-03-01",
        note: "Quick learner, adapting well to role",
        rating: 4,
      },
    ],
    salary: 14000,
    allowances: [{ type: "Meal", amount: 1000 }],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 15000,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 15000,
        type: "Monthly Salary",
      },
      {
        date: "2026-02-15",
        amount: 15000,
        type: "Monthly Salary",
      },
    ],
    permissions: ["view_orders", "verify_payments"],
    tasks: [
      {
        id: "TSK-006",
        title: "Verify payment receipts",
        status: "In Progress",
        priority: "High",
        dueDate: "2026-04-22",
      },
      {
        id: "TSK-007",
        title: "Update customer database",
        status: "Pending",
        priority: "Low",
        dueDate: "2026-04-28",
      },
    ],
  },
];

type Subscriber = () => void;

// Backfills any missing fields on records loaded from storage so older data
// (saved before a field existed) still behaves correctly. "absent" is no
// longer a stored status — a staff member who doesn't clock in is simply
// shown as Absent automatically, so any legacy "absent" value converts to
// "active". Demo staff inherit their seeded on-leave status when the field
// has never been set; once the admin picks a status it is stored and honored
// from then on.
const DEMO_ATTENDANCE_STATUS: Record<string, "on-leave"> = {
  "staff@test.com": "on-leave",
};

function normalizeStaff(s: Staff): Staff {
  const stored = s.attendanceStatus;
  const onLeave = stored === "on-leave" || (stored !== "active" && stored !== "absent" && DEMO_ATTENDANCE_STATUS[s.email.toLowerCase()] === "on-leave");
  return {
    ...s,
    attendanceStatus: onLeave ? "on-leave" : "active",
    onLeaveReason: onLeave ? (s.onLeaveReason?.trim() ? s.onLeaveReason : "Not specified") : "",
  };
}

// ── Store ────────────────────────────────────────────────────────────────────
class StaffStore {
  private list: Staff[] = DEFAULT_STAFF;
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.restore();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.onStorage);
    }
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      this.restore();
      this.notify();
    }
  };

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Staff[];
      if (!Array.isArray(parsed)) return;
      this.list = parsed.filter(
        (s) => s && typeof s === "object" && typeof s.email === "string" && typeof s.name === "string",
      ).map(normalizeStaff);
      if (this.list.length === 0) this.list = DEFAULT_STAFF;
    } catch {
      this.list = DEFAULT_STAFF;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list));
    } catch {
      // storage unavailable — roster stays in-memory for the session
    }
  }

  getStaff(): Staff[] {
    return this.list.map((s) => ({ ...s }));
  }

  setStaff(next: Staff[]): void {
    this.list = next.map((s) => normalizeStaff({ ...s }));
    this.persist();
    this.notify();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }
}

export const staffStore = new StaffStore();

// Staff who appear in the directory AND have attendance records (used by
// AdminAttendance's AttendanceView: seeded staff + anyone who ever clocked in).
export function getStaffRosterFromRecords(): { email: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const s of staffStore.getStaff()) seen.set(s.email.toLowerCase(), s.name);
  for (const r of attendanceStore.getAllLogs()) {
    if (!seen.has(r.userId.toLowerCase())) seen.set(r.userId.toLowerCase(), r.userName);
  }
  return Array.from(seen.entries()).map(([email, name]) => ({ email, name }));
}