import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

type TenantStatusResponse = {
  tenantId?: number | null;
  status?: string | null;
};

/** Admin routes: block the portal if the college row was deleted. */
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
      } catch (_err: unknown) {
        if (!cancelled) {
          // Fail closed: do not render an admin portal whose college could not be verified.
          setHasTenant(false);
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

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking college access...</p>
      </div>
    );
  }
  if (!hasTenant) {
    return <Navigate to={`/login?error=${encodeURIComponent("Please contact the administrator.")}`} replace />;
  }
  return <Outlet />;
}

