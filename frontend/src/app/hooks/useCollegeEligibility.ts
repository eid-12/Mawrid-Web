import { useAuth } from '../auth/AuthContext';

export const COLLEGE_REQUIRED_MESSAGE =
  'Action Required: Please select an active college in Settings to start borrowing equipment.';

/** Users without an ACTIVE college cannot borrow or browse as a borrower. */
export function useCollegeEligibility() {
  const { user } = useAuth();
  const hasActiveCollege =
    Boolean(user?.tenantId) && (user?.tenantStatus ?? '').toUpperCase() === 'ACTIVE';

  return {
    canAccessCoreFeatures: hasActiveCollege,
    shouldShowRestriction: !hasActiveCollege,
  };
}
