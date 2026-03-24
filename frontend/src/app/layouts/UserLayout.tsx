import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { LayoutDashboard, Package, FileText, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiError, api } from '../api/client';

export default function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  
  const links = [
    { to: '/user/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/user/catalog', icon: Package, label: 'Catalog' },
    { to: '/user/requests', icon: FileText, label: 'My Requests' },
    { to: '/user/settings', icon: Settings, label: 'Settings' },
  ];
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNameChange = (_newName: string) => {
    setIsEditingName(false);
  };

  useEffect(() => {
    let cancelled = false;
    async function syncTenantStatus() {
      if (!user?.tenantId) {
        setTenantStatus(null);
        return;
      }
      try {
        const status = await api.get<{ tenantId?: number | null; status?: string | null }>('/api/auth/tenant-status');
        if (cancelled) return;
        if (!status?.tenantId) {
          await logout();
          navigate('/login?error=' + encodeURIComponent('Access Denied: Your college has been permanently removed from the system.'), { replace: true });
          return;
        }
        setTenantStatus((status?.status ?? '').toUpperCase() || null);
      } catch (error) {
        if (cancelled) return;
        const err = error as ApiError;
        if (err?.status === 403) {
          if ((err as { code?: string }).code === 'COLLEGE_REMOVED') {
            await logout();
            navigate('/login?error=' + encodeURIComponent('Access Denied: Your college has been permanently removed from the system.'), { replace: true });
            return;
          }
          setTenantStatus('INACTIVE');
        }
      }
    }
    void syncTenantStatus();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, user?.tenantId, navigate, logout]);
  
  const userInfo = (
    <div className="p-3 bg-background rounded-xl border border-border">
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
        {user?.name ?? '—'}
      </p>
      <p className="text-xs text-muted-foreground">{user?.tenantName ?? '—'}</p>
    </div>
  );
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar title="User Portal" links={links} onLogout={handleLogout} footer={userInfo} />
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