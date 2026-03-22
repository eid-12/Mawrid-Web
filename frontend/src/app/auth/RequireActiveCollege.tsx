import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router';
import { COLLEGE_REQUIRED_MESSAGE, useCollegeEligibility } from '../hooks/useCollegeEligibility';
import { useAuth } from './AuthContext';

export function RequireActiveCollege() {
  const { user, refreshUserStatus } = useAuth();
  const { loading, canAccessCoreFeatures } = useCollegeEligibility();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.userId || user?.tenantStatus) return;
    setSyncing(true);
    refreshUserStatus()
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.userId, user?.tenantStatus]);

  if (loading || syncing) return null;
  if (!canAccessCoreFeatures) {
    return (
      <Navigate
        to={`/user/settings?reason=college_required&message=${encodeURIComponent(COLLEGE_REQUIRED_MESSAGE)}`}
        replace
      />
    );
  }
  return <Outlet />;
}

