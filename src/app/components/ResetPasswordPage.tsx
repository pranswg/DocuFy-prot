import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useLogo } from '../hooks/useLogo';
import { PasswordStrengthIndicator, validatePassword } from './ui/password-strength-indicator';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const logo = useLogo();
  const { resetForgottenPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validatePassword(password).isValid) {
      toast.error('Password does not meet security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    const success = await resetForgottenPassword('', password);
    setSaving(false);
    if (!success) {
      toast.error('The reset link is invalid or expired.');
      return;
    }
    toast.success('Password updated successfully.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F2F7FF] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white">
        <img src={logo} alt="Docufy Logo" className="w-16 h-16 mx-auto mb-4 rounded-full" />
        <h1 className="text-2xl font-bold text-center text-[#1c1f26]">Create a new password</h1>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">Choose a secure password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {password && <PasswordStrengthIndicator password={password} />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}