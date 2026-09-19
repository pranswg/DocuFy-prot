import React, { useState, createContext, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { sessionManager } from '../utils/sessionManager';
import { supabase } from '../../lib/supabaseClient';

// Auth Types
export interface User {
  name: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  profileImage?: string;
  active?: boolean;
}

export interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; reason?: 'inactive' }>;
  signup: (data: any) => Promise<boolean>;
  registerStaff: (data: { name: string; email: string; password: string; role?: 'staff' | 'admin' }) => { success: boolean; message?: string };
  updateStaffAccount: (currentEmail: string, updates: { email?: string; name?: string; role?: 'staff' | 'admin'; active?: boolean }) => boolean;
  getStaffAccounts: () => { email: string; name: string; role: string; active?: boolean; isAdminRegistered?: boolean }[];
  updateProfile: (data: Partial<User> & { profileImage?: string | null }) => void;
  logout: () => void;
  resetPassword: (email: string, currentPassword: string, newPassword: string) => Promise<boolean>;
  resetForgottenPassword: (email: string, newPassword: string) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
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
type MockUser = {
  email: string;
  password: string;
  name: string;
  role: 'customer' | 'staff' | 'admin';
  active: boolean;
  passwordHistory: string[];
  profileImage?: string;
  isAdminRegistered?: boolean;
};

const mockUsers: MockUser[] = [
  {
    email: 'customer@test.com',
    password: 'customer123',
    name: 'Customer User',
    role: 'customer' as const,
    active: true,
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
  {
    email: 'staff@test.com',
    password: 'staff123',
    name: 'Staff User',
    role: 'staff' as const,
    active: true,
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
  {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin' as const,
    active: true,
    passwordHistory: [] as string[],
    profileImage: undefined,
  },
];

// Store for password reset codes
const passwordResetCodes: { [email: string]: string } = {};

// Staff/admin sign-in accounts persist to localStorage so role and status
// changes made in Staff Management survive a page refresh — otherwise the
// freshly-updated MockUser list is re-seeded to the defaults on reload and the
// changed role reverts. Only staff/admin accounts are persisted (customer
// sign-ups stay in-memory, matching the original prototype behavior).
const STAFF_ACCOUNTS_KEY = 'docufy_auth_users_v1';

function loadStaffAccounts(): void {
  try {
    const raw = localStorage.getItem(STAFF_ACCOUNTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const acc of parsed) {
      if (!acc || typeof acc !== 'object') continue;
      if (!acc.email || !acc.name || !acc.role) continue;
      const idx = mockUsers.findIndex(u => u.email.toLowerCase() === acc.email.toLowerCase());
      if (idx >= 0) {
        mockUsers[idx] = { ...mockUsers[idx], ...acc };
      } else {
        mockUsers.push(acc);
      }
    }
  } catch {
    // storage unavailable — in-memory accounts are enough
  }
}

function persistStaffAccounts(): void {
  try {
    localStorage.setItem(
      STAFF_ACCOUNTS_KEY,
      JSON.stringify(mockUsers.filter(u => u.role !== 'customer')),
    );
  } catch {
    // storage unavailable — accounts stay in-memory for the session
  }
}

loadStaffAccounts();

// Persist the logged-in user across page reloads so refreshing while signed in
// does not bounce the user back to the login page. Uses sessionStorage (NOT
// localStorage) so each browser tab keeps its own logged-in user — a prototype
// convenience that lets separate tabs run as customer and staff/admin without
// one refresh wiping the other tab's session.
const AUTH_SESSION_KEY = 'docufy_auth_session_tab';

function readStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadProfile = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, email, role, phone, profile_image_path, active, suspended')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load user profile:', error);
    }

    // If the profile has no phone yet but the signup put one in user_metadata
    // (covers the email-confirmation-ON path where signup has no session),
    // backfill the phone column so it ends up stored in the profiles table.
    const metadataPhone =
      typeof authUser.user_metadata?.phone === 'string' ? authUser.user_metadata.phone : '';

    if (profile && !profile.phone && metadataPhone) {
      await supabase
        .from('profiles')
        .update({ phone: metadataPhone })
        .eq('id', authUser.id);
      profile.phone = metadataPhone;
    }

    const role = profile?.role === 'admin' || profile?.role === 'staff'
      ? profile.role
      : 'customer';

    setUser({
      name: profile?.full_name || String(authUser.user_metadata?.full_name || authUser.email || 'User'),
      email: profile?.email || authUser.email || '',
      role,
      profileImage: profile?.profile_image_path || undefined,
      active: profile?.active !== false && profile?.suspended !== true,
    });
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Failed to restore Supabase session:', error);
      if (mounted && data.session?.user) {
        await loadProfile(data.session.user);
      }
      if (mounted) setAuthLoading(false);
    };

    void initializeAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        void loadProfile(session.user);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
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

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { success: false };
    }

    await loadProfile(data.user);
    const { data: profile } = await supabase
      .from('profiles')
      .select('active, suspended')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile?.active === false || profile?.suspended === true) {
      await supabase.auth.signOut();
      return { success: false, reason: 'inactive' as const };
    }

    return { success: true };
  };

  const signup = async (data: any) => {
    // Combine firstName and lastName to create full name
    const fullName = data.firstName && data.lastName
      ? `${data.firstName} ${data.lastName}`.trim()
      : data.fullName || data.name || 'User';

    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: fullName,
          phone: data.contactNumber,
        },
      },
    });

    if (error || !result.user) {
      toast.error(error?.message || 'Unable to create account.');
      return false;
    }

    if (result.session) {
      if (data.contactNumber) {
        await supabase
          .from('profiles')
          .update({ phone: data.contactNumber })
          .eq('id', result.user.id);
      }
      await loadProfile(result.user);
    }

    toast.success(
      result.session
        ? 'Account created successfully.'
        : 'Account created. Check your email to confirm your account.',
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
      passwordHistory: [] as string[],
      profileImage: undefined,
      isAdminRegistered: true,
    };
    mockUsers.push(newStaff);
    persistStaffAccounts();
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
    persistStaffAccounts();
    return true;
  };

  const getStaffAccounts = () =>
    mockUsers
      .filter(u => u.role !== 'customer')
      .map(u => ({
        email: u.email,
        name: u.name,
        role: u.role,
        active: u.active,
        isAdminRegistered: u.isAdminRegistered,
      }));

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
    sessionManager.destroy();
    void supabase.auth.signOut();
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

  const resetPassword = async (email: string, currentPassword: string, newPassword: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) return false;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return !error;
  };

  const resetForgottenPassword = async (_email: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return false;

    // The password-recovery link logs the user in with a recovery session.
    // Without signing out, that lingering session makes LoginPage's "already
    // signed in" effect redirect straight to /<role>/dashboard instead of
    // showing the login form the user needs after resetting their password.
    await supabase.auth.signOut();
    return true;
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return !error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        login,
        signup,
        registerStaff,
        updateStaffAccount,
        getStaffAccounts,
        updateProfile,
        logout,
        resetPassword,
        resetForgottenPassword,
        requestPasswordReset,
        sendPasswordResetCode,
        verifyResetCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}