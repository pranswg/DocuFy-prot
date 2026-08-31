// Centralized system-wide notifications/announcements store.
// Admins broadcast a notification to "All Users"; it then appears in every
// user's Notifications section (customer, staff, and admin alike). Read-state
// is tracked per user email so it survives page changes without a backend.
//
// The `type` field is intentionally open-ended so later system events can push
// their own notifications (e.g. pricing updates, order-status changes) through
// the SAME store without redesigning the Notifications section — just call
// createAnnouncement() with the right type from wherever the event happens.
import { toPHT, PHT_OFFSET_MS } from './pht';

export type AnnouncementType =
  | 'announcement'
  | 'pricing'
  | 'maintenance'
  | 'reminder'
  | 'promo';

// Severity/visibility tier. `type` says WHAT the notice is about (used by
// future system events); `priority` says HOW prominently it must be shown.
export type AnnouncementPriority = 'regular' | 'important' | 'emergency';

export type Announcement = {
  id: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  title: string;
  message: string;
  // For now the only recipient scope is "All Users". Later this can become
  // an array of emails/roles without changing the consumer API.
  recipients: 'all';
  sentBy: string; // sender email
  sentAt: string; // ISO string
  readBy: string[]; // user emails that have marked it read
};

type Subscriber = () => void;

const STORAGE_KEY = 'docufy_announcements_v1';

function isAnnouncementType(value: unknown): value is AnnouncementType {
  return (
    value === 'announcement' ||
    value === 'pricing' ||
    value === 'maintenance' ||
    value === 'reminder' ||
    value === 'promo'
  );
}

function isAnnouncementPriority(value: unknown): value is AnnouncementPriority {
  return value === 'regular' || value === 'important' || value === 'emergency';
}

function normalize(raw: unknown): Announcement[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Announcement => {
      if (!item || typeof item !== 'object') return false;
      const a = item as Announcement;
      return (
        typeof a.id === 'string' &&
        typeof a.title === 'string' &&
        typeof a.message === 'string' &&
        typeof a.sentAt === 'string'
      );
    })
    .map((a) => ({
      ...a,
      type: isAnnouncementType(a.type) ? a.type : 'announcement',
      priority: isAnnouncementPriority(a.priority) ? a.priority : 'regular',
      recipients: 'all',
      sentBy: typeof a.sentBy === 'string' ? a.sentBy : '',
      readBy: Array.isArray(a.readBy) ? a.readBy.filter((e) => typeof e === 'string') : [],
    }));
}

class AnnouncementsStore {
  private announcements: Announcement[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized = false;

  constructor() {
    this.load();
  }

  private load(): void {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.announcements = normalize(stored ? JSON.parse(stored) : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.announcements = [];
    }
    this.initialized = true;
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.announcements));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  private notify(): void {
    this.subscribers.forEach((listener) => listener());
  }

  // Arrow-function field (not a method shorthand) so `this` stays bound even
  // when consumers pass it as a detached reference (e.g. to useSyncExternalStore).
  subscribe = (listener: Subscriber): () => void => {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  };

  getAnnouncements(): Announcement[] {
    this.load();
    return [...this.announcements].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }

  // Every announcement currently targets "All Users"; each user (including
  // staff and admin) sees the full list scoped to the current session.
  getAnnouncementsFor(email: string): Announcement[] {
    return this.getAnnouncements();
  }

  getUnreadCount(email: string): number {
    return this.getAnnouncements().filter((a) => !a.readBy.includes(email)).length;
  }

  // Unread important/emergency announcements — surfaced as a subtle "needs
  // attention" indicator in the sidebar so urgent items can't get lost.
  getUrgentUnreadCount(email: string): number {
    return this.getAnnouncements().filter(
      (a) => a.priority !== 'regular' && !a.readBy.includes(email),
    ).length;
  }

  markRead(id: string, email: string): boolean {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) return false;
    if (this.announcements[index].readBy.includes(email)) return true;
    this.announcements = this.announcements.map((a) =>
      a.id === id ? { ...a, readBy: [...a.readBy, email] } : a,
    );
    this.save();
    this.notify();
    return true;
  }

  markAllRead(email: string): void {
    this.announcements = this.announcements.map((a) =>
      a.readBy.includes(email) ? a : { ...a, readBy: [...a.readBy, email] },
    );
    this.save();
    this.notify();
  }

  // Create a new announcement broadcast to All Users.
  createAnnouncement(data: {
    title: string;
    message: string;
    type?: AnnouncementType;
    priority?: AnnouncementPriority;
    sentBy: string; // admin email
  }): Announcement {
    const announcement: Announcement = {
      id: `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      type: data.type || 'announcement',
      // Regular notifications are the safe default; anything else asks for
      // a more prominent treatment.
      priority: isAnnouncementPriority(data.priority) ? data.priority : 'regular',
      title: data.title.trim(),
      message: data.message.trim(),
      recipients: 'all',
      sentBy: data.sentBy,
      sentAt: new Date().toISOString(),
      // The sender has already seen it — don't count it as unread for them.
      readBy: data.sentBy ? [data.sentBy] : [],
    };
    this.announcements = [announcement, ...this.announcements];
    this.save();
    this.notify();
    return announcement;
  }

  deleteAnnouncement(id: string): boolean {
    const next = this.announcements.filter((a) => a.id !== id);
    if (next.length === this.announcements.length) return false;
    this.announcements = next;
    this.save();
    this.notify();
    return true;
  }
}

export const announcementsStore = new AnnouncementsStore();

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  announcement: 'Announcement',
  pricing: 'Pricing Update',
  maintenance: 'Maintenance Notice',
  reminder: 'Important Reminder',
  promo: 'Promotion',
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  regular: 'Regular',
  important: 'Important',
  emergency: 'Emergency',
};

export function formatSentTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // Everything is pinned to Philippines time (PHT, UTC+8) so a shared "Today /
  // Yesterday" label reads correctly even when the device isn't in the PH timezone.
  const phtDate = toPHT(date);
  const nowPHT = new Date(Date.now() + PHT_OFFSET_MS);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = phtDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay(phtDate, nowPHT)) return `Today • ${time}`;
  const yesterday = new Date(nowPHT);
  yesterday.setDate(nowPHT.getDate() - 1);
  if (sameDay(phtDate, yesterday)) return `Yesterday • ${time}`;
  if (phtDate.getFullYear() === nowPHT.getFullYear()) {
    return `${phtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${time}`;
  }
  return phtDate.toLocaleDateString('en-US') + ` • ${time}`;
}