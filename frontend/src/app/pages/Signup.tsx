import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { User, Mail, Lock, Building2, ArrowRight } from 'lucide-react';
import { TermsOfServiceModal } from '../components/TermsOfServiceModal';
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';

type TenantOption = { id: number; name: string; status: string };

export default function Signup() {
  const NAME_MAX_LENGTH = 60;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const navigate = useNavigate();
  const { register } = useAuth();
  const [colleges, setColleges] = useState<TenantOption[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    college: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    api.get<Array<{ id: number; name: string; status: string }>>('/api/tenants/public/active')
      .then(setColleges)
      .catch(() => {});
  }, []);
  
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };
  
  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
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
  
  const validateForm = () => {
    const newErrors: any = {};
    const trimmedName = formData.fullName.trim();
    
    if (!trimmedName) {
      newErrors.fullName = 'Full name is required';
    } else if (trimmedName.length > NAME_MAX_LENGTH) {
      newErrors.fullName = `Full name must be at most ${NAME_MAX_LENGTH} characters`;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.college) {
      newErrors.college = 'College is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const hasMinLength = formData.password.length >= 8;
      const hasUpperAndLower = /[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password);
      const hasNumber = /\d/.test(formData.password);
      const hasSpecial = /[^a-zA-Z\d]/.test(formData.password);
      if (!(hasMinLength && hasUpperAndLower && hasNumber && hasSpecial)) {
        newErrors.password = 'Password must satisfy all 4 requirements';
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const tenantId = colleges.find((c) => c.name === formData.college)?.id ?? null;
      if (!tenantId) {
        setErrors((prev: any) => ({ ...prev, college: 'College is required' }));
        setIsSubmitting(false);
        return;
      }
      await register({
        tenantId,
        role: 'USER',
        name: formData.fullName.trim(),
        email: formData.email,
        password: formData.password,
      });
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Signup failed. Check the console/network tab.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F9FF] via-white to-[#F9FAFD] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#111a2e] flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mawrid</h1>
          </div>
          <h2 className="text-lg md:text-xl text-[#334155] dark:text-[#E2E8F0]">Create your account</h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">Join Mawrid to start borrowing equipment</p>
        </div>
        
        {/* Signup Card */}
        <Card>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {submitError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                label="Full Name"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                icon={User}
                error={errors.fullName}
                maxLength={NAME_MAX_LENGTH}
                required
              />
              
              <div>
                <label className="block mb-2 text-sm font-medium text-[#0F172A] dark:text-[#E2E8F0]">
                  College <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <select
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    required
                    className={`w-full h-12 pl-12 pr-4 bg-white dark:bg-[#0f172a] border rounded-2xl transition-all duration-200 text-[#334155] dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#8393DE]/50 ${errors.college ? 'border-red-500' : 'border-[#E2E8F0] dark:border-[#334155] hover:border-[#8393DE]/30'}`}
                  >
                    <option value="">Select your college</option>
                    {colleges.map((college) => (
                      <option key={college.id} value={college.name}>
                        {college.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.college && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.college}</p>
                )}
              </div>
            </div>
            
            <Input
              type="email"
              label="Email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={Mail}
              error={errors.email}
              helperText={!errors.email ? 'Enter your primary email address for account verification' : undefined}
              required
            />
            
            <Input
              type="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              icon={Lock}
              error={errors.password}
              required
            />
            
            {formData.password && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Password strength</span>
                  <span className="text-xs font-medium text-[#334155] dark:text-[#E2E8F0]">{getStrengthText()}</span>
                </div>
                <div className="w-full h-2 bg-[#E2E8F0] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(passwordStrength / 4) * 100}%` }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    At least 8 characters
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    Upper & lowercase
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    At least one number
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${/[^a-zA-Z\d]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                    Special character
                  </p>
                </div>
              </div>
            )}
            
            <Input
              type="password"
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              icon={Lock}
              error={errors.confirmPassword}
              required
            />
            
            <div className="pt-2">
              <div className="flex items-start gap-2 mb-4">
                <input
                  type="checkbox"
                  id="terms"
                  className="w-4 h-4 rounded border-[#E2E8F0] dark:border-[#334155] text-[#8393DE] focus:ring-[#8393DE]/50 mt-0.5"
                  required
                />
                <label htmlFor="terms" className="text-sm text-[#334155] dark:text-[#E2E8F0]">
                  I agree to the{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-[#8393DE] dark:text-[#93A5F3] hover:underline"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacyModal(true);
                    }}
                    className="text-[#8393DE] dark:text-[#93A5F3] hover:underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
              
              <Button type="submit" fullWidth icon={ArrowRight} iconPosition="right" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#8393DE] dark:text-[#93A5F3] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
        
        {/* Info Notice */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/50" padding="sm">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            📧 After creating your account, you'll receive a 6-digit verification code by email.
            Enter it on the next screen to activate your account.
          </p>
        </Card>
      </div>

      <TermsOfServiceModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
}