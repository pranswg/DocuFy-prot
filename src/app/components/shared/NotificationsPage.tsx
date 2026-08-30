import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Package,
  Briefcase,
  Clock,
  ShoppingCart,
  CreditCard,
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
import { Card } from "../ui/card";
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
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router";
import { adminMenuItems } from "../../utils/adminMenuItems";
import {
  announcementsStore,
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  formatSentTime,
  type Announcement,
  type AnnouncementType,
  type AnnouncementPriority,
} from "../../utils/announcementsStore";
import {
  notificationStore,
  type Notification,
} from "../../utils/notificationStore";

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
  {
    label: "Notifications",
    path: "/customer/notifications",
    icon: <Bell className="w-5 h-5" />,
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
    label: "Orders",
    path: "/staff/queue",
    icon: <Package className="w-5 h-5" />,
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
    label: "Notifications",
    path: "/staff/notifications",
    icon: <Bell className="w-5 h-5" />,
  },
];

// What a notice is about — shown as a small category chip where useful.
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

function CategoryChip({ type }: { type: AnnouncementType }) {
  if (type === "announcement") return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wide">
      {ANNOUNCEMENT_TYPE_LABELS[type]}
    </span>
  );
}

// ── Urgent cards (Important Announcements section) ──────────────────────────
export default function NotificationsPage() {
  const { user } = useAuth();
  const email = user?.email || "";
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  // Order/payment/status system notifications shown alongside announcements
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("regular");
  const [recipients, setRecipients] = useState("all");

  useEffect(() => {
    const load = () => setAnnouncements(announcementsStore.getAnnouncementsFor(email));
    load();
    const unsubscribe = announcementsStore.subscribe(load);
    return unsubscribe;
  }, [email]);

  useEffect(() => {
    const load = () =>
      setSystemNotifications(notificationStore.getNotifications(user?.role, user?.email));
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

  const emergency = announcements.filter((a) => a.priority === "emergency");
  const important = announcements.filter((a) => a.priority === "important");
  const regular = announcements.filter((a) => a.priority === "regular");

  const unreadAnnouncements = announcements.filter((a) => !a.readBy.includes(email)).length;
  const unreadSystem = systemNotifications.filter((n) => !n.read).length;
  const unread = unreadAnnouncements + unreadSystem;
  const unreadUrgent = [...emergency, ...important].filter(
    (a) => !a.readBy.includes(email),
  ).length;

  const isRead = (a: Announcement) => a.readBy.includes(email);

  // Combined "Notifications" feed: regular announcements + system (order/payment)
  // notifications, newest first.
  const regularFeed: (Announcement | Notification)[] = [
    ...regular,
    ...systemNotifications,
  ].sort((a, b) => {
    const timeOf = (x: Announcement | Notification) =>
      "sentAt" in x ? new Date(x.sentAt).getTime() : x.timestamp.getTime();
    return timeOf(b) - timeOf(a);
  });

  const openNotification = (announcement: Announcement) => {
    announcementsStore.markRead(announcement.id, email);
    setSelected(announcement);
  };

  const openSystemNotification = (n: Notification) => {
    notificationStore.markAsRead(n.id);
    if (n.clickable && n.relatedRoute) {
      navigate(n.relatedRoute);
    } else if (n.clickable && n.relatedOrderId && user) {
      if (user.role === "customer") navigate(`/customer/track/${n.relatedOrderId}`);
      else navigate(`/${user.role}/orders`);
    }
  };

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
  };

  const handleDelete = (announcement: Announcement) => {
    if (!confirm("Delete this notification? Users will no longer see it.")) return;
    announcementsStore.deleteAnnouncement(announcement.id);
    if (selected?.id === announcement.id) setSelected(null);
    toast.success("Notification deleted");
  };

  const renderUrgentCard = (announcement: Announcement) => {
    const isEmergency = announcement.priority === "emergency";
    const read = isRead(announcement);
    return (
      <Card
        key={announcement.id}
        className={`relative overflow-hidden cursor-pointer transition-all ${
          isEmergency
            ? "border-l-4 border-l-red-500 bg-red-50/60 hover:bg-red-50 hover:shadow-md"
            : "border-l-4 border-l-amber-400 bg-amber-50/50 hover:bg-amber-50/80 hover:shadow-md"
        } ${read ? "opacity-80" : ""}`}
        onClick={() => openNotification(announcement)}
      >
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isEmergency
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {isEmergency ? (
              <AlertOctagon className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      isEmergency
                        ? "bg-red-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {isEmergency ? (
                      <>
                        <AlertOctagon className="w-3 h-3" />
                        {ANNOUNCEMENT_PRIORITY_LABELS.emergency}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        {ANNOUNCEMENT_PRIORITY_LABELS.important.toUpperCase()}
                      </>
                    )}
                  </span>
                  <CategoryChip type={announcement.type} />
                  {!read && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isEmergency ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                  )}
                </div>
                <h3
                  className={`text-sm mt-2 ${
                    read ? "font-bold text-gray-800" : "font-extrabold text-gray-900"
                  }`}
                >
                  {announcement.title}
                </h3>
                <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">
                  {announcement.message}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  title="Delete notification"
                  aria-label={`Delete ${announcement.title}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(announcement);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formatSentTime(announcement.sentAt)}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  const renderRegularCard = (announcement: Announcement) => {
    const Icon = TYPE_ICON[announcement.type];
    const read = isRead(announcement);
    return (
      <Card
        key={announcement.id}
        className={`p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          read ? "bg-white border-gray-100" : "bg-[#F2F7FF]/60 border-[#1D73EC]/25"
        }`}
        onClick={() => openNotification(announcement)}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              read ? "bg-gray-100 text-gray-400" : "bg-[#F2F7FF] text-[#1D73EC]"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryChip type={announcement.type} />
                  {!read && <span className="w-2 h-2 rounded-full bg-[#1D73EC]" />}
                </div>
                <h3
                  className={`text-sm mt-1.5 ${
                    read ? "font-semibold text-gray-900" : "font-bold text-gray-900"
                  }`}
                >
                  {announcement.title}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {announcement.message}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  title="Delete notification"
                  aria-label={`Delete ${announcement.title}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(announcement);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formatSentTime(announcement.sentAt)}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  // System (order/payment/status) notification card, styled to match the
  // regular announcement cards so both kinds read as one unified feed.
  const SYSTEM_META: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    order: { icon: Package, color: "bg-[#F2F7FF] text-[#1D73EC]" },
    payment: { icon: AlertTriangle, color: "bg-amber-50 text-amber-600" },
    status_update: { icon: CheckCircle, color: "bg-[#F2F7FF] text-[#1D73EC]" },
  };

  const renderSystemCard = (n: Notification) => {
    const meta = SYSTEM_META[n.type] || { icon: Bell, color: "bg-gray-100 text-gray-600" };
    const Icon = meta.icon;
    const read = n.read;
    return (
      <Card
        key={n.id}
        className={`p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
          read ? "bg-white border-gray-100" : "bg-[#F2F7FF]/60 border-[#1D73EC]/25"
        }`}
        onClick={() => openSystemNotification(n)}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              read ? "bg-gray-100 text-gray-400" : meta.color
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {!read && <span className="w-2 h-2 rounded-full bg-[#1D73EC]" />}
                </div>
                <h3
                  className={`text-sm mt-1.5 ${
                    read ? "font-semibold text-gray-900" : "font-bold text-gray-900"
                  }`}
                >
                  {n.title}
                </h3>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                  {n.message}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {formatSentTime(n.timestamp.toISOString())}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  const renderFeedItem = (item: Announcement | Notification) =>
    "sentAt" in item ? renderRegularCard(item as Announcement) : renderSystemCard(item as Notification);

  return (
    <Layout menuItems={menuItems} title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F2F7FF] text-[#1D73EC] flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#10316B]">Notifications</h2>
              <p className="text-gray-600 mt-1">
                Announcements and updates from Docufy.
                {isAdmin && " Send announcements to everyone in the system."}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              className="h-11 sm:h-10 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          )}
        </div>

        {/* Unread summary + mark all read */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#1D73EC] text-white text-xs font-bold">
              {unread}
            </span>
            unread notification{unread === 1 ? "" : "s"}
            {unreadUrgent > 0 && (
              <span className="inline-flex items-center gap-1 ml-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" />
                {unreadUrgent} Important
              </span>
            )}
          </p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#2F6FD6] hover:bg-[#F2F7FF] h-8"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        {announcements.length === 0 && systemNotifications.length === 0 ? (
          <Card className="p-16 text-center">
            <div className="w-16 h-16 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-[#1D73EC]/40" />
            </div>
            <p className="text-gray-600 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Admin announcements and order updates will appear here.
            </p>
          </Card>
        ) : (
          <>
            {/* ── IMPORTANT ANNOUNCEMENTS ── */}
            {(emergency.length > 0 || important.length > 0) && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 text-white flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-[#10316B] tracking-wide">
                    Important Announcements
                  </h3>
                </div>
                <div className="space-y-3">
                  {emergency.map(renderUrgentCard)}
                  {important.map(renderUrgentCard)}
                </div>
              </section>
            )}

            {/* ── NOTIFICATIONS ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#1D73EC] text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#10316B] tracking-wide">
                  Notifications
                </h3>
              </div>
              {regularFeed.length === 0 ? (
                <Card className="py-12 text-center">
                  <div className="w-14 h-14 bg-[#F2F7FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-7 h-7 text-[#1D73EC]/40" />
                  </div>
                  <p className="text-gray-500 font-medium">No regular notifications</p>
                  <p className="text-sm text-gray-400 mt-1">
                    General system notifications will appear here.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">{regularFeed.map(renderFeedItem)}</div>
              )}
            </section>
          </>
        )}
      </div>

      {/* View Notification Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {selected && selected.priority !== "regular" && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    selected.priority === "emergency"
                      ? "bg-red-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {selected.priority === "emergency" ? (
                    <AlertOctagon className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {ANNOUNCEMENT_PRIORITY_LABELS[selected.priority]}
                </span>
              )}
              {selected && selected.type !== "announcement" && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-[#F2F7FF] text-[#1D73EC] border-[#1D73EC]/20">
                  {ANNOUNCEMENT_TYPE_LABELS[selected.type]}
                </span>
              )}
            </div>
            <DialogTitle className="text-[#10316B]">{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected && formatSentTime(selected.sentAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
            {selected?.message}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-10 w-full sm:w-auto" onClick={() => setSelected(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <DialogTitle className="text-[#10316B]">Create Notification</DialogTitle>
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
              <Select value={priority} onValueChange={(v) => setPriority(v as AnnouncementPriority)}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Notification</SelectItem>
                  <SelectItem value="important">Important Announcement</SelectItem>
                  <SelectItem value="emergency">Emergency Announcement</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                {priority === "regular" &&
                  "Normal system notification — appears under Notifications."}
                {priority === "important" &&
                  "Highlighted announcement — appears under Important Announcements."}
                {priority === "emergency" &&
                  "Critical announcement — appears at the very top with a strong alert style."}
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
              onClick={handleSend}
            >
              {priority === "emergency" ? (
                <AlertOctagon className="w-4 h-4 mr-2" />
              ) : priority === "important" ? (
                <AlertTriangle className="w-4 h-4 mr-2" />
              ) : (
                <Megaphone className="w-4 h-4 mr-2" />
              )}
              Send {ANNOUNCEMENT_PRIORITY_LABELS[priority]} Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}