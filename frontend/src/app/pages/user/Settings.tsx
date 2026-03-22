import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { User, Phone, Lock } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { SuccessToast } from '../../components/SuccessToast';
import { AlertDialog } from '../../components/AlertDialog';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { isValidSaudiPhone, maskSaudiPhoneInput, normalizeSaudiPhoneForApi, SAUDI_PHONE_ERROR } from '../../lib/phoneValidation';
import { useNavigate, useSearchParams } from 'react-router';
import { COLLEGE_REQUIRED_MESSAGE, useCollegeEligibility } from '../../hooks/useCollegeEligibility';

type MeResponse = {
  userId: number;
  name: string;
  email: string;
  phone?: string | null;
  tenantId?: number | null;
  tenantName?: string | null;
};
type TenantOption = { id: number; name: string; code?: string | null; status?: string | null };

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading: collegeEligibilityLoading, canAccessCoreFeatures, shouldShowRestriction } = useCollegeEligibility();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | ''>('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [passwordMismatchDialog, setPasswordMismatchDialog] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<MeResponse>('/api/auth/me'),
      api.get<TenantOption[]>('/api/tenants/public/active'),
    ])
      .then(([me, tenants]) => {
        setName(me.name ?? '');
        const raw = me.phone ?? '';
        setPhoneNumber(raw ? maskSaudiPhoneInput(raw) : '');
        setSelectedTenantId(me.tenantId ?? '');
        const activeTenants = (tenants ?? [])
          .filter((tenant) => (tenant.status ?? '').toUpperCase() === 'ACTIVE')
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        setTenantOptions(activeTenants);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const reason = searchParams.get('reason');
    const message = searchParams.get('message');
    if (reason === 'college_required') {
      setToastVariant('cancel');
      setToastMessage(message || 'Please select an active college first.');
      setShowSuccessToast(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!collegeEligibilityLoading && canAccessCoreFeatures && searchParams.get('reason') === 'college_required') {
      navigate('/user/settings', { replace: true });
    }
  }, [collegeEligibilityLoading, canAccessCoreFeatures, navigate, searchParams]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/me', {
        name,
        tenantId: selectedTenantId === '' ? undefined : selectedTenantId,
      });
      setToastVariant('success');
      setToastMessage('Changes saved successfully!');
      setShowSuccessToast(true);
      await refreshProfile();
      navigate('/user/settings', { replace: true });
    } catch {
      setToastVariant('cancel');
      setToastMessage('Failed to save');
      setShowSuccessToast(true);
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
      setToastVariant('success');
      setToastMessage('Phone number updated successfully!');
      setShowSuccessToast(true);
      refreshProfile();
    } catch {
      setToastVariant('cancel');
      setToastMessage('Failed to save');
      setShowSuccessToast(true);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMismatchDialog(true);
      return;
    }
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setToastVariant('success');
      setToastMessage('Password changed successfully!');
      setShowSuccessToast(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setToastVariant('cancel');
      setToastMessage((err as { message?: string })?.message ?? 'Failed to change password');
      setShowSuccessToast(true);
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
    if (passwordStrength <= 1) return 'bg-red-500 dark:bg-red-600';
    if (passwordStrength === 2) return 'bg-yellow-500 dark:bg-yellow-600';
    if (passwordStrength === 3) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-green-500 dark:bg-green-600';
  };
  
  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength === 2) return 'Fair';
    if (passwordStrength === 3) return 'Good';
    return 'Strong';
  };
  
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Success Toast */}
      <SuccessToast
        isOpen={showSuccessToast}
        variant={toastVariant}
        message={toastMessage || (toastVariant === 'cancel' ? 'Failed to save' : 'Changes saved successfully!')}
        duration={3500}
        onClose={() => setShowSuccessToast(false)}
      />
      
      {/* Password Mismatch Dialog */}
      <AlertDialog
        isOpen={passwordMismatchDialog}
        onClose={() => setPasswordMismatchDialog(false)}
        onConfirm={() => setPasswordMismatchDialog(false)}
        title="Password Mismatch"
        description="The passwords you entered do not match. Please try again."
        confirmText="OK"
        variant="danger"
      />
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and security settings</p>
      </div>

      {shouldShowRestriction && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <p className="text-sm md:text-base font-medium text-amber-900">
            {COLLEGE_REQUIRED_MESSAGE}
          </p>
        </Card>
      )}
      
      {/* Profile Information */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Profile Information</h2>
        </div>
        
        <div className="space-y-4">
          <form onSubmit={handleNameSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                Name
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  icon={User}
                  placeholder="Enter your name"
                  required
                />
                <Button type="submit">
                  Save
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                College
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select college</option>
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name?.trim() || tenant.code?.trim() || `College #${tenant.id}`}
                  </option>
                ))}
              </select>
            </div>
          </form>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
              University Email
              <Badge variant="neutral" size="sm" className="ml-2">Read-only</Badge>
            </label>
            <Input
              type="email"
              value={user?.email ?? ''}
              disabled
              icon={User}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your university email cannot be changed for security reasons.
            </p>
          </div>
          
        </div>
      </Card>
      
      {canAccessCoreFeatures && (
        <>
          {/* Phone Number */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Contact Information</h2>
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
              <Button type="submit" disabled={!phoneValid}>
                Save Phone Number
              </Button>
            </form>
          </Card>
          
          {/* Password Change */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Security Settings</h2>
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
                    <span className="text-xs text-muted-foreground">Password strength</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-body)' }}>{getStrengthText()}</span>
                  </div>
                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      At least 8 characters
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      Uppercase and lowercase letters
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${/\d/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      At least one number
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${/[^a-zA-Z\d]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      At least one special character
                    </p>
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
        </>
      )}
    </div>
  );
}