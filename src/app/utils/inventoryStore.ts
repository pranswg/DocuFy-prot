// Centralized inventory store for supply/consumable tracking.
// Persisted to localStorage. Tracks stock in/out and flags low-stock items.

export type InventoryItem = {
  id: string;
  name: string;
  category: string; // e.g. Paper, Ink, School supplies, Add-ons
  brand?: string;
  unit: string; // ream, piece, box, bottle, etc.
  currentStock: number;
  minimumStock: number;
  price?: number; // sell price per unit (used for order add-ons)
  paperSize?: string; // size code for Paper items: 'a4' | 'short' | 'legal' | ...
  pcsPerUnit?: number; // pieces per unit (paper ream = 500); defaults to 1
  archived?: boolean;
  lastUpdated?: string;
};

export type PaperSizeOption = {
  id: string;
  name: string;
  displayName: string;
  inStock: boolean;
};

export type AddonOption = {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  unit: string;
  category: string;
  description: string;
};

type Subscriber = () => void;

class InventoryStore {
  private items: InventoryItem[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (this.initialized) return;

    try {
      const INVENTORY_VERSION = '2.0'; // Increment to force a reset
      const storedVersion = localStorage.getItem('inventoryStoreVersion');
      const stored = localStorage.getItem('inventoryStore');

      if (!stored || storedVersion !== INVENTORY_VERSION) {
        this.items = this.getDefaultItems();
        localStorage.setItem('inventoryStoreVersion', INVENTORY_VERSION);
        this.saveToLocalStorage();
      } else {
        const parsed = JSON.parse(stored);
        this.items = Array.isArray(parsed)
          ? parsed.map(item => this.normalizeItem(item))
          : [];
      }
    } catch (error) {
      console.error('Failed to load inventory from localStorage:', error);
      this.items = this.getDefaultItems();
    }

    this.initialized = true;
  }

  // Backfill pcsPerUnit for existing Paper items that were saved before it
  // existed: a Paper ream is 500 pieces, other paper units default to 1.
  private normalizeItem(item: InventoryItem): InventoryItem {
    if (item.category === 'Paper' && item.pcsPerUnit == null) {
      return { ...item, pcsPerUnit: item.unit === 'ream' ? 500 : 1 };
    }
    return item;
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('inventoryStore', JSON.stringify(this.items));
    } catch (error) {
      console.error('Failed to save inventory to localStorage:', error);
    }
  }

  private getDefaultItems(): InventoryItem[] {
    return [
      { id: 'inv-paper-a4', name: 'Bond Paper (A4)', category: 'Paper', brand: '', unit: 'ream', currentStock: 15, minimumStock: 3, paperSize: 'a4', pcsPerUnit: 500 },
      { id: 'inv-paper-short', name: 'Bond Paper (Short)', category: 'Paper', brand: '', unit: 'ream', currentStock: 12, minimumStock: 3, paperSize: 'short', pcsPerUnit: 500 },
      { id: 'inv-paper-legal', name: 'Bond Paper (Legal)', category: 'Paper', brand: '', unit: 'ream', currentStock: 8, minimumStock: 2, paperSize: 'legal', pcsPerUnit: 500 },
      { id: 'inv-ink-black', name: 'Printer Ink (Black)', category: 'Ink', brand: 'Epson', unit: 'bottle', currentStock: 5, minimumStock: 2, pcsPerUnit: 1 },
      { id: 'inv-ballpen', name: 'Ballpen (Black)', category: 'School supplies', brand: '', unit: 'piece', currentStock: 30, minimumStock: 10, pcsPerUnit: 1 },
      { id: 'inv-staples', name: 'Staples', category: 'Add-ons', brand: '', unit: 'box', currentStock: 15, minimumStock: 4, price: 5, pcsPerUnit: 1, description: 'Box of staples for binding printed sets.' },
    ];
  }

  getItems(): InventoryItem[] {
    this.loadFromLocalStorage();
    return [...this.items];
  }

  getActiveItems(): InventoryItem[] {
    this.loadFromLocalStorage();
    return this.items.filter(item => !item.archived);
  }

  getArchivedItems(): InventoryItem[] {
    this.loadFromLocalStorage();
    return this.items.filter(item => item.archived);
  }

  getItemById(id: string): InventoryItem | undefined {
    this.loadFromLocalStorage();
    return this.items.find(item => item.id === id);
  }

  addItem(item: InventoryItem): void {
    this.loadFromLocalStorage();
    this.items = [...this.items, { ...item, lastUpdated: new Date().toISOString().split('T')[0] }];
    this.saveToLocalStorage();
    this.notify();
  }

  updateItem(id: string, updates: Partial<InventoryItem>): void {
    this.loadFromLocalStorage();
    this.items = this.items.map(item =>
      item.id === id
        ? { ...item, ...updates, lastUpdated: new Date().toISOString().split('T')[0] }
        : item
    );
    this.saveToLocalStorage();
    this.notify();
  }

  archiveItem(id: string): void {
    this.updateItem(id, { archived: true });
  }

  unarchiveItem(id: string): void {
    this.updateItem(id, { archived: false });
  }

  deleteItem(id: string): void {
    this.loadFromLocalStorage();
    this.items = this.items.filter(item => item.id !== id);
    this.saveToLocalStorage();
    this.notify();
  }

  // Stock In (restocking): add quantity
  stockIn(id: string, quantity: number): InventoryItem | undefined {
    if (quantity <= 0) return undefined;
    const item = this.getItemById(id);
    if (!item) return undefined;
    const updated = { ...item, currentStock: item.currentStock + quantity };
    this.updateItem(id, { currentStock: updated.currentStock });
    return updated;
  }

  // Stock Out (usage/sale): deduct quantity, never below zero
  stockOut(id: string, quantity: number): { success: boolean; message: string; item?: InventoryItem } {
    if (quantity <= 0) return { success: false, message: 'Quantity must be greater than zero.' };
    const item = this.getItemById(id);
    if (!item) return { success: false, message: 'Item not found.' };
    if (item.currentStock < quantity) {
      return { success: false, message: `Not enough stock. Only ${item.currentStock} ${item.unit}(s) available.` };
    }
    const updated = { ...item, currentStock: item.currentStock - quantity };
    this.updateItem(id, { currentStock: updated.currentStock });
    return { success: true, message: 'Stock deducted.', item: updated };
  }

  isLowStock(item: InventoryItem): boolean {
    return item.currentStock <= item.minimumStock;
  }

  getLowStockItems(): InventoryItem[] {
    this.loadFromLocalStorage();
    return this.items.filter(item => !item.archived && this.isLowStock(item));
  }

  // Piece count for an item: currentStock (units) x pieces-per-unit (paper ream = 500)
  getItemPieces(item: InventoryItem): number {
    return Math.round(item.currentStock * (item.pcsPerUnit || 1));
  }

  getPaperItems(): InventoryItem[] {
    this.loadFromLocalStorage();
    return this.items.filter(item => !item.archived && item.category === 'Paper');
  }

  getPaperItemBySize(paperSize: string): InventoryItem | undefined {
    this.loadFromLocalStorage();
    return this.items.find(
      item => !item.archived && item.category === 'Paper' && item.paperSize === paperSize
    );
  }

  // Total paper pieces remaining across all paper items (for the inventory card)
  getPapersLeftPieces(): number {
    return this.getPaperItems().reduce(
      (sum, item) => sum + this.getItemPieces(item),
      0
    );
  }

  // Deduct paper pieces for an order, matched by paper size.
  // Returns how many pieces were actually deducted for that size.
  deductPaperPieces(paperSize: string, pieces: number): number {
    if (pieces <= 0) return 0;
    const item = this.getPaperItemBySize(paperSize);
    if (!item) return 0;

    const pcsPerUnit = item.pcsPerUnit || 1;
    const unitsToDeduct = pieces / pcsPerUnit;
    const newStock = Math.max(0, item.currentStock - unitsToDeduct);
    const deductedUnits = item.currentStock - newStock;
    const deductedPieces = Math.round(deductedUnits * pcsPerUnit);

    this.updateItem(item.id, { currentStock: newStock });
    return deductedPieces;
  }

  // Paper size options for the customer order form (from Paper items)
  getPaperSizeOptions(): PaperSizeOption[] {
    this.loadFromLocalStorage();
    return this.items
      .filter(item => !item.archived && item.paperSize)
      .map(item => ({
        id: item.id,
        name: item.paperSize as string,
        displayName: this.paperDisplayName(item.paperSize as string),
        inStock: item.currentStock > 0,
      }));
  }

  // Add-on options for the customer order form (from Add-ons category items)
  getAddons(): AddonOption[] {
    this.loadFromLocalStorage();
    return this.items
      .filter(item => !item.archived && item.category === 'Add-ons')
      .map(item => ({
        id: item.id,
        name: item.name,
        price: item.price || 0,
        inStock: item.currentStock > 0,
        unit: item.unit || 'piece',
        category: 'supplies',
        description: `${item.name} for printing needs`,
      }));
  }

  private paperDisplayName(code: string): string {
    switch (code) {
      case 'a4': return 'A4';
      case 'short': return 'Short (8.5 x 11 in)';
      case 'legal': return 'Legal (8.5 x 14 in)';
      case 'long': return 'Long (8.5 x 13 in)';
      case 'folio': return 'Folio (8.5 x 13 in)';
      case 'a3': return 'A3';
      default: return code;
    }
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const inventoryStore = new InventoryStore();
