import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  CreditCard,
  Package,
  Boxes,
  Users,
  FileText,
  UserPlus,
  Briefcase,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Shield,
  DollarSign,
  Award,
  ClipboardList,
  Eye,
  EyeOff,
  Info,
  Ban,
  UserCheck,
  Search,
  Filter,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../Layout";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { PasswordStrengthIndicator, validatePassword } from "../ui/password-strength-indicator";
import { useAuth } from "../../contexts/AuthContext";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
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

export default function Staff() {
  const { registerStaff } = useAuth();
  const [staff, setStaff] =
    useState<Staff[]>([]);
  const [archivedStaff, setArchivedStaff] = useState<Staff[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedStaff, setSelectedStaff] =
    useState<Staff | null>(null);
  const [originalStaff, setOriginalStaff] =
    useState<Staff | null>(null);
  const [showDetailDialog, setShowDetailDialog] =
    useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [newStaff, setNewStaff] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    startDate: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const displayStaff = showArchived ? archivedStaff : staff;

  const filteredStaff = displayStaff.filter((emp) => {
    const matchesSearch =
      emp.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      emp.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      emp.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-blue-700";
      case "Inactive":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-blue-700 text-white";
      case "medium":
        return "bg-white border-2 border-blue-2000 text-white";
      case "low":
        return "bg-amber-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-600 text-white";
      case "in progress":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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

    // Register the brand-new staff account so they can sign in
    const result = registerStaff({ name, email, password });
    if (!result.success) {
      toast.error(result.message || "Could not create staff account");
      return;
    }

    const staffMember: Staff = {
      id: `EMP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      name,
      email: email.toLowerCase(),
      phone: "Not set",
      role: "Staff",
      status: "Active",
      joinDate: newStaff.startDate || new Date().toISOString().split("T")[0],
      skillsMessage: "",
      portfolioLink: "",
      performanceNotes: [],
      salary: 0,
      allowances: [],
      paymentHistory: [],
      permissions: ["view_orders", "edit_orders"],
      tasks: [],
    };

    setStaff([...staff, staffMember]);
    setNewStaff({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      startDate: "",
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowAddDialog(false);
    toast.success(
      `${staffMember.name} has been registered as Staff!\nThey can sign in using the email and password you set.`,
    );
  };

  return (
    <Layout menuItems={menuItems} title="Staff Management" showBackButton>
      <div className="space-y-6">
        {/* Header with Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <p className="text-gray-600 mt-1">
              Manage staff profiles, tasks, and payroll
            </p>
          </div>
          <div className="flex flex-col w-full sm:w-auto gap-2 sm:flex-row">
            <Button
              variant={showArchived ? "outline" : "default"}
              className={`h-11 sm:h-10 w-full sm:w-auto ${showArchived ? "" : "bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"}`}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Show Active" : `Show Archived (${archivedStaff.length})`}
            </Button>
            <Button
              className="h-11 sm:h-10 w-full sm:w-auto bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>
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
                <SelectItem value="inactive">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map((staffMember) => (
            <Card
              key={staffMember.id}
              className="p-6 bg-white shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedStaff(staffMember);
                setOriginalStaff(JSON.parse(JSON.stringify(staffMember)));
                setShowDetailDialog(true);
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-[#1D73EC] rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {staffMember.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <Badge
                  className={getStatusColor(staffMember.status)}
                >
                  {staffMember.status}
                </Badge>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {staffMember.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {staffMember.id}
              </p>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {staffMember.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{staffMember.phone}</span>
                </div>
              </div>


              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Joined: {staffMember.joinDate}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#2F6FD6] hover:text-[#1e5bb8] hover:bg-white border-2 border-blue-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStaff(staffMember);
                    setOriginalStaff(JSON.parse(JSON.stringify(staffMember)));
                    setShowDetailDialog(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <Card className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No staff members found matching your search criteria.
            </p>
          </Card>
        )}

        {/* Staff Detail Dialog */}
        <Dialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
        >
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1D73EC] rounded-full flex items-center justify-center text-white font-bold">
                  {selectedStaff?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedStaff?.name}
                  </h2>
                  <p className="text-sm text-gray-600 font-normal">
                    {selectedStaff?.id}
                  </p>
                </div>
              </DialogTitle>
              <DialogDescription>
                View and manage staff details and permissions
              </DialogDescription>
            </DialogHeader>

            {selectedStaff && (
              <>
                <Tabs defaultValue="profile" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="access">
                      Access
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 max-h-[500px] overflow-y-auto">
                  {/* Profile Tab */}
                  <TabsContent
                    value="profile"
                    className="space-y-4"
                  >
                    <Card className="p-4">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-[#2F6FD6]" />
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-600">
                            Email
                          </Label>
                          <p className="font-medium">
                            {selectedStaff.email}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Phone
                          </Label>
                          <p className="font-medium">
                            {selectedStaff.phone}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">
                            Status
                          </Label>
                          <Badge
                            className={getStatusColor(
                              selectedStaff.status,
                            )}
                          >
                            {selectedStaff.status}
                          </Badge>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 relative">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#2F6FD6]" />
                        Skill Description
                      </h3>
                      <Textarea
                        value={selectedStaff.skillsMessage || ""}
                        onChange={(e) =>
                          setSelectedStaff({
                            ...selectedStaff,
                            skillsMessage: e.target.value,
                          })
                        }
                        placeholder="Enter skills, experience, or message..."
                        className="min-h-[100px] bg-gray-50"
                        disabled={true}
                      />
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Staff Only
                        </Badge>
                      </div>
                    </Card>

                    <Card className="p-4 relative">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#2F6FD6]" />
                        Resume
                      </h3>
                      <Input
                        value={selectedStaff.portfolioLink || ""}
                        onChange={(e) =>
                          setSelectedStaff({
                            ...selectedStaff,
                            portfolioLink: e.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="bg-gray-50"
                        disabled={true}
                      />
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Staff Only
                        </Badge>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* Access Tab */}
                  <TabsContent
                    value="access"
                    className="space-y-4"
                  >
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Shield className="w-5 h-5 text-[#2F6FD6]" />
                          Role & Permissions
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-600 mb-2 block">
                            Role
                          </Label>
                          <Select
                            value={selectedStaff.role}
                            onValueChange={(value) => {
                              setSelectedStaff({
                                ...selectedStaff,
                                role: value,
                              });
                              toast.success(`Role updated to ${value}`);
                            }}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Staff">Staff</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Promote staff to Admin to grant full system access
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600 mb-2 block">
                            Permissions
                          </Label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              "view_orders",
                              "edit_orders",
                              "view_reports",
                              "verify_payments",
                            ].map((permission) => {
                              const hasPermission =
                                selectedStaff.permissions.includes(
                                  permission,
                                );
                              return (
                                <div
                                  key={permission}
                                  className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    hasPermission
                                      ? "bg-white border-2 border-blue-200 border-[#1D73EC]"
                                      : "bg-gray-50 border-gray-200 hover:border-[#1D73EC]"
                                  }`}
                                  onClick={() => {
                                    const updatedPermissions =
                                      hasPermission
                                        ? selectedStaff.permissions.filter(
                                            (p) => p !== permission,
                                          )
                                        : [
                                            ...selectedStaff.permissions,
                                            permission,
                                          ];
                                    const updatedStaff = {
                                      ...selectedStaff,
                                      permissions: updatedPermissions,
                                    };
                                    setSelectedStaff(
                                      updatedStaff,
                                    );
                                    toast.success(
                                      hasPermission
                                        ? "Permission removed"
                                        : "Permission granted",
                                    );
                                  }}
                                >
                                  <span className="text-sm font-medium text-gray-700">
                                    {permission.replace(/_/g, " ")}
                                  </span>
                                  {hasPermission ? (
                                    <CheckCircle className="w-5 h-5 text-[#1D73EC]" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-gray-300" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h3 className="font-bold text-lg mb-4">
                        Account Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-white hover:text-blue-600 border-2 border-blue-200"
                          onClick={() => {
                            if (selectedStaff.status === "Active") {
                              setShowDeactivateConfirm(true);
                            } else {
                              setShowActivateConfirm(true);
                            }
                          }}
                        >
                          {selectedStaff.status === "Active" ? (
                            <>
                              <Ban className="w-4 h-4 mr-2" />
                              Deactivate Account
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate Account
                            </>
                          )}
                        </Button>
                        {selectedStaff.status === "Inactive" && (
                          <Button
                            variant="outline"
                            className="text-blue-700 border-blue-700 hover:bg-white hover:text-blue-700 border-2 border-blue-200"
                            onClick={() => {
                              setShowArchiveConfirm(true);
                            }}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Archive Staff Member
                          </Button>
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Save Changes Footer */}
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (originalStaff) {
                      setSelectedStaff(originalStaff);
                      setStaff(
                        staff.map((emp) =>
                          emp.id === originalStaff.id ? originalStaff : emp,
                        ),
                      );
                    }
                    setShowDetailDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white"
                  onClick={() => {
                    setShowSaveConfirm(true);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </>
            )}
          </DialogContent>
        </Dialog>

        {/* Register New Staff Dialog */}
        <Dialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setShowPassword(false);
              setShowConfirmPassword(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#10316B]">Register New Staff</DialogTitle>
              <DialogDescription>
                Create a brand-new staff account. The staff member can sign in with the email and
                password you set below.
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
                    setNewStaff({
                      ...newStaff,
                      fullName: e.target.value,
                    })
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
                    setNewStaff({
                      ...newStaff,
                      email: e.target.value,
                    })
                  }
                  placeholder="staff@example.com"
                  className="h-11 bg-white text-sm"
                />
                <p className="text-xs text-gray-500">
                  Used to sign in to the new staff account
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
                        setNewStaff({
                          ...newStaff,
                          password: e.target.value,
                        })
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

              <div className="space-y-2">
                <Label htmlFor="staffStartDate">Start Date</Label>
                <Input
                  id="staffStartDate"
                  type="date"
                  value={newStaff.startDate}
                  onChange={(e) =>
                    setNewStaff({
                      ...newStaff,
                      startDate: e.target.value,
                    })
                  }
                  className="h-11 bg-white text-sm"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-800 flex items-start gap-2 leading-relaxed">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    The new account can sign in immediately with these credentials. They must Time
                    In on the staff dashboard before processing orders or verifying payments.
                  </span>
                </p>
              </div>
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
                Register Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialogs */}
        {selectedStaff && (
          <>
            <ConfirmationDialog
              open={showActivateConfirm}
              onOpenChange={setShowActivateConfirm}
              onConfirm={() => {
                const updatedStaff = {
                  ...selectedStaff,
                  status: "Active" as const,
                };
                setSelectedStaff(updatedStaff);
                toast.success("Account activated");
              }}
              title="Activate Staff Account?"
              description="This will reactivate the staff member's account and restore their access to the system."
              destructive={false}
            />

            <ConfirmationDialog
              open={showDeactivateConfirm}
              onOpenChange={setShowDeactivateConfirm}
              onConfirm={() => {
                const updatedStaff = {
                  ...selectedStaff,
                  status: "Inactive" as const,
                };
                setSelectedStaff(updatedStaff);
                toast.success("Account deactivated");
              }}
              title="Deactivate Staff Account?"
              description="This will temporarily disable the staff member's account. They will not be able to access the system until reactivated."
              destructive={true}
            />

            <ConfirmationDialog
              open={showArchiveConfirm}
              onOpenChange={setShowArchiveConfirm}
              onConfirm={() => {
                setArchivedStaff([...archivedStaff, selectedStaff]);
                setStaff(staff.filter(emp => emp.id !== selectedStaff.id));
                setShowDetailDialog(false);
                toast.success(`${selectedStaff.name} has been archived`);
              }}
              title="Archive Staff Member?"
              description="This action will permanently archive this staff member. This cannot be undone."
              destructive={true}
            />

            <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Settings className="w-6 h-6 text-[#1D73EC]" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">DocuFy</DialogTitle>
                      <p className="text-sm text-gray-600 font-normal">Confirm Changes</p>
                    </div>
                  </div>
                  <DialogDescription className="text-base">
                    Are you sure you want to save all changes made to {selectedStaff?.name}'s profile and permissions?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setStaff(
                        staff.map((emp) =>
                          emp.id === selectedStaff!.id ? selectedStaff! : emp,
                        ),
                      );
                      setOriginalStaff(selectedStaff);
                      setShowSaveConfirm(false);
                      setShowDetailDialog(false);
                      toast.success("Staff details updated successfully");
                    }}
                    className="bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white"
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </Layout>
  );
}