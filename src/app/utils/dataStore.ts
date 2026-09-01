// Centralized data store for orders
// This ensures all dashboards show consistent data
import { orderCounter } from './orderCounter';

export interface AttachedFile {
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt?: string;
  paperSize?: string;
  orientation?: string;
  copies?: number;
  twoSided?: string;
  pagesPerSheet?: string;
  colorMode?: string;
  pageRange?: string;
  specificPages?: string;
  margins?: string;
  scale?: string;
  customScale?: number;
  pageCount?: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: 'Received' | 'In Queue' | 'Printing' | 'Completed' | 'Released' | 'On Hold' | 'Canceled' | 'Awaiting Payment';
  holdReason?: string;
  cancellationReason?: string;
  total: string;
  date: string;
  paperType?: string;
  paperSize?: string;
  printType?: string;
  copies?: number;
  paymentMethod?: string;
  paymentProof?: string;
  paymentReferenceNumber?: string;
  paymentVerified?: boolean;
  paymentProofUrl?: string;
  fileName?: string;
  pages?: number;
  attachedFiles?: AttachedFile[];
  orientation?: string;
  twoSided?: string;
  pagesPerSheet?: string;
  margins?: string;
  scale?: string;
  customScale?: number;
  colorMode?: string;
  pageRange?: string;
  specificPages?: string;
  notes?: string;
  addons?: Array<{ name: string; quantity: number; price: number }>;
  costBreakdown?: {
    printingCost: number;
    addonsCost: number;
    total: number;
  };
  orderSource?: 'online' | 'walkin';
  // Down payment fields
  downPaymentRequired?: boolean;
  downPaymentAmount?: number;
  downPaymentVerified?: boolean;
  // Timestamp tracking fields
  statusUpdatedAt?: string; // ISO string - tracks when status was last changed
  createdAt?: string; // ISO string - tracks when order was created
  lastUpdatedAt?: string; // ISO string - tracks any update to the order
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  link?: string;
  orderId?: string;
}

// Mock customers for UI checking (seeded on every fresh load).
// Customer A: online GCash order still awaiting payment verification ->
//   shows as PENDING in Payment Verification, and is EXCLUDED from the Orders/queue
//   list (status 'Awaiting Payment' is filtered out by queueOrders).
// Customer B: online GCash order already payment-verified and waiting in queue ->
//   shows on the Orders/queue list as 'In Queue', and shows as VERIFIED in Payment Verification.
const initialOrders: Order[] = [
  {
    id: 'ORD-2026-0001',
    customerId: 'cust-maria',
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@example.com',
    status: 'Awaiting Payment',
    total: '₱75.00',
    date: '2026-09-01T01:15:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: false,
    paymentReferenceNumber: 'GCS-2026-000123',
    fileName: 'research-report.pdf',
    pages: 5,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Waiting for GCash payment verification.',
    attachedFiles: [
      {
        name: 'research-report.pdf',
        size: '1.2 MB',
        type: 'PDF',
        pageCount: 5,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: {
      printingCost: 75,
      addonsCost: 0,
      total: 75,
    },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-01T01:15:00+08:00',
    createdAt: '2026-09-01T01:15:00+08:00',
    lastUpdatedAt: '2026-09-01T01:15:00+08:00',
  },
  {
    id: 'ORD-2026-0002',
    customerId: 'cust-john',
    customerName: 'John Dela Cruz',
    customerEmail: 'john.delacruz@example.com',
    status: 'In Queue',
    total: '₱120.00',
    date: '2026-09-01T00:45:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 2,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000124',
    fileName: 'thesis-chapter-1.pdf',
    pages: 6,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Queued and ready for printing.',
    attachedFiles: [
      {
        name: 'thesis-chapter-1.pdf',
        size: '2.4 MB',
        type: 'PDF',
        pageCount: 6,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 2,
      },
    ],
    costBreakdown: {
      printingCost: 120,
      addonsCost: 0,
      total: 120,
    },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-01T00:45:00+08:00',
    createdAt: '2026-09-01T00:45:00+08:00',
    lastUpdatedAt: '2026-09-01T00:45:00+08:00',
  },
];

// In-memory store with event listeners
class DataStore {
  private orders: Order[] = [...initialOrders];
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Initialize order counter from existing orders
    this.initializeOrderCounter();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Order methods
  getOrders(): Order[] {
    return [...this.orders];
  }

  getOrdersByCustomer(customerEmail: string): Order[] {
    return this.orders.filter(order => order.customerEmail === customerEmail);
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(order => order.id === id);
  }

  addOrder(order: Order) {
    // Automatically add timestamp when creating a new order
    const now = new Date().toISOString();
    const orderWithTimestamps = {
      ...order,
      createdAt: order.createdAt || now,
      statusUpdatedAt: order.statusUpdatedAt || now,
      lastUpdatedAt: now
    };
    this.orders.unshift(orderWithTimestamps);
    this.notify();
  }

  updateOrder(id: string, updates: Partial<Order>) {
    const index = this.orders.findIndex(order => order.id === id);
    if (index !== -1) {
      const now = new Date().toISOString();
      const previousStatus = this.orders[index].status;

      // Automatically update timestamps
      const timestampedUpdates = {
        ...updates,
        lastUpdatedAt: now,
        // Update statusUpdatedAt only if status is actually changing
        ...(updates.status && updates.status !== previousStatus
          ? { statusUpdatedAt: now }
          : {})
      };

      this.orders[index] = { ...this.orders[index], ...timestampedUpdates };
      this.notify();
    }
  }

  updateOrderStatus(id: string, status: Order['status'], holdReason?: string) {
    this.updateOrder(id, { status, holdReason });
  }

  deleteOrder(id: string) {
    this.orders = this.orders.filter(order => order.id !== id);
    this.notify();
  }

  getOrderStats(customerEmail?: string) {
    const orders = customerEmail
      ? this.getOrdersByCustomer(customerEmail)
      : this.orders;

    const received  = orders.filter(o => o.status === 'Received').length;
    const inQueue   = orders.filter(o => o.status === 'In Queue').length;
    const printing  = orders.filter(o => o.status === 'Printing').length;
    const completed = orders.filter(o => o.status === 'Completed').length;
    const released  = orders.filter(o => o.status === 'Released').length;
    const onHold    = orders.filter(o => o.status === 'On Hold').length;

    // "In Progress" = all orders actively being handled (received + queued + printing)
    const inProgress = received + inQueue + printing;
    // "All Completed" = done + picked up
    const allCompleted = completed + released;
    // "Active" = all orders not yet finished/picked up (includes onHold)
    const allActive = inProgress + onHold;
    // "Finished" = completed + released (alias)
    const allFinished = allCompleted;
    // Total = onHold + inProgress + allCompleted (no canceled) — always matches sum of status cards
    const total = onHold + inProgress + allCompleted;

    return {
      total,        // = onHold + inProgress + allCompleted (consistent with dashboard cards)
      received,
      inQueue,
      printing,
      completed,
      released,
      onHold,
      inProgress,   // received + inQueue + printing
      allCompleted, // completed + released
      // Legacy aliases kept for backward compatibility
      allActive,    // inProgress + onHold
      allFinished,  // completed + released
    };
  }

  // Generate next sequential order ID using centralized counter
  getNextOrderId(): string {
    return orderCounter.getNextOrderId();
  }

  // Initialize the order counter from existing orders (call once on app start)
  initializeOrderCounter(): void {
    const orderIds = this.orders.map(order => order.id);
    orderCounter.initializeFromOrders(orderIds);
  }
}

export const dataStore = new DataStore();