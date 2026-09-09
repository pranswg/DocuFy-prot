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

class ShopStatusStore {
  private state: ShopStatusState = { ...DEFAULT_STATE };
  private subscribers: Set<Subscriber> = new Set();

  constructor() {
    this.loadFromStorage();
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
    return this.getState();
  }

  private notifyStatusChange(prevState: ShopStatusState, nextState: ShopStatusState) {
    const detail = [nextState.reason, nextState.eta]
      .filter(Boolean)
      .join(" · ");

    if (nextState.status === "paused") {
      notificationStore.addNotification(
        "status_update",
        "Shop Paused",
        `Docufy has been marked as paused${detail ? ` — ${detail}` : ""}. New orders are on hold until we reopen.`,
        {
          clickable: true,
          priority: "important",
          relatedRoute: "/staff/queue",
          recipientRole: "staff_admin",
        },
      );
      const affected = dataStore
        .getOrders()
        .filter(
          (o) =>
            o.status === "In Queue" ||
            o.status === "Printing" ||
            o.status === "Awaiting Payment",
        );
      for (const order of affected) {
        if (!order.customerEmail) continue;
        notificationStore.addNotification(
          "status_update",
          "Docufy is Temporarily Paused",
          `Your order ${order.id} is safe and on hold — Docufy is currently paused${detail ? ` (${detail})` : ""}. We'll resume processing as soon as we're back.`,
          {
            clickable: true,
            relatedOrderId: order.id,
            relatedRoute: "/customer/orders",
            recipientEmail: order.customerEmail,
          },
        );
      }
    } else if (nextState.status === "closed-scheduled") {
      notificationStore.addNotification(
        "status_update",
        "Shop Closed — Scheduled",
        "Docufy has been marked as scheduled close (e.g. weekend or holiday). New orders are on hold until we reopen.",
        {
          clickable: true,
          priority: "important",
          relatedRoute: "/staff/queue",
          recipientRole: "staff_admin",
        },
      );
    } else if (nextState.status === "open") {
      notificationStore.addNotification(
        "status_update",
        "Docufy is Open Again",
        "Docufy has resumed operations — new orders are accepted again and the queue can continue.",
        {
          clickable: true,
          priority: "important",
          relatedRoute: "/staff/queue",
          recipientRole: "staff_admin",
        },
      );
    }
  }
}

export const shopStatusStore = new ShopStatusStore();