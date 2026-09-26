// ============================================================================
// ORDER SESSION LOCKS — Supabase-backed facade
// ----------------------------------------------------------------------------
// "Who is reviewing this order right now" so two staff/admin don't approve /
// process the same order at the same time.
//
// The authoritative source of truth is the shared `order_locks` table (one row
// per order, `expires_at` = now() + 5 min), so claims/releases/expiry are
// visible to EVERY machine — not just the tabs of one browser. The localStorage
// mirror below stays as the offline / anonymous fallback (and the cross-tab
// `storage` event still keeps this browser's tabs coherent).
//
// AUTHENTICATED LOCK RULES:
//   - Only the lock holder may act on the order.
//   - A lock auto-expires after LOCK_TIMEOUT_MS so a dropped PC / crashed tab
//     doesn't trap an order forever.
//   - claimLock NEVER steals a live lock held by someone else (the server-side
//     `claim_order_lock` RPC makes that decision atomic); if our local mirror
//     and the DB fall out of sync, the DB wins on the next hydrate.
//   - releaseLock only ever frees OUR hold.
//
// API kept identical to the old localStorage module — consumers only gain the
// async `verifyLockOnServer` for the final-confirm moment.
// ============================================================================

import { authReady } from '../../lib/supabaseClient';
import { isRlsDenied, showDbError } from '../../lib/db/errors';
import {
  claimOrderLock,
  fetchOrderLocks,
  getOrderLockById,
  pruneExpiredOrderLocks,
  releaseOrderLock,
  sessionUserProfileId,
  subscribeOrderLocks,
} from '../../lib/db/orderLocksRepo';
import type { OrderLockRow } from '../../lib/db/types';

export interface OrderLock {
  orderId: string;
  heldBy: string;
  heldAt: number;
}

const STORAGE_KEY = "docufy_order_locks";
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (matches the DB TTL)

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

function persist(map: Record<string, OrderLock>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota/availability errors
  }
}

// In-memory mirror of the LIVE locks. Reads here are synchronous (consumers
// call getLock/getAllLocks during render), while every mutation also fires a
// best-effort push to the DB and the DB wins on hydrate/realtime.
let mirror: Record<string, OrderLock> = load();
const subscribers = new Set<() => void>();
let hydrating = false;

function notify() {
  subscribers.forEach((cb) => cb());
}

function refreshFromRows(rows: OrderLockRow[]) {
  const next: Record<string, OrderLock> = {};
  for (const row of rows) {
    const heldAt = Date.parse(row.held_at);
    if (Number.isNaN(heldAt)) continue;
    next[row.order_id] = { orderId: row.order_id, heldBy: row.held_by_name, heldAt };
  }
  mirror = next;
  persist(mirror);
  notify();
}

// Pull the authoritative lock snapshot from Supabase. The DB replaces the
// mirror entirely (so a live lock claimed on ANOTHER machine shows up here);
// an empty/unreachable backend keeps the local mirror as the offline fallback.
async function hydrate(): Promise<void> {
  if (hydrating) return;
  hydrating = true;
  await authReady;
  try {
    const rows = await fetchOrderLocks();
    refreshFromRows(rows);
    // Expired rows are invisible to every reader already; prune them so the
    // table doesn't grow forever. Best-effort — never blocks hydration.
    void pruneExpiredOrderLocks().catch(() => {});
  } catch (err) {
    console.warn('[order-locks] hydration kept local data:', err);
  } finally {
    hydrating = false;
  }
}

// Re-verify OUR hold against the server right before a final confirm. This is
// the authoritative check (a second machine may have claimed the order after
// we opened our dialog). When the DB is unreachable it falls back to the local
// mirror so the offline flow keeps working.
export async function verifyLockOnServer(orderId: string, heldBy?: string): Promise<boolean> {
  try {
    const profileId = await sessionUserProfileId();
    if (profileId) {
      const row = await getOrderLockById(orderId);
      // getOrderLockById already excludes expired rows — an expired/missing
      // lock therefore means we can NOT act, regardless of our local mirror.
      return !!row && row.held_by === profileId;
    }
  } catch {
    // fall through to the local mirror
  }
  return heldBy ? stillHoldsLock(orderId, heldBy) : false;
}

// Live sync: realtime on `order_locks` re-hydrates from ANY device, and the
// `storage` event keeps this browser's other tabs coherent.
subscribeOrderLocks(() => {
  void hydrate();
});
window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  mirror = load();
  notify();
});
void hydrate();

export function isLockExpired(lock: OrderLock): boolean {
  return Date.now() - lock.heldAt > LOCK_TIMEOUT_MS;
}

/** Read the current (non-expired) lock for an order, if any. */
export function getLock(orderId: string): OrderLock | null {
  const lock = mirror[orderId];
  if (!lock) return null;
  if (isLockExpired(lock)) {
    delete mirror[orderId];
    persist(mirror);
    return null;
  }
  return lock;
}

/** All non-expired locks (right now), for list-row indicators. */
export function getAllLocks(): OrderLock[] {
  const now = Date.now();
  let changed = false;
  const result: OrderLock[] = [];
  Object.values(mirror).forEach((lock) => {
    if (now - lock.heldAt > LOCK_TIMEOUT_MS) {
      delete mirror[lock.orderId];
      changed = true;
    } else {
      result.push(lock);
    }
  });
  if (changed) persist(mirror);
  return result;
}

/**
 * Claim (or renew) a lock for an order held by `heldBy`.
 *
 * Mirrors the old safe-by-design behavior: it will NOT steal an active lock
 * held by someone else — if another user holds a live lock it returns that
 * lock without touching it. If the lock is expired (dropped PC) OR held by us,
 * it (re)claims it, which doubles as the "heartbeat" that keeps our lock alive
 * while our window stays open. Local-first (instant UI), then the async
 * `claim_order_lock` RPC makes the server-side claim atomically; if the RPC
 * reports that someone else took it in between, the DB snapshot re-hydrates.
 * Returns the resulting lock.
 */
export function claimLock(orderId: string, heldBy: string): OrderLock {
  const existing = mirror[orderId];
  if (existing && !isLockExpired(existing) && existing.heldBy !== heldBy) {
    return existing; // someone else holds a live lock — don't steal it
  }
  const lock: OrderLock = { orderId, heldBy, heldAt: Date.now() };
  mirror[orderId] = lock;
  persist(mirror);
  notify();
  void pushClaim(orderId, heldBy);
  return lock;
}

async function pushClaim(orderId: string, name: string): Promise<void> {
  try {
    const profileId = await sessionUserProfileId();
    if (!profileId) {
      console.warn('[order-locks] no session — keeping local-only lock');
      return;
    }
    const row = await claimOrderLock(orderId, profileId, name);
    if (row === null) {
      // A live lock held by someone else won the race — adopt the real DB
      // state (never keep a locally-optimistic lock the server didn't grant).
      void hydrate();
    }
  } catch (err) {
    if (!isRlsDenied(err)) showDbError('order-locks.claim', err);
    else console.warn('[order-locks] not synced (RLS) — keeping local lock:', err);
  }
}

/**
 * Release a held lock. NEVER releases a lock held by someone else —
 * passing `heldBy` (the current user's name) makes this safe across machines:
 * closing our window only ever frees OUR lock, never another reviewer's.
 */
export function releaseLock(orderId: string, heldBy?: string) {
  const lock = mirror[orderId];
  if (!lock) return;
  if (heldBy && lock.heldBy !== heldBy) return; // not ours — leave it alone
  delete mirror[orderId];
  persist(mirror);
  notify();
  void pushRelease(orderId);
}

async function pushRelease(orderId: string): Promise<void> {
  try {
    const profileId = await sessionUserProfileId();
    if (!profileId) return; // mirror-only (offline / anonymous)
    await releaseOrderLock(orderId, profileId);
  } catch (err) {
    if (!isRlsDenied(err)) showDbError('order-locks.release', err);
    else console.warn('[order-locks] release not synced (RLS):', err);
  }
}

/**
 * Quick mirror check that this tab still holds the lock for an order. For the
 * FINAL confirm moment use `verifyLockOnServer` — this is only a hint.
 */
export function stillHoldsLock(orderId: string, heldBy: string): boolean {
  const lock = getLock(orderId);
  return !!lock && lock.heldBy === heldBy;
}

/** Subscribe to lock changes from ANY tab or device (realtime + storage). */
export function subscribeToLocks(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}