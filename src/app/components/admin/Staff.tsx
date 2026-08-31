import React, { useState } from "react";
import {
  UserPlus,
  Shield,
  User,
  Ban,
  UserCheck,
  Edit2,
  Eye,
  EyeOff,
  Search,
  Filter,
  Mail,
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

import { adminMenuItems } from "../../utils/adminMenuItems";
import { formatPHDate, todayPHTKey } from "../../utils/pht";

const menuItems = adminMenuItems;

interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  joinDate: string;
  skillsMessage: string;
  portfolioLink: string;
  performanceNotes: {
    date: string;
    note: string;
    rating: number;
  }[];
  salary: number;
  allowances: { type: string; amount: number }[];
  paymentHistory: {
    date: string;
    amount: number;
    type: string;
  }[];
  permissions: string[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }[];
}

const staffData: Staff[] = [
  {
    id: "EMP-001",
    name: "Heaven Rica",
    email: "staff@test.com",
    phone: "0912 345 6789",
    role: "Staff",
    status: "Active",
    joinDate: "2025-09-01",
    skillsMessage: "I have extensive experience in managing daily print operations, quality control, equipment maintenance, color management, and providing excellent customer service. Certified Print Professional with proven track record.",
    portfolioLink: "https://drive.google.com/heavenrica-portfolio",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Excellent performance, handled rush orders efficiently",
        rating: 5,
      },
      {
        date: "2026-03-01",
        note: "Successfully trained 2 new staffs",
        rating: 5,
      },
      {
        date: "2026-02-01",
        note: "Improved print quality standards",
        rating: 4,
      },
    ],
    salary: 18000,
    allowances: [
      { type: "Transportation", amount: 2000 },
      { type: "Meal", amount: 1500 },
    ],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 21500,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 21500,
        type: "Monthly Salary",
      },
      {
        date: "2026-02-15",
        amount: 21500,
        type: "Monthly Salary",
      },
    ],
    permissions: [
      "view_orders",
      "edit_orders",
      "view_reports",
    ],
    tasks: [
      {
        id: "TSK-001",
        title: "Quality check for color prints",
        status: "Completed",
        priority: "High",
        dueDate: "2026-04-20",
      },
      {
        id: "TSK-002",
        title: "Train new staff on binding",
        status: "In Progress",
        priority: "Medium",
        dueDate: "2026-04-25",
      },
      {
        id: "TSK-003",
        title: "Printer toner check",
        status: "Pending",
        priority: "Low",
        dueDate: "2026-04-30",
      },
    ],
  },
  {
    id: "EMP-002",
    name: "Robert Chen",
    email: "robert.chen@docufy.com",
    phone: "0923 456 7890",
    role: "Staff",
    status: "Active",
    joinDate: "2025-10-15",
    skillsMessage: "Proficient in printing operations, equipment setup, document binding, and customer support. Quick learner with attention to detail.",
    portfolioLink: "https://linkedin.com/in/robertchen",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Good attendance and punctuality",
        rating: 4,
      },
      {
        date: "2026-03-01",
        note: "Needs improvement in color matching",
        rating: 3,
      },
    ],
    salary: 15000,
    allowances: [{ type: "Transportation", amount: 1500 }],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 16500,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 16500,
        type: "Monthly Salary",
      },
    ],
    permissions: ["view_orders", "edit_orders"],
    tasks: [
      {
        id: "TSK-004",
        title: "Process customer orders",
        status: "Completed",
        priority: "High",
        dueDate: "2026-04-21",
      },
      {
        id: "TSK-005",
        title: "Clean and maintain printers",
        status: "Completed",
        priority: "Medium",
        dueDate: "2026-04-22",
      },
    ],
  },
  {
    id: "EMP-003",
    name: "Katie Perry",
    email: "katie.perry@docufy.com",
    phone: "0934 567 8901",
    role: "Staff",
    status: "Active",
    joinDate: "2026-01-10",
    skillsMessage: "Excellent customer service skills, experienced in payment processing, order management, and professional communication.",
    portfolioLink: "",
    performanceNotes: [
      {
        date: "2026-04-01",
        note: "Excellent customer service skills",
        rating: 5,
      },
      {
        date: "2026-03-01",
        note: "Quick learner, adapting well to role",
        rating: 4,
      },
    ],
    salary: 14000,
    allowances: [{ type: "Meal", amount: 1000 }],
    paymentHistory: [
      {
        date: "2026-04-15",
        amount: 15000,
        type: "Monthly Salary",
      },
      {
        date: "2026-03-15",
        amount: 15000,
        type: "Monthly Salary",
      },
      {
        date: "2026-02-15",
        amount: 15000,
        type: "Monthly Salary",
      },
    ],
    permissions: ["view_orders", "verify_payments"],
    tasks: [
      {
        id: "TSK-006",
        title: "Verify payment receipts",
        status: "In Progress",
        priority: "High",
        dueDate: "2026-04-22",
      },
      {
        id: "TSK-007",
        title: "Update customer database",
        status: "Pending",
        priority: "Low",
        dueDate: "2026-04-28",
      },
    ],
  },
];

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
  const { registerStaff, updateStaffAccount } = useAuth();

  const [staff, setStaff] = useState<Staff[]>(staffData);
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

    setStaff([staffMember, ...staff]);
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

    setStaff(staff.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStaff(null);
    setEditForm(null);
    toast.success(
      accountUpdated
        ? "Staff account updated successfully"
        : "Staff details updated successfully",
    );
  };

  const confirmActivate = (member: Staff) => {
    setStaff(
      staff.map((s) =>
        s.id === member.id ? { ...s, status: "Active" as const } : s,
      ),
    );
    updateStaffAccount(member.email, { active: true });
    toast.success(`${member.name}'s account has been activated`);
    setActivating(null);
  };

  const confirmDeactivate = (member: Staff) => {
    setStaff(
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

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#FBFDFF] border-gray-200 shadow-sm ring-1 ring-blue-300 rounded-lg"
              />
            </div>
            <div className="w-full md:w-56">
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                          <p className="text-xs text-gray-400">{member.id}</p>
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
                          title="Edit staff"
                          onClick={() => openEdit(member)}
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        {member.status === "Active" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Deactivate account"
                            className="hover:bg-red-50"
                            onClick={() => setDeactivating(member)}
                          >
                            <Ban className="w-4 h-4 text-red-500" />
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
              <Label htmlFor="fullName">Full Name *</Label>
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
              <Label htmlFor="staffEmail">Email Address *</Label>
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
              <Label>Role *</Label>
              <Select
                value={newStaff.role}
                onValueChange={(value) =>
                  setNewStaff({ ...newStaff, role: value })
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Admins get full system access, staff get order and payment
                access.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staffPassword">Password *</Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffConfirmPassword">Confirm *</Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={handleAddStaff}
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
                <Label htmlFor="editFullName">Full Name *</Label>
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
                <Label htmlFor="editEmail">Email Address *</Label>
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
                  <Label>Role *</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        role: value as "Staff" | "Admin",
                      })
                    }
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Status *</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        status: value as "Active" | "Inactive",
                      })
                    }
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
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
              className="h-11 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={handleSaveEdit}
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
        destructive={true}
      />
    </Layout>
  );
}