import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { ADMIN_DATA_REFRESH_EVENT } from '../lib/adminDataRefresh';

type TenantStatusResponse = {
  tenantId?: number | null;
  status?: string | null;
};

/**
 * Keeps admin data pages in sync after college reactivation:
 * - Refetch when navigating between admin routes (custom event from AdminLayout)
 * - Refetch when the tab becomes visible again or returns from bfcache
 * - Poll tenant status; when it flips to ACTIVE, refetch lists/stats immediately
 */
export function useAdminLiveData(refetch: () => void, enabled: boolean): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const prevTenantStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const run = () => refetchRef.current();

    window.addEventListener(ADMIN_DATA_REFRESH_EVENT, run);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) run();
    };
    window.addEventListener('pageshow', onPageShow);

    const pollTenantStatus = () => {
      api
        .get<{ status?: string | null }>('/api/auth/tenant-status')
        .then((t) => {
          const s = (t?.status ?? '').toUpperCase();
          const prev = prevTenantStatus.current;
          if (prev !== 'ACTIVE' && s === 'ACTIVE') run();
          prevTenantStatus.current = s || null;
        })
        .catch(() => {
          /* keep last known status */
        });
    };
    pollTenantStatus();
    const pollId = window.setInterval(pollTenantStatus, 8000);

    return () => {
      window.removeEventListener(ADMIN_DATA_REFRESH_EVENT, run);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.clearInterval(pollId);
    };
  }, [enabled]);
}

/**
 * Resolves current tenant identity from backend so admin pages can still fetch
 * data even if in-memory profile state is stale right after reactivation/login.
 */
export function useAdminTenantState(userTenantId?: number | null): { tenantId: number | null; tenantStatus: string | null } {
  const [tenantId, setTenantId] = useState<number | null>(userTenantId ?? null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof userTenantId === 'number') setTenantId(userTenantId);
  }, [userTenantId]);

  const syncTenantState = useCallback(() => {
    api
      .get<TenantStatusResponse>('/api/auth/tenant-status')
      .then((payload) => {
        if (typeof payload?.tenantId === 'number') setTenantId(payload.tenantId);
        setTenantStatus((payload?.status ?? '').toUpperCase() || null);
      })
      .catch(() => {
        /* keep last known state */
      });
  }, []);

  useEffect(() => {
    syncTenantState();
    window.addEventListener(ADMIN_DATA_REFRESH_EVENT, syncTenantState);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncTenantState();
    };
    const onFocus = () => syncTenantState();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(ADMIN_DATA_REFRESH_EVENT, syncTenantState);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncTenantState]);

  return { tenantId, tenantStatus };
}
