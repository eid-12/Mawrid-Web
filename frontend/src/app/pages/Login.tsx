import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { PageNotice } from '../components/PageNotice';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { dashboardPathForRole, useAuth } from '../auth/AuthContext';
import { SESSION_EXPIRED_NOTICE_KEY, type ApiError } from '../api/client';
import { formatApiError, SESSION_EXPIRED_MESSAGE } from '../lib/userFacingError';

export default function Login() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Sign in failed');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const { login, error, clearError } = useAuth();

  const resetErrors = () => {
    clearError();
    setLocalError(null);
    setErrorTitle('Sign in failed');
    setEmailError(null);
    setPasswordError(null);
    setShowVerificationWarning(false);
  };

  useEffect(() => {
    resetErrors();
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY)) {
      window.sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      setErrorTitle('Session expired');
      setLocalError(SESSION_EXPIRED_MESSAGE);
    }
    const queryError = searchParams.get('error');
    if (queryError) {
      const normalized = queryError.trim().toLowerCase();
      if (normalized === 'access denied.' || normalized === 'access denied') {
        setErrorTitle('Access denied');
        setLocalError('Your college access was removed. Please contact an administrator.');
      } else {
        setErrorTitle('Sign in blocked');
        setLocalError(queryError);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetErrors();
    const trimmedEmail = email.trim();
    let hasFieldError = false;
    if (!trimmedEmail) {
      setEmailError('Email is required');
      hasFieldError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      hasFieldError = true;
    }
    if (!password) {
      setPasswordError('Password is required');
      hasFieldError = true;
    }
    if (hasFieldError) return;
    setSubmitting(true);

    try {
      const loggedInUser = await login(trimmedEmail, password);
      setShowVerificationWarning(false);
      const normalizedRole = String(loggedInUser?.role ?? '')
        .trim()
        .toUpperCase()
        .replace(/^ROLE_/, '');
      if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
        setLocalError('This account has an unrecognized role. Please contact support.');
        return;
      }
      const from = (location.state as { from?: string } | null)?.from;
      const sameRolePath =
        (normalizedRole === 'SUPER_ADMIN' && (from?.startsWith('/superadmin') || from?.startsWith('/super-admin'))) ||
        (normalizedRole === 'ADMIN' && from?.startsWith('/admin')) ||
        (normalizedRole === 'USER' && from?.startsWith('/user'));
      const target =
        from && from.startsWith('/') && !from.startsWith('//') && sameRolePath
          ? from
          : dashboardPathForRole(normalizedRole);
      navigate(target, { replace: true });
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = String(err?.message ?? error ?? '');
      if (err?.code === 'COLLEGE_INACTIVE') {
        setErrorTitle('College deactivated');
        setLocalError(
          'Your college is currently deactivated. Please contact the Super Admin for assistance.'
        );
      } else if (err?.code === 'COLLEGE_REMOVED') {
        setErrorTitle('Access denied');
        setLocalError('Your college has been permanently removed from the system.');
      } else if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('email not verified')) {
        setShowVerificationWarning(true);
      } else if (err?.status === 401 || msg.toLowerCase().includes('invalid email or password')) {
        setLocalError('Invalid email or password.');
      } else {
        setLocalError(formatApiError(e, 'Login failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
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

        {showVerificationWarning && (
          <PageNotice
            variant="warning"
            title="Account not verified"
            className="mb-6"
            action={
              <Button variant="secondary" size="sm" onClick={() => navigate('/verify-email', { state: { email } })}>
                Go to verification
              </Button>
            }
          >
            Please verify your email before logging in. Check your inbox for the 6-digit code.
          </PageNotice>
        )}

        {(localError || error) && !showVerificationWarning && (
          <PageNotice title={errorTitle} className="mb-6">
            {localError ?? error}
          </PageNotice>
        )}

        <Card>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              type="email"
              label="Email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => {
                if (error || localError || showVerificationWarning || emailError) resetErrors();
                setEmail(e.target.value);
              }}
              icon={Mail}
              required
              error={emailError ?? undefined}
            />

            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                if (error || localError || showVerificationWarning || passwordError) resetErrors();
                setPassword(e.target.value);
              }}
              icon={Lock}
              required
              error={passwordError ?? undefined}
            />

            <div className="flex justify-end">
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
