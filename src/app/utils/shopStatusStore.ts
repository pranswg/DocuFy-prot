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