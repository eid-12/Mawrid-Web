import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import { ApiError, api } from '../api/client';

type TenantStatusResponse = {
  tenantId?: number | null;
  status?: string | null;
};

export function RequireActiveAdminCollege() {
  const { user } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [hasTenant, setHasTenant] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function validateCollegeStatus() {
      setChecking(true);
      try {
        const tenant = await api.get<TenantStatusResponse>('/api/auth/tenant-status');
        if (!tenant?.tenantId) {
          if (!cancelled) {
            setHasTenant(false);
          }
          return;
        }
        if (!cancelled) {
          setHasTenant(true);
        }
      } catch (err: unknown) {
        const status = (err as ApiError | undefined)?.status;
        if (!cancelled) {
          setHasTenant(status !== 403);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void validateCollegeStatus();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, user?.tenantId]);

  if (checking) return null;
  if (!hasTenant) {
    return <Navigate to={`/login?error=${encodeURIComponent("Please contact the administrator.")}`} replace />;
  }
  return <Outlet />;
}

