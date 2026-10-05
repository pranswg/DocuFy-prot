// Audit trail store — the read model behind Admin -> Audit Trail
// (/admin/audit-trail). Every privileged change in the system is an entry here:
// who acted, what they did, which module, which entity, and the exact
// before/after values.
//
// Design note: the TABLE deliberately does NOT show a description/description
// column. Date/User/Role/Action/Module/Reference is already enough to scan and
// sort a log line, and a free-text column repeated the same facts as the other
// six while making rows tall and unreadable. The full human-readable narrative
// lives ONLY in the "View Details" panel, which also carries the
// investigation-level extras (previous/new values, IP, device, transaction id).

const STORAGE_KEY = "docufy_audit_log_v1";

export type AuditAction =
  | "Created"
  | "Updated"
  | "Approved"
  | "Rejected"
  | "Deleted"
  | "Released";

export type AuditRole = "Admin" | "Staff" | "Customer";

export type AuditModule =
  | "Orders"
  | "Payments"
  | "Inventory"
  | "Pricing"
  | "Staff"
  | "Walk-in"
  | "Attendance"
  | "Payment Methods"
  | "Shop Content";

/** A single field transition captured at the moment of the change. */
export interface AuditChange {
  field: string;
  previous: string;
  next: string;
}

export interface AuditEntry {
  id: string;
  /** ISO timestamp. Rendered in PHT by the page. */
  timestamp: string;
  /** Display name of whoever performed the action. */
  actorName: string;
  actorRole: AuditRole;
  action: AuditAction;
  module: AuditModule;
  /** The affected entity, e.g. "Order #ORD-1024". */
  reference: string;
  /** Short headline, e.g. "Payment Approved". Shown in the details panel. */
  title: string;
  /** Full human-readable explanation. Details panel ONLY — never the table. */
  description: string;
  /** Before/after values. Empty when the action created or deleted a record. */
  changes: AuditChange[];
  /** Optional investigation metadata — omitted entirely when unknown. */
  ipAddress?: string;
  device?: string;
  transactionId?: string;
}

type Subscriber = () => void;

const minutesAgo = (m: number): string =>
  new Date(Date.now() - m * 60_000).toISOString();

/**
 * Demo history. Timestamps are generated relative to load so the log always
 * reads as "recent" rather than drifting into the past.
 */
const SEED: AuditEntry[] = [
  {
    id: "AUD-1021",
    timestamp: minutesAgo(4),
    actorName: "Juan Santos",
    actorRole: "Staff",
    action: "Approved",
    module: "Payments",
    reference: "Order #ORD-1024",
    title: "Payment Approved",
    description:
      "Juan Santos approved the customer's GCash payment. The order payment status was changed from Pending to Verified.",
    changes: [
      { field: "Payment Status", previous: "Pending", next: "Verified" },
      { field: "Order Status", previous: "Awaiting Payment", next: "In Queue" },
    ],
    ipAddress: "112.135.44.90",
    device: "Chrome — Windows 11",
    transactionId: "TXN-88412",
  },
  {
    id: "AUD-1020",
    timestamp: minutesAgo(11),
    actorName: "Maria Santos",
    actorRole: "Staff",
    action: "Updated",
    module: "Orders",
    reference: "Order #ORD-1024",
    title: "Order Status Updated",
    description:
      "Maria Santos moved the order forward in the print queue after confirming the job details with the customer.",
    changes: [
      { field: "Order Status", previous: "In Queue", next: "Printing" },
    ],
    ipAddress: "112.135.44.77",
    device: "Chrome — Windows 11",
    transactionId: "TXN-88405",
  },
  {
    id: "AUD-1019",
    timestamp: minutesAgo(23),
    actorName: "Customer User",
    actorRole: "Customer",
    action: "Created",
    module: "Orders",
    reference: "Order #ORD-1024",
    title: "Order Created",
    description:
      "Customer User placed a new print order online and selected GCash as the payment method. The order was created as Awaiting Payment and held pending verification.",
    changes: [
      { field: "Order Status", previous: "—", next: "Awaiting Payment" },
      { field: "Payment Method", previous: "—", next: "GCash" },
    ],
    ipAddress: "124.89.72.14",
    device: "Safari — iPhone 15",
  },
  {
    id: "AUD-1018",
    timestamp: minutesAgo(38),
    actorName: "Angel Reyes",
    actorRole: "Admin",
    action: "Updated",
    module: "Pricing",
    reference: "Pricing — Document / Color / A4",
    title: "Pricing Rate Updated",
    description:
      "Angel Reyes changed the per-page rate for full-color A4 document printing. The new rate applies to all new orders placed after this change.",
    changes: [
      { field: "Full Color A4", previous: "₱12.00", next: "₱15.00" },
    ],
    ipAddress: "49.144.19.203",
    device: "Edge — Windows 11",
    transactionId: "TXN-88360",
  },
  {
    id: "AUD-1017",
    timestamp: minutesAgo(52),
    actorName: "Juan Santos",
    actorRole: "Staff",
    action: "Rejected",
    module: "Payments",
    reference: "Order #ORD-1021",
    title: "Payment Rejected",
    description:
      "Juan Santos rejected the customer's submitted reference number because the amount on the receipt did not match the amount due. The customer was asked to resubmit.",
    changes: [
      { field: "Payment Status", previous: "Pending", next: "Rejected" },
    ],
    ipAddress: "112.135.44.90",
    device: "Chrome — Windows 11",
    transactionId: "TXN-88341",
  },
  {
    id: "AUD-1016",
    timestamp: minutesAgo(96),
    actorName: "Miguel Santos",
    actorRole: "Staff",
    action: "Released",
    module: "Orders",
    reference: "Order #ORD-1018",
    title: "Order Released",
    description:
      "Miguel Santos released the completed order to the customer and collected the balance at the counter.",
    changes: [{ field: "Order Status", previous: "Completed", next: "Released" }],
    ipAddress: "112.135.44.31",
    device: "Chrome — Windows 10",
    transactionId: "TXN-88290",
  },
  {
    id: "AUD-1015",
    timestamp: minutesAgo(130),
    actorName: "Angel Reyes",
    actorRole: "Admin",
    action: "Created",
    module: "Staff",
    reference: "Staff — Miguel Santos",
    title: "Staff Account Created",
    description:
      "Angel Reyes registered a new staff account for Miguel Santos with the Staff role. The account can now sign in but must clock in before using staff functions.",
    changes: [{ field: "Account Status", previous: "—", next: "Active" }],
    ipAddress: "49.144.19.203",
    device: "Edge — Windows 11",
  },
  {
    id: "AUD-1014",
    timestamp: minutesAgo(164),
    actorName: "Maria Santos",
    actorRole: "Staff",
    action: "Updated",
    module: "Inventory",
    reference: "Inventory — Paper A4",
    title: "Stock Adjusted",
    description:
      "Maria Santos recorded a stock-out of A4 paper after a miscount was found during the closing inventory check.",
    changes: [
      { field: "Current Stock", previous: "12 reams", next: "9 reams" },
    ],
    ipAddress: "112.135.44.77",
    device: "Chrome — Windows 11",
    transactionId: "TXN-88211",
  },
  {
    id: "AUD-1013",
    timestamp: minutesAgo(210),
    actorName: "Ana Dela Cruz",
    actorRole: "Staff",
    action: "Deleted",
    module: "Orders",
    reference: "Order #ORD-1015",
    title: "Order Deleted",
    description:
      "Ana Dela Cruz deleted a duplicate walk-in order that had been entered twice by mistake. The original order record was left untouched.",
    changes: [{ field: "Record", previous: "Active", next: "Deleted" }],
    ipAddress: "112.135.44.58",
    device: "Chrome — Windows 10",
  },
  {
    id: "AUD-1012",
    timestamp: minutesAgo(260),
    actorName: "Angel Reyes",
    actorRole: "Admin",
    action: "Updated",
    module: "Payment Methods",
    reference: "Payment Method — Maya",
    title: "Payment Method Updated",
    description:
      "Angel Reyes deactivated the Maya payment method after its account number was changed by the provider.",
    changes: [{ field: "Status", previous: "Active", next: "Inactive" }],
    ipAddress: "49.144.19.203",
    device: "Edge — Windows 11",
    transactionId: "TXN-88104",
  },
  {
    id: "AUD-1011",
    timestamp: minutesAgo(318),
    actorName: "Juan Santos",
    actorRole: "Staff",
    action: "Approved",
    module: "Walk-in",
    reference: "Walk-in #WALK-0451",
    title: "Walk-in Transaction Approved",
    description:
      "Juan Santos approved a walk-in photocopy transaction at the counter. Cash payment was collected in full and the order entered the print queue.",
    changes: [
      { field: "Payment Status", previous: "Unpaid", next: "Paid" },
      { field: "Amount Collected", previous: "—", next: "₱85.00" },
    ],
    ipAddress: "112.135.44.90",
    device: "Chrome — Windows 11",
    transactionId: "TXN-88062",
  },
  {
    id: "AUD-1010",
    timestamp: minutesAgo(402),
    actorName: "Angel Reyes",
    actorRole: "Admin",
    action: "Updated",
    module: "Attendance",
    reference: "Attendance — Robert Chen",
    title: "Attendance Record Adjusted",
    description:
      "Angel Reyes corrected Robert Chen's clock-in time after reviewing the branch camera footage. The original value was preserved in the adjustment log.",
    changes: [
      { field: "Clock In", previous: "08:45 AM", next: "08:30 AM" },
    ],
    ipAddress: "49.144.19.203",
    device: "Edge — Windows 11",
    transactionId: "TXN-87915",
  },
  {
    id: "AUD-1009",
    timestamp: minutesAgo(520),
    actorName: "Maria Santos",
    actorRole: "Staff",
    action: "Created",
    module: "Walk-in",
    reference: "Walk-in #WALK-0448",
    title: "Walk-in Transaction Created",
    description:
      "Maria Santos created a walk-in printing transaction for a customer who paid at the counter.",
    changes: [{ field: "Order Status", previous: "—", next: "In Queue" }],
    ipAddress: "112.135.44.77",
    device: "Chrome — Windows 11",
  },
  {
    id: "AUD-1008",
    timestamp: minutesAgo(640),
    actorName: "Angel Reyes",
    actorRole: "Admin",
    action: "Updated",
    module: "Shop Content",
    reference: "Shop Status",
    title: "Shop Status Changed",
    description:
      "Angel Reyes paused new order acceptance while the shop underwent electrical repairs. Existing orders continued to be processed normally.",
    changes: [{ field: "Shop Status", previous: "Open", next: "Paused" }],
    ipAddress: "49.144.19.203",
    device: "Edge — Windows 11",
    transactionId: "TXN-87740",
  },
];

class AuditLogStore {
  private entries: AuditEntry[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuditEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.entries = parsed;
          return;
        }
      }
    } catch {
      // Fall through to the demo seed on unreadable storage.
    }
    this.entries = SEED;
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // A full/blocked store must never break the page.
    }
  }

  private notify(): void {
    this.subscribers.forEach((listener) => listener());
  }

  /** Newest first — the order a reviewer reads a log in. */
  getEntries(): AuditEntry[] {
    this.load();
    return [...this.entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  getById(id: string): AuditEntry | undefined {
    this.load();
    return this.entries.find((entry) => entry.id === id);
  }

  subscribe(listener: Subscriber): () => void {
    this.load();
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  /** Append a new activity entry (newest automatically sorts first). */
  record(entry: Omit<AuditEntry, "id" | "timestamp"> & { id?: string; timestamp?: string }): void {
    this.load();
    const created: AuditEntry = {
      ...entry,
      id: entry.id ?? `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    };
    this.entries = [created, ...this.entries];
    this.persist();
    this.notify();
  }
}

export const auditLogStore = new AuditLogStore();

export const AUDIT_ACTIONS: AuditAction[] = [
  "Created",
  "Updated",
  "Approved",
  "Rejected",
  "Deleted",
  "Released",
];

export const AUDIT_MODULES: AuditModule[] = [
  "Orders",
  "Payments",
  "Inventory",
  "Pricing",
  "Staff",
  "Walk-in",
  "Attendance",
  "Payment Methods",
  "Shop Content",
];

export const AUDIT_ROLES: AuditRole[] = ["Admin", "Staff", "Customer"];