import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, FileText, Briefcase, Package, User, Mail, Phone, ArrowLeft, CheckCircle, AlertCircle, Key, Shield, Camera } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../Layout';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { ConfirmationDialog } from '../ui/confirmation-dialog';
import { useAuth } from '../../contexts/AuthContext';
import { PasswordStrengthIndicator, validatePassword } from '../ui/password-strength-indicator';

const menuItems = [
  { label: 'Dashboard', path: '/customer/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Print Request', path: '/customer/new-request', icon: <FileText className="w-5 h-5" /> },
  { label: 'My Orders', path: '/customer/orders', icon: <Package className="w-5 h-5" /> },
  { label: 'Job Board', path: '/customer/job-board', icon: <Briefcase className="w-5 h-5" /> },
];

const STORAGE_KEY = 'customer_profile_data';

const defaultProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '0912 345 6789',
  studentId: 'STU-2024-001',
};

export default function CustomerProfile() {
  const navigate = useNavigate();
  // Layout will be updated with showBackButton prop below
  const { user, enableMFA, disableMFA, resetPassword, updateProfile, logout } = useAuth();
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [showDisableMFADialog, setShowDisableMFADialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const nameParts = (user?.name || '').split(' ');
    const defaultFirstName = nameParts[0] || '';
    const defaultLastName = nameParts.slice(1).join(' ') || '';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle migration from old 'name' field to firstName/lastName
        if (parsed.name && !parsed.firstName && !parsed.lastName) {
          const parts = parsed.name.split(' ');
          return {
            ...parsed,
            firstName: parts[0] || defaultFirstName,
            lastName: parts.slice(1).join(' ') || defaultLastName,
            email: user?.email || parsed.email
          };
        }
        return {
          ...parsed,
          firstName: parsed.firstName || defaultFirstName,
          lastName: parsed.lastName || defaultLastName,
          email: user?.email || parsed.email
        };
      } catch {
        return {
          ...defaultProfileData,
          firstName: defaultFirstName,
          lastName: defaultLastName,
          email: user?.email || defaultProfileData.email
        };
      }
    }
    return {
      ...defaultProfileData,
      firstName: defaultFirstName,
      lastName: defaultLastName,
      email: user?.email || defaultProfileData.email
    };
  });
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    const savedImage = localStorage.getItem('customer_profile_image');
    return savedImage || user?.profileImage || null;
  });

  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user?.profileImage]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const nameParts = (user?.name || '').split(' ');
    const defaultFirstName = nameParts[0] || '';
    const defaultLastName = nameParts.slice(1).join(' ') || '';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle migration from old 'name' field to firstName/lastName
        if (parsed.name && !parsed.firstName && !parsed.lastName) {
          const parts = parsed.name.split(' ');
          setFormData({
            ...parsed,
            firstName: parts[0] || defaultFirstName,
            lastName: parts.slice(1).join(' ') || defaultLastName,
            email: user?.email || parsed.email
          });
        } else {
          setFormData({
            ...parsed,
            firstName: parsed.firstName || defaultFirstName,
            lastName: parsed.lastName || defaultLastName,
            email: user?.email || parsed.email
          });
        }
      } catch {
        setFormData({
          ...defaultProfileData,
          firstName: defaultFirstName,
          lastName: defaultLastName,
          email: user?.email || defaultProfileData.email
        });
      }
    }
  }, [user]);

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Please choose an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setProfileImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setShowSaveDialog(true);
  };

  const confirmSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    if (profileImage) {
      localStorage.setItem('customer_profile_image', profileImage);
    } else {
      localStorage.removeItem('customer_profile_image');
    }
    updateProfile({ profileImage });
    setIsEditing(false);
    setShowSavedMessage(true);
    setShowSaveDialog(false);
    setTimeout(() => setShowSavedMessage(false), 3000);
  };

  const handleChangePassword = () => {
    console.log('Change password clicked');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    // Check if current password is the same as new password
    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from your current password');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      toast.error('Password does not meet security requirements');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    console.log('All validations passed, calling resetPassword');

    // Use the resetPassword function from AuthContext (with user email)
    if (user && resetPassword(user.email, passwordData.currentPassword, passwordData.newPassword)) {
      console.log('Password reset successful');
      toast.success('Password changed successfully!');
      setShowChangePasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } else {
      console.log('Password reset failed');
      toast.error('Current password is incorrect or password was previously used');
    }
  };

  const handleEnableMFA = () => {
    const secret = enableMFA();
    setMfaSecret(secret);
    setShowMFADialog(true);
  };

  const handleDisableMFA = () => {
    setShowDisableMFADialog(true);
  };

  const confirmDisableMFA = () => {
    disableMFA();
    setShowDisableMFADialog(false);
    toast.success('Multi-factor authentication disabled');
  };

  return (
    <Layout menuItems={menuItems} title="Profile Settings" showBackButton backButtonPath="/customer/dashboard">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account information</p>
        </div>

        {/* Success Message */}
        {showSavedMessage && (
          <div className="bg-white border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Profile changes saved successfully!</p>
          </div>
        )}

        {/* Profile Card */}
        <Card className="p-8 bg-white shadow-sm">
          <div className="flex flex-col gap-5 mb-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#1D73EC] text-2xl font-semibold text-white ring-4 ring-white shadow-sm">
                {profileImage ? (
                  <img src={profileImage} alt="Profile preview" className="h-full w-full rounded-full object-cover" />
                ) : (
                  user?.name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U'
                )}
                {isEditing && (
                  <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#1D73EC] text-white shadow-lg ring-2 ring-white">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                  </label>
                )}
                {isEditing && profileImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage(null)}
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{user?.name}</h2>
                <p className="text-gray-500 capitalize">{user?.role} Account</p>
              </div>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <div className={`flex w-full flex-col gap-2 sm:w-auto sm:flex-row ${profileImage ? "pt-8" : ""}`}>
                <Button
                  className="order-1 w-full bg-white text-[#2F6FD6] border-2 border-blue-200 hover:bg-[#2F6FD6] hover:text-white sm:order-2 sm:w-auto"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="order-2 w-full sm:order-1 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Contact Number</Label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <Input
                  id="studentId"
                  type="text"
                  value={formData.studentId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="p-8 bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Security</h3>

          <div className="space-y-2">
            <div className="flex flex-col items-start gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-gray-900">Password</p>
                <p className="mt-1 hidden text-sm text-gray-500 sm:block">Change your account password</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowChangePasswordDialog(true)}
                className="w-full border-[#2F6FD6] text-[#2F6FD6] hover:bg-white hover:text-[#2F6FD6] border-2 border-blue-200 sm:w-auto"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>

            <div className="flex flex-col gap-3 pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">Multi-Factor Authentication</p>
                </div>
                <p className="mt-1 hidden text-sm text-gray-500 sm:block">
                  {user?.mfaEnabled
                    ? 'Additional security layer is active'
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Button
                variant="outline"
                onClick={user?.mfaEnabled ? handleDisableMFA : handleEnableMFA}
                className={`w-full sm:w-auto ${
                  user?.mfaEnabled
                    ? 'border-blue-600 text-blue-600 hover:bg-blue-50 border-2 border-blue-200'
                    : 'border-blue-600 text-blue-600 hover:bg-white hover:text-blue-600 border-2 border-blue-200'
                }`}
              >
                <Shield className="w-4 h-4 mr-2" />
                {user?.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="pb-4">
          <Button
            variant="outline"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-[#1D73EC]" />
              </div>
              <DialogTitle className="text-xl">Save Changes?</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Are you sure you want to save these changes to your profile?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSave}
              className="bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Setup Dialog */}
      <Dialog open={showMFADialog} onOpenChange={setShowMFADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <DialogTitle className="text-xl">Enable Multi-Factor Authentication</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Scan this QR code with your authenticator app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-white p-4 border-2 border-gray-200 rounded-lg">
              <div className="bg-gray-100 h-48 flex items-center justify-center rounded">
                <p className="text-sm text-gray-500 text-center px-4">
                  QR Code Placeholder<br />
                  <span className="text-xs">In production, show actual TOTP QR code</span>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Or enter this code manually:</Label>
              <Input
                value={mfaSecret}
                readOnly
                className="font-mono text-xs"
              />
            </div>
            <div className="p-3 bg-white border-2 border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-xs text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>Scan the QR code or enter the code manually</li>
                <li>Enter the 6-digit code from your app when logging in</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowMFADialog(false);
                toast.success('Multi-factor authentication enabled successfully!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableMFADialog} onOpenChange={setShowDisableMFADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable MFA?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable multi-factor authentication? This will reduce the security of your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableMFADialog(false)}>Keep MFA</Button>
            <Button onClick={confirmDisableMFA} className="bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white">Disable MFA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Key className="w-6 h-6 text-[#1D73EC]" />
              </div>
              <DialogTitle className="text-xl">Change Password</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password (min. 8 characters)"
                className={passwordData.currentPassword && passwordData.newPassword && passwordData.currentPassword === passwordData.newPassword ? "border-red-500" : ""}
              />
              {passwordData.currentPassword && passwordData.newPassword && passwordData.currentPassword === passwordData.newPassword && (
                <div className="flex items-center gap-2 text-red-600 text-sm mt-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>New password must be different from current password</span>
                </div>
              )}
              {passwordData.newPassword && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={passwordData.newPassword} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowChangePasswordDialog(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!validatePassword(passwordData.newPassword).isValid || (passwordData.currentPassword === passwordData.newPassword && passwordData.currentPassword !== '')}
              className={`${
                validatePassword(passwordData.newPassword).isValid && !(passwordData.currentPassword === passwordData.newPassword && passwordData.currentPassword !== '')
                  ? "bg-white text-[#1D73EC] border-2 border-blue-200 hover:bg-[#1D73EC] hover:text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showLogoutConfirm && (
        <ConfirmationDialog
          open
          onOpenChange={setShowLogoutConfirm}
          onConfirm={() => { logout(); setShowLogoutConfirm(false); }}
          title="Sign out of Docufy?"
          description="You will be returned to the sign-in page. Your session will be preserved, but sign-in will be required to continue."
          confirmLabel="Log Out"
          cancelLabel="Stay Signed In"
          destructive={true}
        />
      )}
    </Layout>
  );
}