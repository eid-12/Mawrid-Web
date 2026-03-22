import { useAuth } from '../auth/AuthContext';

export const COLLEGE_REQUIRED_MESSAGE =
  'Action Required: Please select an active college in Settings to start borrowing equipment.';

export function useCollegeEligibility() {
  const { user } = useAuth();
  const normalizedTenantStatus = (user?.tenantStatus ?? '').toUpperCase();
  const hasAssignedCollege = Boolean(user?.tenantId);
  const hasActiveCollege = Boolean(hasAssignedCollege && normalizedTenantStatus === 'ACTIVE');

  const loading = false;
  const canAccessCoreFeatures = hasActiveCollege;
  const shouldShowRestriction = !hasActiveCollege;

  return {
    loading,
    hasActiveCollege,
    canAccessCoreFeatures,
    shouldShowRestriction,
    requiresCollegeSelection: shouldShowRestriction,
  };
}

