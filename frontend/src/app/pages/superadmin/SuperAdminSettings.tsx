import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { User, Phone, Lock, Check, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { isValidSaudiPhone, maskSaudiPhoneInput, normalizeSaudiPhoneForApi, SAUDI_PHONE_ERROR } from '../../lib/phoneValidation';

type MeResponse = { userId: number; name: string; email: string; phone?: string | null; role: string };

export default function SuperAdminSettings() {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MeResponse>('/api/auth/me')
      .then((data) => {
        setName(data.name);
        setEmail(data.email);
        const raw = data.phone ?? '';
        setPhoneNumber(raw ? maskSaudiPhoneInput(raw) : '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/me', { name });
      await refreshProfile();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setShowSuccess(false);
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
      await api.put('/api/auth/me', { name, phone: phoneNumber.trim() ? normalizeSaudiPhoneForApi(phoneNumber) : null });
      await refreshProfile();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      setShowSuccess(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setShowSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? 'Failed to change password');
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

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Super Admin Settings</h1>
        <p className="text-muted-foreground">Manage your super admin profile and security settings</p>
      </div>

      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top">
          <Card className="flex items-center gap-3 shadow-lg border-green-200 bg-green-50">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-800">Changes saved successfully!</p>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleNameSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <div className="flex gap-3">
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} icon={User} placeholder="Enter your name" required />
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              University Email
              <Badge variant="neutral" size="sm" className="ml-2">Read-only</Badge>
            </label>
            <Input type="email" value={email} disabled icon={User} />
            <p className="mt-1.5 text-xs text-muted-foreground">Your university email cannot be changed for security reasons.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
            <div className="px-4 py-3 bg-card rounded-xl border border-border flex items-center gap-2">
              <Badge variant="error">SUPER ADMIN</Badge>
              <span className="text-sm text-foreground/90">Full System Access</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Contact Information</h2>
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
            helperText={!phoneError ? 'Update your phone number for critical system notifications (Saudi format)' : undefined}
          />
          <Button type="submit" disabled={!phoneValid}>Save Phone Number</Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Security Settings</h2>
        </div>

        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm text-red-800">
            <strong>Security Notice:</strong> As a super administrator, use a strong, unique password.
            Password changes will be logged for security audit purposes.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
          <Input type="password" label="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} icon={Lock} required />
          <Input type="password" label="New Password" value={newPassword} onChange={(e) => handlePasswordChange(e.target.value)} icon={Lock} required />

          {newPassword && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Password strength</span>
                <span className="text-xs font-medium text-foreground">{getStrengthText()}</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
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
