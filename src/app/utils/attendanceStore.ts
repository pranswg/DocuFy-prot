// ── Attendance management system — Morning / Afternoon session model ────────

export type SessionRecord = {
  timeIn?: Date;
  timeOut?: Date;
};

export type DailyAttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  role: 'admin' | 'staff';
  date: string; // YYYY-MM-DD
  morning: SessionRecord;
  afternoon: SessionRecord;
};

// Determines which action the user should perform next
export type NextAction =
  | 'morning-time-in'    // No morning session started yet
  | 'morning-time-out'   // Morning started but not ended
  | 'afternoon-time-in'  // Morning complete; afternoon not started
  | 'afternoon-time-out' // Afternoon started but not ended
  | 'complete';          // Both sessions fully recorded for today

// Backward-compat shapes kept for NewPrintRequest.tsx
export type AttendanceLog = {
  id: string;
  userId: string;
  userName: string;
  role: 'admin' | 'staff';
  timeIn: Date;
  timeOut?: Date;
  status: 'active' | 'inactive';
};

export type UserAvailability = {
  isTimedIn: boolean;
  currentLog?: AttendanceLog;
};

type Subscriber = () => void;

// ── Helpers ────────────────────────────────────────────────────────────────
const pad2 = (n: number): string => String(n).padStart(2, '0');

const toDateKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; // local YYYY-MM-DD

const calcDurationMs = (start: Date, end: Date = new Date()): number =>
  Math.max(0, end.getTime() - start.getTime());

const formatDuration = (ms: number): string => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

export { formatDuration, calcDurationMs };

// ── Philippines time (UTC+8) helpers ───────────────────────────────────────
// All product-facing time is pinned to the Philippines timezone regardless of
// the viewer's device clock, so a Philippine printing-shop system reads
// correctly everywhere.
export const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Current instant shifted to the PHT wall-clock (a local-view Date carrying the
// Philippines calendar time/date). Use .getHours()/.getDay()/.getDate() on this
// to derive PHT-based periods/days.
export const nowPHT = (): Date => new Date(Date.now() + PHT_OFFSET_MS);

// Philippines date key (YYYY-MM-DD) for the current moment.
export const todayPHTKey = (): string => toDateKey(nowPHT());

// Current session period (Morning/Afternoon) derived from the PHT clock.
export const getCurrentPeriod = (): 'morning' | 'afternoon' =>
  nowPHT().getHours() < 12 ? 'morning' : 'afternoon';

// Format a UTC instant as a PHT HH:MM (or HH:MM:SS with includeSeconds).
export const formatPHT = (d: Date | undefined | null, includeSeconds = false): string => {
  if (!d || Number.isNaN(d.getTime())) return '—';
  const pht = new Date(d.getTime() + PHT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${pad(pht.getHours())}:${pad(pht.getMinutes())}`;
  return includeSeconds ? `${base}:${pad(pht.getSeconds())}` : base;
};

// ── Timesheet analytics — constants & pure helpers ─────────────────────────
export const STANDARD_DAILY_HOURS = 8;
export const STANDARD_WEEKLY_HOURS = 40;

const MS_PER_HOUR = 3_600_000;

// Monday-based week-start date key (PHT date, YYYY-MM-DD)
export const getWeekStartKey = (d: Date = nowPHT()): string => {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
  return toDateKey(monday);
};

// Elapsed ms across a record's sessions; an active (not-yet-clocked-out)
// session counts up to `until` so live totals keep ticking during a shift.
export const sessionTotalMs = (record: DailyAttendanceRecord, until: Date = new Date()): number => {
  const acc = (s: SessionRecord): number =>
    s.timeIn ? Math.max(0, (s.timeOut ?? until).getTime() - s.timeIn.getTime()) : 0;
  return acc(record.morning) + acc(record.afternoon);
};

// Gap between the Morning time-out and the Afternoon time-in (lunch/break).
export const sessionBreakMs = (record: DailyAttendanceRecord): number => {
  if (!record.morning.timeIn || !record.morning.timeOut || !record.afternoon.timeIn) return 0;
  return Math.max(0, record.afternoon.timeIn.getTime() - record.morning.timeOut.getTime());
};

// Overtime ms beyond a standard window (defaults: 8h/day, 40h/week).
export const overtimeMs = (totalMs: number, standardHours: number = STANDARD_DAILY_HOURS): number =>
  Math.max(0, totalMs - standardHours * MS_PER_HOUR);

// ── Store ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'docufy_attendance_records_v1';
const ABSENCE_KEY = 'docufy_attendance_absences_v1';

export type AbsenceType = 'on-leave' | 'absent';

type AbsenceEntry = {
  userId: string;
  date: string; // YYYY-MM-DD
  type: AbsenceType;
};

type StoredSession = { timeIn?: string; timeOut?: string };
type StoredRecord = Omit<DailyAttendanceRecord, 'morning' | 'afternoon'> & {
  morning: StoredSession;
  afternoon: StoredSession;
};

class AttendanceStore {
  private records: DailyAttendanceRecord[] = [];
  private absences: Map<string, AbsenceType> = new Map(); // `${userId}|${date}` -> type
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.restore();
    this.restoreAbsences();
  }

  // ── Persistence (demo: per-browser localStorage) ──────────────────────
  private serialize(): StoredRecord[] {
    const toStored = (s: SessionRecord): StoredSession => ({
      timeIn: s.timeIn?.toISOString(),
      timeOut: s.timeOut?.toISOString(),
    });
    return this.records.map((r) => ({
      ...r,
      morning: toStored(r.morning),
      afternoon: toStored(r.afternoon),
    }));
  }

  private parseStored(s: StoredSession): SessionRecord {
    return {
      timeIn: s.timeIn ? new Date(s.timeIn) : undefined,
      timeOut: s.timeOut ? new Date(s.timeOut) : undefined,
    };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
    } catch {
      // storage unavailable — records stay in-memory for the session
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredRecord[];
      this.records = parsed.map((r) => ({
        ...r,
        morning: this.parseStored(r.morning),
        afternoon: this.parseStored(r.afternoon),
      }));
    } catch {
      this.records = [];
    }
  }

  // ── Absence/leave persistence (admin monitoring — separate key) ────────
  private persistAbsences(): void {
    try {
      const entries: AbsenceEntry[] = [...this.absences.entries()].map(([key, type]) => {
        const [date, userId] = key.split('|');
        return { userId, date, type };
      });
      localStorage.setItem(ABSENCE_KEY, JSON.stringify(entries));
    } catch {
      // storage unavailable
    }
  }

  private restoreAbsences(): void {
    try {
      const raw = localStorage.getItem(ABSENCE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AbsenceEntry[];
      this.absences.clear();
      parsed.forEach(e => this.absences.set(`${e.userId}|${e.date}`, e.type));
    } catch {
      this.absences.clear();
    }
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.persist();
    this.subscribers.forEach(cb => cb());
  }

  // ── Get or create today's record ──────────────────────────────────────
  private getOrCreateTodayRecord(
    userId: string,
    userName: string,
    role: 'admin' | 'staff',
  ): DailyAttendanceRecord {
    const today = toDateKey(nowPHT());
    let record = this.records.find(r => r.userId === userId && r.date === today);
    if (!record) {
      record = {
        id: `ATT-${Date.now()}`,
        userId,
        userName,
        role,
        date: today,
        morning: {},
        afternoon: {},
      };
      this.records.push(record);
    }
    return record;
  }

  // ── Determine next action for user ────────────────────────────────────
  // Period-aware: the current PHT AM/PM dictates which session is in play.
  // In the Morning you can only act on `morning`; in the Afternoon only on
  // `afternoon`. 'complete' here means the CURRENT period's session is done.
  getNextAction(userId: string): NextAction {
    const today = toDateKey(nowPHT());
    const record = this.records.find(r => r.userId === userId && r.date === today);
    const period = getCurrentPeriod();
    const session = record?.[period];

    if (!session || !session.timeIn) {
      return period === 'morning' ? 'morning-time-in' : 'afternoon-time-in';
    }
    if (!session.timeOut) {
      return period === 'morning' ? 'morning-time-out' : 'afternoon-time-out';
    }
    return 'complete';
  }

  // ── Time In (period-aware — AM = Morning, PM = Afternoon) ─────────────
  timeIn(userId: string, userName: string, role: 'admin' | 'staff'): DailyAttendanceRecord {
    const record = this.getOrCreateTodayRecord(userId, userName, role);
    const now = new Date();
    const period = getCurrentPeriod();

    const target = record[period];
    if (!target.timeIn) {
      target.timeIn = now;
    } else if (!target.timeOut) {
      throw new Error(
        period === 'morning'
          ? 'You are still in your Morning session. Please Time Out first.'
          : 'You are still in your Afternoon session. Please Time Out first.',
      );
    } else {
      throw new Error(
        period === 'morning'
          ? 'Your Morning session is already complete. Afternoon Time In opens in the PM.'
          : 'Your Afternoon session is already complete for today.',
      );
    }

    this.notify();
    return record;
  }

  // ── Time Out (period-aware — always closes the current AM/PM session) ─
  timeOut(userId: string): DailyAttendanceRecord {
    const today = toDateKey(nowPHT());
    const record = this.records.find(r => r.userId === userId && r.date === today);

    if (!record) {
      throw new Error('No attendance record found for today. Please Time In first.');
    }

    const now = new Date();
    const period = getCurrentPeriod();
    const session = record[period];

    if (session.timeIn && !session.timeOut) {
      session.timeOut = now;
    } else {
      throw new Error(
        period === 'morning'
          ? 'No active Morning session to Time Out from.'
          : 'No active Afternoon session to Time Out from.',
      );
    }

    this.notify();
    return record;
  }

  // ── Today's record for a user ─────────────────────────────────────────
  getTodayRecord(userId: string): DailyAttendanceRecord | null {
    const today = toDateKey(nowPHT());
    return this.records.find(r => r.userId === userId && r.date === today) ?? null;
  }

  // ── All records for a user (newest date first) ───────────────────────
  getUserLogs(userId: string): DailyAttendanceRecord[] {
    return this.records
      .filter(r => r.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── This week's records for a user (oldest date first) ───────────────
  getWeekRecords(userId: string): DailyAttendanceRecord[] {
    const start = getWeekStartKey();
    return this.records
      .filter(r => r.userId === userId && r.date >= start)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── All records ───────────────────────────────────────────────────────
  getAllLogs(): DailyAttendanceRecord[] {
    return [...this.records].sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── Get a record for a specific user + date ───────────────────────────
  getRecord(userId: string, date: string): DailyAttendanceRecord | null {
    return this.records.find(r => r.userId === userId && r.date === date) ?? null;
  }

  // ── Manual adjustment (admin monitoring) ──────────────────────────────
  // Sets (or clears, value = null) a session timestamp. Creates the record
  // on first use so an admin can back-fill a day from the monitoring table.
  upsertSession(
    userId: string,
    userName: string,
    role: 'admin' | 'staff',
    date: string,
    session: 'morning' | 'afternoon',
    field: 'timeIn' | 'timeOut',
    value: Date | null,
  ): DailyAttendanceRecord {
    let record = this.records.find(r => r.userId === userId && r.date === date);
    if (!record) {
      record = {
        id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        userId,
        userName,
        role,
        date,
        morning: {},
        afternoon: {},
      };
      this.records.push(record);
    }

    const target = record[session];
    if (field === 'timeIn') {
      target.timeIn = value ?? undefined;
      if (!value) target.timeOut = undefined;
    } else {
      if (!target.timeIn && value) {
        throw new Error('Set the session Time In before adjusting Time Out.');
      }
      target.timeOut = value ?? undefined;
    }

    this.notify();
    return record;
  }

  // ── Absence / leave overrides (admin monitoring) ──────────────────────
  setAbsence(userId: string, date: string, type: AbsenceType | null): void {
    const key = `${userId}|${date}`;
    if (!type) {
      this.absences.delete(key);
    } else {
      this.absences.set(key, type);
    }
    this.persistAbsences();
    this.notify();
  }

  getAbsence(userId: string, date: string): AbsenceType | null {
    return this.absences.get(`${userId}|${date}`) ?? null;
  }

  // ── Check if a specific user is currently clocked in ─────────────────
  isUserAvailable(userId: string): boolean {
    return this.getNextAction(userId) === 'morning-time-out'
        || this.getNextAction(userId) === 'afternoon-time-out';
  }

  // ── Check if any user in a role is currently clocked in ──────────────
  isRoleAvailable(role: 'admin' | 'staff'): boolean {
    const today = toDateKey(nowPHT());
    return this.records.some(r => {
      if (r.role !== role || r.date !== today) return false;
      const morningActive   = !!r.morning.timeIn   && !r.morning.timeOut;
      const afternoonActive = !!r.afternoon.timeIn && !r.afternoon.timeOut;
      return morningActive || afternoonActive;
    });
  }

  // ── Backward-compat: availability for NewPrintRequest.tsx ────────────
  getAvailability(): { admin: UserAvailability; staff: UserAvailability } {
    const buildAvailability = (role: 'admin' | 'staff'): UserAvailability => {
      const today = toDateKey(nowPHT());
      const activeRecord = this.records.find(r => {
        if (r.role !== role || r.date !== today) return false;
        const morningActive   = !!r.morning.timeIn   && !r.morning.timeOut;
        const afternoonActive = !!r.afternoon.timeIn && !r.afternoon.timeOut;
        return morningActive || afternoonActive;
      });

      if (!activeRecord) return { isTimedIn: false };

      // Find active session's timeIn
      const activeTimeIn = !activeRecord.morning.timeOut && activeRecord.morning.timeIn
        ? activeRecord.morning.timeIn
        : activeRecord.afternoon.timeIn!;

      const legacyLog: AttendanceLog = {
        id:       activeRecord.id,
        userId:   activeRecord.userId,
        userName: activeRecord.userName,
        role:     activeRecord.role,
        timeIn:   activeTimeIn,
        status:   'active',
      };

      return { isTimedIn: true, currentLog: legacyLog };
    };

    return {
      admin: buildAvailability('admin'),
      staff: buildAvailability('staff'),
    };
  }

  // ── Backward-compat: getCurrentSession for existing consumers ─────────
  getCurrentSession(userId: string): AttendanceLog | null {
    const today = toDateKey(nowPHT());
    const record = this.records.find(r => r.userId === userId && r.date === today);
    if (!record) return null;

    const morningActive   = !!record.morning.timeIn   && !record.morning.timeOut;
    const afternoonActive = !!record.afternoon.timeIn && !record.afternoon.timeOut;

    if (!morningActive && !afternoonActive) return null;

    const activeTimeIn = morningActive
      ? record.morning.timeIn!
      : record.afternoon.timeIn!;

    return {
      id:       record.id,
      userId:   record.userId,
      userName: record.userName,
      role:     record.role,
      timeIn:   activeTimeIn,
      status:   'active',
    };
  }

  // ── Compute total worked hours for a record ───────────────────────────
  getTotalHours(record: DailyAttendanceRecord): number {
    let ms = 0;
    if (record.morning.timeIn && record.morning.timeOut) {
      ms += calcDurationMs(record.morning.timeIn, record.morning.timeOut);
    }
    if (record.afternoon.timeIn && record.afternoon.timeOut) {
      ms += calcDurationMs(record.afternoon.timeIn, record.afternoon.timeOut);
    }
    return parseFloat((ms / 3_600_000).toFixed(2));
  }

  // ── Overall daily status ──────────────────────────────────────────────
  getDayStatus(record: DailyAttendanceRecord): 'Complete' | 'Half-Day' | 'Incomplete' | 'Active' {
    const mDone = !!(record.morning.timeIn && record.morning.timeOut);
    const aDone = !!(record.afternoon.timeIn && record.afternoon.timeOut);
    const mActive = !!(record.morning.timeIn && !record.morning.timeOut);
    const aActive = !!(record.afternoon.timeIn && !record.afternoon.timeOut);

    if (mActive || aActive) return 'Active';
    if (mDone && aDone)     return 'Complete';
    if (mDone || aDone)     return 'Half-Day';
    return 'Incomplete';
  }
}

export const attendanceStore = new AttendanceStore();