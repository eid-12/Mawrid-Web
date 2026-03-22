import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import type { ApiError } from '../api/client';

export default function Login() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const { login, error, clearError } = useAuth();

  const resetErrors = () => {
    clearError();
    setLocalError(null);
    setShowVerificationWarning(false);
  };

  useEffect(() => {
    resetErrors();
  }, [location.pathname]);

  useEffect(() => {
    const queryError = searchParams.get('error');
    if (queryError) {
      const normalized = queryError.trim().toLowerCase();
      if (normalized === 'access denied.' || normalized === 'access denied') {
        setLocalError('Please contact the administrator.');
      } else {
        setLocalError(queryError);
      }
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetErrors();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }
    setSubmitting(true);

    try {
      const loggedInUser = await login(trimmedEmail, password);
      console.log('Login Response:', loggedInUser);
      setShowVerificationWarning(false);
      const normalizedRole = String(loggedInUser?.role ?? '')
        .trim()
        .toUpperCase()
        .replace(/^ROLE_/, '');
      console.log('Resolved login role:', normalizedRole);
      if (normalizedRole === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else if (normalizedRole === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (normalizedRole === 'USER') {
        navigate('/user/dashboard');
      } else {
        setLocalError('Unauthorized role returned from server. Please contact support.');
      }
    } catch (e: unknown) {
      console.log('Login submit error:', e);
      const err = e as ApiError;
      const msg = String(err?.message ?? error ?? '');
      if (err?.code === 'COLLEGE_INACTIVE') {
        setLocalError(
          'Login Access Denied: Your college is currently deactivated. Please contact the Super Admin for assistance.'
        );
      } else if (err?.code === 'COLLEGE_REMOVED') {
        setLocalError('Access Denied: Your college has been permanently removed from the system.');
      } else if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('email not verified')) {
        setShowVerificationWarning(true);
      } else if (err?.status === 401 || msg.toLowerCase().includes('invalid email or password')) {
        setLocalError('Invalid email or password.');
      } else if (msg) {
        setLocalError(msg);
      } else {
        setLocalError('Login failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>Mawrid</h1>
          </div>
          <h2 className="text-lg md:text-xl text-foreground">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
        </div>
        
        {/* Verification Warning */}
        {showVerificationWarning && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Account Not Verified</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Please verify your email before logging in. Check your inbox for the verification link.
              </p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/verify-email', { state: { email } })}>
                Go to verification
              </Button>
            </div>
          </div>
        )}

        {(localError || error) && !showVerificationWarning && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Login failed</p>
              <p className="text-sm text-red-700 dark:text-red-300">{localError ?? error}</p>
            </div>
          </div>
        )}
        
        {/* Login Card */}
        <Card>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              type="email"
              label="Email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                if (error || localError || showVerificationWarning) resetErrors();
                setEmail(e.target.value);
              }}
              icon={Mail}
              required
            />
            
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                if (error || localError || showVerificationWarning) resetErrors();
                setPassword(e.target.value);
              }}
              icon={Lock}
              required
            />
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <span className="text-sm text-foreground">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            
            <Button type="submit" fullWidth icon={ArrowRight} iconPosition="right" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}