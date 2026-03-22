import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CheckCircle, XCircle, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { toast } from 'sonner';

export default function Verification() {
  const RESEND_COOLDOWN_SECONDS = 60;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, verifyRegistration, resendVerification } = useAuth();
  const [status, setStatus] = useState<'success' | 'error' | 'otp' | 'pending'>('pending');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const otpInputRef = useRef<HTMLInputElement>(null);

  const tokenFromQuery = new URLSearchParams(location.search).get('token') ?? undefined;
  const emailFromQuery = new URLSearchParams(location.search).get('email') ?? undefined;
  const emailFromState = (location.state as any)?.email as string | undefined;
  const email = emailFromQuery ?? emailFromState;
  const resendStorageKey = email ? `verification_resend_until_${email.trim().toLowerCase()}` : null;
  const resendRemainingSeconds = Math.max(0, Math.ceil((resendAvailableAt - nowTick) / 1000));
  const resendBlocked = resendRemainingSeconds > 0;

  const loadResendCooldown = (storageKey: string | null) => {
    setNowTick(Date.now());
    if (!storageKey) {
      setResendAvailableAt(0);
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? Number(raw) : 0;
    if (!Number.isFinite(parsed) || parsed <= Date.now()) {
      window.localStorage.removeItem(storageKey);
      setResendAvailableAt(0);
      return;
    }
    setResendAvailableAt(parsed);
  };

  const startResendCooldown = (targetEmail: string) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    if (!normalizedEmail) return;
    const until = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    window.localStorage.setItem(`verification_resend_until_${normalizedEmail}`, String(until));
    setNowTick(Date.now());
    setResendAvailableAt(until);
  };

  // Legacy link verification (token in URL)
  useEffect(() => {
    if (!tokenFromQuery) return;
    setStatus('pending');
    verifyEmail(tokenFromQuery)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [tokenFromQuery, verifyEmail]);

  // OTP flow: when email is in query (from signup redirect), show OTP form
  useEffect(() => {
    if (tokenFromQuery) return;
    if (email) {
      setStatus('otp');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } else {
      setStatus('pending');
    }
  }, [email, tokenFromQuery]);

  useEffect(() => {
    loadResendCooldown(resendStorageKey);
  }, [resendStorageKey]);

  useEffect(() => {
    if (!resendBlocked) return;
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendBlocked]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }
    setOtpError(null);
    setIsVerifying(true);
    try {
      await verifyRegistration(email, otp);
      toast.success('Email verified successfully! You can now log in.');
      navigate('/login');
    } catch (e: unknown) {
      setOtpError((e as { message?: string })?.message ?? 'Invalid or expired code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendBlocked) return;
    setResent(true);
    try {
      await resendVerification(email);
      startResendCooldown(email);
      setOtp('');
      setOtpError(null);
      toast.success('Verification code sent! Check your email.');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (e: unknown) {
      setOtpError((e as { message?: string })?.message ?? 'Failed to resend');
    } finally {
      setTimeout(() => setResent(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F9FF] via-white to-[#F9FAFD] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#111a2e] flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mawrid</h1>
          </div>
          <h2 className="text-lg md:text-xl text-[#334155] dark:text-[#E2E8F0]">Email Verification</h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">Please verify your email to continue</p>
        </div>

        <div className="space-y-4">
          {/* OTP input form (from signup) */}
          {status === 'otp' && email && (
            <Card>
              <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
                {otpError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                    <p className="text-sm text-red-700 dark:text-red-300">{otpError}</p>
                  </div>
                )}
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium text-[#334155] dark:text-[#E2E8F0] mb-1.5">Verification Code</label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full h-12 px-4 text-center text-2xl font-mono tracking-[0.5em] bg-white dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] dark:text-[#E2E8F0]"
                  />
                </div>
                <Button type="submit" fullWidth disabled={isVerifying || otp.length !== 6}>
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleResend}
                  disabled={resent || resendBlocked}
                >
                  {resent ? 'Code sent!' : resendBlocked ? `Resend in ${resendRemainingSeconds}s` : 'Resend code'}
                </Button>
              </form>
              <div className="mt-6">
                <Button variant="ghost" fullWidth onClick={() => navigate('/login')}>
                  Back to Login
                </Button>
              </div>
            </Card>
          )}

          {status === 'success' && (
            <Card>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Email Verified!</h2>
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
                  Your email has been successfully verified. You can now access your account.
                </p>
                <Button fullWidth icon={ArrowRight} iconPosition="right" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            </Card>
          )}

          {status === 'error' && (
            <Card>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Verification Failed</h2>
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
                  The verification link is invalid or has expired. Please request a new verification code.
                </p>
                {email && (
                  <div className="space-y-3">
                    <Button
                      fullWidth
                      icon={Mail}
                      iconPosition="left"
                      onClick={handleResend}
                      disabled={resent || resendBlocked}
                    >
                      {resent ? 'Code sent!' : resendBlocked ? `Resend in ${resendRemainingSeconds}s` : 'Resend verification code'}
                    </Button>
                  </div>
                )}
                <Button fullWidth variant="secondary" onClick={() => navigate('/login')} className="mt-3">
                  Back to Login
                </Button>
              </div>
            </Card>
          )}

          {status === 'pending' && !email && (
            <Card>
              <div className="text-center">
                {otpError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-700">{otpError}</p>
                  </div>
                )}
                <div className="w-16 h-16 rounded-full bg-[#F9FAFD] border-2 border-[#E0E4F7] flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[#8393DE]" />
                </div>
                <h2 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Verify Your Email</h2>
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-4">
                  Enter your email to receive a new verification code.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const target = e.target as HTMLFormElement;
                    const emailInput = target.querySelector<HTMLInputElement>('input[name="email"]');
                    const val = emailInput?.value?.trim();
                    if (!val) {
                      setOtpError('Email is required');
                      return;
                    }
                    if (!EMAIL_REGEX.test(val)) {
                      setOtpError('Please enter a valid email address');
                      return;
                    }
                    try {
                      await resendVerification(val);
                      startResendCooldown(val);
                      toast.success('Verification code sent!');
                      navigate(`/verify-email?email=${encodeURIComponent(val)}`);
                    } catch (err) {
                      setOtpError((err as { message?: string })?.message ?? 'Failed to send code');
                    }
                  }}
                  noValidate
                  className="space-y-3"
                >
                  <input
                    type="email"
                    name="email"
                    placeholder="example@email.com"
                    required
                    className="w-full h-12 px-4 bg-white dark:bg-[#0f172a] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] dark:text-[#E2E8F0]"
                  />
                  <Button type="submit" fullWidth>
                    Send verification code
                  </Button>
                </form>
                <Button fullWidth variant="ghost" onClick={() => navigate('/login')} className="mt-3">
                  Back to Login
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
