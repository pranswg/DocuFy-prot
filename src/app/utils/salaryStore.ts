// ── Salary tracking store — hourly-rate × attended hours ────────────────────
// Salary is computed per staff member from their attendance records:
//   Current Salary = Total Approved Working Hours (current period) × Hourly Rate
// Attendance is the only source of worked time — a staff member is paid for the
// shifts they actually clocked. The Monday–Friday schedule is naturally honored
// because weekend days with no attendance simply produce no hours (weekend
// attendance, if any, still counts as worked time). Releasing a salary marks the
// current period paid, stores a history record, and starts a NEW period — the
// attendance records themselves are never deleted.
import { attendanceStore, sessionTotalMs, nowPHT } from "./attendanceStore";

// ── Types ────────────────────────────────────────────────────────────────────
export type SalaryReleaseRecord = {
  id: string;
  staffEmail: string;
  staffName: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  totalHours: number;
  hourlyRate: number;
  amount: number;
  releasedAt: string;  // ISO instant
  releasedBy: string;
};

export type StaffSalarySummary = {
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  hourlyRate: number;
  amount: number;
};

type SalaryState = {
  hourlyRate: number;
  releases: SalaryReleaseRecord[];
  periodStarts: Record<string, string>; // staff email (lowercased) -> period start YYYY-MM-DD
};

type Subscriber = () => void;

const MS_PER_HOUR = 3_600_000;
const STORAGE_KEY = "docufy_salary_state_v1";

const pad2 = (n: number): string => String(n).padStart(2, "0");

const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (key: string, days: number): string => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dateKey(dt);
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const defaultPeriodStart = (): string => {
  const p = nowPHT();
  return `${p.getFullYear()}-${pad2(p.getMonth() + 1)}-01`;
};

const DEFAULT_STATE = (): SalaryState => ({
  hourlyRate: 50,
  releases: [],
  periodStarts: {},
});

// ── Store ────────────────────────────────────────────────────────────────────
class SalaryStore {
  private state: SalaryState = DEFAULT_STATE();
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.restore();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.onStorage);
    }
  }

  // Cross-tab live sync: when another tab writes salary state (release, rate,
  // period starts), reload from localStorage and notify subscribers.
  private onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      this.restore();
      this.notify();
    }
  };

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SalaryState>;
      this.state = {
        hourlyRate: typeof parsed.hourlyRate === "number" && parsed.hourlyRate > 0 ? parsed.hourlyRate : 50,
        releases: Array.isArray(parsed.releases) ? parsed.releases.filter(r => r && r.id && r.staffEmail && r.staffEmail.toLowerCase() === r.staffEmail) : [],
        periodStarts: parsed.periodStarts && typeof parsed.periodStarts === "object" ? parsed.periodStarts : {},
      };
    } catch {
      this.state = DEFAULT_STATE();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable — salary state stays in-memory for the session
    }
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb());
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // ── Hourly rate (admin-configured) ─────────────────────────────────────
  getHourlyRate(): number {
    return this.state.hourlyRate;
  }

  setHourlyRate(rate: number): void {
    const safe = Math.max(0, Number(rate) || 0);
    this.state.hourlyRate = round2(safe);
    this.persist();
    this.notify();
  }

  // ── Salary period ──────────────────────────────────────────────────────
  getPeriodStart(email: string): string {
    const key = (email || "").toLowerCase();
    const start = this.state.periodStarts[key] ?? defaultPeriodStart();
    const today = todayPHT();
    // After a release the next period starts the day AFTER the release day; on
    // the release day itself that start is still "tomorrow", which would make
    // the current-period window [tomorrow → today] inverted/empty and hide the
    // staff's same-day clock-ins ("0 days"). Clamp to today so the window is
    // never inverted and today's records always appear.
    return start > today ? today : start;
  }

  private recordsFor(staffEmail: string, startKey: string, endKey: string) {
    const key = staffEmail.toLowerCase();
    return attendanceStore
      .getAllLogs()
      .filter(r => r.userId.toLowerCase() === key && r.date >= startKey && r.date <= endKey)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  // ── Current-period summary (period start → today, PHT) ─────────────────
  getStaffSummary(email: string): StaffSalarySummary {
    const periodStart = this.getPeriodStart(email);
    const periodEnd = todayPHT();
    const records = this.recordsFor(email, periodStart, periodEnd);
    const totalMs = records.reduce((sum, r) => sum + sessionTotalMs(r, nowPHT()), 0);
    const totalHours = round2(totalMs / MS_PER_HOUR);
    const rate = this.state.hourlyRate;
    return {
      periodStart,
      periodEnd,
      totalHours,
      hourlyRate: rate,
      amount: round2(totalHours * rate),
    };
  }

  // ── Attendance records within the current period (for the detail table) ─
  getPeriodAttendance(email: string) {
    const periodStart = this.getPeriodStart(email);
    return this.recordsFor(email, periodStart, todayPHT());
  }

  // ── Release salary ─────────────────────────────────────────────────────
  releaseSalary(email: string, name: string, releasedBy: string): SalaryReleaseRecord {
    const key = (email || "").toLowerCase();
    const summary = this.getStaffSummary(email);
    const record: SalaryReleaseRecord = {
      id: `SAL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      staffEmail: email,
      staffName: name,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
      totalHours: summary.totalHours,
      hourlyRate: summary.hourlyRate,
      amount: summary.amount,
      releasedAt: new Date().toISOString(),
      releasedBy,
    };
    // Mark current period paid and start a NEW period the day after the release.
    // Attendance history is intentionally left intact.
    this.state.releases = [record, ...this.state.releases];
    this.state.periodStarts[key] = addDays(summary.periodEnd, 1);
    this.persist();
    this.notify();
    return record;
  }

  // ── Salary history (per staff, newest first) ───────────────────────────
  getSalaryHistory(email: string): SalaryReleaseRecord[] {
    const key = (email || "").toLowerCase();
    return this.state.releases.filter(r => r.staffEmail.toLowerCase() === key);
  }
}

const todayPHT = (): string => dateKey(nowPHT());

export const salaryStore = new SalaryStore();