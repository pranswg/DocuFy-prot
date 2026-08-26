// SIEM (Security Information and Event Management) Alert Store
// Manages security alerts for real-time threat monitoring

export type SIEMAlertType =
  | 'impossible_travel'
  | 'brute_force'
  | 'suspicious_upload'
  | 'unusual_access'
  | 'repeated_failures';

export type SIEMAlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SIEMAlert {
  id: string;
  type: SIEMAlertType;
  severity: SIEMAlertSeverity;
  title: string;
  description: string;
  affectedAccount?: string;
  timestamp: Date;
  read: boolean;
  investigateUrl?: string;
}

class SIEMAlertStore {
  private alerts: SIEMAlert[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.alerts = [];
  }

  private initializeMockAlerts() {
    this.alerts = [];
  }

  addAlert(alert: Omit<SIEMAlert, 'id' | 'timestamp' | 'read'>) {
    const newAlert: SIEMAlert = {
      ...alert,
      id: `SIEM-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    this.alerts.unshift(newAlert);
    this.notifyListeners();
  }

  getAlerts(roleFilter?: 'admin' | 'staff' | 'customer'): SIEMAlert[] {
    // SIEM alerts are typically only visible to admins
    if (roleFilter && roleFilter !== 'admin') {
      return [];
    }
    return [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getUnreadCount(roleFilter?: 'admin' | 'staff' | 'customer'): number {
    if (roleFilter && roleFilter !== 'admin') {
      return 0;
    }
    return this.alerts.filter((alert) => !alert.read).length;
  }

  getCriticalUnreadCount(roleFilter?: 'admin' | 'staff' | 'customer'): number {
    if (roleFilter && roleFilter !== 'admin') {
      return 0;
    }
    return this.alerts.filter(
      (alert) => !alert.read && (alert.severity === 'critical' || alert.severity === 'high')
    ).length;
  }

  markAsRead(alertId: string) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead(roleFilter?: 'admin' | 'staff' | 'customer') {
    if (roleFilter && roleFilter !== 'admin') {
      return;
    }
    this.alerts.forEach((alert) => {
      alert.read = true;
    });
    this.notifyListeners();
  }

  deleteAlert(alertId: string) {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const siemAlertStore = new SIEMAlertStore();
