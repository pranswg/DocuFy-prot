// Centralized notification store
type Notification = {
  id: string;
  type: 'order' | 'payment' | 'status_update' | 'inventory';
  priority?: 'important' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  clickable: boolean;
  relatedOrderId?: string;
  relatedRoute?: string;
  recipientRole?: 'customer' | 'staff' | 'admin' | 'staff_admin' | 'all';
  recipientEmail?: string;
};

type Subscriber = () => void;

class NotificationStore {
  private notifications: Notification[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.loadFromStorage();

    // Cross-tab live sync: notifications added in ANOTHER tab/window (e.g. the
    // staff tab where an order was placed, while the admin Notifications page
    // is open in a second tab) persist to localStorage, which fires a `storage`
    // event HERE. Reload from storage and re-render every subscriber live — the
    // bell badge, the Notifications dropdown, and the full Notifications page
    // all update without a page refresh.
    window.addEventListener('storage', (e) => {
      if (e.key !== 'notifications' || e.newValue == null) return;
      this.reloadFromStorage();
    });
  }

  private parseNotifications(raw: string): Notification[] {
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
    } catch (e) {
      console.error('Failed to parse notifications:', e);
      return [];
    }
  }

  private loadFromStorage() {
    if (this.initialized) return;

    const saved = localStorage.getItem('notifications');
    if (saved) {
      this.notifications = this.parseNotifications(saved);
    }
    this.initialized = true;
  }

  // Re-read unconditionally (ignores the `initialized` guard) and notify. Used
  // by the cross-tab `storage` listener so a fresh snapshot from another tab
  // replaces the in-memory list and every subscriber re-renders.
  private reloadFromStorage() {
    const saved = localStorage.getItem('notifications');
    this.notifications = saved ? this.parseNotifications(saved) : [];
    this.notify();
  }

  private saveToStorage() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
    this.notify();
  }

  private notify() {
    this.subscribers.forEach((callback) => callback());
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => { this.subscribers.delete(callback); };
  }

  // Add a new notification
  addNotification(
    type: Notification['type'],
    title: string,
    message: string,
    options?: {
      clickable?: boolean;
      priority?: Notification['priority'];
      relatedOrderId?: string;
      relatedRoute?: string;
      recipientRole?: Notification['recipientRole'];
      recipientEmail?: string;
    }
  ) {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options?.priority,
      title,
      message,
      timestamp: new Date(),
      read: false,
      clickable: options?.clickable || false,
      relatedOrderId: options?.relatedOrderId,
      relatedRoute: options?.relatedRoute,
      recipientRole: options?.recipientRole || 'all',
      recipientEmail: options?.recipientEmail,
    };

    this.notifications.unshift(notification);
    this.saveToStorage();
    return notification.id;
  }

  // Get notifications for a specific user
  getNotifications(userRole?: string, userEmail?: string): Notification[] {
    if (!userRole) return this.notifications;

    return this.notifications.filter((n) => {
      // Role match: 'staff_admin' targets staff and admin only (inventory alerts).
      const roleMatch =
        n.recipientRole === 'all' ||
        n.recipientRole === userRole ||
        (n.recipientRole === 'staff_admin' &&
          (userRole === 'staff' || userRole === 'admin'));
      // Check email match (if specified)
      const emailMatch = !n.recipientEmail || n.recipientEmail === userEmail;
      return roleMatch && emailMatch;
    });
  }

  // Get unread count for a user
  getUnreadCount(userRole?: string, userEmail?: string): number {
    const userNotifications = this.getNotifications(userRole, userEmail);
    return userNotifications.filter((n) => !n.read).length;
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
    }
  }

  // Mark all notifications as read for a user
  markAllAsRead(userRole?: string, userEmail?: string) {
    const userNotifications = this.getNotifications(userRole, userEmail);
    userNotifications.forEach((n) => {
      n.read = true;
    });
    this.saveToStorage();
  }

  // Delete notification
  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    this.saveToStorage();
  }

  // Clear all notifications (admin only)
  clearAll() {
    this.notifications = [];
    this.saveToStorage();
  }

  // Get notification by ID
  getNotificationById(id: string): Notification | undefined {
    return this.notifications.find((n) => n.id === id);
  }
}

export const notificationStore = new NotificationStore();
export type { Notification };
