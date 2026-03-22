import { useState, type FormEvent, useRef } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

type Step = 'email' | 'otp' | 'success';

export default function ForgotPassword() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const { forgotPassword, verifyOtpAndResetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setIsSubmitting(true);
    try {
      await forgotPassword(trimmedEmail);
      setStep('otp');
      setOtp('');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to send code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyOtpAndResetPassword(email, otp);
      setStep('success');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Invalid or expired code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTryAnotherEmail = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setError(null);
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
          <h2 className="text-lg md:text-xl text-[#334155] dark:text-[#E2E8F0]">Reset Password</h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
            {step === 'email' && 'Enter your email to receive a verification code'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email'}
            {step === 'success' && 'Password reset complete'}
          </p>
        </div>

        {step === 'email' && (
          <Card>
            <form onSubmit={handleSendCode} noValidate className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <Input
                type="email"
                label="Email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                required
                helperText="Enter the email address associated with your account"
              />
              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Code'}
              </Button>
            </form>
            <div className="mt-6">
              <Link to="/login">
                <Button variant="ghost" fullWidth icon={ArrowLeft}>
                  Back to Login
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {step === 'otp' && (
          <Card>
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
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
              <Button type="submit" fullWidth disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button type="button" variant="secondary" fullWidth onClick={handleTryAnotherEmail} disabled={isSubmitting}>
                Try Another Email
              </Button>
            </form>
            <div className="mt-6">
              <Link to="/login">
                <Button variant="ghost" fullWidth icon={ArrowLeft}>
                  Back to Login
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {step === 'success' && (
          <Card>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] dark:text-[#F8FAFC] mb-2">Password Reset Complete</h3>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
                Your password has been reset. A temporary password has been sent to <strong>{email}</strong>. Please check your inbox and log in to change it immediately.
              </p>
              <Link to="/login">
                <Button fullWidth>Go to Login</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Help Text */}
        {(step === 'email' || step === 'otp') && (
          <Card className="mt-6" padding="sm">
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] text-center">
              For security reasons, verification codes expire after 5 minutes.
              If you need help, contact your college administrator.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
