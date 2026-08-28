// Shared admin sidebar menu items — import this in every admin page
// so the navigation stays consistent whenever items are added/removed.
import React from "react";
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Users,
  Briefcase,
  Settings,
  ShoppingCart,
} from "lucide-react";

export const adminMenuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Payment Verification",
    path: "/admin/payment-verification",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    label: "Orders",
    path: "/admin/orders",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Walk-in Transactions",
    path: "/admin/walk-in",
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    label: "Staff",
    path: "/admin/staff",
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: "Job Board",
    path: "/admin/job-board",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    label: "Content Management",
    path: "/admin/content",
    icon: <Settings className="w-5 h-5" />,
  },
];