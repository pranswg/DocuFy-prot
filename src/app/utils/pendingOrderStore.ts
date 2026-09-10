// Shared helpers for the customer "held" payment flow. An online print request
// is only pushed to the data store once the customer submits their payment
// reference, so its full payload is held in sessionStorage (docufy_pending_online_order)
// plus a small localStorage blob (order_<id>) that carries the payment-requirement
// flags / method across the checkout → Down Payment Method → Payment Verification
// steps. Cash orders are materialized at checkout, so the Down Payment Method
// page writes its choice straight into the data store for those.
import { dataStore, type Order } from "./dataStore";

const PENDING_ORDER_KEY = "docufy_pending_online_order";
const PRINT_DRAFT_KEY = "docufy_print_draft";

export function savePendingOrder(payload: Record<string, unknown>) {
  sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(payload));
}

export function readPendingOrder():
  | (Record<string, unknown> & { id: string })
  | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> & { id?: string };
    return parsed.id
      ? (parsed as Record<string, unknown> & { id: string })
      : null;
  } catch {
    return null;
  }
}

export function clearPendingOrder() {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
}

// Remove the held pending order plus the matching resume draft. Used when the
// customer completes payment or cancels — never leaves a phantom order behind.
export function clearPendingFlow(orderId: string) {
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  try {
    const draft = sessionStorage.getItem(PRINT_DRAFT_KEY);
    if (draft) {
      const parsed = JSON.parse(draft) as { orderId?: string };
      if (parsed.orderId === orderId) {
        sessionStorage.removeItem(PRINT_DRAFT_KEY);
      }
    }
  } catch {
    /* ignore */
  }
}

export type OrderBlob = {
  orderId: string;
  total: number;
  paymentMethod?: string;
  timestamp?: string;
  downPaymentRequired?: boolean;
  downPaymentAmount?: number;
  fullPaymentRequired?: boolean;
  fullPaymentAmount?: number;
};

export function readOrderBlob(orderId: string): OrderBlob | null {
  try {
    const raw = localStorage.getItem(`order_${orderId}`);
    return raw ? (JSON.parse(raw) as OrderBlob) : null;
  } catch {
    return null;
  }
}

export function saveOrderBlob(orderId: string, data: OrderBlob) {
  localStorage.setItem(`order_${orderId}`, JSON.stringify(data));
}

export type DownPaymentPlan = {
  venue: "shop" | "online";
  amountChoice: "down" | "full";
  wallet: string;
};

// Materialize a deferred cash order from its held pending state into the real
// data store. Called by the Down Payment Method page after the customer
// confirms "Pay at the Shop". Returns true if the order was materialized.
export function materializeCashPendingOrder(orderId: string): boolean {
  const pending = readPendingOrder();
  if (!pending || pending.id !== orderId) return false;
  dataStore.addOrder(pending as unknown as Order);
  clearPendingFlow(orderId);
  return true;
}

export type DownPaymentDecision = {
  method: string;
  isFull: boolean;
  downDue: number;
  total: number;
};

// Persist the Down Payment Method choice so the Payment Verification page (and
// staff/admin verification) sees the correct down/full flags, method, and hold
// reason. Cash orders are already in the data store; online orders are still a
// held pending payload + blob, so those are updated instead.
export function applyDownPaymentPlan(
  orderId: string,
  total: number,
  plan: DownPaymentPlan,
): DownPaymentDecision {
  const down = total * 0.5;
  const isFull = plan.amountChoice === "full";
  const method = plan.venue === "shop" ? "Cash" : plan.wallet;

  const holdReason =
    plan.venue === "online"
      ? isFull
        ? `${method} full payment of ₱${Math.round(total)} is pending verification. Your order will be queued once the full payment is verified.`
        : `${method} down payment of ₱${Math.round(down)} (50% of total ₱${Math.round(total)}) is pending verification. Your order will be queued once the down payment is verified.`
      : isFull
        ? `Cash on Pickup: pay ₱${Math.round(total)} (full payment) at the shop before your payment deadline to confirm this order.`
        : `Cash on Pickup: pay ₱${Math.round(down)} (down payment of ₱${Math.round(down)} — 50% of the total) at the shop before your payment deadline to confirm this order.`;

  const updates: Record<string, unknown> = {
    paymentMethod: method,
    holdReason,
    downPaymentRequired: !isFull,
    downPaymentAmount: !isFull ? down : undefined,
    fullPaymentRequired: isFull,
    fullPaymentAmount: isFull ? total : undefined,
  };

  const existingOrder = dataStore.getOrderById(orderId);
  if (existingOrder) {
    dataStore.updateOrder(orderId, updates as Partial<Order>);
  } else {
    const pending = readPendingOrder();
    if (pending && pending.id === orderId) {
      savePendingOrder({ ...pending, ...updates });
    }
  }

  const blob = readOrderBlob(orderId);
  if (blob) {
    saveOrderBlob(orderId, {
      ...blob,
      paymentMethod: method,
      downPaymentRequired: !isFull,
      downPaymentAmount: !isFull ? down : undefined,
      fullPaymentRequired: isFull,
      fullPaymentAmount: isFull ? total : undefined,
    });
  }

  return {
    method,
    isFull,
    downDue: Math.round(down),
    total: Math.round(total),
  };
}