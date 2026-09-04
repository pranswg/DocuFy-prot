import React, { Fragment, useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Package,
  Briefcase,
  Clock,
  ShoppingCart,
  CreditCard,
  Boxes,
  Bell,
  BellRing,
  BadgeDollarSign,
  Wrench,
  Info,
  Sparkles,
  Megaphone,
  AlertTriangle,
  AlertOctagon,
  Plus,
  Trash2,
  CheckCheck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
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
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  announcementsStore,
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  type Announcement,
  type AnnouncementType,
  type AnnouncementPriority,
} from "../../utils/announcementsStore";
import {
  notificationStore,
  type Notification,
} from "../../utils/notificationStore";
import {
  AnnouncementDetailsModal,
  type AnnouncementDetailData,
} from "./AnnouncementDetailsModal";
import { toPHT, toPHTKey, formatPHTime } from "../../utils/pht";

const customerMenuItems = [
  {
    label: "Dashboard",
    path: "/customer/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Print Request",
    path: "/customer/new-request",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    label: "My Orders",
    path: "/customer/orders",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Job Board",
    path: "/customer/job-board",
    icon: <Briefcase className="w-5 h-5" />,
  },
];

const staffMenuItems = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Clock-In & Timesheet",
    path: "/staff/timesheet",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    label: "Walk-in Transactions",
    path: "/staff/walk-in",
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    label: "Payment Verification",
    path: "/staff/payment-verification",
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    label: "Orders",
    path: "/staff/queue",
    icon: <Package className="w-5 h-5" />,
  },
  {
    label: "Inventory",
    path: "/staff/inventory",
    icon: <Boxes className="w-5 h-5" />,
  },
];

// What an announcement is about — shown as a small type label where useful.
const TYPE_ICON: Record<
  AnnouncementType,
  React.ComponentType<{ className?: string }>
> = {
  announcement: Megaphone,
  pricing: BadgeDollarSign,
  maintenance: Wrench,
  reminder: Info,
  promo: Sparkles,
};

const NOTIF_TYPE_LABEL: Record<Notification["type"], string> = {
  order: "Order",
  payment: "Payment",
  status_update: "Status Update",
  inventory: "Inventory Alert",
};

const NOTIF_PRIORITY_LABEL = (
  p?: Notification["priority"],
): string | undefined => {
  if (p === "important") return "Important";
  if (p === "emergency") return "Emergency";
  return undefined;
};

type FeedCategory = "announcements" | "orders" | "inventory";
type FilterKey = "all" | "unread" | FeedCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcements", label: "Announcements" },
  { key: "orders", label: "Orders" },
];

// Inventory is an INTERNAL operational module — only admin and staff may see
// inventory-related functionality. Customers never get an Inventory filter.
const STAFF_FILTERS: { key: FilterKey; label: string }[] = [
  ...FILTERS,
  { key: "inventory", label: "Inventory" },
];

type FeedItem = {
  key: string;
  kind: "announcement" | "notification";
  category: FeedCategory;
  source: Announcement | Notification;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority?: "important" | "emergency";
  priorityLabel?: string;
  typeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  markRead: () => void;
  open: () => void;
  action?: { label: string; run: () => void } | null;
};

function PriorityBadge({ priority }: { priority: "important" | "emergency" }) {
  const emergency = priority === "emergency";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
        emergency
          ? "bg-red-50 text-red-600 border border-red-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {emergency ? (
        <AlertOctagon className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      {priority}
    </span>
  );
}

const FILTER_EMPTY_TEXT: Record<FilterKey, string> = {
  all: "No notifications yet",
  unread: "No unread notifications",
  announcements: "No announcements",
  orders: "No order updates",
  inventory: "No inventory alerts",
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const email = user?.email || "";
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [detail, setDetail] = useState<AnnouncementDetailData | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("regular");
  const [recipients, setRecipients] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  useEffect(() => {
    const load = () =>
      setAnnouncements(announcementsStore.getAnnouncementsFor(email));
    load();
    const unsubscribe = announcementsStore.subscribe(load);
    return unsubscribe;
  }, [email]);

  useEffect(() => {
    const load = () =>
      setNotifications(
        notificationStore.getNotifications(user?.role, user?.email),
      );
    load();
    const unsubscribe = notificationStore.subscribe(load);
    return unsubscribe;
  }, [user?.role, user?.email]);

  const menuItems =
    user?.role === "admin"
      ? adminMenuItems
      : user?.role === "staff"
        ? staffMenuItems
        : customerMenuItems;

  // ── Opening a notification → mark read + open the shared detail modal ──────
  const runNotificationAction = (n: Notification) => {
    if (n.type === "inventory" && user) {
      navigate(
        user.role === "staff" ? "/staff/inventory" : "/admin/inventory",
      );
      return;
    }
    if (n.relatedOrderId && user) {
      if (user.role === "customer") {
        navigate(`/customer/track/${n.relatedOrderId}`);
      } else {
        navigate(
          `/${user.role}/orders?orderId=${encodeURIComponent(n.relatedOrderId)}`,
        );
      }
      return;
    }
    if (n.relatedRoute) navigate(n.relatedRoute);
  };

  const notificationDestination = (
    n: Notification,
  ): { label: string; run: () => void } | null => {
    if (!user) return null;
    if (n.type === "inventory")
      return { label: "View Inventory", run: () => runNotificationAction(n) };
    if (n.relatedOrderId)
      return { label: "View Order", run: () => runNotificationAction(n) };
    if (n.relatedRoute)
      return { label: "Go to Page", run: () => runNotificationAction(n) };
    return null;
  };

  const openAnnouncement = (a: Announcement) => {
    announcementsStore.markRead(a.id, email);
    setDetail({
      title: a.title,
      message: a.message,
      timestamp: new Date(a.sentAt),
      priority:
        a.priority === "emergency"
          ? "emergency"
          : a.priority === "important"
            ? "important"
            : undefined,
      typeLabel: ANNOUNCEMENT_TYPE_LABELS[a.type],
      priorityLabel:
        a.priority !== "regular"
          ? ANNOUNCEMENT_PRIORITY_LABELS[a.priority]
          : undefined,
      action: null,
    });
  };

  const openNotification = (n: Notification) => {
    notificationStore.markAsRead(n.id);
    setDetail({
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      priority:
        n.priority === "emergency"
          ? "emergency"
          : n.priority === "important"
            ? "important"
            : undefined,
      typeLabel: NOTIF_TYPE_LABEL[n.type],
      priorityLabel: NOTIF_PRIORITY_LABEL(n.priority),
      action: notificationDestination(n),
    });
  };

  const notificationMeta = (n: Notification) => {
    if (n.type === "inventory") {
      return n.priority === "emergency"
        ? { icon: AlertOctagon, bg: "bg-red-50 text-red-600" }
        : { icon: Boxes, bg: "bg-amber-50 text-amber-600" };
    }
    switch (n.type) {
      case "payment":
        return { icon: AlertTriangle, bg: "bg-yellow-50 text-yellow-600" };
      case "status_update":
        return { icon: CheckCircle, bg: "bg-blue-50 text-[#1D73EC]" };
      case "order":
      default:
        return { icon: Package, bg: "bg-blue-50 text-[#1D73EC]" };
    }
  };

  // ── One unified feed: announcements + system notifications, newest first ───
  const feed: FeedItem[] = [];
  for (const a of announcements) {
    const isEmergency = a.priority === "emergency";
    const isImportant = a.priority === "important";
    const meta = isEmergency
      ? { icon: AlertTriangle, bg: "bg-red-50 text-red-600" }
      : isImportant
        ? { icon: AlertTriangle, bg: "bg-amber-50 text-amber-600" }
        : { icon: TYPE_ICON[a.type], bg: "bg-blue-50 text-[#1D73EC]" };
    feed.push({
      key: a.id,
      kind: "announcement",
      category: "announcements",
      source: a,
      title: a.title,
      message: a.message,
      timestamp: new Date(a.sentAt),
      read: a.readBy.includes(email),
      priority: isEmergency ? "emergency" : isImportant ? "important" : undefined,
      priorityLabel:
        a.priority !== "regular"
          ? ANNOUNCEMENT_PRIORITY_LABELS[a.priority]
          : undefined,
      typeLabel: ANNOUNCEMENT_TYPE_LABELS[a.type],
      icon: meta.icon,
      iconBg: meta.bg,
      markRead: () => announcementsStore.markRead(a.id, email),
      open: () => openAnnouncement(a),
      action: null,
    });
  }
  for (const n of notifications) {
    // Inventory alerts are internal (staff/admin only) — never render them to
    // customers, even defensively.
    if (n.type === "inventory" && user?.role === "customer") continue;
    const meta = notificationMeta(n);
    feed.push({
      key: n.id,
      kind: "notification",
      category: n.type === "inventory" ? "inventory" : "orders",
      source: n,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read,
      priority:
        n.priority === "emergency"
          ? "emergency"
          : n.priority === "important"
            ? "important"
            : undefined,
      priorityLabel: NOTIF_PRIORITY_LABEL(n.priority),
      typeLabel: NOTIF_TYPE_LABEL[n.type],
      icon: meta.icon,
      iconBg: meta.bg,
      markRead: () => notificationStore.markAsRead(n.id),
      open: () => openNotification(n),
      action: notificationDestination(n),
    });
  }
  feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const unread = feed.filter((item) => !item.read).length;

  const filtered = feed.filter((item) => {
    switch (filter) {
      case "unread":
        return !item.read;
      case "announcements":
        return item.category === "announcements";
      case "orders":
        return item.category === "orders";
      case "inventory":
        return item.category === "inventory";
      default:
        return true;
    }
  });

  // Group the filtered feed by Philippines date (TODAY / YESTERDAY / SEPT 3 …).
  const today = toPHT(new Date());
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );
  const sameDay = (p: Date, d: Date) =>
    p.getFullYear() === d.getFullYear() &&
    p.getMonth() === d.getMonth() &&
    p.getDate() === d.getDate();
  const groupMap = new Map<string, { label: string; items: FeedItem[] }>();
  for (const item of filtered) {
    const key = toPHTKey(item.timestamp);
    if (!groupMap.has(key)) {
      const pht = toPHT(item.timestamp);
      const label = sameDay(pht, today)
        ? "Today"
        : sameDay(pht, yesterday)
          ? "Yesterday"
          : pht
              .toLocaleDateString("en-US", { month: "long", day: "numeric" })
              .toUpperCase();
      groupMap.set(key, { label, items: [] });
    }
    groupMap.get(key)!.items.push(item);
  }
  const groups = [...groupMap.entries()].map(([id, g]) => ({
    id,
    label: g.label,
    items: g.items,
  }));

  const handleMarkAllRead = () => {
    announcementsStore.markAllRead(email);
    notificationStore.markAllAsRead(user?.role, user?.email);
    toast.success("All notifications marked as read");
  };

  const handleSend = () => {
    if (!title.trim()) {
      toast.error("Please enter a notification title");
      return;
    }
    if (!message.trim()) {
      toast.error("Please write a message for the notification");
      return;
    }
    announcementsStore.createAnnouncement({
      title: title.trim(),
      message: message.trim(),
      type: "announcement",
      priority,
      sentBy: email,
    });
    toast.success(
      priority === "regular"
        ? "Notification sent to all users."
        : `${ANNOUNCEMENT_PRIORITY_LABELS[priority]} announcement sent to all users.`,
    );
    setShowCreate(false);
    setTitle("");
    setMessage("");
    setPriority("regular");
    setRecipients("all");
    setShowSendConfirm(false);
  };

  const renderItem = (item: FeedItem, last: boolean) => {
    const isEmergency = item.priority === "emergency";
    const isImportant = item.priority === "important";
    const rowBg = isEmergency
      ? "bg-red-50/30"
      : isImportant
        ? "bg-amber-50/20"
        : !item.read
          ? "bg-blue-50/20"
          : "";
    const leftBorder = isEmergency
      ? "border-l-2 border-l-red-400"
      : isImportant
        ? "border-l-2 border-l-amber-400"
        : "";
    return (
      <div
        key={item.key}
        role="button"
        tabIndex={0}
        className={`group flex items-start gap-3 px-3.5 sm:px-5 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${rowBg} ${leftBorder} ${last ? "" : "border-b border-gray-50"}`}
        onClick={item.open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            item.open();
          }
        }}
      >
        <div
          className={`w-8 h-8 ${item.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}
        >
          <item.icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          {(item.priorityLabel || item.kind === "announcement") && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.priorityLabel && (
                <PriorityBadge
                  priority={item.priority as "important" | "emergency"}
                />
              )}
              {item.kind === "announcement" && (
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  {item.typeLabel}
                </span>
              )}
            </div>
          )}
          <p
            className={`text-sm mt-0.5 leading-snug ${item.read ? "font-medium text-gray-800" : "font-bold text-gray-900"}`}
          >
            {item.title}
          </p>
          <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1 leading-snug">
            {item.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-gray-400">
              {formatPHTime(item.timestamp)}
            </span>
            {item.action && (
              <button
                type="button"
                className="text-[11px] font-semibold text-[#1D73EC] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  item.markRead();
                  item.action?.run();
                }}
              >
                {item.action.label}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 mt-1">
          {!item.read && (
            <span
              className={`w-2 h-2 rounded-full ${isEmergency ? "bg-red-500" : isImportant ? "bg-amber-500" : "bg-[#1D73EC]"}`}
            />
          )}
          {isAdmin && item.kind === "announcement" && (
            <button
              type="button"
              title="Delete notification"
              aria-label={`Delete ${item.title}`}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(item.source as Announcement);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout menuItems={menuItems} title="Notifications">
      <div className="mx-auto max-w-3xl space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#10316B]">
              Notifications
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Announcements and updates from Docufy.
              {isAdmin && " Send announcements to everyone in the system."}
            </p>
          </div>
          {isAdmin && (
            <Button
              className="h-10 bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Notification
            </Button>
          )}
        </div>

        {/* Unread count + mark all read */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#1D73EC] text-white text-xs font-bold">
              {unread}
            </span>
            unread notification{unread === 1 ? "" : "s"}
          </p>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2F6FD6] hover:text-[#1D73EC] transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(user?.role === "customer" ? FILTERS : STAFF_FILTERS).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "bg-[#1D73EC] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#1D73EC]/40 hover:text-[#1D73EC]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Unified feed */}
        {feed.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-14 px-6 text-center">
            <div className="w-12 h-12 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-[#1D73EC]/40" />
            </div>
            <p className="text-sm font-semibold text-gray-700">
              No notifications yet
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Announcements and order updates will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-12 px-6 text-center">
            <p className="text-sm font-semibold text-gray-700">
              {FILTER_EMPTY_TEXT[filter]}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Adjust your filter to see more notifications.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            {groups.map((group) => (
              <Fragment key={group.id}>
                <div className="px-4 sm:px-5 pt-4 pb-2.5 border-b border-gray-100">
                  <span className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {group.label}
                    </span>
                    <span className="flex-1 h-px bg-gray-100" />
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.items.map((item, i) =>
                    renderItem(item, i === group.items.length - 1),
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Shared Announcement Details Modal — same one used across Docufy */}
      <AnnouncementDetailsModal
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        announcement={detail}
      />

      {/* Create Notification Dialog (Admin) */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setTitle("");
            setMessage("");
            setPriority("regular");
            setRecipients("all");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <DialogTitle className="text-[#10316B]">
                Create Notification
              </DialogTitle>
            </div>
            <DialogDescription>
              This announcement will be sent to all users across the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title"
                className="h-11 bg-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-message">Message</Label>
              <Textarea
                id="notif-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement..."
                className="min-h-32 bg-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as AnnouncementPriority)
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Notification</SelectItem>
                  <SelectItem value="important">
                    Important Announcement
                  </SelectItem>
                  <SelectItem value="emergency">
                    Emergency Announcement
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                {priority === "regular" &&
                  "Normal system notification — appears in the unified notifications list."}
                {priority === "important" &&
                  "Highlighted announcement — shown with an Important badge in the list."}
                {priority === "emergency" &&
                  "Critical announcement — shown with an Emergency badge at the top of the list."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select value={recipients} onValueChange={setRecipients}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button
              className={`h-11 w-full sm:w-auto ${
                priority === "emergency"
                  ? "bg-red-600 hover:bg-red-700"
                  : priority === "important"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              }`}
              onClick={() => setShowSendConfirm(true)}
            >
              {priority === "emergency" ? (
                <AlertOctagon className="w-4 h-4 mr-2" />
              ) : priority === "important" ? (
                <AlertTriangle className="w-4 h-4 mr-2" />
              ) : (
                <Megaphone className="w-4 h-4 mr-2" />
              )}
              Send{" "}
              {ANNOUNCEMENT_PRIORITY_LABELS[priority]} Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Notification Confirmation */}
      {deleteTarget && (
        <ConfirmationDialog
          open
          onOpenChange={() => setDeleteTarget(null)}
          onConfirm={() => {
            announcementsStore.deleteAnnouncement(deleteTarget.id);
            if (detail?.title === deleteTarget.title) setDetail(null);
            toast.success("Notification deleted");
            setDeleteTarget(null);
          }}
          title="Delete this notification?"
          description={`"${deleteTarget.title}" will be permanently removed. All users will no longer see this notification. This action cannot be undone.`}
          confirmLabel="Delete Notification"
          cancelLabel="Keep It"
          requirePhrase
        />
      )}

      {/* Send Notification Confirmation */}
      {showSendConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowSendConfirm}
          onConfirm={() => {
            handleSend();
            setShowSendConfirm(false);
          }}
          title={`Send ${ANNOUNCEMENT_PRIORITY_LABELS[priority]} notification?`}
          description={`This will broadcast "${title}" to all users. It will appear in the Notifications panel for everyone and cannot be unsent once delivered.`}
          confirmLabel={`Send ${ANNOUNCEMENT_PRIORITY_LABELS[priority]} Notification`}
          cancelLabel="Go Back"
          destructive={false}
        />
      )}
    </Layout>
  );
}