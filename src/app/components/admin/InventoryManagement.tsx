import React, { useState, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  PackagePlus,
  PackageMinus,
  Pencil,
  Archive,
  RotateCcw,
  Plus,
  Search,
  Inbox,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  inventoryStore,
  type InventoryItem,
} from "../../utils/inventoryStore";
import { formatNumber } from "../../utils/formatNumber";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";

const CATEGORIES = [
  "Paper",
  "Ink",
  "School supplies",
  "Add-ons",
  "Other",
];

const UNIT_OPTIONS = ["ream", "piece", "box", "bottle", "pack", "roll"];

type StockDialogState =
  | { type: "in" | "out"; item: InventoryItem }
  | null;

export default function InventoryManagement() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [stockDialog, setStockDialog] = useState<StockDialogState>(null);

  // Add / edit form state
  const [form, setForm] = useState({
    name: "",
    category: "Paper",
    brand: "",
    unit: "ream",
    currentStock: 0,
    minimumStock: 0,
    paperSize: "",
    price: 0,
  });

  // Stock dialog state
  const [stockQty, setStockQty] = useState<number>(1);
  const [stockNote, setStockNote] = useState("");

  const loadItems = () => {
    setItems(
      showArchived
        ? inventoryStore.getArchivedItems()
        : inventoryStore.getActiveItems(),
    );
  };

  useEffect(() => {
    loadItems();
    const unsubscribe = inventoryStore.subscribe(loadItems);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const lowStockCount = inventoryStore.getLowStockItems().length;
  const paperItems = inventoryStore.getPaperItems();
  const papersLeftReams = paperItems.reduce(
    (sum, item) => sum + item.currentStock,
    0,
  );

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.brand || "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setForm({
      name: "",
      category: "Paper",
      brand: "",
      unit: "ream",
      currentStock: 0,
      minimumStock: 0,
      paperSize: "",
      price: 0,
    });
    setShowAddDialog(true);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      name: item.name,
      category: item.category,
      brand: item.brand || "",
      unit: item.unit,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      paperSize: item.paperSize || "",
      price: item.price || 0,
    });
    setEditItem(item);
  };

  const openStock = (type: "in" | "out", item: InventoryItem) => {
    setStockQty(1);
    setStockNote("");
    setStockDialog({ type, item });
  };

  const saveItem = () => {
    if (!form.name.trim()) {
      toast.error("Item name is required.");
      return;
    }
    const currentStock = Math.max(0, Number(form.currentStock) || 0);
    const minimumStock = Math.max(0, Number(form.minimumStock) || 0);
    const price =
      form.category === "Add-ons" ? Math.max(0, Number(form.price) || 0) : 0;
    const paperSize =
      form.category === "Paper" ? form.paperSize.trim() : "";
    const pcsPerUnit =
      form.category === "Paper"
        ? form.unit === "ream"
          ? 500
          : editItem?.pcsPerUnit || 1
        : undefined;

    if (editItem) {
      inventoryStore.updateItem(editItem.id, {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim(),
        unit: form.unit || "piece",
        currentStock,
        minimumStock,
        price,
        paperSize,
        pcsPerUnit,
      });
      toast.success("Item updated successfully.");
    } else {
      const id = `inv-${Date.now()}`;
      inventoryStore.addItem({
        id,
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim(),
        unit: form.unit || "piece",
        currentStock,
        minimumStock,
        price,
        paperSize,
        pcsPerUnit,
      });
      toast.success("Item added to inventory.");
    }

    setShowAddDialog(false);
    setEditItem(null);
  };

  const submitStock = () => {
    if (!stockDialog) return;
    const { type, item } = stockDialog;
    const qty = Math.floor(Number(stockQty)) || 0;

    if (qty <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }

    if (type === "in") {
      inventoryStore.stockIn(item.id, qty);
      toast.success(
        `Stocked in ${qty} ${item.unit}(s) to ${item.name}.`,
      );
    } else {
      const result = inventoryStore.stockOut(item.id, qty);
      if (result.success) {
        toast.success(`Stocked out ${qty} ${item.unit}(s) from ${item.name}.`);
      } else {
        toast.error(result.message);
      }
    }

    setStockDialog(null);
  };

  const toggleArchive = (item: InventoryItem) => {
    if (item.archived) {
      inventoryStore.unarchiveItem(item.id);
      toast.success(`${item.name} restored.`);
    } else {
      inventoryStore.archiveItem(item.id);
      toast.success(`${item.name} archived.`);
    }
  };

  const statusBadge = (item: InventoryItem) => {
    if (item.currentStock <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (item.currentStock <= item.minimumStock) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          <AlertTriangle className="w-3 h-3" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        In Stock
      </span>
    );
  };

  const lowStockItems = inventoryStore.getLowStockItems();

  return (
    <Layout menuItems={adminMenuItems} title="Inventory Management">
      <div className="space-y-6">
        {/* Low Stock Banner */}
        {lowStockItems.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">
                  Low Stock Alert
                </p>
                <p className="text-xs text-amber-700">
                  {lowStockItems.length} item
                  {lowStockItems.length > 1 ? "s" : ""} at or below the minimum
                  reorder level. Consider restocking.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {lowStockItems.slice(0, 4).map((item) => (
                <Badge
                  key={item.id}
                  className="bg-white text-amber-800 border border-amber-300"
                >
                  {item.name}: {item.currentStock} {item.unit}
                </Badge>
              ))}
              {lowStockItems.length > 4 && (
                <Badge className="bg-white text-amber-800 border border-amber-300">
                  +{lowStockItems.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Papers Left Card */}
        <Card className="p-6 bg-white border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-[#2F6FD6]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Papers Left
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">
                    {formatNumber(papersLeftReams, 2)}
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    reams left
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {paperItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {item.name}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {formatNumber(inventoryStore.getItemPieces(item), 0)} pcs
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-[#2F6FD6]">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Items
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {inventoryStore.getActiveItems().length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  Low Stock
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockCount}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="pl-9 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 rounded-lg"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowArchived(false)}
              className={!showArchived ? "bg-[#2F6FD6] text-white hover:bg-[#2557b8]" : "bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"}
            >
              Active
            </Button>
            <Button
              type="button"
              onClick={() => setShowArchived(true)}
              className={showArchived ? "bg-[#2F6FD6] text-white hover:bg-[#2557b8]" : "bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"}
            >
              Archived
            </Button>
            <Button
              onClick={openAdd}
              className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>

        {/* Items Table */}
        <Card className="bg-white border border-slate-100 shadow-sm overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center">
              <Boxes className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-600">
                {showArchived
                  ? "No archived items."
                  : "No inventory items yet. Add your first item."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Item
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Category
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Unit
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Stock
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Min Stock
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        {item.brand && (
                          <p className="text-xs text-slate-400">{item.brand}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline">{item.category}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-600 capitalize">
                        {item.unit}
                      </td>
                      <td className="px-5 py-3">
                        {item.category === "Paper" && item.pcsPerUnit ? (
                          <>
                            <span className="font-bold text-slate-900">
                              {formatNumber(
                                inventoryStore.getItemPieces(item),
                                0,
                              )}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">
                              pcs ({formatNumber(item.currentStock, 2)}{" "}
                              {item.unit}s)
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {formatNumber(item.currentStock, 2)}
                          </span>
                        )}
                        {item.currentStock <= item.minimumStock && (
                          <span className="ml-1 text-amber-600">
                            <AlertTriangle className="inline h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {item.minimumStock}
                      </td>
                      <td className="px-5 py-3">{statusBadge(item)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Stock In"
                            onClick={() => openStock("in", item)}
                          >
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Stock Out"
                            onClick={() => openStock("out", item)}
                          >
                            <PackageMinus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Edit"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            title={item.archived ? "Restore" : "Archive"}
                            onClick={() => toggleArchive(item)}
                          >
                            {item.archived ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add / Edit Item Dialog */}
      <Dialog open={showAddDialog || editItem !== null} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setEditItem(null); } }}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {editItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? "Update the details of this inventory item."
                : "Add a new supply or consumable item."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Item / Supply Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Bond Paper (A4)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brand (optional)</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Epson"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unit</Label>
                <Select
                  value={form.unit}
                  onValueChange={(value) => setForm({ ...form, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u} className="capitalize">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.category === "Paper" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Paper Size</Label>
                  <Select
                    value={form.paperSize}
                    onValueChange={(value) => setForm({ ...form, paperSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="folio">Folio</SelectItem>
                      <SelectItem value="a3">A3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : form.category === "Add-ons" ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sell Price (₱)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Minimum Stock / Reorder Level
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.minimumStock}
                  onChange={(e) => setForm({ ...form, minimumStock: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveItem}
              className="bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
            >
              {editItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock In / Out Dialog */}
      <Dialog open={stockDialog !== null} onOpenChange={(open) => { if (!open) setStockDialog(null); }}>
        <DialogContent className="max-w-md bg-white">
          {stockDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {stockDialog.type === "in" ? "Stock In" : "Stock Out"} —{" "}
                  {stockDialog.item.name}
                </DialogTitle>
                <DialogDescription>
                  {stockDialog.type === "in"
                    ? "Record a restocking action to add quantity."
                    : "Record usage or sale to deduct quantity."}
                </DialogDescription>
              </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-600">
                Current stock:{" "}
                <span className="font-bold text-slate-900">
                  {stockDialog?.item.category === "Paper" &&
                  stockDialog?.item.pcsPerUnit
                    ? `${formatNumber(
                        inventoryStore.getItemPieces(stockDialog?.item),
                        0,
                      )} pcs (${formatNumber(
                        stockDialog?.item.currentStock,
                        2,
                      )} ${stockDialog?.item.unit}s)`
                    : `${formatNumber(
                        stockDialog?.item.currentStock,
                        2,
                      )} ${stockDialog?.item.unit}(s)`}
                </span>
              </p>
              <p className="text-slate-500">
                Minimum stock: {stockDialog?.item.minimumStock}{" "}
                {stockDialog?.item.unit}(s)
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Quantity to {stockDialog?.type === "in" ? "add" : "deduct"}
              </Label>
              <Input
                type="number"
                min="1"
                value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Note (optional)</Label>
              <Input
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
                placeholder={
                  stockDialog?.type === "in"
                    ? "e.g. Restocked from supplier"
                    : "e.g. Used for customer order"
                }
              />
            </div>
          </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setStockDialog(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitStock}
                  className={
                    stockDialog.type === "in"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
                  }
                >
                  {stockDialog.type === "in" ? "Stock In" : "Stock Out"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
