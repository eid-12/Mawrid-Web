import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { LayoutDashboard, Package, FileText, ClipboardCheck, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, api } from '../api/client';
import { dispatchAdminDataRefresh } from '../lib/adminDataRefresh';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const refreshPathRef = useRef<string | null>(null);
  const navGuardPathRef = useRef<string | null>(null);
  const { user, refreshProfile, logout: authLogout } = useAuth();
  const [adminName, setAdminName] = useState(user?.name ?? '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setAdminName(user.name);
  }, [user?.name]);

  /** After college reactivation: sync JWT/profile and force child pages to refetch from the API. */
  useEffect(() => {
    if (refreshPathRef.current === null) {
      refreshPathRef.current = location.pathname;
      void refreshProfile();
      dispatchAdminDataRefresh();
      return;
    }
    if (refreshPathRef.current !== location.pathname) {
      refreshPathRef.current = location.pathname;
      void refreshProfile();
      dispatchAdminDataRefresh();
    }
  }, [location.pathname, refreshProfile]);

  useEffect(() => {
    let cancelled = false;
    async function syncTenantStatusAndEnforceNavigationLock() {
      try {
        const status = await api.get<{ tenantId?: number | null; status?: string | null }>('/api/auth/tenant-status');
        const normalized = (status?.status ?? '').toUpperCase() || null;
        const inactive = normalized === 'INACTIVE';
        const removed = Boolean(user?.tenantId) && !status?.tenantId;
        if (cancelled) return;
        setTenantStatus(normalized);
        const previousPath = navGuardPathRef.current;
        if (removed) {
          await authLogout();
          navigate('/login?error=' + encodeURIComponent('Access Denied: Your college has been permanently removed from the system.'), { replace: true });
          return;
        }
        if (previousPath !== null && previousPath !== location.pathname && inactive) {
          await authLogout();
          navigate('/login?error=' + encodeURIComponent('Your college is currently deactivated.'), { replace: true });
        }
        navGuardPathRef.current = location.pathname;
      } catch (error) {
        if (cancelled) return;
        const err = error as ApiError;
        if (err?.status === 403) {
          const code = (err as { code?: string }).code;
          if (code === 'COLLEGE_REMOVED') {
            await authLogout();
            navigate('/login?error=' + encodeURIComponent('Access Denied: Your college has been permanently removed from the system.'), { replace: true });
            return;
          }
          setTenantStatus('INACTIVE');
          const previousPath = navGuardPathRef.current;
          if (previousPath === null || previousPath === location.pathname) {
            navGuardPathRef.current = location.pathname;
            return;
          }
          await authLogout();
          navigate('/login?error=' + encodeURIComponent('Your college is currently deactivated.'), { replace: true });
        }
      }
    }
    void syncTenantStatusAndEnforceNavigationLock();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate, authLogout, user?.tenantId]);

  const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/requests', icon: FileText, label: 'Requests' },
    { to: '/admin/checking', icon: ClipboardCheck, label: 'Check In/Out' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];
  
  const handleLogout = async () => {
    await authLogout();
    navigate('/login');
  };

  const handleNameChange = async (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      try {
        await api.put('/api/auth/me', { name: trimmed });
        setAdminName(trimmed);
        refreshProfile();
      } catch { /* ignore */ }
    }
    setIsEditingName(false);
  };
  
  const adminInfo = (
    <div className="p-3 bg-background rounded-xl border border-border">
      {isEditingName ? (
        <input
          type="text"
          defaultValue={adminName}
          onBlur={(e) => handleNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNameChange(e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              setIsEditingName(false);
            }
          }}
          autoFocus
          className="w-full text-sm font-medium mb-1 bg-card border border-primary rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
      ) : (
        <p
          className="text-sm font-medium mb-1 cursor-pointer hover:text-primary transition-colors"
          onClick={() => setIsEditingName(true)}
          title="Click to edit name"
          style={{ color: 'var(--text-heading)' }}
        >
          {adminName}
        </p>
      )}
      <p className="text-xs text-muted-foreground">College Admin</p>
      <p className="text-xs text-muted-foreground">{user?.tenantName ?? 'College'}</p>
    </div>
  );
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar title="Admin Portal" links={links} onLogout={handleLogout} footer={adminInfo} />
      <main className="flex-1 w-full p-3 sm:p-4 md:p-6 lg:p-8 pt-20 md:pt-6 lg:ml-0">
        {tenantStatus === 'INACTIVE' && (
          <div className="mb-4 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm">
            Notice: This college is currently inactive. You can view existing data, but new transactions and management actions are disabled.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}