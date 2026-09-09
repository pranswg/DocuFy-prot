// ============================================================================
// ORDER SESSION LOCKS (prototype demo)
// ----------------------------------------------------------------------------
// A lightweight "who is reviewing this order right now" mechanism so two
// staff/admin don't approve / process the same order at the same time.
//
// DEMO PROTOTYPE ONLY — localStorage is shared across tabs on the SAME machine.
// Open two tabs (each signed in as a different user, e.g. Staff + Admin) to
// simulate two separate PCs. The `storage` event fires across tabs, so tab B
// hears tab A claim/release an order live.
//
// ❗ SUPABASE IMPLEMENTATION COMES LATER — do NOT rely on localStorage for the
// real product. On a real backend this module's read/write must be replaced
// with:
//   - a `session_locks` table (order_id, held_by, held_at) as the AUTHORITATIVE
//     single source of truth shared across ALL machines, and/or
//   - Supabase Realtime channel `order:{id}` to broadcast presence
//     ("viewing"/"verified"/"released") to every connected client.
// The rest of the UI (banners, disabled buttons, guard) stays exactly the same.
//
// LOCK RULES:
//   - Only the lock holder may act on the order.
//   - A lock auto-expires after LOCK_TIMEOUT_MS so a dropped PC / crashed tab
//     doesn't trap an order forever.
// ============================================================================

export interface OrderLock {
  orderId: string;
  heldBy: string;
  heldAt: number;
}

const STORAGE_KEY = "docufy_order_locks";
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const empty = (): Record<string, OrderLock> => ({});

function load(): Record<string, OrderLock> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, OrderLock>;
    return empty();
  } catch {
    return empty();
  }
}

function save(map: Record<string, OrderLock>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function isLockExpired(lock: OrderLock): boolean {
  return Date.now() - lock.heldAt > LOCK_TIMEOUT_MS;
}

/** Read the current (non-expired) lock for an order, if any. */
export function getLock(orderId: string): OrderLock | null {
  const map = load();
  const lock = map[orderId];
  if (!lock) return null;
  if (isLockExpired(lock)) {
    delete map[orderId];
    save(map);
    return null;
  }
  return lock;
}

/** All non-expired locks (right now), for list-row indicators. */
export function getAllLocks(): OrderLock[] {
  const map = load();
  const now = Date.now();
  let changed = false;
  const result: OrderLock[] = [];
  Object.values(map).forEach((lock) => {
    if (now - lock.heldAt > LOCK_TIMEOUT_MS) {
      delete map[lock.orderId];
      changed = true;
    } else {
      result.push(lock);
    }
  });
  if (changed) save(map);
  return result;
}

/**
 * Claim (or renew) a lock for an order held by `heldBy`.
 *
 * Safe by design: it will NOT steal an active lock held by someone else —
 * if another user holds a live lock it returns that lock without touching it.
 * If the lock is expired (dropped PC) OR held by us, it (re)claims it, which
 * doubles as the "heartbeat" that keeps our lock alive while our window stays
 * open. Returns the resulting lock.
 */
export function claimLock(orderId: string, heldBy: string): OrderLock {
  const map = load();
  const existing = map[orderId];
  if (existing && !isLockExpired(existing) && existing.heldBy !== heldBy) {
    return existing; // someone else holds a live lock — don't steal it
  }
  const lock: OrderLock = { orderId, heldBy, heldAt: Date.now() };
  map[orderId] = lock;
  save(map);
  return lock;
}

/**
 * Release a held lock. NEVER releases a lock held by someone else —
 * passing `heldBy` (the current user's name) makes this safe across tabs:
 * closing our window only ever frees OUR lock, never another reviewer's.
 */
export function releaseLock(orderId: string, heldBy?: string) {
  const map = load();
  const lock = map[orderId];
  if (!lock) return;
  if (heldBy && lock.heldBy !== heldBy) return; // not ours — leave it alone
  delete map[orderId];
  save(map);
}

/**
 * Re-check that this tab still holds the lock for an order (guarding the
 * moment a user clicks the final confirm). Returns true if we hold it.
 */
export function stillHoldsLock(orderId: string, heldBy: string): boolean {
  const lock = getLock(orderId);
  return !!lock && lock.heldBy === heldBy;
}

/** Subscribe to lock changes from ANY tab (via the browser `storage` event). */
export function subscribeToLocks(cb: () => void): () => void {
  const listener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
