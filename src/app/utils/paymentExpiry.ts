// Automatic payment-deadline expiry for the new order lifecycle.
// Every awaited-payment order carries a `paymentDeadline` (computed from the
// admin-editable cash-on-pickup / online verification windows in pricingStore;
// set when the order is placed). While an order sits in 'Awaiting Payment'
// WITHOUT its required payment being verified and the deadline passes, this
// module auto-cancels it as expired:
//   status -> 'Canceled', cancellationReason -> 'Payment Deadline Expired'
// and notifies staff/admin and the customer. Expired orders leave the active
// queue but remain in order history with the reason displayed.
//
// Configurable (never hardcoded): the deadline windows themselves are set per
// order at creation time from pricingStore; if a shop disables expiry
// (window = 0) no deadline is stored and nothing auto-cancels.
import { dataStore, type Order } from './dataStore';
import { notificationStore } from './notificationStore';
import { formatPHDateTime } from './pht';

export const PAYMENT_DEADLINE_EXPIRED_REASON = 'Payment Deadline Expired';

// True when an awaiting-payment order is actively pending (nothing verified)
// and its deadline has passed.
export function isOrderExpired(order: Order, now: Date = new Date()): boolean {
  if (order.status !== 'Awaiting Payment') return false;
  const verified =
    order.paymentVerified ||
    order.downPaymentVerified ||
    order.fullPaymentVerified;
  if (verified) return false;
  if (!order.paymentDeadline) return false;
  return new Date(order.paymentDeadline).getTime() <= now.getTime();
}

// Cancel every expired awaiting-payment order. Dedup via clearing the deadline.
export function expireOverdueOrders(): void {
  const now = new Date();

  for (const order of dataStore.getOrders()) {
    if (!isOrderExpired(order, now)) continue;

    dataStore.updateOrder(order.id, {
      status: 'Canceled',
      cancellationReason: PAYMENT_DEADLINE_EXPIRED_REASON,
      holdReason: undefined,
      paymentDeadline: undefined,
    });

    const deadlineLabel = formatPHDateTime(order.paymentDeadline);
    notificationStore.addNotification('order', 'Order Cancelled — Payment Deadline Expired', `${order.customerName}'s order ${order.id} (${order.total}) was auto-cancelled because payment was not confirmed before ${deadlineLabel} (deadline expired).`, {
      clickable: true,
      priority: 'important',
      relatedOrderId: order.id,
      relatedRoute: '/staff/queue',
      recipientRole: 'staff_admin',
    });
    notificationStore.addNotification('order', 'Order Cancelled — Payment Deadline Expired', `Your order ${order.id} was auto-cancelled because payment was not confirmed before ${deadlineLabel}. If you still need this order, please place it again.`, {
      clickable: true,
      relatedOrderId: order.id,
      relatedRoute: '/customer/orders',
      recipientEmail: order.customerEmail,
    });
  }
}

// Evaluate once on load and then on a lightweight interval so deadlines expire
// even while the page is sitting open. (Pure demo timing — a real backend
// would use scheduled jobs.)
expireOverdueOrders();
const EXPIRY_CHECK_INTERVAL_MS = 30_000;
setInterval(expireOverdueOrders, EXPIRY_CHECK_INTERVAL_MS);