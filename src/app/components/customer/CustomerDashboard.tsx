import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle,
  Package,
  Bell,
  X,
} from "lucide-react";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { dataStore } from "../../utils/dataStore";
import { useAuth } from "../../contexts/AuthContext";
import { notificationStore, Notification } from "../../utils/notificationStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { getStatusBadgeClasses } from "../../utils/orderStatusPalette";
import { formatPHDateTime } from "../../utils/pht";

const menuItems = [
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

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customerOrders, setCustomerOrders] = useState(
    dataStore.getOrdersByCustomer(user?.email || ""),
  );
  const [stats, setStats] = useState(
    dataStore.getOrderStats(user?.email || ""),
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [shopOpen, setShopOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      setCustomerOrders(
        dataStore.getOrdersByCustomer(user?.email || ""),
      );
      setStats(dataStore.getOrderStats(user?.email || ""));
    });
    return () => {
      unsubscribe();
    };
  }, [user?.email]);

  useEffect(() => {
    const loadNotifications = () => {
      const userNotifs = notificationStore.getNotifications('customer', user?.email);
      // Filter for application-related notifications only
      const appNotifs = userNotifs.filter(n => n.type === 'status_update');
      setNotifications(appNotifs);
    };

    loadNotifications();
    const unsubscribe = notificationStore.subscribe(loadNotifications);
    return unsubscribe;
  }, [user?.email]);

  const handleNotificationClick = (notification: Notification) => {
    notificationStore.markAsRead(notification.id);
    if (notification.clickable && notification.relatedRoute) {
      navigate(notification.relatedRoute);
    }
  };

  const handleDismissNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationStore.deleteNotification(notificationId);
  };

  const recentOrders = customerOrders.slice(0, 3);

  const getStatusColor = (status: string) => getStatusBadgeClasses(status);

  return (
    <Layout menuItems={menuItems} title="Dashboard">
      <div className="space-y-4 sm:space-y-6 h-auto overflow-visible pb-6 sm:pb-10 max-w-7xl mx-auto">

        {/* Welcome Message */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <Button
            onClick={() => setShopOpen(true)}
            className="h-9 sm:h-10 bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white transition-all duration-200 active:scale-[0.97]"
          >
            <MapPin className="w-4 h-4" /> Shop Location
          </Button>
        </div>

        {/* Application Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                role={notification.clickable ? "button" : undefined}
                tabIndex={notification.clickable ? 0 : undefined}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={notification.clickable ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNotificationClick(notification);
                  }
                } : undefined}
                className={`p-3 sm:p-4 rounded-xl border-2 ${
                  notification.read
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-300'
                } cursor-pointer hover:shadow-md transition-all group`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.read ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <Bell className={`w-5 h-5 ${notification.read ? 'text-gray-500' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatPHDateTime(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDismissNotification(notification.id, e)}
                        aria-label="Dismiss notification"
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-3 md:gap-4">
          {[
            {
              key: "kpi-tot",
              label: "Total Orders",
              val: stats.total,
              icon: FileText,
              click: () => navigate("/customer/orders"),
              desc: "View all orders",
            },
            {
              key: "kpi-prg",
              label: "Active Orders",
              val: stats.allActive,
              icon: Clock,
              click: () => navigate("/customer/orders"),
              desc: "Currently processing",
            },
            {
              key: "kpi-com",
              label: "Completed",
              val: stats.allFinished,
              icon: CheckCircle,
              click: () => navigate("/customer/orders"),
              desc: "Ready for pickup",
            },
          ].map((kpi) => (
            <Card
              key={kpi.key}
              onClick={kpi.click}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") kpi.click();
              }}
              className="group min-h-[4.5rem] cursor-pointer rounded-xl border border-blue-400/70 bg-[#1D73EC] p-2 shadow-md transition-all hover:-translate-y-0.5 hover:border-[#10316B] hover:bg-[#1557b8] hover:shadow-lg sm:min-h-0 sm:rounded-lg sm:p-4 md:cursor-pointer md:border md:border-slate-100 md:bg-white md:p-5 md:shadow-sm md:hover:-translate-y-0.5 md:hover:bg-[#2F6FD6] md:hover:text-white md:hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-1 md:justify-between md:items-start">
                <p className="max-w-[70%] text-left text-[10px] font-semibold tracking-wide text-blue-100 sm:max-w-none sm:text-sm sm:normal-case sm:tracking-normal md:text-base md:font-bold md:text-slate-700 md:group-hover:text-white">
                  <span className="block sm:inline">{kpi.label.split(" ").slice(0, 2).join(" ")}</span>
                  {kpi.label.split(" ").length > 2 && <span className="block sm:inline"> {kpi.label.split(" ").slice(2).join(" ")}</span>}
                </p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 shadow-sm transition-all duration-300 sm:h-8 sm:w-8 lg:h-8 lg:w-8 md:rounded-none md:bg-transparent md:shadow-none md:h-5 md:w-5 md:opacity-50 md:group-hover:scale-110 md:group-hover:opacity-100">
                  <kpi.icon className="h-3.8 w-3.8 text-white sm:h-4 sm:w-4 lg:h-4 lg:w-4 md:h-5 md:w-5 md:text-[#2F6FD6] md:group-hover:text-white" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold leading-none text-white sm:mt-3 sm:text-3xl md:text-3xl md:text-slate-900 md:group-hover:text-white">
                {kpi.val}
              </p>
              <p className="mt-1 hidden truncate text-xs text-blue-100 sm:block md:text-[11px] md:text-slate-400 md:uppercase md:font-medium md:group-hover:text-blue-100">
                {kpi.desc}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {/* Left Column: Quick Actions */}
          <div className="lg:col-span-1 flex flex-col">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4 ml-1">
              Quick Actions
            </h3>
            <div className="grid grid-cols-3 gap-2 flex-grow lg:grid-cols-1">
              {[
                {
                  key: "qa-1",
                  label: "New Request",
                  icon: FileText,
                  path: "/customer/new-request",
                },
                {
                  key: "qa-2",
                  label: "Track Orders",
                  icon: MapPin,
                  path: "/customer/orders",
                },
                {
                  key: "qa-3",
                  label: "Job Board",
                  icon: Briefcase,
                  path: "/customer/job-board",
                },
              ].map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all group hover:bg-[#2F6FD6] sm:min-h-0 sm:flex-row sm:gap-3 sm:p-4 lg:p-7"
                >
                  <action.icon className="w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0 text-[#2F6FD6] group-hover:text-white" />
                  <p className="text-center text-xs font-semibold leading-tight text-gray-900 group-hover:text-white sm:text-sm lg:text-lg sm:text-left">
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Recent Orders */}
          <div className="lg:col-span-3">
            <Card className="p-3 sm:p-6 bg-white shadow-sm border border-slate-100 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-6 gap-3 sm:gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Recent Orders
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto flex-grow">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                        Order ID
                      </th>
                      <th className="text-left py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="hidden sm:table-cell text-left py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                        Total
                      </th>
                      <th className="hidden sm:table-cell text-left py-2 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="text-center py-2 sm:py-4 px-1 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <Package className="mx-auto mb-3 h-10 w-10 text-[#1D73EC]/35" />
                          <p className="text-sm font-semibold text-gray-500">No recent orders</p>
                          <p className="mt-1 text-xs text-gray-400">Your print requests will appear</p>
                          <p className="text-xs text-gray-400">here once you have placed an order.</p>
                        </td>
                      </tr>
                    ) : recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <span className="font-semibold text-gray-900">
                            {order.id}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <Badge
                            className={`${getStatusColor(order.status)} font-medium`}
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="hidden sm:table-cell py-3 sm:py-4 px-2 sm:px-4">
                          <span className="font-semibold text-gray-900">
                            {order.total || "₱0.00"}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell py-3 sm:py-4 px-2 sm:px-4">
                          <span className="text-gray-600 text-sm">
                            {order.date || "N/A"}
                          </span>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/customer/track/${order.id}`,
                              )
                            }
                            className="h-8 px-2 text-xs sm:text-sm text-[#2F6FD6] hover:bg-blue-100 cursor-pointer"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={() => navigate("/customer/orders")}
                className="mt-3 h-10 w-full bg-white text-[#2F6FD6] hover:bg-gray-100 sm:mt-5 sm:w-auto sm:self-end cursor-pointer"
              >
                View All Orders
              </Button>
            </Card>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4 sm:p-6 bg-[#1D73EC] text-white shadow-lg border-none">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
                  Shop Hours
                </h4>
                <div className="space-y-2 text-sm text-white/95">
                  <p>
                    <strong>Mon-Thurs:</strong> 9:00 AM - 6:00
                    PM
                  </p>
                  <p>
                    <strong>Fri-Sun:</strong> Closed
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-[#1D73EC] text-white shadow-lg border-none">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
                  Quick Tips
                </h4>
                <div className="space-y-2 text-sm text-white/95">
                  <p>
                    • Orders that use e-wallet requires payment
                    verification
                  </p>
                  <p>• If possible, upload PDF files</p>
                  <p>• Check order status regularly</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Shop Location Dialog */}
      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#2F6FD6]" /> Shop Location
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Palawan State University - Main Campus, Puerto Princesa City,
            Palawan
          </p>
          <div className="overflow-hidden rounded-xl border-2 border-blue-100">
            <iframe
              title="Docufy Printing Services - Shop Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3931.8605234742895!2d118.7358141!3d9.777867299999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33b5632f84660cb3%3A0x6c411581676a62cf!2sDocufy%20Printing%20Services!5e0!3m2!1sen!2sph!4v1788133073002!5m2!1sen!2sph"
              className="w-full h-72 border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}