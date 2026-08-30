import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Bell,
  LogOut,
  Menu,
  User,
  ChevronDown,
  Printer,
  CheckCircle,
  Package as PackageIcon,
  AlertTriangle,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Shield,
  MapPin,
  XCircle,
  Clock,
  Upload,
  ArrowLeft,
  Megaphone,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoImage from "../../assets/32cd46dac3d06839e0db69b6c6ad22c9a8ac17a6.png";
import { notificationStore, type Notification } from "../utils/notificationStore";
import { siemAlertStore, type SIEMAlert } from "../utils/siemAlertStore";
import {
  announcementsStore,
  type Announcement,
} from "../utils/announcementsStore";
import { toast } from "sonner";
import { useIsMobile } from "./ui/use-mobile";
import { usePresence } from "./ui/use-presence";
import { useMobileNav } from "../contexts/MobileNavContext";

interface LayoutProps {
  children: React.ReactNode;
  menuItems: {
    label: string;
    path: string;
    icon: React.ReactNode;
  }[];
  title?: string;
  showBackButton?: boolean;
  backButtonPath?: string;
  hideMobileBackButton?: boolean;
}

export default function Layout({
  children,
  menuItems,
  title,
  showBackButton = false,
  backButtonPath,
  hideMobileBackButton = false,
}: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const { open: isMobileNavOpen, setOpen: setMobileNavOpen } = useMobileNav();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => {
      const saved = localStorage.getItem("sidebarExpanded");
      return saved !== null ? JSON.parse(saved) : true;
    },
  );
  const [isNavigationOpen, setIsNavigationOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false,
  );

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTopProfileOpen, setIsTopProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] =
    useState(false);
  const [isSIEMOpen, setIsSIEMOpen] = useState(false);

  // Keep panels mounted while animating closed
  const sidebarProfilePresence = usePresence(isProfileOpen, 200);
  const topProfilePresence = usePresence(isTopProfileOpen, 200);
  const notificationPresence = usePresence(isNotificationOpen, 200);
  const siemPresence = usePresence(isSIEMOpen, 200);

  // Track notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track announcements (merged into the bell dropdown alongside notifications)
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Track announcements unread (sidebar badge)
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState(0);

  useEffect(() => {
    const updateAnnouncements = () => {
      setUnreadAnnouncements(announcementsStore.getUnreadCount(user?.email));
      setUrgentAnnouncements(announcementsStore.getUrgentUnreadCount(user?.email));
    };
    updateAnnouncements();
    const unsubscribe = announcementsStore.subscribe(updateAnnouncements);
    return unsubscribe;
  }, [user?.email]);

  // Track SIEM alerts (admin only)
  const [siemAlerts, setSiemAlerts] = useState<SIEMAlert[]>([]);
  const [siemUnreadCount, setSiemUnreadCount] = useState(0);
  const [siemCriticalCount, setSiemCriticalCount] = useState(0);

  useEffect(() => {
    localStorage.setItem(
      "sidebarExpanded",
      JSON.stringify(isSidebarExpanded),
    );
  }, [isSidebarExpanded]);

  // Subscribe to notifications
  useEffect(() => {
    const updateNotifications = () => {
      const userNotifications = notificationStore.getNotifications(user?.role, user?.email);
      setNotifications(userNotifications);
      setUnreadCount(notificationStore.getUnreadCount(user?.role, user?.email));
    };

    updateNotifications();
    const unsubscribe = notificationStore.subscribe(updateNotifications);
    return unsubscribe;
  }, [user?.role, user?.email]);

  // Subscribe to announcements and merge them into the bell dropdown
  useEffect(() => {
    const updateAnnouncements = () => {
      const list = announcementsStore.getAnnouncementsFor(user?.email || "");
      setAnnouncements(list);
    };
    updateAnnouncements();
    const unsubscribe = announcementsStore.subscribe(updateAnnouncements);
    return unsubscribe;
  }, [user?.email]);

  // Subscribe to SIEM alerts (admin only)
  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    const updateSIEMAlerts = () => {
      const alerts = siemAlertStore.getAlerts(user?.role);
      setSiemAlerts(alerts);
      setSiemUnreadCount(siemAlertStore.getUnreadCount(user?.role));
      setSiemCriticalCount(siemAlertStore.getCriticalUnreadCount(user?.role));
    };

    updateSIEMAlerts();
    const unsubscribe = siemAlertStore.subscribe(updateSIEMAlerts);
    return unsubscribe;
  }, [user?.role]);

  const getInitials = (value?: string) => {
    if (!value) return "U";
    const letters = value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
    return letters || "U";
  };

  const profileImage = user?.profileImage;
  const profileInitial = getInitials(user?.name || user?.email || "User");

  const displayTitle =
    title ||
    menuItems.find((item) => item.path === location.pathname)
      ?.label ||
    "Dashboard";

  useEffect(() => {
    setIsNavigationOpen(!isMobile);
  }, [isMobile]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    notificationStore.markAsRead(notification.id);

    setIsNotificationOpen(false);

    // Navigate if clickable
    if (notification.clickable && notification.relatedRoute) {
      navigate(notification.relatedRoute);
    } else if (notification.clickable && notification.relatedOrderId && user) {
      // Navigate to order tracking
      if (user.role === 'customer') {
        navigate(`/customer/track/${notification.relatedOrderId}`);
      } else {
        navigate(`/${user.role}/orders`);
      }
    }
  };

  const handleMarkAllRead = () => {
    notificationStore.markAllAsRead(user?.role, user?.email);
    announcementsStore.markAllRead(user?.email || "");
    toast.success('All notifications marked as read');
  };

  const handleAnnouncementClick = (announcement: Announcement) => {
    announcementsStore.markRead(announcement.id, user?.email || "");
    setIsNotificationOpen(false);
  };

  const handleSIEMAlertClick = (alert: SIEMAlert) => {
    siemAlertStore.markAsRead(alert.id);
    setIsSIEMOpen(false);
    if (alert.investigateUrl) {
      navigate(alert.investigateUrl);
    }
  };

  const handleMarkAllSIEMRead = () => {
    siemAlertStore.markAllAsRead(user?.role);
    toast.success('All security alerts marked as read');
  };

  const getSIEMAlertIcon = (type: SIEMAlert['type']) => {
    switch (type) {
      case 'impossible_travel':
        return { icon: MapPin, color: 'bg-red-100 text-red-600' };
      case 'brute_force':
        return { icon: AlertTriangle, color: 'bg-red-100 text-red-600' };
      case 'suspicious_upload':
        return { icon: Upload, color: 'bg-yellow-100 text-yellow-600' };
      case 'unusual_access':
        return { icon: Clock, color: 'bg-yellow-100 text-yellow-600' };
      case 'repeated_failures':
        return { icon: XCircle, color: 'bg-blue-100 text-blue-600' };
      default:
        return { icon: AlertTriangle, color: 'bg-gray-100 text-gray-600' };
    }
  };

  const getSIEMSeverityBadge = (severity: SIEMAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return { icon: PackageIcon, color: 'bg-blue-100 text-blue-600' };
      case 'payment':
        return { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' };
      case 'status_update':
        return { icon: CheckCircle, color: 'bg-blue-100 text-blue-600' };
      default:
        return { icon: Bell, color: 'bg-gray-100 text-gray-600' };
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Combined unread count = order/payment notifications + announcements
  const combinedUnread = unreadCount + unreadAnnouncements;

  // Merge announcements and order/payment notifications into one chronological
  // feed for the bell dropdown so both kinds show in the same list.
  type BellItem = {
    key: string;
    read: boolean;
    title: string;
    message: string;
    timestamp: Date;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    unreadDot: string;
    onClick: () => void;
    clickable: boolean;
  };

  const bellItems: BellItem[] = [
    ...announcements.map((a) => {
      const read = a.readBy.includes(user?.email || "");
      const meta =
        a.priority === "emergency"
          ? { icon: AlertTriangle, color: "bg-red-100 text-red-600", unreadDot: "bg-red-500" }
          : a.priority === "important"
            ? { icon: AlertTriangle, color: "bg-amber-100 text-amber-600", unreadDot: "bg-amber-500" }
            : { icon: Megaphone, color: "bg-blue-100 text-blue-600", unreadDot: "bg-blue-500" };
      return {
        key: a.id,
        read,
        title: a.title,
        message: a.message,
        timestamp: new Date(a.sentAt),
        icon: meta.icon,
        color: meta.color,
        unreadDot: meta.unreadDot,
        onClick: () => handleAnnouncementClick(a),
        clickable: true,
      };
    }),
    ...notifications.map((n) => {
      const meta = getNotificationIcon(n.type);
      return {
        key: n.id,
        read: n.read,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        icon: meta.icon,
        color: meta.color,
        unreadDot: "bg-blue-500",
        onClick: () => handleNotificationClick(n),
        clickable: n.clickable,
      };
    }),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const navigation = (
    <>
      <div className="pt-5 pb-3 w-full" aria-hidden="true">
        <div className="flex items-center justify-center">
          <img
            src={logoImage}
            alt=""
            className="w-10 h-10 rounded-full bg-white/10 p-0.5 shadow-lg flex-shrink-0"
          />
        </div>
      </div>

      <div className="my-2 px-3">
        <div className="h-[2px] bg-white/40 w-full mb-4 shadow-sm" />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setIsNavigationOpen(false);
              } else {
                setIsSidebarExpanded(!isSidebarExpanded);
              }
            }}
            aria-label={isMobile ? "Close navigation" : isSidebarExpanded ? "Collapse navigation" : "Expand navigation"}
            aria-expanded={isMobile ? isNavigationOpen : isSidebarExpanded}
            className={`flex items-center rounded-xl transition-all duration-200 group relative ${
              isMobile || isSidebarExpanded
                ? "w-full px-3 py-2.5 gap-3"
                : "w-10 h-10 justify-center"
            } text-blue-100 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
          >
            <div className="flex-shrink-0">
              {isMobile || isSidebarExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            {(isMobile || isSidebarExpanded) && <span className="text-sm font-medium">Collapse</span>}
            {!isMobile && !isSidebarExpanded && (
              <div className="fixed left-[80px] px-3 py-1.5 bg-[#1c1f26] text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[9999] whitespace-nowrap border border-white/10">
                Expand navigation
              </div>
            )}
          </button>
        </div>
        <div className="h-[2px] bg-white/40 w-full mt-4 shadow-sm" />
      </div>

      <nav aria-label="Primary navigation" className="flex-1 py-5 space-y-2 overflow-y-auto custom-scrollbar flex flex-col items-center">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const isNotificationsItem = item.path.endsWith("/notifications");
          return (
            <div key={item.path} className="relative group w-full flex justify-center px-3">
              <button
                type="button"
                onClick={() => handleNavigation(item.path)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isMobile || isSidebarExpanded ? "w-full px-4 py-3 gap-3.5 rounded-xl" : "w-11 h-11 justify-center rounded-xl"
                } ${isActive ? "bg-white text-[#1D73EC] shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              >
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  {item.icon}
                  {isNotificationsItem && unreadAnnouncements > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5252] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0B2C5B]">
                      {unreadAnnouncements > 9 ? "9+" : unreadAnnouncements}
                    </span>
                  )}
                  {isNotificationsItem && urgentAnnouncements > 0 && (
                    <span
                      title={`${urgentAnnouncements} important/urgent announcement${urgentAnnouncements === 1 ? "" : "s"}`}
                      className="absolute -bottom-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0B2C5B]"
                    />
                  )}
                </div>
                {(isMobile || isSidebarExpanded) && <span className="text-sm font-medium whitespace-nowrap truncate">{item.label}</span>}
                {isActive && (isMobile || isSidebarExpanded) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1D73EC]" />}
              </button>
              {!isMobile && !isSidebarExpanded && (
                <div className="fixed left-[80px] px-3 py-1.5 bg-[#1c1f26] text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[9999] whitespace-nowrap border border-white/10">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="relative mt-auto w-full px-3 pb-5">
        <div className="h-[2px] bg-white/40 w-full mb-4 shadow-sm" />
        <button
          type="button"
          onClick={() => {
            setIsProfileOpen(!isProfileOpen);
            setIsTopProfileOpen(false);
            setIsNotificationOpen(false);
            setIsSIEMOpen(false);
          }}
          aria-label="Open account menu"
          aria-expanded={isProfileOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-3 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            isMobile || isSidebarExpanded ? "w-full px-3 py-2.5" : "mx-auto h-11 w-11 justify-center"
          } ${isProfileOpen ? "bg-white/15" : "hover:bg-white/10"}`}
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#1D73EC] font-bold text-xs uppercase flex-shrink-0 overflow-hidden">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profileInitial
            )}
          </div>
          {(isMobile || isSidebarExpanded) && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-white leading-none truncate">
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-blue-100 capitalize leading-none mt-1">
                {user?.role} account
              </p>
            </div>
          )}
          {(isMobile || isSidebarExpanded) && (
            <ChevronDown className={`w-4 h-4 text-blue-100 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
          )}
        </button>

        {sidebarProfilePresence && (
          <div className={`absolute bottom-full mb-2 ${sidebarProfilePresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"} ${isMobile || isSidebarExpanded ? "left-3 right-3" : "left-[72px] w-56"} bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-20`}>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.email}</p>
              <p className="text-[10px] text-gray-500 capitalize mt-0.5">{user?.role} Account</p>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  handleNavigation(`/${user?.role}/profile`);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <User className="w-4 h-4" /> My Profile
              </button>
            </div>
            <div className="border-t border-gray-100 py-1">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex font-poppins overflow-hidden">
      {!isMobile && (
        <aside
          aria-label="Primary navigation"
          className={`h-screen overflow-y-auto custom-scrollbar bg-[#1D73EC] flex flex-col z-30 shadow-2xl transition-all duration-300 ease-in-out flex-shrink-0 relative ${
            isNavigationOpen ? (isSidebarExpanded ? "w-64" : "w-[72px]") : "w-0"
          }`}
        >
          {navigation}
        </aside>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="min-h-16 bg-white border-b border-gray-200 px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between z-40 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <button
                type="button"
                onClick={() => setMobileNavOpen(!isMobileNavOpen)}
                aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={isMobileNavOpen}
                className="rounded-xl p-2 text-[#1D73EC] transition-all duration-200 hover:bg-[#F2F7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D73EC] focus-visible:ring-offset-2"
              >
                <Menu className={`h-6 w-6 transition-transform duration-200 ${isMobileNavOpen ? "rotate-90" : "rotate-0"}`} />
              </button>
            ) : null}
            {isMobile && !hideMobileBackButton && (showBackButton || !location.pathname.endsWith("/dashboard")) && (
              <button
                type="button"
                onClick={() => backButtonPath ? navigate(backButtonPath) : navigate(-1)}
                aria-label="Go back"
                className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D73EC]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-base font-bold text-[#1c1f26] truncate">
              {displayTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* SIEM Security Alerts (Admin Only) */}
            {user?.role === 'admin' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsSIEMOpen(!isSIEMOpen);
                    setIsNotificationOpen(false);
                    setIsProfileOpen(false);
                  }}
                  aria-label={`Security alerts${siemUnreadCount > 0 ? `, ${siemUnreadCount} unread` : ''}`}
                  aria-expanded={isSIEMOpen}
                  aria-haspopup="true"
                  className={`p-2 rounded-xl border transition-all relative ${isSIEMOpen ? "bg-red-100 border-red-300" : siemCriticalCount > 0 ? "bg-red-50 border-red-200 animate-pulse" : "hover:bg-gray-50 border-transparent"}`}
                >
                  <Shield className={`w-5 h-5 ${siemCriticalCount > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                  {siemUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                      {siemUnreadCount > 99 ? '99+' : siemUnreadCount}
                    </span>
                  )}
                </button>
                {siemPresence && (
                  <>
                    <div
                      className={`fixed inset-0 z-10 ${siemPresence.isClosing ? "animate-out fade-out-0 duration-200" : "animate-in fade-in-0 duration-200"}`}
                      onClick={() => setIsSIEMOpen(false)}
                    />
                    <div className={`absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-red-200 z-20 ${siemPresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"}`}>
                      <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <h3 className="font-bold text-sm text-red-900">Security Alerts</h3>
                          {siemCriticalCount > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                              {siemCriticalCount} Critical
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {siemAlerts.length === 0 ? (
                          <div className="p-8 text-center">
                            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">No security alerts</p>
                          </div>
                        ) : (
                          siemAlerts.map((alert, index) => {
                            const { icon: Icon, color } = getSIEMAlertIcon(alert.type);
                            const severityClass = getSIEMSeverityBadge(alert.severity);
                            return (
                              <div
                                key={alert.id}
                                role="button"
                                tabIndex={0}
                                className={`p-4 ${index !== siemAlerts.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-red-50 transition-colors cursor-pointer ${!alert.read ? 'bg-red-50/50' : ''}`}
                                onClick={() => handleSIEMAlertClick(alert)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSIEMAlertClick(alert);
                                  }
                                }}
                              >
                                <div className="flex gap-3">
                                  <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <p className={`text-xs ${!alert.read ? 'font-bold' : 'font-medium'} text-gray-900`}>
                                        {alert.title}
                                      </p>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${severityClass} uppercase`}>
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                                      {alert.description}
                                    </p>
                                    {alert.affectedAccount && (
                                      <p className="text-xs text-red-700 font-medium mb-1">
                                        Account: {alert.affectedAccount}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-gray-400">
                                      {formatTimeAgo(alert.timestamp)}
                                    </p>
                                  </div>
                                  {!alert.read && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-red-100 bg-red-50">
                        <button
                          className="text-xs font-medium text-red-700 hover:text-red-800 transition-colors"
                          onClick={handleMarkAllSIEMRead}
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationOpen(!isNotificationOpen);
                  setIsProfileOpen(false);
                  setIsSIEMOpen(false);
                }}
                aria-label={`Notifications${combinedUnread > 0 ? `, ${combinedUnread} unread` : ''}`}
                aria-expanded={isNotificationOpen}
                aria-haspopup="true"
                className={`p-2 rounded-xl border transition-all relative ${isNotificationOpen ? "bg-gray-100 border-gray-300" : "hover:bg-gray-50 border-transparent"}`}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {combinedUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {combinedUnread > 99 ? '99+' : combinedUnread}
                  </span>
                )}
              </button>

              {notificationPresence && (
                <>
                  <div
                    className={`fixed inset-0 z-10 ${notificationPresence.isClosing ? "animate-out fade-out-0 duration-200" : "animate-in fade-in-0 duration-200"}`}
                    onClick={() => {
                      setIsNotificationOpen(false);
                      setIsSIEMOpen(false);
                    }}
                  />
                  <div className={`absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 ${notificationPresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"}`}>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {bellItems.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        bellItems.map((item, index) => (
                          <div
                            key={item.key}
                            role={item.clickable ? "button" : undefined}
                            tabIndex={item.clickable ? 0 : undefined}
                            className={`p-4 ${index !== bellItems.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition-colors ${item.clickable ? 'cursor-pointer' : ''} ${!item.read ? 'bg-blue-50/50' : ''}`}
                            onClick={item.onClick}
                            onKeyDown={item.clickable ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                item.onClick();
                              }
                            } : undefined}
                          >
                            <div className="flex gap-3">
                              <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <item.icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${!item.read ? 'font-bold' : 'font-medium'} text-gray-900`}>
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {item.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatTimeAgo(item.timestamp)}
                                </p>
                              </div>
                              {!item.read && (
                                <div className={`w-2 h-2 ${item.unreadDot} rounded-full flex-shrink-0 mt-1`} />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100">
                      <button className="text-xs font-medium text-[#1D73EC] hover:text-[#1557b8] transition-colors" onClick={handleMarkAllRead}>
                        Mark all as read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTopProfileOpen(!isTopProfileOpen);
                setIsProfileOpen(false);
                setIsNotificationOpen(false);
                setIsSIEMOpen(false);
              }}
              aria-label="Open profile"
              aria-expanded={isTopProfileOpen}
              aria-haspopup="menu"
              className="rounded-full transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-[#1D73EC]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D73EC] focus-visible:ring-offset-2"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-[#1D73EC] text-white shadow-sm flex items-center justify-center font-bold text-xs">
                {profileImage ? <img src={profileImage} alt="Profile" className="h-full w-full object-cover" /> : profileInitial}
              </div>
            </button>
            {topProfilePresence && (
              <div className={`absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-1.5 shadow-2xl ${topProfilePresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"}`}>
                <button type="button" onClick={() => { setIsTopProfileOpen(false); navigate(`/${user?.role}/profile`); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <User className="h-4 w-4" /> Profile Settings
                </button>
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
            </div>

          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f0f4f8]">
          <div className="p-3 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        /* Custom Scrollbar Styling - Beautiful & Modern */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.12) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.02);
          border-radius: 10px;
          margin: 4px 0;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
          background-clip: padding-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: rgba(0,0,0,0.3);
          background-clip: padding-box;
        }

        /* Sidebar-specific scrollbar - White theme for blue background */
        aside .custom-scrollbar {
          scrollbar-color: rgba(255,255,255,0.25) transparent;
        }

        aside .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
        }

        aside .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.25);
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        aside .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.35);
          background-clip: padding-box;
        }

        aside .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: rgba(255,255,255,0.45);
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
}