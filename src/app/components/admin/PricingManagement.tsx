import React, { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Edit2,
  Tag,
  FileText,
  Printer,
  Wallet,
  RotateCcw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  pricingStore,
  PRICING_ITEMS,
  formatPrice,
  type PricingValues,
  type PricingItemSpec,
  type PricingCategory,
} from "../../utils/pricingStore";

const menuItems = adminMenuItems;

const CATEGORY_ORDER: PricingCategory[] = [
  "Color & Black and White",
  "Paper Size",
  "Printing Options",
  "Order Rules",
];

const CATEGORY_ICON: Record<PricingCategory, React.ReactNode> = {
  "Color & Black and White": <Tag className="w-4 h-4 text-[#2F6FD6]" />,
  "Paper Size": <FileText className="w-4 h-4 text-[#2F6FD6]" />,
  "Printing Options": <Printer className="w-4 h-4 text-[#2F6FD6]" />,
  "Order Rules": <Wallet className="w-4 h-4 text-[#2F6FD6]" />,
};

const CATEGORY_BLURB: Record<PricingCategory, string> = {
  "Color & Black and White": "Per-page rates depending on the selected printing mode.",
  "Paper Size": "Per-page surcharges added on top of the base rate for larger paper sizes.",
  "Printing Options": "Savings and options applied across the whole order.",
  "Order Rules": "Order-wide rules used at checkout.",
};

export default function PricingManagement() {
  const [pricing, setPricing] = useState<PricingValues>(pricingStore.getPricing());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [editing, setEditing] = useState<PricingItemSpec | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const load = () => setPricing(pricingStore.getPricing());
    const unsubscribe = pricingStore.subscribe(load);
    return unsubscribe;
  }, []);

  const openEdit = (item: PricingItemSpec) => {
    setEditing(item);
    setEditValue(String(pricing[item.id]));
    setShowResetConfirm(false);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const handleSave = () => {
    if (!editing) return;
    const parsed = Number(editValue);
    if (editValue.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      toast.error("Please enter a valid number (0 or greater)");
      return;
    }
    const ok = pricingStore.updatePricing(editing.id, parsed);
    if (!ok) {
      toast.error(`Could not update ${editing.label}. Please try again.`);
      return;
    }
    toast.success("Pricing updated successfully.");
    closeEdit();
  };

  const confirmReset = () => {
    pricingStore.resetPricing();
    toast.success("Pricing reset to the default values.");
    setShowResetConfirm(false);
  };

  const displayValue = (item: PricingItemSpec) => {
    const value = formatPrice(pricing[item.id]);
    const price = `${item.prefix || ""}${value}`;
    if (item.unit === "₱") return price;
    return `${price} ${item.unit}`;
  };

  return (
    <Layout menuItems={menuItems} title="Pricing Management" showBackButton>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center shrink-0">
              <BadgeDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#10316B]">
                Printing Prices
              </h2>
              <p className="text-gray-600 mt-1">
                Manage the prices customers see and pay. Any change here is
                applied instantly everywhere in the system — new print
                requests and the pricing shown on the landing page.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-11 sm:h-10 w-full sm:w-auto border-[#2F6FD6]/40 text-[#2F6FD6] hover:bg-[#F2F7FF]"
            onClick={() => setShowResetConfirm(true)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Price Groups */}
        {CATEGORY_ORDER.map((category) => {
          const items = PRICING_ITEMS.filter((item) => item.category === category);
          return (
            <Card key={category} className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-8 h-8 rounded-lg bg-[#F2F7FF] flex items-center justify-center shrink-0">
                  {CATEGORY_ICON[category]}
                </span>
                <h3 className="font-bold text-gray-900">{category}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4 ml-10">
                {CATEGORY_BLURB[category]}
              </p>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-[#10316B] whitespace-nowrap">
                        {displayValue(item)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#2F6FD6] border-[#2F6FD6]/40 hover:bg-[#F2F7FF] h-9"
                        onClick={() => openEdit(item)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Informational row — copies are derived, not priced */}
                <div className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">Number of Copies</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Copying has no separate price — the total is the per-page
                      price above multiplied by the number of copies. This is
                      calculated automatically, so it cannot be edited here.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                      per page × copies
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Price Dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              Edit {editing?.label}
            </DialogTitle>
            <DialogDescription>{editing?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pricing-value">Price</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-400">
                  ₱
                </span>
                <Input
                  id="pricing-value"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="0"
                  className="h-11 bg-white text-sm"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {editing?.unit === "₱" ? "" : editing?.unit}
                </span>
              </div>
              {editing?.unit === "₱" && (
                <p className="text-xs text-gray-500">
                  The order total at or above this amount requires a down
                  payment.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={closeEdit}
            >
              Cancel
            </Button>
            <Button
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={handleSave}
            >
              <Edit2 className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirm */}
      <Dialog
        open={showResetConfirm}
        onOpenChange={(open) => {
          if (!open && !editing) setShowResetConfirm(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              Reset pricing to defaults?
            </DialogTitle>
            <DialogDescription>
              This restores all prices to their original values (B&amp;W ₱1.00,
              Colored ₱3.00/₱5.00, Long/Folio/Legal +₱11.00, A3 +₱1.50,
              Double-Sided –₱0.50, down-payment threshold ₱50.00). This applies
              everywhere immediately and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 w-full sm:w-auto"
              onClick={confirmReset}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}