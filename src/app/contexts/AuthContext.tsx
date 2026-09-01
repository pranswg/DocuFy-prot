import React, { useState, createContext, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { sessionManager } from '../utils/sessionManager';

// Auth Types
export interface User {
  name: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  profileImage?: string;
  active?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; requiresMFA?: boolean; reason?: 'inactive' };
  verifyMFA: (code: string) => boolean;
  cancelMFA: () => void;
  enableMFA: () => string;
  disableMFA: () => void;
  signup: (data: any) => boolean;
  registerStaff: (data: { name: string; email: string; password: string; role?: 'staff' | 'admin' }) => { success: boolean; message?: string };
  updateStaffAccount: (currentEmail: string, updates: { email?: string; name?: string; role?: 'staff' | 'admin'; active?: boolean }) => boolean;
  updateProfile: (data: Partial<User> & { profileImage?: string | null }) => void;
  logout: () => void;
  resetPassword: (email: string, currentPassword: string, newPassword: string) => boolean;
  sendPasswordResetCode: (email: string) => boolean;
  verifyResetCode: (email: string, code: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Test accounts for local UI testing only
const mockUsers = [
  {
    email: 'customer@test.com',
    password: 'customer123',
    name: 'Customer User',
    role: 'customer' as const,
    active: true,
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP',
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
  {
    email: 'staff@test.com',
    password: 'staff123',
    name: 'Staff User',
    role: 'staff' as const,
    active: true,
    mfaEnabled: true,
    mfaSecret: 'HXDMVJECJJWSRB3H',
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
  {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin' as const,
    active: true,
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPFQQHO33S',
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
];

// Store for password reset codes
const passwordResetCodes: { [email: string]: string } = {};

// Persist the logged-in user across page reloads so refreshing while signed in
// does not bounce the user back to the login page.
const AUTH_SESSION_KEY = 'docufy_auth_session';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.email || !parsed.name || !parsed.role) return null;
    return parsed as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [pendingMFAUser, setPendingMFAUser] = useState<any>(null);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      sessionManager.init(() => {
        toast.error('Session expired due to inactivity. Please log in again.');
        logout();
      });
    }
    return () => {
      sessionManager.destroy();
    };
  }, [user]);

  const login = (email: string, password: string) => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    if (foundUser) {
      if (foundUser.active === false) {
        return { success: false, reason: 'inactive' as const };
      }
      setPendingMFAUser(foundUser);
      return { success: true, requiresMFA: true };
    }
    return { success: false };
  };

  const verifyMFA = (code: string) => {
    if (pendingMFAUser) {
      if (code.length === 6 && /^\d{6}$/.test(code)) {
        setUser({
          name: pendingMFAUser.name,
          email: pendingMFAUser.email,
          role: pendingMFAUser.role,
          mfaEnabled: true,
          mfaVerified: true,
          profileImage: pendingMFAUser.profileImage,
        });
        setPendingMFAUser(null);
        return true;
      } else {
        toast.error('Invalid MFA code. Please enter a 6-digit code.');
      }
    }
    return false;
  };

  const cancelMFA = () => {
    setPendingMFAUser(null);
  };

  const enableMFA = () => {
    const secret =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    if (user) {
      const userIndex = mockUsers.findIndex(u => u.email === user.email);
      if (userIndex !== -1) {
        mockUsers[userIndex].mfaEnabled = true;
        mockUsers[userIndex].mfaSecret = secret;
        setUser({ ...user, mfaEnabled: true });
      }
    }
    return secret;
  };

  const disableMFA = () => {
    if (user) {
      const userIndex = mockUsers.findIndex(u => u.email === user.email);
      if (userIndex !== -1) {
        mockUsers[userIndex].mfaEnabled = false;
        mockUsers[userIndex].mfaSecret = '';
        setUser({ ...user, mfaEnabled: false });
      }
    }
  };

  const signup = (data: any) => {
    // Combine firstName and lastName to create full name
    const fullName = data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`.trim()
      : data.fullName || data.name || 'User';

    const newUser = {
      email: data.email,
      password: data.password,
      name: fullName,
      role: 'customer' as const,
      active: true,
      mfaEnabled: true,
      mfaSecret: Math.random().toString(36).substring(2, 15),
      passwordHistory: [] as string[],
      profileImage: data.profileImage || undefined,
    };
    mockUsers.push(newUser);
    setUser({
      name: fullName,
      email: data.email,
      role: 'customer',
      mfaEnabled: true,
      mfaVerified: true,
      profileImage: data.profileImage || undefined,
    });
    toast.success(
      'Account created! MFA is required for all accounts. You will be prompted to verify on login.'
    );
    return true;
  };

  const registerStaff = (data: { name: string; email: string; password: string; role?: 'staff' | 'admin' }) => {
    if (!data.name || !data.email || !data.password) {
      return { success: false, message: 'All fields are required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (mockUsers.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const newStaff: any = {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role || 'staff',
      active: true,
      mfaEnabled: true,
      mfaSecret: Math.random().toString(36).substring(2, 15),
      passwordHistory: [] as string[],
      profileImage: undefined,
      isAdminRegistered: true,
    };
    mockUsers.push(newStaff);
    return { success: true };
  };

  const updateStaffAccount = (currentEmail: string, updates: {
    email?: string;
    name?: string;
    role?: 'staff' | 'admin';
    active?: boolean;
  }) => {
    const userIndex = mockUsers.findIndex(
      u => u.email.toLowerCase() === currentEmail.toLowerCase() && u.role !== 'customer'
    );
    if (userIndex === -1) return false;
    if (updates.email) {
      const conflict = mockUsers.some(
        (u, i) => i !== userIndex && u.email.toLowerCase() === updates.email!.toLowerCase()
      );
      if (conflict) return false;
      mockUsers[userIndex].email = updates.email;
    }
    if (typeof updates.name === 'string') mockUsers[userIndex].name = updates.name;
    if (updates.role === 'staff' || updates.role === 'admin') mockUsers[userIndex].role = updates.role;
    if (typeof updates.active === 'boolean') mockUsers[userIndex].active = updates.active;
    return true;
  };

  const updateProfile = (data: Partial<User> & { profileImage?: string | null }) => {
    setUser((current) => {
      if (!current) return current;
      return {
        ...current,
        ...data,
        profileImage: Object.prototype.hasOwnProperty.call(data, "profileImage")
          ? data.profileImage || undefined
          : current.profileImage,
      };
    });
  };

  const logout = () => {
    setUser(null);
    setPendingMFAUser(null);
    sessionManager.destroy();
  };

  const sendPasswordResetCode = (email: string) => {
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      passwordResetCodes[email] = code;
      console.log(`Password reset code for ${email}: ${code}`);
      toast.success(`Reset code sent to ${email}. Check console for demo code.`);
      return true;
    }
    return false;
  };

  const verifyResetCode = (email: string, code: string) => {
    return passwordResetCodes[email] === code;
  };

  const resetPassword = (email: string, currentPassword: string, newPassword: string) => {
    console.log('resetPassword called for:', email);
    console.log('Current user in mockUsers:', mockUsers.find(u => u.email === email));

    const userIndex = mockUsers.findIndex(
      u => u.email === email && u.password === currentPassword
    );

    console.log('User index found:', userIndex);

    if (userIndex !== -1) {
      const user = mockUsers[userIndex];

      // Check password reuse - prevent using any of the last 5 passwords
      const passwordHistory = user.passwordHistory || [];
      const recentPasswords = [user.password, ...passwordHistory].slice(0, 5);

      console.log('Recent passwords:', recentPasswords);
      console.log('New password:', newPassword);

      if (recentPasswords.includes(newPassword)) {
        console.log('Password reuse detected');
        return false; // Error will be shown by the calling component
      }

      // Update password history
      mockUsers[userIndex].passwordHistory = [user.password, ...passwordHistory].slice(0, 5);
      mockUsers[userIndex].password = newPassword;

      console.log('Password updated successfully');
      console.log('New password is now:', mockUsers[userIndex].password);

      // Update the current user's session state if they're logged in
      if (user && user.email === email) {
        setUser({ ...user, name: user.name, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled, profileImage: user.profileImage });
      }

      return true; // Success will be shown by the calling component
    }

    console.log('User not found or current password incorrect');
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        verifyMFA,
        cancelMFA,
        enableMFA,
        disableMFA,
        signup,
        registerStaff,
        updateStaffAccount,
        updateProfile,
        logout,
        resetPassword,
        sendPasswordResetCode,
        verifyResetCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}