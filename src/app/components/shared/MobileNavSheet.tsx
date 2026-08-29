import React, { useState, useEffect, useSyncExternalStore } from "react";
import {
  LogOut,
  User,
  ChevronDown,
  ChevronLeft,
  LayoutDashboard,
  FileText,
  Package,
  Briefcase,
  CreditCard,
  ShoppingCart,
  Boxes,
  Clock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useMobileNav } from "../../contexts/MobileNavContext";
import { useIsMobile } from "../ui/use-mobile";
import { usePresence } from "../ui/use-presence";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import logoImage from "../../../assets/32cd46dac3d06839e0db69b6c6ad22c9a8ac17a6.png";
import { adminMenuItems } from "../../utils/adminMenuItems";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const customerMenuItems: MenuItem[] = [
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

const staffMenuItems: MenuItem[] = [
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
    label: "Inventory",
    path: "/staff/inventory",
    icon: <Boxes className="w-5 h-5" />,
  },
];

interface MobileNavSheetProps {
  router: ReturnType<typeof import("react-router").createBrowserRouter>;
}

export default function MobileNavSheet({ router }: MobileNavSheetProps) {
  const { open, setOpen } = useMobileNav();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profilePresence = usePresence(isProfileOpen, 200);

  // React to route changes so nav highlights stay in sync even though this
  // component lives outside the router tree (it must persist across pages so
  // the sheet can animate closed while the next page mounts).
  const pathname = useSyncExternalStore(
    router.subscribe,
    () => router.state.location.pathname,
    () => router.state.location.pathname,
  );

  useEffect(() => {
    if (!isMobile && open) {
      setOpen(false);
    }
  }, [isMobile, open, setOpen]);

  if (!user) {
    return null;
  }

  const menuItems =
    user.role === "admin"
      ? adminMenuItems
      : user.role === "staff"
        ? staffMenuItems
        : customerMenuItems;

  const getInitials = (value?: string) => {
    if (!value) return "U";
    const letters = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    return letters || "U";
  };

  const profileImage = user?.profileImage;
  const profileInitial = getInitials(user?.name || user?.email || "User");

  const navigateAndClose = (path: string) => {
    setOpen(false);
    setIsProfileOpen(false);
    // Navigate immediately so the next page is already rendering while the
    // sheet plays its slide-out animation (no lag/delay).
    router.navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.navigate("/");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        showClose={false}
        className="w-[min(16rem,57vw)] bg-[#1D73EC] p-0 text-white"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Primary navigation</SheetTitle>
          <SheetDescription>Navigate through your DocuFy account.</SheetDescription>
        </SheetHeader>

        <div className="flex h-full w-full flex-col">
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
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex items-center rounded-xl transition-all duration-200 w-full px-3 py-2.5 gap-3 text-blue-100 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <div className="flex-shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Collapse</span>
              </button>
            </div>
            <div className="h-[2px] bg-white/40 w-full mt-4 shadow-sm" />
          </div>

          <nav
            aria-label="Primary navigation"
            className="flex-1 py-5 space-y-2 overflow-y-auto custom-scrollbar flex flex-col items-center"
          >
            {menuItems.map((item) => {
              const isActive =
                pathname === item.path ||
                pathname.startsWith(`${item.path}/`);
              return (
                <div key={item.path} className="w-full flex justify-center px-3">
                  <button
                    type="button"
                    onClick={() => navigateAndClose(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white w-full px-4 py-3 gap-3.5 rounded-xl ${
                      isActive
                        ? "bg-white text-[#1D73EC] shadow-lg"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap truncate">
                      {item.label}
                    </span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1D73EC]" />}
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="relative mt-auto w-full px-3 pb-5">
            <div className="h-[2px] bg-white/40 w-full mb-4 shadow-sm" />
            <button
              type="button"
              onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              aria-label="Open account menu"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-3 rounded-xl transition-all w-full px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                isProfileOpen ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#1D73EC] font-bold text-xs uppercase flex-shrink-0 overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profileInitial
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold text-white leading-none truncate">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-blue-100 capitalize leading-none mt-1">
                  {user?.role} account
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-blue-100 transition-transform ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profilePresence && (
              <div className={`absolute bottom-full mb-2 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-20 ${profilePresence.isClosing ? "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2 duration-200 pointer-events-none" : "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"}`}>
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.email}</p>
                  <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                    {user?.role} Account
                  </p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => navigateAndClose(`/${user?.role}/profile`)}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}