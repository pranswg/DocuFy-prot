import React, { useState } from "react";
import {
  UserPlus,
  Shield,
  User,
  Users,
  Ban,
  Clock,
  UserCheck,
  Edit2,
  CalendarDays,
  Wallet,
  History,
  Eye,
  EyeOff,
  Search,
  Filter,
  Mail,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PasswordStrengthIndicator, validatePassword } from "../ui/password-strength-indicator";
import { useAuth } from "../../contexts/AuthContext";
import { ZoomSafeDropdown } from "../ui/zoom-safe-dropdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { useSearchParams } from "react-router";
import { AttendanceView } from "./AdminAttendance";
import { staffStore, type Staff } from "../../utils/staffStore";
import { salaryStore } from "../../utils/salaryStore";
import { attendanceStore, sessionTotalMs, hasActiveSession, formatPHT, nowPHT } from "../../utils/attendanceStore";
import { formatCurrency, formatNumber } from "../../utils/formatNumber";

import { adminMenuItems } from "../../utils/adminMenuItems";
import { formatPHDate, formatPHDateTime, todayPHTKey } from "../../utils/pht";

const menuItems = adminMenuItems;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return formatPHDate(date, "short");
}

export default function Staff() {
  const { registerStaff, updateStaffAccount, getStaffAccounts, user } = useAuth();
  const [searchParams] = useSearchParams();

  const buildStaffList = () => {
    const merged = staffStore.getStaff();
    const byEmail = new Map<string, Staff>();
    for (const r of merged) byEmail.set(r.email.toLowerCase(), r);

    // Auth accounts are the source of truth for role/status: the display must
    // always match the real login permission, so registered staff accounts
    // (created via Register New Staff) that somehow lack a roster row are added
    // back, and any matching row is synced to the account's role/status.
    for (const acc of getStaffAccounts()) {
      const existing = byEmail.get(acc.email.toLowerCase());
      if (existing) {
        existing.name = acc.name || existing.name;
        existing.email = acc.email;
        existing.role = acc.role === "admin" ? "Admin" : "Staff";
        existing.status = acc.active === false ? "Inactive" : "Active";
      } else if (acc.isAdminRegistered) {
        const row: Staff = {
          id: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          name: acc.name || acc.email,
          email: acc.email,
          phone: "Not set",
          role: acc.role === "admin" ? "Admin" : "Staff",
          status: acc.active === false ? "Inactive" : "Active",
          joinDate: todayPHTKey(),
          skillsMessage: "",
          portfolioLink: "",
          performanceNotes: [],
          salary: 0,
          allowances: [],
          paymentHistory: [],
          permissions: ["view_orders", "edit_orders"],
          tasks: [],
        };
        merged.push(row);
        byEmail.set(row.email.toLowerCase(), row);
      }
    }
    return merged;
  };

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") === "attendance" ? "attendance" : "staff",
  );

  const [staff, setStaff] = useState<Staff[]>(() => buildStaffList());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStaff, setNewStaff] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: "Staff" | "Admin";
    status: "Active" | "Inactive";
  } | null>(null);

  const [activating, setActivating] = useState<Staff | null>(null);
  const [deactivating, setDeactivating] = useState<Staff | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  const activeCount = staff.filter((s) => s.status === "Active").length;
  const inactiveCount = staff.length - activeCount;

  const filteredStaff = staff.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      emp.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const resetAddForm = () => {
    setNewStaff({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "staff",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const applyStaffList = (next: Staff[]) => {
    staffStore.setStaff(next);
    setStaff(next);
  };

  // ── Salary settings + per-staff salary view state ─────────────────────
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [rateInput, setRateInput] = useState(String(salaryStore.getHourlyRate()));
  const [salaryView, setSalaryView] = useState<Staff | null>(null);
  const [releasing, setReleasing] = useState<Staff | null>(null);
  const [, setDataTick] = useState(0);

  React.useEffect(() => {
    const unsubSalary = salaryStore.subscribe(() => setDataTick((t) => t + 1));
    const unsubAtt = attendanceStore.subscribe(() => setDataTick((t) => t + 1));
    return () => {
      unsubSalary();
      unsubAtt();
    };
  }, []);

  const handleAddStaff = () => {
    const name = newStaff.fullName.trim();
    const email = newStaff.email.trim();
    const password = newStaff.password;

    if (!name) {
      toast.error("Please enter the staff member's full name");
      return;
    }

    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error("Password does not meet security requirements");
      return;
    }

    if (password !== newStaff.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (staff.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      toast.error("This email is already a staff member");
      return;
    }

    const role: "staff" | "admin" = newStaff.role === "admin" ? "admin" : "staff";

    // Register the brand-new staff account so they can sign in
    const result = registerStaff({ name, email, password, role });
    if (!result.success) {
      toast.error(result.message || "Could not create staff account");
      return;
    }

    const staffMember: Staff = {
      id: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name,
      email: email.toLowerCase(),
      phone: "Not set",
      role: role === "admin" ? "Admin" : "Staff",
      status: "Active",
      joinDate: todayPHTKey(),
      skillsMessage: "",
      portfolioLink: "",
      performanceNotes: [],
      salary: 0,
      allowances: [],
      paymentHistory: [],
      permissions: ["view_orders", "edit_orders"],
      tasks: [],
    };

    applyStaffList([staffMember, ...staff]);
    resetAddForm();
    setShowAddDialog(false);
    toast.success("Staff account created successfully", {
      description: `${name} can now sign in with the email and password you set.`,
    });
  };

  const openEdit = (member: Staff) => {
    setEditingStaff(member);
    setEditForm({
      name: member.name,
      email: member.email,
      role: member.role === "Admin" ? "Admin" : "Staff",
      status: member.status,
    });
  };

  const handleSaveEdit = () => {
    if (!editingStaff || !editForm) return;

    const name = editForm.name.trim();
    const email = editForm.email.trim();

    if (!name) {
      toast.error("Please enter the staff member's full name");
      return;
    }

    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (
      staff.some(
        (s) =>
          s.id !== editingStaff.id &&
          s.email.toLowerCase() === email.toLowerCase(),
      )
    ) {
      toast.error("This email is already used by another staff member");
      return;
    }

    const updated: Staff = {
      ...editingStaff,
      name,
      email: email.toLowerCase(),
      role: editForm.role,
      status: editForm.status,
    };

    const accountUpdated = updateStaffAccount(editingStaff.email, {
      email: email.toLowerCase() !== editingStaff.email.toLowerCase() ? email.toLowerCase() : undefined,
      name: name !== editingStaff.name ? name : undefined,
      role: editForm.role !== editingStaff.role ? (editForm.role === "Admin" ? "admin" : "staff") : undefined,
      active: editForm.status !== editingStaff.status ? editForm.status === "Active" : undefined,
    });

    applyStaffList(staff.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStaff(null);
    setEditForm(null);
    toast.success(
      accountUpdated
        ? "Staff account updated successfully"
        : "Staff details updated successfully",
    );
  };

  const confirmActivate = (member: Staff) => {
    applyStaffList(
      staff.map((s) =>
        s.id === member.id ? { ...s, status: "Active" as const } : s,
      ),
    );
    updateStaffAccount(member.email, { active: true });
    toast.success(`${member.name}'s account has been activated`);
    setActivating(null);
  };

  const confirmDeactivate = (member: Staff) => {
    applyStaffList(
      staff.map((s) =>
        s.id === member.id ? { ...s, status: "Inactive" as const } : s,
      ),
    );
    updateStaffAccount(member.email, { active: false });
    toast.success(`${member.name}'s account has been deactivated`);
    setDeactivating(null);
  };

  return (
    <Layout menuItems={menuItems} title="Staff Management" showBackButton>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <p className="text-gray-600 mt-1">
            Manage staff accounts, roles, and access permissions.
          </p>
          <Button
            className="h-11 sm:h-10 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Tabs: Staff List | Attendance (merged staff management & attendance) */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto w-fit gap-1.5 p-1.5 sm:h-11">
            <TabsTrigger value="staff" className="gap-2 px-4">
              <Users className="w-4 h-4" />
              Staff List
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2 px-4">
              <Clock className="w-4 h-4" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="mt-0 flex flex-col gap-6">
            {/* Salary Settings */}
            <Card className="p-4 border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1D73EC]/10 text-[#1D73EC] flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      Salary Settings
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Hourly rate used to compute each staff member's salary from their attendance hours.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Hourly Rate</p>
                    <p className="text-xl font-semibold text-[#1D73EC] leading-tight">
                      ₱{formatNumber(salaryStore.getHourlyRate(), 2)} / hour
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-9 whitespace-nowrap border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white"
                    onClick={() => {
                      setRateInput(String(salaryStore.getHourlyRate()));
                      setShowRateDialog(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Rate
                  </Button>
                </div>
              </div>
            </Card>

            {/* Search and Filters */}
            <Card className="p-4 border border-slate-100 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="w-full sm:max-w-xs">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  aria-label="Search staff"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 rounded-lg"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
              <ZoomSafeDropdown
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All Statuses"
                icon={<Filter className="w-4 h-4 text-gray-500" />}
                className="mt-1.5"
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            <Button
              variant="outline"
              className="h-10 border-[#2F6FD6] text-[#2F6FD6] hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </Card>

        {/* Staff Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Staff
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Account Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Date Added
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1D73EC] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-gray-500">{member.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          member.role === "Admin"
                            ? "bg-[#1D73EC]/10 text-[#1D73EC] border border-[#1D73EC]/20"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }
                      >
                        {member.role === "Admin" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {member.status === "Active" ? (
                        <Badge className="bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-gray-600">
                        {formatDate(member.joinDate)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View attendance & salary"
                          className="group"
                          onClick={() => setSalaryView(member)}
                        >
                          <CalendarDays className="w-4 h-4 text-green-600 group-hover:text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit staff"
                          className="group"
                          onClick={() => openEdit(member)}
                        >
                          <Edit2 className="w-4 h-4 text-[#2F6FD6] group-hover:text-white" />
                        </Button>
                        {member.status === "Active" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate account"
                            className="group bg-red-50 hover:bg-red-500 hover:text-white transition-all"
                            onClick={() => setDeactivating(member)}
                          >
                            <Ban className="w-4 h-4 text-red-500 group-hover:text-white" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Activate account"
                            className="hover:bg-green-50"
                            onClick={() => setActivating(member)}
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStaff.length === 0 && (
            <div className="py-16 text-center">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No staff members found matching your search criteria.
              </p>
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-gray-500">
            <span>
              Showing {filteredStaff.length} of {staff.length} staff members
            </span>
            <span>
              {activeCount} active &middot; {inactiveCount} inactive
            </span>
          </div>
        </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-0">
            <AttendanceView />
          </TabsContent>
        </Tabs>
      </div>

      {/* Register New Staff Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">Add Staff</DialogTitle>
            <DialogDescription>
              Create a staff account. The staff member can sign in with the
              email and password you set below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="fullName"
                type="text"
                value={newStaff.fullName}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, fullName: e.target.value })
                }
                placeholder="e.g. Maria Santos"
                className="h-11 bg-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffEmail">Email Address <span className="text-red-500">*</span></Label>
              <Input
                id="staffEmail"
                type="email"
                value={newStaff.email}
                onChange={(e) =>
                  setNewStaff({ ...newStaff, email: e.target.value })
                }
                placeholder="staff@example.com"
                className="h-11 bg-white text-sm"
              />
              <p className="text-xs text-gray-500">
                Used to sign in to the new staff account
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role <span className="text-red-500">*</span></Label>
              <ZoomSafeDropdown
                value={newStaff.role}
                onChange={(value) => setNewStaff({ ...newStaff, role: value })}
                placeholder="Select role"
                triggerClassName="h-11 bg-white"
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "admin", label: "Admin" },
                ]}
              />
              <p className="text-xs text-gray-500">
                Admins get full system access, staff get order and payment
                access.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffPassword">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="staffPassword"
                    type={showPassword ? "text" : "password"}
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    placeholder="Enter password"
                    className="h-11 bg-white text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffConfirmPassword">Confirm <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="staffConfirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={newStaff.confirmPassword}
                    onChange={(e) =>
                      setNewStaff({
                        ...newStaff,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Confirm password"
                    className="h-11 bg-white text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {newStaff.password && (
              <PasswordStrengthIndicator password={newStaff.password} />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              data-primary-action
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => setShowAddConfirm(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Staff Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog
        open={!!editingStaff}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStaff(null);
            setEditForm(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              Edit Staff
            </DialogTitle>
            <DialogDescription>
              Update {editingStaff?.name || "this staff member"}'s details,
              role, and account status.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="editFullName"
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="e.g. Maria Santos"
                  className="h-11 bg-white text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editEmail">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder="staff@example.com"
                  className="h-11 bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role <span className="text-red-500">*</span></Label>
                  <ZoomSafeDropdown
                    value={editForm.role}
                    onChange={(value) =>
                      setEditForm({ ...editForm, role: value as "Staff" | "Admin" })
                    }
                    placeholder="Select role"
                    triggerClassName="h-11 bg-white"
                    options={[
                      { value: "Staff", label: "Staff" },
                      { value: "Admin", label: "Admin" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Status <span className="text-red-500">*</span></Label>
                  <ZoomSafeDropdown
                    value={editForm.status}
                    onChange={(value) =>
                      setEditForm({ ...editForm, status: value as "Active" | "Inactive" })
                    }
                    placeholder="Select status"
                    triggerClassName="h-11 bg-white"
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-11 w-full sm:w-auto"
              onClick={() => {
                setEditingStaff(null);
                setEditForm(null);
              }}
            >
              Cancel
            </Button>
            <Button
              data-primary-action
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => setShowEditConfirm(true)}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={!!activating}
        onOpenChange={(open) => {
          if (!open) setActivating(null);
        }}
        onConfirm={() => activating && confirmActivate(activating)}
        title="Activate Staff Account?"
        description={
          activating
            ? `${activating.name} will regain access to the system and can sign in again.`
            : ""
        }
        confirmLabel="Activate"
        destructive={false}
      />

      <ConfirmationDialog
        open={!!deactivating}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        onConfirm={() => deactivating && confirmDeactivate(deactivating)}
        title="Deactivate Staff Account?"
        description={
          deactivating
            ? `${deactivating.name} will no longer be able to sign in until the account is reactivated.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive={true}
      />

      <ConfirmationDialog
        open={showAddConfirm}
        onOpenChange={setShowAddConfirm}
        onConfirm={handleAddStaff}
        title="Create Staff Account?"
        description={`This will create a new sign-in account for ${newStaff.fullName.trim() || "this staff member"} (${newStaff.email.trim() || ""}). They will be able to log in with the credentials you set.`}
        confirmLabel="Create Account"
        cancelLabel="Go Back"
        destructive={false}
      />

      <ConfirmationDialog
        open={showEditConfirm}
        onOpenChange={setShowEditConfirm}
        onConfirm={handleSaveEdit}
        title={`Save Changes${editingStaff ? ` to ${editForm?.name || editingStaff.name}?` : "?"}`}
        description={`Are you sure you want to save the changes to ${editingStaff?.name || "this staff member"}'s account? Changes to email or role take effect immediately.`}
        confirmLabel="Save Changes"
        cancelLabel="Go Back"
        destructive={false}
      />

      {/* Edit Hourly Rate Dialog */}
      <Dialog
        open={showRateDialog}
        onOpenChange={(open) => {
          setShowRateDialog(open);
          if (!open) setRateInput(String(salaryStore.getHourlyRate()));
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">Edit Hourly Rate</DialogTitle>
            <DialogDescription>
              Set the hourly rate used to compute every staff member's current
              salary from their attendance hours.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (₱ per hour) <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₱</span>
              <Input
                id="hourlyRate"
                type="number"
                min={0}
                step={0.01}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="50"
                className="h-11 pl-8 bg-white text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">
                Salary = Total Approved Working Hours × Hourly Rate.
              </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={() => setShowRateDialog(false)}>
              Cancel
            </Button>
            <Button
              data-primary-action
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => {
                const rate = Number(rateInput);
                if (Number.isNaN(rate) || rate < 0) {
                  toast.error("Please enter a valid hourly rate");
                  return;
                }
                salaryStore.setHourlyRate(rate);
                setShowRateDialog(false);
                toast.success("Hourly rate updated successfully", {
                  description: `Salary computations now use ₱${formatNumber(rate, 2)} / hour.`,
                });
              }}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Save Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Salary Confirmation */}
      <ConfirmationDialog
        open={!!releasing}
        onOpenChange={(open) => {
          if (!open) setReleasing(null);
        }}
        onConfirm={() => {
          if (!releasing) return;
          const rec = salaryStore.releaseSalary(releasing.email, releasing.name, user?.name || "Admin");
          toast.success("Salary released successfully", {
            description: `${rec.staffName} earned ${formatCurrency(rec.amount)} (${formatNumber(rec.totalHours, 2)} hrs × ₱${formatNumber(rec.hourlyRate, 2)}/hr). A new salary period has started.`,
          });
          setReleasing(null);
        }}
        title="Release Salary?"
        description={
          releasing
            ? `This will mark the current salary period as paid and reset salary tracking. Attendance records are kept. Staff: ${releasing.name} · Current Salary: ${formatCurrency(
                salaryStore.getStaffSummary(releasing.email).amount,
              )}`
            : ""
        }
        confirmLabel="Confirm Release"
        cancelLabel="Go Back"
        destructive={false}
      />

      {/* View Attendance & Salary Dialog */}
      <Dialog
        open={!!salaryView}
        onOpenChange={(open) => {
          if (!open) setSalaryView(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#10316B]">
              View Attendance & Salary
            </DialogTitle>
            <DialogDescription>
              {salaryView?.name} · {salaryView?.email}
            </DialogDescription>
          </DialogHeader>

          {salaryView &&
            (() => {
              const summary = salaryStore.getStaffSummary(salaryView.email);
              const records = salaryStore.getPeriodAttendance(salaryView.email);
              const history = salaryStore.getSalaryHistory(salaryView.email);
              const periodLabel = `${formatPHDate(summary.periodStart, "short")} — ${formatPHDate(summary.periodEnd, "short")}`;

              return (
                <div className="py-2 space-y-4">
                  {/* Staff Attendance Summary */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                      Staff Attendance Summary
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-[11px] text-gray-500">Staff</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{salaryView.name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] text-gray-500">Period</p>
                        <p className="text-sm font-semibold text-gray-900">{periodLabel}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Total Hours Worked</p>
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(summary.totalHours, 2)} hrs</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Hourly Rate</p>
                        <p className="text-sm font-semibold text-gray-900">₱{formatNumber(summary.hourlyRate, 2)} / hr</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Current Salary</p>
                        <p className="text-base font-bold text-[#1D73EC]">{formatCurrency(summary.amount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance records within the period */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gray-50/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Attendance Records · Current Period
                      </p>
                      <span className="text-xs text-gray-500">{records.length} day{records.length === 1 ? "" : "s"}</span>
                    </div>
                    {records.length === 0 ? (
                      <div className="py-8 text-center">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No attendance records in the current period.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Clock In</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Clock Out</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Hours</th>
                              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {records.map((r) => {
                              const hours = sessionTotalMs(r, nowPHT()) / 3_600_000;
                              const status = hasActiveSession(r) ? "Active" : r.timeIn && r.timeOut ? (r.exceeded ? "Exceeded" : "Complete") : "Incomplete";
                              return (
                                <tr key={r.id} className="hover:bg-gray-50/70">
                                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatPHDate(r.date, "short")}</td>
                                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatPHT(r.timeIn)}</td>
                                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                                    {r.timeOut ? formatPHT(r.timeOut) : <span className="text-green-600 font-medium">On Clock</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatNumber(hours, 2)} hrs</td>
                                  <td className="px-4 py-2.5">
                                    <Badge className={
                                      status === "Complete"
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : status === "Active"
                                        ? "bg-blue-50 text-[#1D73EC] border border-blue-200"
                                        : status === "Exceeded"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }>
                                      {status}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Release Salary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Current Salary: {formatCurrency(summary.amount)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Releasing pays this period and starts a new tracking period. Attendance history is kept.
                      </p>
                    </div>
                    <Button
                      className="h-10 w-full sm:w-auto bg-[#2F6FD6] text-white hover:bg-[#2557b8]"
                      onClick={() => setReleasing(salaryView)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Release Salary
                    </Button>
                  </div>

                  {/* Salary History */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gray-50/70">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        Salary History
                      </p>
                      <span className="text-xs text-gray-500">{history.length} release{history.length === 1 ? "" : "s"}</span>
                    </div>
                    {history.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">No releases yet for this staff member.</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        {history.map((h) => (
                          <div key={h.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatPHDate(h.periodStart, "short")} - {formatPHDate(h.periodEnd, "short")}
                              </p>
                              <p className="text-sm font-bold text-[#1D73EC]">{formatCurrency(h.amount)}</p>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div>
                                <p className="text-gray-500">Hours Worked</p>
                                <p className="font-medium text-gray-800">{formatNumber(h.totalHours, 2)} hrs</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Rate</p>
                                <p className="font-medium text-gray-800">₱{formatNumber(h.hourlyRate, 2)}/hr</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Release Date</p>
                                <p className="font-medium text-gray-800">{formatPHDateTime(h.releasedAt)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Released By</p>
                                <p className="font-medium text-gray-800">{h.releasedBy}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}