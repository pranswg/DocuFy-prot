// Automatic inventory alerts for the Notifications system.
// Monitors the inventory store and emits a notification when an item
// transitions into a Low Stock or Out of Stock condition.
//
// The inventory store remains the single source of truth for stock levels.
// This module subscribes to it and re-evaluates every inventory change (Stock
// In / Stock Out / order deductions / item edits), so alerts stay in sync
// without any separate or hardcoded stock calculations.
//
// Deduplication: each item only re-fires an alert when it FIRST enters a
// low/out condition. While it stays low/out no new alert is created. Once it
// is restocked past the threshold (healthy) and later drops low/out again, a
// fresh alert is created.
//
// Recipients: staff and admin only (customers never see these).
import { inventoryStore, type InventoryItem, type InventoryStatus } from './inventoryStore';
import { notificationStore } from './notificationStore';
import { formatPHDateTime } from './pht';

const STATE_KEY = 'docufy_inventory_alert_state_v1';

// itemId -> the last status (out/low/ok) an alert was emitted for.
type AlertState = Record<string, InventoryStatus>;

function loadState(): AlertState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: AlertState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures — alerts will just re-fire next evaluation.
  }
}

// Piece count display used in the message, matching the Inventory module's
// emphasis on pieces (a paper ream = 500 pcs; other items = 1 pc per unit).
function piecesLabel(item: InventoryItem): string {
  const pcs = Math.round(item.currentStock * (item.pcsPerUnit || 1));
  const unit = item.pcsPerUnit && item.pcsPerUnit > 1 ? ` (${item.currentStock} ${item.unit}(s))` : '';
  return `${pcs.toLocaleString()} pcs${unit}`;
}

function minPiecesLabel(item: InventoryItem): string {
  const pcs = Math.round(item.minimumStock * (item.pcsPerUnit || 1));
  const unit = item.pcsPerUnit && item.pcsPerUnit > 1 ? ` (${item.minimumStock} ${item.unit}(s))` : '';
  return `${pcs.toLocaleString()} pcs${unit}`;
}

function emitAlert(item: InventoryItem, status: 'low' | 'out'): void {
  const isOut = status === 'out';
  const title = isOut ? 'Out of Stock' : 'Low Stock';
  const message = isOut
    ? `${item.name} is out of stock. The item currently has ${piecesLabel(item)} remaining and may no longer be available for transactions.`
    : `${item.name} is running low. Current stock: ${piecesLabel(item)}; minimum stock: ${minPiecesLabel(item)}. Please consider restocking this item.`;

  notificationStore.addNotification('inventory', title, message, {
    priority: isOut ? 'emergency' : 'important',
    clickable: true,
    recipientRole: 'staff_admin',
  });
}

// Re-evaluate the current inventory and emit alerts for items that have just
// entered a low/out condition (avoids duplicate alerts while they remain so).
export function evaluateInventoryAlerts(): void {
  const state = loadState();
  let changed = false;

  for (const item of inventoryStore.getActiveItems()) {
    const status = inventoryStore.getInventoryStatus(item);
    const prev = state[item.id];

    // Emit only when an item FIRST enters low/out (not when it stays there).
    if (prev !== status && (status === 'low' || status === 'out')) {
      emitAlert(item, status);
      changed = true;
    }

    if (prev !== status) {
      state[item.id] = status;
      changed = true;
    }
  }

  if (changed) saveState(state);
}

// Subscribe to inventory changes so Stock In/Out (and order deductions / item
// edits, which all route through the same store) automatically re-evaluate.
inventoryStore.subscribe(evaluateInventoryAlerts);

// Evaluate once on load so the current stored stock is reflected on startup.
evaluateInventoryAlerts();