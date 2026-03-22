import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  const token = new URLSearchParams(location.search).get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      setIsDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F9FF] via-white to-[#F9FAFD] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#111a2e] flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Mawrid</h1>
          </div>
          <h2 className="text-lg md:text-xl text-[#334155] dark:text-[#E2E8F0]">Set New Password</h2>
        </div>

        <Card>
          {isDone ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mb-6">
                Password updated successfully. You can sign in now.
              </p>
              <Button fullWidth onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Input
                type="password"
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={Lock}
                required
              />

              <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={Lock}
                required
              />

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className="mt-6">
            <Link to="/login">
              <Button variant="ghost" fullWidth icon={ArrowLeft}>
                Back to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
