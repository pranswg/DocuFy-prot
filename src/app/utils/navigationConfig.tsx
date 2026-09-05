// Sectioned navigation model for the EXISTING single sidebar.
// The sidebar stays one component; its items are grouped under three section
// headings (MAIN / OPERATIONS / MANAGEMENT). The OPERATIONS and MANAGEMENT
// sections each contain a single expandable parent row (Operations,
// Management) whose children render inline underneath it inside this same
// sidebar — never in a second panel. Customers keep the legacy flat menu.
import React from "react";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  ShoppingCart,
  Boxes,
  ClipboardList,
  SlidersHorizontal,
} from "lucide-react";

export type NavChild = {
  label: string;
  path: string;
};

export type NavModule = {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: NavChild[];
};

export type NavSection = {
  key: string;
  label: string;
  items: NavModule[];
};

export const pathBase = (path: string) => path.split("?")[0];

export const childPathMatches = (
  child: NavChild,
  pathname: string,
  search: string,
): boolean => {
  const qIndex = child.path.indexOf("?");
  const base = qIndex === -1 ? child.path : child.path.slice(0, qIndex);
  if (pathname !== base) return false;
  if (qIndex === -1) return true;
  return search === child.path.slice(qIndex);
};

export const findActiveModule = (
  modules: NavModule[],
  pathname: string,
  search: string,
): NavModule | undefined =>
  modules.find((module) => {
    if (module.children && module.children.length > 0) {
      return module.children.some((child) =>
        childPathMatches(child, pathname, search),
      );
    }
    const base = pathBase(module.path);
    return pathname === base || pathname.startsWith(`${base}/`);
  });

export const flattenSections = (sections: NavSection[]): NavModule[] =>
  sections.flatMap((section) => section.items);

// ─── Admin modules ───────────────────────────────────────────────────────────
// MAIN (first-level, directly accessible — Orders and Payment Verification are
// frequently used, so they stay as direct destinations near the top).
const dashboard = {
  label: "Dashboard",
  path: "/admin/dashboard",
  icon: <LayoutDashboard className="w-5 h-5" />,
};

const orders = {
  label: "Orders",
  path: "/admin/orders",
  icon: <Package className="w-5 h-5" />,
};

const paymentVerification = {
  label: "Payment Verification",
  path: "/admin/payment-verification",
  icon: <CreditCard className="w-5 h-5" />,
};

const walkIn = {
  label: "Walk-in Transactions",
  path: "/admin/walk-in",
  icon: <ShoppingCart className="w-5 h-5" />,
};

const inventory = {
  label: "Inventory",
  path: "/admin/inventory",
  icon: <Boxes className="w-5 h-5" />,
};

// OPERATIONS (expandable parent, children render inline in the same sidebar).
const operations = {
  label: "Operations",
  path: "/admin/attendance",
  icon: <ClipboardList className="w-5 h-5" />,
  children: [
    { label: "Attendance", path: "/admin/attendance" },
    { label: "Job Board", path: "/admin/job-board" },
  ],
};

// MANAGEMENT (expandable parent, children render inline in the same sidebar).
const management = {
  label: "Management",
  path: "/admin/staff",
  icon: <SlidersHorizontal className="w-5 h-5" />,
  children: [
    { label: "Staff", path: "/admin/staff" },
    { label: "Payment Methods", path: "/admin/payment-methods" },
    { label: "Pricing Management", path: "/admin/pricing" },
    { label: "Content Management", path: "/admin/content" },
  ],
};

export const adminSections: NavSection[] = [
  {
    key: "main",
    label: "MAIN",
    items: [dashboard, orders, paymentVerification, walkIn, inventory],
  },
  { key: "operations", label: "OPERATIONS", items: [operations] },
  { key: "management", label: "MANAGEMENT", items: [management] },
];

// ─── Staff modules (same structure; admin-only items are not exposed) ────────
const staffDashboard = {
  label: "Dashboard",
  path: "/staff/dashboard",
  icon: <LayoutDashboard className="w-5 h-5" />,
};

const staffOrders = {
  label: "Orders",
  path: "/staff/queue",
  icon: <Package className="w-5 h-5" />,
};

const staffPaymentVerification = {
  label: "Payment Verification",
  path: "/staff/payment-verification",
  icon: <CreditCard className="w-5 h-5" />,
};

const staffWalkIn = {
  label: "Walk-in Transactions",
  path: "/staff/walk-in",
  icon: <ShoppingCart className="w-5 h-5" />,
};

const staffInventory = {
  label: "Inventory",
  path: "/staff/inventory",
  icon: <Boxes className="w-5 h-5" />,
};

// Staff's Operations parent holds the timesheet (staff attendance workflow).
const staffOperations = {
  label: "Operations",
  path: "/staff/timesheet",
  icon: <ClipboardList className="w-5 h-5" />,
  children: [{ label: "Clock-In & Timesheet", path: "/staff/timesheet" }],
};

export const staffSections: NavSection[] = [
  {
    key: "main",
    label: "MAIN",
    items: [
      staffDashboard,
      staffOrders,
      staffPaymentVerification,
      staffWalkIn,
      staffInventory,
    ],
  },
  { key: "operations", label: "OPERATIONS", items: [staffOperations] },
];