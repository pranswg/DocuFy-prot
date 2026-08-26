// Inventory store for tracking inventory items, stock levels, and transactions
import { notificationStore } from './notificationStore';

export type InventoryTransaction = {
  id: string;
  type: 'add' | 'sell' | 'adjust' | 'deduct';
  quantity: number;
  date: Date;
  note?: string;
  orderId?: string; // Reference to order if transaction was from an order
  transactionId?: string; // Reference to walk-in transaction if applicable
};

export type InventoryItem = {
  id: string;
  itemName: string;
  category: string;
  quantityAdded: number;
  quantitySold: number;
  currentStock: number;
  dateAdded: Date;
  archived?: boolean;
  transactions: InventoryTransaction[];
};

type Subscriber = () => void;

class InventoryStore {
  private items: InventoryItem[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  // Initialize from localStorage on first access
  private loadFromLocalStorage(): void {
    if (this.initialized) return;

    try {
      const INVENTORY_VERSION = '3.0'; // Increment this to force inventory reset
      const storedVersion = localStorage.getItem('inventoryStoreVersion');
      const stored = localStorage.getItem('inventoryStore');

      // Reset inventory if version changed or no stored data
      if (!stored || storedVersion !== INVENTORY_VERSION) {
        console.log('Resetting inventory to empty state (version mismatch or first load)');
        this.items = this.getDefaultInventory();
        localStorage.setItem('inventoryStoreVersion', INVENTORY_VERSION);
        this.saveToLocalStorage();
      } else {
        const parsed = JSON.parse(stored);
        this.items = parsed.map((item: any) => ({
          ...item,
          dateAdded: new Date(item.dateAdded),
          transactions: item.transactions.map((t: any) => ({
            ...t,
            date: new Date(t.date),
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to load inventory from localStorage:', error);
      this.items = this.getDefaultInventory();
    }

    this.initialized = true;
  }

  // Get default inventory items
  private getDefaultInventory(): InventoryItem[] {
    return [];
  }

  // Save to localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('inventoryStore', JSON.stringify(this.items));
    } catch (error) {
      console.error('Failed to save inventory to localStorage:', error);
    }
  }

  // Check and send low inventory notifications
  private checkLowInventoryNotification(item: InventoryItem): void {
    // Define thresholds: 100 for paper, 10 for supplies and add-ons
    const threshold = item.category === 'Paper' ? 100 : 10;

    if (item.currentStock <= threshold && !item.archived) {
      // Check if a notification for this item was already sent in the last 24 hours
      const existingNotifications = notificationStore.getNotifications();
      const recentNotification = existingNotifications.find(n =>
        n.type === 'inventory' &&
        n.message.includes(item.itemName) &&
        new Date().getTime() - n.timestamp.getTime() < 24 * 60 * 60 * 1000 // 24 hours
      );

      if (!recentNotification) {
        // Send notification to admin
        notificationStore.addNotification(
          'inventory',
          'Low Inventory Alert',
          `${item.itemName} is running low. Current stock: ${item.currentStock}. Please restock soon.`,
          {
            clickable: true,
            relatedRoute: '/admin/inventory',
            recipientRole: 'admin',
          }
        );

        // Send notification to staff
        notificationStore.addNotification(
          'inventory',
          'Low Inventory Alert',
          `${item.itemName} is running low. Current stock: ${item.currentStock}. Please inform admin.`,
          {
            clickable: true,
            relatedRoute: '/staff/inventory',
            recipientRole: 'staff',
          }
        );
      }
    }
  }

  // Get all inventory items
  getItems(): InventoryItem[] {
    return [...this.items];
  }

  // Get a specific item by ID
  getItem(id: string): InventoryItem | undefined {
    return this.items.find(item => item.id === id);
  }

  // Get item by name and category
  getItemByNameAndCategory(itemName: string, category: string): InventoryItem | undefined {
    return this.items.find(
      item => item.itemName === itemName && item.category === category && !item.archived
    );
  }

  // Add a new inventory item
  addItem(item: Omit<InventoryItem, 'id' | 'currentStock' | 'transactions'>): InventoryItem {
    const newId = `INV-${String(this.items.length + 1).padStart(3, '0')}`;

    const initialTransaction: InventoryTransaction = {
      id: `TXN-${Date.now()}`,
      type: 'add',
      quantity: item.quantityAdded,
      date: new Date(),
      note: 'Initial stock',
    };

    const newItem: InventoryItem = {
      ...item,
      id: newId,
      currentStock: item.quantityAdded - item.quantitySold,
      transactions: [initialTransaction],
    };

    this.items.push(newItem);
    this.saveToLocalStorage();
    this.notify();
    return newItem;
  }

  // Update an existing item
  updateItem(id: string, updates: Partial<InventoryItem>): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updates };
      // Recalculate current stock
      this.items[index].currentStock =
        this.items[index].quantityAdded - this.items[index].quantitySold;
      this.saveToLocalStorage();
      this.notify();
    }
  }

  // Add quantity to an existing item
  addQuantity(id: string, quantity: number, note?: string): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      const transaction: InventoryTransaction = {
        id: `TXN-${Date.now()}`,
        type: 'add',
        quantity,
        date: new Date(),
        note,
      };

      this.items[index].quantityAdded += quantity;
      this.items[index].currentStock += quantity;
      this.items[index].transactions.push(transaction);

      this.saveToLocalStorage();
      this.notify();
    }
  }

  // Deduct quantity from an item (for sales/usage)
  deductQuantity(
    itemName: string,
    category: string,
    quantity: number,
    note?: string,
    orderId?: string,
    transactionId?: string
  ): boolean {
    const item = this.getItemByNameAndCategory(itemName, category);
    if (!item) {
      console.warn(`Item not found: ${itemName} (${category})`);
      return false;
    }

    if (item.currentStock < quantity) {
      console.warn(`Insufficient stock for ${itemName}. Available: ${item.currentStock}, Requested: ${quantity}`);
      return false;
    }

    const index = this.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      const transaction: InventoryTransaction = {
        id: `TXN-${Date.now()}`,
        type: 'deduct',
        quantity,
        date: new Date(),
        note,
        orderId,
        transactionId,
      };

      this.items[index].quantitySold += quantity;
      this.items[index].currentStock -= quantity;
      this.items[index].transactions.push(transaction);

      // Check for low inventory and send notification if needed
      this.checkLowInventoryNotification(this.items[index]);

      this.saveToLocalStorage();
      this.notify();
      return true;
    }

    return false;
  }

  // Reduce quantity (manual adjustment)
  reduceQuantity(id: string, quantity: number, note?: string): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    if (this.items[index].currentStock < quantity) {
      console.warn(`Insufficient stock. Available: ${this.items[index].currentStock}, Requested: ${quantity}`);
      return false;
    }

    const transaction: InventoryTransaction = {
      id: `TXN-${Date.now()}`,
      type: 'adjust',
      quantity: -quantity,
      date: new Date(),
      note,
    };

    this.items[index].quantityAdded -= quantity;
    this.items[index].currentStock -= quantity;
    this.items[index].transactions.push(transaction);

    // Check for low inventory and send notification if needed
    this.checkLowInventoryNotification(this.items[index]);

    this.saveToLocalStorage();
    this.notify();
    return true;
  }

  // Archive an item
  archiveItem(id: string): void {
    this.updateItem(id, { archived: true });
  }

  // Unarchive an item
  unarchiveItem(id: string): void {
    this.updateItem(id, { archived: false });
  }

  // Get transaction history for an item
  getTransactions(id: string): InventoryTransaction[] {
    const item = this.items.find(item => item.id === id);
    return item ? [...item.transactions] : [];
  }

  // Get available stock for a specific item name
  getAvailableStock(itemName: string): number {
    const item = this.items.find(
      item => item.itemName === itemName && !item.archived
    );
    return item ? item.currentStock : 0;
  }

  // Check if item is in stock
  isInStock(itemName: string, requiredQuantity: number = 1): boolean {
    const availableStock = this.getAvailableStock(itemName);
    return availableStock >= requiredQuantity;
  }

  // Calculate totals
  getTotals() {
    const activeItems = this.items.filter(item => !item.archived);
    return {
      totalItems: this.items.length,
      activeItems: activeItems.length,
      totalAdded: activeItems.reduce((sum, item) => sum + item.quantityAdded, 0),
      totalSold: activeItems.reduce((sum, item) => sum + item.quantitySold, 0),
      remainingStock: activeItems.reduce((sum, item) => sum + item.currentStock, 0),
    };
  }

  // Subscribe to changes
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify subscribers
  private notify(): void {
    this.subscribers.forEach(callback => callback());
  }

  // Clear all data (for testing)
  clear(): void {
    this.items = [];
    this.saveToLocalStorage();
    this.notify();
  }

  // Reset to default inventory
  reset(): void {
    this.items = this.getDefaultInventory();
    this.saveToLocalStorage();
    this.notify();
  }
}

// Export singleton instance
export const inventoryStore = new InventoryStore();