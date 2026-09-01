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
  // ── Historical dashboard seed data (Jun–Aug 2026) ─────────────────────────
  // Mostly Completed/Released so they feed the sales trend + KPIs without
  // lingering in the active queue. Vary service/paper/color for the charts.
  {
    id: 'ORD-2026-0003',
    customerId: 'cust-ana',
    customerName: 'Ana Reyes',
    customerEmail: 'ana.reyes@example.com',
    status: 'Completed',
    total: '₱150.00',
    date: '2026-06-05T09:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'brochure-final.pdf',
    pages: 10,
    colorMode: 'colored',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'brochure-final.pdf',
        size: '3.1 MB',
        type: 'PDF',
        pageCount: 10,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 150, addonsCost: 0, total: 150 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-06-05T10:10:00+08:00',
    createdAt: '2026-06-05T09:30:00+08:00',
    lastUpdatedAt: '2026-06-05T10:10:00+08:00',
  },
  {
    id: 'ORD-2026-0004',
    customerId: 'cust-jose',
    customerName: 'Jose Ramirez',
    customerEmail: 'jose.ramirez@example.com',
    status: 'Released',
    total: '₱40.00',
    date: '2026-06-18T14:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Photocopy',
    copies: 20,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'id-forms.pdf',
    pages: 2,
    colorMode: 'bw',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'id-forms.pdf',
        size: '0.4 MB',
        type: 'PDF',
        pageCount: 2,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 20,
      },
    ],
    costBreakdown: { printingCost: 40, addonsCost: 0, total: 40 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-06-18T14:25:00+08:00',
    createdAt: '2026-06-18T14:00:00+08:00',
    lastUpdatedAt: '2026-06-18T14:25:00+08:00',
  },
  {
    id: 'ORD-2026-0005',
    customerId: 'cust-liza',
    customerName: 'Liza Mendoza',
    customerEmail: 'liza.mendoza@example.com',
    status: 'Completed',
    total: '₱95.00',
    date: '2026-07-09T11:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Black & White',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000210',
    fileName: 'manuscript-v3.docx',
    pages: 95,
    colorMode: 'bw',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'manuscript-v3.docx',
        size: '0.9 MB',
        type: 'Document',
        pageCount: 95,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 95, addonsCost: 0, total: 95 },
    orderSource: 'online',
    statusUpdatedAt: '2026-07-09T11:40:00+08:00',
    createdAt: '2026-07-09T11:00:00+08:00',
    lastUpdatedAt: '2026-07-09T11:40:00+08:00',
  },
  {
    id: 'ORD-2026-0006',
    customerId: 'cust-karlo',
    customerName: 'Karlo Garcia',
    customerEmail: 'karlo.garcia@example.com',
    status: 'Released',
    total: '₱60.00',
    date: '2026-07-22T16:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Long',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'poster-design.pdf',
    pages: 2,
    colorMode: 'colored',
    pageRange: 'all',
    addons: [
      { id: 'ad-sketch', name: 'Sketch Pad', quantity: 1, price: 25 },
      { id: 'ad-pen', name: 'Ballpen', quantity: 1, price: 12 },
    ],
    attachedFiles: [
      {
        name: 'poster-design.pdf',
        size: '1.8 MB',
        type: 'PDF',
        pageCount: 2,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 23, addonsCost: 37, total: 60 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-07-22T16:45:00+08:00',
    createdAt: '2026-07-22T16:30:00+08:00',
    lastUpdatedAt: '2026-07-22T16:45:00+08:00',
  },
  {
    id: 'ORD-2026-0007',
    customerId: 'cust-rosa',
    customerName: 'Rosa Villanueva',
    customerEmail: 'rosa.villanueva@example.com',
    status: 'Completed',
    total: '₱85.00',
    date: '2026-08-12T10:15:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000315',
    fileName: 'invitation-card.pdf',
    pages: 8,
    colorMode: 'colored',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'invitation-card.pdf',
        size: '2.2 MB',
        type: 'PDF',
        pageCount: 8,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 85, addonsCost: 0, total: 85 },
    orderSource: 'online',
    statusUpdatedAt: '2026-08-12T10:50:00+08:00',
    createdAt: '2026-08-12T10:15:00+08:00',
    lastUpdatedAt: '2026-08-12T10:50:00+08:00',
  },
  {
    id: 'ORD-2026-0008',
    customerId: 'cust-dan',
    customerName: 'Danilo Cruz',
    customerEmail: 'danilo.cruz@example.com',
    status: 'Completed',
    total: '₱30.00',
    date: '2026-08-20T13:45:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Photocopy',
    copies: 30,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'exam-answer-sheets.pdf',
    pages: 2,
    colorMode: 'bw',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'exam-answer-sheets.pdf',
        size: '0.3 MB',
        type: 'PDF',
        pageCount: 2,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 30,
      },
    ],
    costBreakdown: { printingCost: 30, addonsCost: 0, total: 30 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-08-20T14:05:00+08:00',
    createdAt: '2026-08-20T13:45:00+08:00',
    lastUpdatedAt: '2026-08-20T14:05:00+08:00',
  },
  {
    id: 'ORD-2026-0009',
    customerId: 'cust-bea',
    customerName: 'Bea Torres',
    customerEmail: 'bea.torres@example.com',
    status: 'Canceled',
    total: '₱55.00',
    date: '2026-08-27T09:05:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: false,
    paymentReferenceNumber: 'GCS-2026-000376',
    fileName: 'event-program.pdf',
    pages: 6,
    colorMode: 'colored',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'event-program.pdf',
        size: '1.5 MB',
        type: 'PDF',
        pageCount: 6,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 55, addonsCost: 0, total: 55 },
    orderSource: 'online',
    statusUpdatedAt: '2026-08-27T09:35:00+08:00',
    createdAt: '2026-08-27T09:05:00+08:00',
    lastUpdatedAt: '2026-08-27T09:35:00+08:00',
  },
  // ── Current month (Sept 2026) — completed/released so they add revenue ────
  {
    id: 'ORD-2026-0010',
    customerId: 'cust-miguel',
    customerName: 'Miguel Santiago',
    customerEmail: 'miguel.santiago@example.com',
    status: 'Completed',
    total: '₱210.00',
    date: '2026-09-01T08:20:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000401',
    fileName: 'thesis-covers.pdf',
    pages: 20,
    colorMode: 'colored',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'thesis-covers.pdf',
        size: '4.0 MB',
        type: 'PDF',
        pageCount: 20,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 210, addonsCost: 0, total: 210 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-01T09:00:00+08:00',
    createdAt: '2026-09-01T08:20:00+08:00',
    lastUpdatedAt: '2026-09-01T09:00:00+08:00',
  },
  {
    id: 'ORD-2026-0011',
    customerId: 'cust-grace',
    customerName: 'Grace Lim',
    customerEmail: 'grace.lim@example.com',
    status: 'Released',
    total: '₱25.00',
    date: '2026-09-01T10:10:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Photocopy',
    copies: 25,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'clearance-forms.pdf',
    pages: 2,
    colorMode: 'bw',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'clearance-forms.pdf',
        size: '0.2 MB',
        type: 'PDF',
        pageCount: 2,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 25,
      },
    ],
    costBreakdown: { printingCost: 25, addonsCost: 0, total: 25 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-09-01T10:30:00+08:00',
    createdAt: '2026-09-01T10:10:00+08:00',
    lastUpdatedAt: '2026-09-01T10:30:00+08:00',
  },
  {
    id: 'ORD-2026-0012',
    customerId: 'cust-aaron',
    customerName: 'Aaron De Vera',
    customerEmail: 'aaron.devera@example.com',
    status: 'Completed',
    total: '₱135.00',
    date: '2026-09-01T11:45:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Black & White',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000402',
    fileName: 'report-consolidated.pdf',
    pages: 135,
    colorMode: 'bw',
    pageRange: 'all',
    attachedFiles: [
      {
        name: 'report-consolidated.pdf',
        size: '0.8 MB',
        type: 'PDF',
        pageCount: 135,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 135, addonsCost: 0, total: 135 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-01T12:20:00+08:00',
    createdAt: '2026-09-01T11:45:00+08:00',
    lastUpdatedAt: '2026-09-01T12:20:00+08:00',
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