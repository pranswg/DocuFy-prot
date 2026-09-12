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
  status:
    | 'Awaiting Payment'
    | 'In Queue'
    | 'Printing'
    | 'Completed'
    | 'Released'
    | 'Canceled';
  holdReason?: string;
  cancellationReason?: string;
  // Payment confirmation/verification deadline (ISO). Cash-on-pickup orders
  // must be paid at the shop, online orders must be submitted + verified,
  // before this time or the order is auto-cancelled as expired.
  paymentDeadline?: string;
  // Amount the customer reports having paid (online submissions) — used for
  // Full/Partial Payment + Remaining Balance displays in verification.
  paymentAmountPaid?: number;
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
  customerType?: 'printing' | 'photocopy';
  // Optional manual staff-entered total (overrides automatic pricing, e.g. walk-in photocopy).
  manualTotal?: number;
  // Down payment fields
  downPaymentRequired?: boolean;
  downPaymentAmount?: number;
  downPaymentVerified?: boolean;
  // Full payment fields (high-value orders ≥ fullPaymentThreshold — no 50% option)
  fullPaymentRequired?: boolean;
  fullPaymentAmount?: number;
  fullPaymentVerified?: boolean;
  expectedPaperUsage?: { size: string; sheets: number }[];
  paperDeductedOnCreate?: boolean;
  paperConfirmed?: boolean;
  errorUsage?: { noErrors: boolean; reason?: string; wastedSheets: number };
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
    // Demo online payment awaiting staff verification
    paymentDeadline: '2026-09-30T23:59:00+08:00',
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
    costBreakdown: { printingCost: 75, addonsCost: 0, total: 75 },
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
    status: 'Printing',
    total: '₱120.00',
    date: '2026-09-06T08:30:00+08:00',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 2,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'thesis-chapter-1.pdf',
    pages: 6,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Walk-in order paid at the shop, currently being printed.',
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
    costBreakdown: { printingCost: 120, addonsCost: 0, total: 120 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-09-06T08:30:00+08:00',
    createdAt: '2026-09-06T08:30:00+08:00',
    lastUpdatedAt: '2026-09-06T08:30:00+08:00',
  },
  {
    id: 'ORD-2026-0003',
    customerId: 'cust-ana',
    customerName: 'Ana Reyes',
    customerEmail: 'ana.reyes@example.com',
    status: 'In Queue',
    total: '₱150.00',
    date: '2026-09-06T09:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000124',
    fileName: 'brochure-final.pdf',
    pages: 10,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Queued and ready for printing.',
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
    orderSource: 'online',
    statusUpdatedAt: '2026-09-06T09:00:00+08:00',
    createdAt: '2026-09-06T09:00:00+08:00',
    lastUpdatedAt: '2026-09-06T09:00:00+08:00',
  },
  {
    id: 'ORD-2026-0004',
    customerId: 'cust-jose',
    customerName: 'Jose Ramirez',
    customerEmail: 'jose.ramirez@example.com',
    status: 'In Queue',
    total: '₱40.00',
    date: '2026-09-06T10:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Black & White',
    copies: 20,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'id-forms.pdf',
    pages: 2,
    colorMode: 'bw',
    pageRange: 'all',
    notes: 'Queued and ready for printing.',
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
    statusUpdatedAt: '2026-09-06T10:00:00+08:00',
    createdAt: '2026-09-06T10:00:00+08:00',
    lastUpdatedAt: '2026-09-06T10:00:00+08:00',
  },
  {
    id: 'ORD-2026-0005',
    customerId: 'cust-liza',
    customerName: 'Liza Mendoza',
    customerEmail: 'liza.mendoza@example.com',
    status: 'Completed',
    total: '₱95.00',
    date: '2026-09-02T11:00:00+08:00',
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
    notes: 'Printing done, awaiting pickup.',
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
    statusUpdatedAt: '2026-09-02T11:40:00+08:00',
    createdAt: '2026-09-02T11:00:00+08:00',
    lastUpdatedAt: '2026-09-02T11:40:00+08:00',
  },
  {
    id: 'ORD-2026-0006',
    customerId: 'cust-karlo',
    customerName: 'Karlo Garcia',
    customerEmail: 'karlo.garcia@example.com',
    status: 'Awaiting Payment',
    total: '₱60.00',
    date: '2026-09-02T13:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Long',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: false,
    fileName: 'poster-design.pdf',
    pages: 2,
    colorMode: 'colored',
    pageRange: 'all',
    // Cash-on-pickup awaiting in-shop payment confirmation (demo pending row)
    paymentDeadline: '2026-09-30T23:59:00+08:00',
    notes: 'Awaiting in-shop cash payment confirmation before printing.',
    addons: [
      { name: 'Sketch Pad', quantity: 1, price: 25 },
      { name: 'Ballpen', quantity: 1, price: 12 },
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
    statusUpdatedAt: '2026-09-02T13:30:00+08:00',
    createdAt: '2026-09-02T13:00:00+08:00',
    lastUpdatedAt: '2026-09-02T13:30:00+08:00',
  },
  {
    id: 'ORD-2026-0007',
    customerId: 'cust-rosa',
    customerName: 'Rosa Villanueva',
    customerEmail: 'rosa.villanueva@example.com',
    status: 'Released',
    total: '₱85.00',
    date: '2026-09-02T14:00:00+08:00',
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
    notes: 'Released to customer.',
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
    statusUpdatedAt: '2026-09-02T14:30:00+08:00',
    createdAt: '2026-09-02T14:00:00+08:00',
    lastUpdatedAt: '2026-09-02T14:30:00+08:00',
  },
  {
    id: 'ORD-2026-0008',
    customerId: 'cust-bea',
    customerName: 'Bea Torres',
    customerEmail: 'bea.torres@example.com',
    status: 'Canceled',
    total: '₱55.00',
    date: '2026-09-02T15:00:00+08:00',
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
    cancellationReason: 'Customer no longer needs the printout.',
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
    statusUpdatedAt: '2026-09-02T15:30:00+08:00',
    createdAt: '2026-09-02T15:00:00+08:00',
    lastUpdatedAt: '2026-09-02T15:30:00+08:00',
  },

  // ── Extra recent demo orders (Sep 2026) spanning every status so the Orders
  // ── list and Payment Verification have enough rows to show pagination.
  {
    id: 'ORD-2026-0009',
    customerId: 'cust-miguel',
    customerName: 'Miguel Fernandez',
    customerEmail: 'miguel.fernandez@example.com',
    status: 'Awaiting Payment',
    total: '₱85.00',
    date: '2026-09-06T11:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: false,
    paymentReferenceNumber: 'MAY-2026-000442',
    paymentDeadline: '2026-09-30T23:59:00+08:00',
    fileName: 'certificate-stock.pdf',
    pages: 10,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Waiting for Maya payment verification.',
    attachedFiles: [
      {
        name: 'certificate-stock.pdf',
        size: '1.1 MB',
        type: 'PDF',
        pageCount: 10,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 85, addonsCost: 0, total: 85 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-06T11:30:00+08:00',
    createdAt: '2026-09-06T11:30:00+08:00',
    lastUpdatedAt: '2026-09-06T11:30:00+08:00',
  },
  {
    id: 'ORD-2026-0010',
    customerId: 'cust-elena',
    customerName: 'Elena Navarro',
    customerEmail: 'elena.navarro@example.com',
    status: 'Awaiting Payment',
    total: '₱75.00',
    date: '2026-09-06T13:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: false,
    paymentReferenceNumber: 'GCS-2026-000501',
    paymentDeadline: '2026-09-30T23:59:00+08:00',
    fileName: 'events-invitation.pdf',
    pages: 8,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Waiting for GCash payment verification.',
    attachedFiles: [
      {
        name: 'events-invitation.pdf',
        size: '1.6 MB',
        type: 'PDF',
        pageCount: 8,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 75, addonsCost: 0, total: 75 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-06T13:00:00+08:00',
    createdAt: '2026-09-06T13:00:00+08:00',
    lastUpdatedAt: '2026-09-06T13:00:00+08:00',
  },
  {
    id: 'ORD-2026-0011',
    customerId: 'cust-omar',
    customerName: 'Omar Bautista',
    customerEmail: 'omar.bautista@example.com',
    status: 'In Queue',
    total: '₱64.00',
    date: '2026-09-06T14:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Black & White',
    copies: 8,
    paymentMethod: 'GCash',
    paymentVerified: true,
    paymentReferenceNumber: 'GCS-2026-000512',
    fileName: 'school-module.pdf',
    pages: 8,
    colorMode: 'bw',
    pageRange: 'all',
    notes: 'Queued and ready for printing.',
    attachedFiles: [
      {
        name: 'school-module.pdf',
        size: '0.7 MB',
        type: 'PDF',
        pageCount: 8,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 8,
      },
    ],
    costBreakdown: { printingCost: 64, addonsCost: 0, total: 64 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-06T14:00:00+08:00',
    createdAt: '2026-09-06T14:00:00+08:00',
    lastUpdatedAt: '2026-09-06T14:00:00+08:00',
  },
  {
    id: 'ORD-2026-0012',
    customerId: 'cust-pia',
    customerName: 'Pia Salvacion',
    customerEmail: 'pia.salvacion@example.com',
    status: 'Printing',
    total: '₱128.00',
    date: '2026-09-06T15:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: true,
    paymentReferenceNumber: 'MAY-2026-000520',
    fileName: 'game-day-flyer.pdf',
    pages: 16,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Currently being printed.',
    attachedFiles: [
      {
        name: 'game-day-flyer.pdf',
        size: '2.0 MB',
        type: 'PDF',
        pageCount: 16,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 128, addonsCost: 0, total: 128 },
    orderSource: 'online',
    statusUpdatedAt: '2026-09-06T15:00:00+08:00',
    createdAt: '2026-09-06T15:00:00+08:00',
    lastUpdatedAt: '2026-09-06T15:00:00+08:00',
  },
  {
    id: 'ORD-2026-0013',
    customerId: 'cust-luis',
    customerName: 'Luis Jimenez',
    customerEmail: 'luis.jimenez@example.com',
    status: 'Completed',
    total: '₱110.00',
    date: '2026-09-04T10:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'yearbook-page.pdf',
    pages: 12,
    colorMode: 'colored',
    pageRange: 'all',
    notes: 'Walk-in order, printing done.',
    attachedFiles: [
      {
        name: 'yearbook-page.pdf',
        size: '2.3 MB',
        type: 'PDF',
        pageCount: 12,
        colorMode: 'colored',
        pageRange: 'all',
        copies: 1,
      },
    ],
    costBreakdown: { printingCost: 110, addonsCost: 0, total: 110 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-09-04T10:30:00+08:00',
    createdAt: '2026-09-04T10:00:00+08:00',
    lastUpdatedAt: '2026-09-04T10:30:00+08:00',
  },
  {
    id: 'ORD-2026-0014',
    customerId: 'cust-thea',
    customerName: 'Thea Domingo',
    customerEmail: 'thea.domingo@example.com',
    status: 'Released',
    total: '₱35.00',
    date: '2026-09-03T09:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Black & White',
    copies: 5,
    paymentMethod: 'Cash',
    paymentVerified: true,
    fileName: 'printout-final.pdf',
    pages: 5,
    colorMode: 'bw',
    pageRange: 'all',
    notes: 'Released to customer.',
    attachedFiles: [
      {
        name: 'printout-final.pdf',
        size: '0.5 MB',
        type: 'PDF',
        pageCount: 5,
        colorMode: 'bw',
        pageRange: 'all',
        copies: 5,
      },
    ],
    costBreakdown: { printingCost: 35, addonsCost: 0, total: 35 },
    orderSource: 'walkin',
    statusUpdatedAt: '2026-09-03T09:20:00+08:00',
    createdAt: '2026-09-03T09:00:00+08:00',
    lastUpdatedAt: '2026-09-03T09:20:00+08:00',
  },

  // ── Mock historical orders (Apr…, back 12 months) so the Admin Dashboard
  // ── Sales Trend area chart has a real multi-month line to render. All are
  // ── payment-verified and Completed/Released, so they never appear as Pending
  // ── in Payment Verification, never join the queue, and only feed the sales
  // ── charts/KPIs + order history.
  {
    id: 'ORD-2026-0015',
    customerId: 'cust-ron',
    customerName: 'Ron Del Rosario',
    customerEmail: 'ron.delrosario@example.com',
    status: 'Released',
    total: '₱1,050.00',
    date: '2025-10-15T10:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'marketing-brochure.pdf',
    pages: 12,
    costBreakdown: { printingCost: 1050, addonsCost: 0, total: 1050 },
    statusUpdatedAt: '2025-10-15T10:05:00+08:00',
    createdAt: '2025-10-15T10:00:00+08:00',
    lastUpdatedAt: '2025-10-15T10:05:00+08:00',
  },
  {
    id: 'ORD-2026-0016',
    customerId: 'cust-tricia',
    customerName: 'Tricia Villanueva',
    customerEmail: 'tricia.villanueva@example.com',
    status: 'Released',
    total: '₱1,320.00',
    date: '2025-11-14T11:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'B&W',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'modules-textbook.pdf',
    pages: 220,
    costBreakdown: { printingCost: 1320, addonsCost: 0, total: 1320 },
    statusUpdatedAt: '2025-11-14T11:35:00+08:00',
    createdAt: '2025-11-14T11:30:00+08:00',
    lastUpdatedAt: '2025-11-14T11:35:00+08:00',
  },
  {
    id: 'ORD-2026-0017',
    customerId: 'cust-mark',
    customerName: 'Mark Aquino',
    customerEmail: 'mark.aquino@example.com',
    status: 'Released',
    total: '₱2,100.00',
    date: '2025-12-18T09:00:00+08:00',
    paperType: 'Vellum',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'christmas-program.pdf',
    pages: 48,
    costBreakdown: { printingCost: 2100, addonsCost: 0, total: 2100 },
    statusUpdatedAt: '2025-12-18T09:10:00+08:00',
    createdAt: '2025-12-18T09:00:00+08:00',
    lastUpdatedAt: '2025-12-18T09:10:00+08:00',
  },
  {
    id: 'ORD-2026-0018',
    customerId: 'cust-sarah',
    customerName: 'Sarah Lim',
    customerEmail: 'sarah.lim@example.com',
    status: 'Completed',
    total: '₱1,450.00',
    date: '2026-01-16T14:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: true,
    orderSource: 'walkin',
    fileName: 'yearbook-pages.pdf',
    pages: 90,
    costBreakdown: { printingCost: 1450, addonsCost: 0, total: 1450 },
    statusUpdatedAt: '2026-01-16T14:20:00+08:00',
    createdAt: '2026-01-16T14:00:00+08:00',
    lastUpdatedAt: '2026-01-16T14:20:00+08:00',
  },
  {
    id: 'ORD-2026-0019',
    customerId: 'cust-carlo',
    customerName: 'Carlo Mendoza',
    customerEmail: 'carlo.mendoza@example.com',
    status: 'Completed',
    total: '₱1,680.00',
    date: '2026-02-13T13:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Short',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'thesis-final.pdf',
    pages: 150,
    costBreakdown: { printingCost: 1680, addonsCost: 0, total: 1680 },
    statusUpdatedAt: '2026-02-13T13:15:00+08:00',
    createdAt: '2026-02-13T13:00:00+08:00',
    lastUpdatedAt: '2026-02-13T13:15:00+08:00',
  },
  {
    id: 'ORD-2026-0020',
    customerId: 'cust-nina',
    customerName: 'Nina Ramirez',
    customerEmail: 'nina.ramirez@example.com',
    status: 'Released',
    total: '₱1,220.00',
    date: '2026-03-20T15:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'B&W',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'business-report.pdf',
    pages: 200,
    costBreakdown: { printingCost: 1220, addonsCost: 0, total: 1220 },
    statusUpdatedAt: '2026-03-20T15:10:00+08:00',
    createdAt: '2026-03-20T15:00:00+08:00',
    lastUpdatedAt: '2026-03-20T15:10:00+08:00',
  },
  {
    id: 'ORD-2026-0021',
    customerId: 'cust-paolo',
    customerName: 'Paolo Cruz',
    customerEmail: 'paolo.cruz@example.com',
    status: 'Released',
    total: '₱1,860.00',
    date: '2026-04-17T10:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'photobook.pdf',
    pages: 40,
    costBreakdown: { printingCost: 1860, addonsCost: 0, total: 1860 },
    statusUpdatedAt: '2026-04-17T10:40:00+08:00',
    createdAt: '2026-04-17T10:30:00+08:00',
    lastUpdatedAt: '2026-04-17T10:40:00+08:00',
  },
  {
    id: 'ORD-2026-0022',
    customerId: 'cust-bella',
    customerName: 'Bella Garcia',
    customerEmail: 'bella.garcia@example.com',
    status: 'Completed',
    total: '₱2,150.00',
    date: '2026-05-15T11:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'Legal',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Cash',
    paymentVerified: true,
    orderSource: 'walkin',
    fileName: 'brochures-pack.pdf',
    pages: 75,
    costBreakdown: { printingCost: 2150, addonsCost: 0, total: 2150 },
    statusUpdatedAt: '2026-05-15T11:30:00+08:00',
    createdAt: '2026-05-15T11:00:00+08:00',
    lastUpdatedAt: '2026-05-15T11:30:00+08:00',
  },
  {
    id: 'ORD-2026-0023',
    customerId: 'cust-josh',
    customerName: 'Josh Reyes',
    customerEmail: 'josh.reyes@example.com',
    status: 'Completed',
    total: '₱1,940.00',
    date: '2026-06-19T16:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'B&W',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'reviewer-bundle.pdf',
    pages: 320,
    costBreakdown: { printingCost: 1940, addonsCost: 0, total: 1940 },
    statusUpdatedAt: '2026-06-19T16:15:00+08:00',
    createdAt: '2026-06-19T16:00:00+08:00',
    lastUpdatedAt: '2026-06-19T16:15:00+08:00',
  },
  {
    id: 'ORD-2026-0024',
    customerId: 'cust-angel',
    customerName: 'Angel Santos',
    customerEmail: 'angel.santos@example.com',
    status: 'Released',
    total: '₱2,480.00',
    date: '2026-07-17T09:30:00+08:00',
    paperType: 'Vellum',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'wedding-invites.pdf',
    pages: 60,
    costBreakdown: { printingCost: 2480, addonsCost: 0, total: 2480 },
    statusUpdatedAt: '2026-07-17T09:45:00+08:00',
    createdAt: '2026-07-17T09:30:00+08:00',
    lastUpdatedAt: '2026-07-17T09:45:00+08:00',
  },
  {
    id: 'ORD-2026-0025',
    customerId: 'cust-david',
    customerName: 'David Tan',
    customerEmail: 'david.tan@example.com',
    status: 'Released',
    total: '₱2,760.00',
    date: '2026-08-21T12:00:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'GCash',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'campaign-materials.pdf',
    pages: 110,
    costBreakdown: { printingCost: 2760, addonsCost: 0, total: 2760 },
    statusUpdatedAt: '2026-08-21T12:20:00+08:00',
    createdAt: '2026-08-21T12:00:00+08:00',
    lastUpdatedAt: '2026-08-21T12:20:00+08:00',
  },
  {
    id: 'ORD-2026-0026',
    customerId: 'cust-karen',
    customerName: 'Karen Lim',
    customerEmail: 'karen.lim@example.com',
    status: 'Completed',
    total: '₱890.00',
    date: '2026-09-03T14:30:00+08:00',
    paperType: 'Bond Paper',
    paperSize: 'A4',
    printType: 'Colored',
    copies: 1,
    paymentMethod: 'Maya',
    paymentVerified: true,
    orderSource: 'online',
    fileName: 'poster-set.pdf',
    pages: 18,
    costBreakdown: { printingCost: 890, addonsCost: 0, total: 890 },
    statusUpdatedAt: '2026-09-03T14:45:00+08:00',
    createdAt: '2026-09-03T14:30:00+08:00',
    lastUpdatedAt: '2026-09-03T14:45:00+08:00',
  },

  // ── Extra Awaiting-Payment demo orders (Sep 2026) so Payment Verification's
  // ── default Pending list has enough rows to show pagination.
  ...Array.from({ length: 10 }, (_, i) => {
    const n = 27 + i;
    const id = `ORD-2026-00${n}`;
    const customers = [
      ['cust-franco', 'Franco Mercado', 'franco.mercado@example.com', 'GCash', 'GCS-2026-0006' + String(10 + i)],
      ['cust-gina', 'Gina Reyes', 'gina.reyes@example.com', 'Maya', 'MAY-2026-0007' + String(10 + i)],
      ['cust-henri', 'Henri Go', 'henri.go@example.com', 'GCash', 'GCS-2026-0008' + String(10 + i)],
      ['cust-irma', 'Irma Salazar', 'irma.salazar@example.com', 'Cash', ''],
      ['cust-joel', 'Joel Ramos', 'joel.ramos@example.com', 'Maya', 'MAY-2026-0009' + String(10 + i)],
      ['cust-kyla', 'Kyla Tan', 'kyla.tan@example.com', 'GCash', 'GCS-2026-0010' + String(10 + i)],
      ['cust-leo', 'Leo Domingo', 'leo.domingo@example.com', 'Cash', ''],
      ['cust-marie', 'Marie Cruz', 'marie.cruz@example.com', 'GCash', 'GCS-2026-0011' + String(10 + i)],
      ['cust-nico', 'Nico Villar', 'nico.villar@example.com', 'Maya', 'MAY-2026-0012' + String(10 + i)],
      ['cust-orna', 'Orna Santos', 'orna.santos@example.com', 'Cash', ''],
    ][i];
    const hour = (0b10 + i) % 17 + 8; // 10:00 .. 17:00 staggered
    const minute = (i * 7) % 60;
    const ts = `2026-09-0${(i % 5) + 4}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
    const isCash = customers[3] === 'Cash';
    return {
      id,
      customerId: customers[0],
      customerName: customers[1],
      customerEmail: customers[2],
      status: 'Awaiting Payment',
      total: `₱${55 + i * 3}.00`,
      date: ts,
      paperType: 'Bond Paper',
      paperSize: 'A4',
      printType: 'Colored',
      copies: 1,
      paymentMethod: customers[3],
      paymentVerified: false,
      ...(customers[4] ? { paymentReferenceNumber: customers[4] } : {}),
      paymentDeadline: '2026-09-30T23:59:00+08:00',
      fileName: `pending-doc-${n}.pdf`,
      pages: 4 + (i % 6),
      colorMode: 'colored',
      pageRange: 'all',
      notes: isCash
        ? 'Awaiting in-shop cash payment confirmation before printing.'
        : `Waiting for ${customers[3]} payment verification.`,
      attachedFiles: [
        {
          name: `pending-doc-${n}.pdf`,
          size: `${(i % 4) + 1}.0 MB`,
          type: 'PDF',
          pageCount: 4 + (i % 6),
          colorMode: 'colored',
          pageRange: 'all',
          copies: 1,
        },
      ],
      costBreakdown: { printingCost: 55 + i * 3, addonsCost: 0, total: 55 + i * 3 },
      orderSource: 'online',
      statusUpdatedAt: ts,
      createdAt: ts,
      lastUpdatedAt: ts,
    } as Order;
  }),

  // ── Extra In Queue / Printing demo orders (Sep 2026) so the Orders/queue page
  // ── default view has enough rows to show pagination.
  ...Array.from({ length: 10 }, (_, i) => {
    const n = 37 + i;
    const id = `ORD-2026-00${n}`;
    const customers = [
      ['cust-paolo-b', 'Paolo Bautista', 'paolo.bautista@example.com', 'GCash', 'GCS-2026-0013' + String(i)],
      ['cust-quinn', 'Quinn Lim', 'quinn.lim@example.com', 'Maya', 'MAY-2026-0014' + String(i)],
      ['cust-rico', 'Rico Dela Pena', 'rico.delapena@example.com', 'Cash', ''],
      ['cust-sienna', 'Sienna Cruz', 'sienna.cruz@example.com', 'GCash', 'GCS-2026-0015' + String(i)],
      ['cust-tomas', 'Tomas Aquino', 'tomas.aquino@example.com', 'Maya', 'MAY-2026-0016' + String(i)],
      ['cust-urna', 'Urna Reyes', 'urna.reyes@example.com', 'Cash', ''],
      ['cust-victor', 'Victor Santos', 'victor.santos@example.com', 'GCash', 'GCS-2026-0017' + String(i)],
      ['cust-wina', 'Wina Garcia', 'wina.garcia@example.com', 'Maya', 'MAY-2026-0018' + String(i)],
      ['cust-xander', 'Xander Villanueva', 'xander.villanueva@example.com', 'GCash', 'GCS-2026-0019' + String(i)],
      ['cust-yana', 'Yana Mercado', 'yana.mercado@example.com', 'Cash', ''],
    ][i];
    const status = i % 3 === 0 ? 'Printing' : 'In Queue';
    const hour = 9 + i;
    const minute = (i * 3) % 60;
    const ts = `2026-09-${String(i + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`;
    const isCash = customers[3] === 'Cash';
    return {
      id,
      customerId: customers[0],
      customerName: customers[1],
      customerEmail: customers[2],
      status,
      total: `₱${45 + i * 7}.00`,
      date: ts,
      paperType: 'Bond Paper',
      paperSize: 'A4',
      printType: 'Colored',
      copies: 1,
      paymentMethod: customers[3],
      paymentVerified: true,
      ...(customers[4] && !isCash ? { paymentReferenceNumber: customers[4] } : {}),
      fileName: `queue-doc-${n}.pdf`,
      pages: 3 + (i % 5),
      colorMode: 'colored',
      pageRange: 'all',
      notes: status === 'Printing' ? 'Currently being printed.' : 'Queued and ready for printing.',
      attachedFiles: [
        {
          name: `queue-doc-${n}.pdf`,
          size: `${(i % 3) + 1}.0 MB`,
          type: 'PDF',
          pageCount: 3 + (i % 5),
          colorMode: 'colored',
          pageRange: 'all',
          copies: 1,
        },
      ],
      costBreakdown: { printingCost: 45 + i * 7, addonsCost: 0, total: 45 + i * 7 },
      orderSource: customers[3] === 'Cash' ? 'walkin' : 'online',
      statusUpdatedAt: ts,
      createdAt: ts,
      lastUpdatedAt: ts,
    } as Order;
  }),
];

// ─── Cross-tab order sync ──────────────────────────────────────────────────
// Orders live across every open tab (staff/admin/queue/dashboards) via a
// localStorage snapshot used as the shared channel, synced through the browser
// `storage` event. Writing any order first re-bases on the LATEST snapshot (so
// tabs updating different orders can't silently revert each other), then saves
// and notifies; every OTHER tab hears the storage event, reloads the snapshot,
// and re-renders LIVE — no page refresh needed.
// NOTE (Supabase later): replace this mirror with real shared state (a
// Postgres table + Realtime broadcasts). This only emulates that behavior
// locally so the multi-PC demo works in two tabs.
const ORDERS_SYNC_KEY = 'docufy_orders_sync_v1';

function readOrdersSnapshot(): Order[] | null {
  try {
    const raw = localStorage.getItem(ORDERS_SYNC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : null;
  } catch {
    return null;
  }
}

function writeOrdersSnapshot(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_SYNC_KEY, JSON.stringify(orders));
  } catch {
    // quota / private-mode errors are non-fatal for the mock store
  }
}

// In-memory store with event listeners
class DataStore {
  private orders: Order[] = [...initialOrders];
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Adopt any existing cross-tab snapshot on load, so a freshly-opened tab
    // (customer OR staff/admin) immediately reflects orders placed in other
    // tabs instead of starting from the seed rows until the next write.
    const snap = readOrdersSnapshot();
    if (snap) {
      this.orders = snap;
    }

    // Initialize order counter from existing orders
    this.initializeOrderCounter();

    // Cross-tab sync: whenever another tab writes the shared snapshot, adopt
    // it into memory and re-render every subscriber live (no refresh needed).
    window.addEventListener('storage', (e) => {
      if (e.key !== ORDERS_SYNC_KEY || e.newValue == null) return;
      try {
        const incoming = JSON.parse(e.newValue);
        if (Array.isArray(incoming)) {
          this.orders = incoming as Order[];
          this.notify();
        }
      } catch {
        // ignore malformed snapshots
      }
    });
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
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
    // Re-base on the latest shared snapshot so changes made in other tabs
    // (that we haven't received yet) aren't clobbered by this write.
    const base = readOrdersSnapshot();
    const working = base ?? this.orders;
    // Automatically add timestamp when creating a new order
    const now = new Date().toISOString();
    const orderWithTimestamps = {
      ...order,
      createdAt: order.createdAt || now,
      statusUpdatedAt: order.statusUpdatedAt || now,
      lastUpdatedAt: now
    };
    const updated = [orderWithTimestamps, ...working];
    this.orders = updated;
    writeOrdersSnapshot(updated);
    this.notify();
  }

  updateOrder(id: string, updates: Partial<Order>) {
    const base = readOrdersSnapshot();
    const working = base ?? this.orders;
    const index = working.findIndex(order => order.id === id);
    if (index !== -1) {
      const now = new Date().toISOString();
      const previousStatus = working[index].status;

      // Automatically update timestamps
      const timestampedUpdates = {
        ...updates,
        lastUpdatedAt: now,
        // Update statusUpdatedAt only if status is actually changing
        ...(updates.status && updates.status !== previousStatus
          ? { statusUpdatedAt: now }
          : {})
      };

      const updated = working.map((order, i) =>
        i === index ? { ...order, ...timestampedUpdates } : order
      );
      this.orders = updated;
      writeOrdersSnapshot(updated);
      this.notify();
    }
  }

  updateOrderStatus(id: string, status: Order['status'], holdReason?: string) {
    this.updateOrder(id, { status, holdReason });
  }

  deleteOrder(id: string) {
    const base = readOrdersSnapshot();
    const working = base ?? this.orders;
    const updated = working.filter(order => order.id !== id);
    this.orders = updated;
    writeOrdersSnapshot(updated);
    this.notify();
  }

  getOrderStats(customerEmail?: string) {
    const orders = customerEmail
      ? this.getOrdersByCustomer(customerEmail)
      : this.orders;

    const awaitingPayment = orders.filter(o => o.status === 'Awaiting Payment').length;
    const inQueue   = orders.filter(o => o.status === 'In Queue').length;
    const printing  = orders.filter(o => o.status === 'Printing').length;
    const completed = orders.filter(o => o.status === 'Completed').length;
    const released  = orders.filter(o => o.status === 'Released').length;
    const canceled  = orders.filter(o => o.status === 'Canceled').length;

    // "In Progress" = orders actively being printed (queued + printing)
    const inProgress = inQueue + printing;
    // "All Completed" = done + picked up
    const allCompleted = completed + released;
    // "Active" = not yet finished or picked up (includes awaiting payment)
    const allActive = inQueue + printing + awaitingPayment;
    // "Finished" = completed + released (alias)
    const allFinished = allCompleted;
    // Total = awaitingPayment + inProgress + allCompleted (no canceled) — matches sum of status cards
    const total = awaitingPayment + inProgress + allCompleted;

    return {
      total,          // = awaitingPayment + inProgress + allCompleted (consistent with dashboard cards)
      awaitingPayment,
      inQueue,
      printing,
      completed,
      released,
      canceled,
      inProgress,     // inQueue + printing
      allCompleted,   // completed + released
      allActive,      // inQueue + printing + awaitingPayment
      allFinished,    // completed + released
    };
  }

  // Generate next sequential order ID using centralized counter
  getNextOrderId(): string {
    // Re-base on the LATEST shared snapshot before minting. A tab that has been
    // open a while (e.g. the customer tab while staff/admin was placing walk-in
    // orders in another tab) otherwise holds a stale in-memory counter and could
    // mint an ID that already exists. initializeFromOrders only ever raised the
    // sequence, so this is safe against any previously-minted ID.
    const snap = readOrdersSnapshot();
    if (snap && snap.length > 0) {
      orderCounter.initializeFromOrders(snap.map(order => order.id));
    }
    return orderCounter.getNextOrderId();
  }

  // Initialize the order counter from existing orders (call once on app start)
  initializeOrderCounter(): void {
    const orderIds = this.orders.map(order => order.id);
    orderCounter.initializeFromOrders(orderIds);
  }
}

export const dataStore = new DataStore();