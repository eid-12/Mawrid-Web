import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { User, Phone, Lock, Check, Shield } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { SuccessToast } from '../../components/SuccessToast';
import { isValidSaudiPhone, maskSaudiPhoneInput, normalizeSaudiPhoneForApi, SAUDI_PHONE_ERROR } from '../../lib/phoneValidation';

type MeResponse = {
  userId: number;
  tenantId: number | null;
  tenantName?: string | null;
  role: string;
  name: string;
  email: string;
  phone?: string | null;
};

export default function AdminSettings() {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');

  useEffect(() => {
    api.get<MeResponse>('/api/auth/me').then((me) => {
      setName(me.name ?? '');
      const raw = me.phone ?? '';
      setPhoneNumber(raw ? maskSaudiPhoneInput(raw) : '');
    }).catch(() => {});
  }, []);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/me', { name });
      setToastVariant('success');
      setToastMessage('Changes saved successfully!');
      setShowToast(true);
      refreshProfile();
    } catch {
      setToastVariant('cancel');
      setToastMessage('Failed to save');
      setShowToast(true);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(maskSaudiPhoneInput(value));
  };

  const phoneValid = !phoneNumber.trim() || isValidSaudiPhone(phoneNumber);
  const phoneError = phoneNumber.trim() && !isValidSaudiPhone(phoneNumber) ? SAUDI_PHONE_ERROR : undefined;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return;
    try {
      await api.put('/api/auth/me', { name, phone: normalizeSaudiPhoneForApi(phoneNumber) });
      setToastVariant('success');
      setToastMessage('Phone number updated successfully!');
      setShowToast(true);
      refreshProfile();
    } catch {
      setToastVariant('cancel');
      setToastMessage('Failed to save');
      setShowToast(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToastVariant('cancel');
      setToastMessage('Passwords do not match!');
      setShowToast(true);
      return;
    }
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setToastVariant('success');
      setToastMessage('Password changed successfully!');
      setShowToast(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      setToastVariant('cancel');
      setToastMessage((e as { message?: string })?.message ?? 'Failed to change password');
      setShowToast(true);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <SuccessToast isOpen={showToast} variant={toastVariant} message={toastMessage} onClose={() => setShowToast(false)} />

      <div>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">Admin Settings</h1>
        <p className="text-[#64748B]">Manage your admin profile and security settings</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A]">Profile Information</h2>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleNameSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">Name</label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={User}
                  placeholder="Enter your name"
                  required
                />
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Email
              <Badge variant="neutral" size="sm" className="ml-2">Read-only</Badge>
            </label>
            <Input type="email" value={user?.email ?? ''} disabled icon={User} />
            <p className="mt-1.5 text-xs text-[#64748B]">Your email cannot be changed for security reasons.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">Role</label>
            <div className="px-4 py-3 bg-[#F5F9FF] rounded-xl border border-[#E2E8F0] flex items-center gap-2">
              <Badge variant="info">College Admin</Badge>
              <span className="text-sm text-[#334155]">{user?.tenantName ?? 'College'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">College</label>
            <p className="text-sm text-[#334155] px-4 py-3 bg-[#F5F9FF] rounded-xl border border-[#E2E8F0]">{user?.tenantName ?? '—'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A]">Contact Information</h2>
        </div>

        <form onSubmit={handlePhoneSubmit} noValidate className="space-y-4">
          <Input
            type="tel"
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            icon={Phone}
            placeholder="05X XXX XXXX"
            error={phoneError}
            helperText={!phoneError ? 'Update your phone number for notifications (Saudi format)' : undefined}
          />
          <Button type="submit" disabled={!phoneValid}>Save Phone Number</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-[#0F172A]">Security Settings</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
          <Input
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            icon={Lock}
            required
          />

          <Input
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => handlePasswordChange(e.target.value)}
            icon={Lock}
            required
          />

          {newPassword && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#64748B]">Password strength</span>
                <span
                  className={`text-xs font-medium ${
                    passwordStrength <= 1 ? 'text-red-600' :
                    passwordStrength === 2 ? 'text-yellow-600' :
                    passwordStrength === 3 ? 'text-blue-600' :
                    'text-green-600'
                  }`}
                >
                  {getStrengthText()}
                </span>
              </div>
              <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                  style={{ width: `${(passwordStrength / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Input
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={Lock}
            required
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          />

          <Button type="submit" disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
