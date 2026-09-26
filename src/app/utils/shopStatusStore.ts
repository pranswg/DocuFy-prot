import { subscribeTableChanges } from '../../lib/db/hooks';
import { isRlsDenied, showDbError } from '../../lib/db/errors';
import { authReady, supabase } from '../../lib/supabaseClient';
import { fetchShopStatus, upsertShopStatus } from '../../lib/db/siteContentRepo';
import { dataStore } from "./dataStore";
import { notificationStore } from "./notificationStore";
import { internetUtcMs } from "./pht";

export type ShopStatus = "open" | "closed-scheduled" | "paused";

export interface ShopStatusState {
  status: ShopStatus;
  reason?: string;
  eta?: string;
  updatedBy?: string;
  updatedAt?: string;
}

type Subscriber = () => void;

const STORAGE_KEY = "docufy_shop_status_v1";
const VERSION_KEY = "docufy_shop_status_v";
const VERSION = "1";

const DEFAULT_STATE: ShopStatusState = {
  status: "open",
  updatedAt: new Date(internetUtcMs()).toISOString(),
};

function isShopStatus(value: unknown): value is ShopStatus {
  return value === "open" || value === "closed-scheduled" || value === "paused";
}

// Best-effort resolve a `profiles.id` (the uuid stored in `updated_by`) back to
// a display name so the "Updated by …" line stays human. Returns null when the
// value isn't a uuid or the lookup fails (offline / profile deleted).
async function resolveProfileName(profileId: string | null | undefined): Promise<string | null> {
  if (!profileId) return null;
  const maybeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
  if (!maybeUuid) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .maybeSingle();
    if (error || !data || !data.full_name) return null;
    return data.full_name;
  } catch {
    return null;
  }
}

function normalize(raw: unknown): ShopStatusState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const s = raw as ShopStatusState;
  return {
    status: isShopStatus(s.status) ? s.status : "open",
    reason: typeof s.reason === "string" ? s.reason : undefined,
    eta: typeof s.eta === "string" ? s.eta : undefined,
    updatedBy: typeof s.updatedBy === "string" ? s.updatedBy : undefined,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : undefined,
  };
}

// Supabase-backed facade: the localStorage mirror below stays as the offline /
// anonymous fallback, but the DB's single `shop_status` row now drives the
// real cross-device status — a staff/admin pause/closing on any device shows
// up on every open page (landing banner, dashboard banner, checkout locks,
// auto-expiry freeze) via realtime. Reads are open to everyone (the public
// landing page renders the banner anonymously); writes are staff/admin only.
class ShopStatusStore {
  private state: ShopStatusState = { ...DEFAULT_STATE };
  private subscribers: Set<Subscriber> = new Set();
  private hydrating = false;

  constructor() {
    this.loadFromStorage();

    // Cross-tab live sync: any local edit writes the mirror; the `storage`
    // event reloads it here so every open tab of this browser updates.
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      this.loadFromStorage();
    });

    // Backend sync: realtime fires when ANY device flips the shop status, so
    // the DB snapshot replaces the mirror everywhere.
    subscribeTableChanges('shop_status', () => {
      void this.hydrate();
    });

    void this.hydrate();
  }

  private loadFromStorage() {
    try {
      if (localStorage.getItem(VERSION_KEY) !== VERSION) {
        localStorage.setItem(VERSION_KEY, VERSION);
        this.persist();
        return;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = normalize(raw ? JSON.parse(raw) : null);
    } catch {
      this.state = { ...DEFAULT_STATE };
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage quota/availability errors
    }
    this.subscribers.forEach((cb) => cb());
  }

  // Pull the latest snapshot from Supabase. The DB wins whenever the row
  // exists; an empty/unreachable backend keeps the local mirror. Customer
  // notifications are NOT re-fired on hydrate — they only ever fire on a LOCAL
  // `setStatus` transition (a realtime echo elsewhere would duplicate the
  // alerts in every browser otherwise). Concurrent calls dedupe.
  private async hydrate(): Promise<void> {
    if (this.hydrating) return;
    this.hydrating = true;
    await authReady;
    try {
      const row = await fetchShopStatus();
      if (!row) return; // not seeded yet — keep the local mirror
      this.state = {
        status: isShopStatus(row.status) ? row.status : "open",
        reason: (row.reason ?? undefined) || undefined,
        eta: (row.eta ?? undefined) || undefined,
        // The DB stores the actor as a profile uuid; resolve it to a name for
        // display. Unresolvable → undefined (never show the raw uuid).
        updatedBy: (await resolveProfileName(row.updated_by)) ?? undefined,
        updatedAt: row.updated_at,
      } as ShopStatusState;
      this.persist();
    } catch (err) {
      console.warn('[shop-status] hydration kept local data:', err);
    } finally {
      this.hydrating = false;
    }
  }

  // Public force-refetch entry (used by storeSync when auth settles so the DB
  // status appears the moment a user logs in without needing a page reload).
  async refreshFromBackend(): Promise<void> {
    await this.hydrate();
  }

  // Best-effort push of the status row. RLS-denied writes degrade quietly;
  // every other failure is surfaced so a silently-unreflected toggle is never
  // mistaken for a successful sync.
  private async syncRemote(): Promise<void> {
    try {
      // `updated_by` is a uuid FK → profiles.id, so send the ACTING user's
      // profile id (resolved from the auth session), never a display name.
      const { data: sessionData } = await supabase.auth.getSession();
      await upsertShopStatus({
        status: this.state.status,
        reason: this.state.reason ?? null,
        eta: this.state.eta ?? null,
        updated_by: sessionData.session?.user?.id ?? null,
      });
    } catch (err) {
      if (!isRlsDenied(err)) showDbError('shop-status.update', err);
      else console.warn('[shop-status] not synced (RLS):', err);
    }
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  getState(): ShopStatusState {
    return { ...this.state };
  }

  getStatus(): ShopStatus {
    return this.state.status;
  }

  isOperational(): boolean {
    return this.state.status === "open";
  }

  setStatus(
    next: { status: ShopStatus; reason?: string; eta?: string },
    actorName?: string,
  ): ShopStatusState {
    const prev = this.state;
    const now = new Date(internetUtcMs()).toISOString();
    this.state = {
      status: next.status,
      reason:
        next.status === "open"
          ? undefined
          : next.reason?.trim() || prev.reason,
      eta:
        next.status === "paused"
          ? next.eta?.trim() || prev.eta
          : undefined,
      updatedBy: actorName?.trim() || prev.updatedBy,
      updatedAt: now,
    };
    this.persist();
    if (prev.status !== this.state.status) {
      this.notifyStatusChange(prev, this.state);
    }
    void this.syncRemote();
    return this.getState();
  }

  private notifyStatusChange(prevState: ShopStatusState, nextState: ShopStatusState) {
    const detail = [nextState.reason, nextState.eta]
      .filter(Boolean)
      .join(" · ");

    // Shop-status notifications are customer-only: the affected customers are
    // notified individually via their email. Staff/admin are NOT notified (they
    // flipped the toggle themselves).
    const affected = dataStore
      .getOrders()
      .filter(
        (o) =>
          o.status === "In Queue" ||
          o.status === "Printing" ||
          o.status === "Awaiting Payment",
      );
    const notifyCustomers = (
      title: string,
      message: (order: { customerEmail?: string; id: string }) => string,
    ) => {
      for (const order of affected) {
        if (!order.customerEmail) continue;
        notificationStore.addNotification(
          "status_update",
          title,
          message(order),
          {
            clickable: true,
            relatedOrderId: order.id,
            relatedRoute: "/customer/orders",
            recipientEmail: order.customerEmail,
          },
        );
      }
    };

    if (nextState.status === "paused") {
      notifyCustomers(
        "Docufy is Temporarily Paused",
        (order) =>
          `Your order ${order.id} is safe and on hold — Docufy is currently paused${detail ? ` (${detail})` : ""}. We'll resume processing as soon as we're back.`,
      );
    } else if (nextState.status === "closed-scheduled") {
      notifyCustomers(
        "Docufy is Closed — Scheduled",
        (order) =>
          `Your order ${order.id} is safe and on hold — Docufy is on scheduled close (e.g. weekend or holiday)${detail ? ` (${detail})` : ""}. We'll resume processing as soon as we reopen.`,
      );
    } else if (nextState.status === "open") {
      notifyCustomers(
        "Docufy is Open Again",
        (order) =>
          `Your order ${order.id} — Docufy has resumed operations and will continue processing your order. New orders are accepted again.`,
      );
    }
  }
}

export const shopStatusStore = new ShopStatusStore();