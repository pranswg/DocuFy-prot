// Centralized data store for orders and inventory
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
  status: 'Received' | 'In Queue' | 'Printing' | 'Completed' | 'Released' | 'On Hold' | 'Canceled';
  holdReason?: string;
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

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  lastUpdated: string;
  supplier?: string;
  cost?: number;
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

const initialOrders: Order[] = [];

const initialInventory: InventoryItem[] = [];

// In-memory store with event listeners
class DataStore {
  private orders: Order[] = [...initialOrders];
  private inventory: InventoryItem[] = [...initialInventory];
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

  // Inventory methods
  getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  getInventoryById(id: string): InventoryItem | undefined {
    return this.inventory.find(item => item.id === id);
  }

  addInventoryItem(item: InventoryItem) {
    this.inventory.push(item);
    this.notify();
  }

  updateInventoryItem(id: string, updates: Partial<InventoryItem>) {
    const index = this.inventory.findIndex(item => item.id === id);
    if (index !== -1) {
      this.inventory[index] = {
        ...this.inventory[index],
        ...updates,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
      this.notify();
    }
  }

  deleteInventoryItem(id: string) {
    this.inventory = this.inventory.filter(item => item.id !== id);
    this.notify();
  }

  getLowStockItems(): InventoryItem[] {
    return this.inventory.filter(item => item.quantity <= item.reorderLevel);
  }

  // Get stock status for an item
  getStockStatus(item: InventoryItem): 'in-stock' | 'low-stock' | 'critical' {
    const percentageOfReorder = item.quantity / item.reorderLevel;

    if (item.quantity <= item.reorderLevel * 0.5) {
      return 'critical'; // 50% or less of reorder level
    } else if (item.quantity <= item.reorderLevel) {
      return 'low-stock'; // At or below reorder level
    }
    return 'in-stock'; // Above reorder level
  }

  // Get stock status label
  getStockStatusLabel(item: InventoryItem): string {
    const status = this.getStockStatus(item);
    if (status === 'critical') return 'Critical Stock';
    if (status === 'low-stock') return 'Low Stock';
    return 'In Stock';
  }

  // Get stock status color class
  getStockStatusColor(item: InventoryItem): string {
    const status = this.getStockStatus(item);
    if (status === 'critical') return 'bg-red-100 text-red-800 border-red-300';
    if (status === 'low-stock') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-green-100 text-green-800 border-green-300';
  }

  // Get available paper sizes from inventory (for customer order form)
  getAvailablePaperSizes(): Array<{ id: string; name: string; displayName: string; inStock: boolean }> {
    return [
      { id: 'paper-a4', name: 'a4', displayName: 'A4', inStock: true },
      { id: 'paper-short', name: 'short', displayName: 'Short (8.5 x 11 in)', inStock: true },
      { id: 'paper-long', name: 'long', displayName: 'Long (8.5 x 13 in)', inStock: true },
      { id: 'paper-folio', name: 'folio', displayName: 'Folio (8.5 x 13 in)', inStock: true },
    ];
  }

  // Get available add-ons from inventory (for customer order form)
  getAvailableAddons(): Array<{
    id: string;
    name: string;
    price: number;
    inStock: boolean;
    unit: string;
    category: string;
    description: string;
  }> {
    const addonItems = this.inventory.filter(item => item.category === 'Add-ons' && !item.archived);
    return addonItems.map(item => ({
      id: item.id,
      name: item.name,
      price: item.cost || 0,
      inStock: item.quantity > 0,
      unit: item.unit || 'piece',
      category: 'supplies',
      description: `${item.name} for printing needs`
    }));
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