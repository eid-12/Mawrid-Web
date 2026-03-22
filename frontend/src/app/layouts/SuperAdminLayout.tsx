import { Outlet, useNavigate } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { LayoutDashboard, Building2, Users, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

function formatRole(role: string): string {
  return role.replace(/_/g, ' ');
}

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const links = [
    { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Global Dashboard' },
    { to: '/superadmin/colleges', icon: Building2, label: 'Colleges' },
    { to: '/superadmin/users', icon: Users, label: 'User Management' },
    { to: '/superadmin/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminInfo = (
    <div className="p-3 bg-sidebar-accent rounded-xl border border-sidebar-border">
      <p
        className="text-sm font-medium mb-1"
        style={{ color: 'var(--text-heading)' }}
      >
        {loading ? 'Loading...' : user?.name ?? '—'}
      </p>
      <p className="text-xs text-red-500 dark:text-red-400">
        {loading ? '...' : user?.role ? formatRole(user.role) : '—'}
      </p>
    </div>
  );
  
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar title="Super Admin" links={links} onLogout={handleLogout} footer={adminInfo} />
      <main className="flex-1 p-4 md:p-6 lg:p-8 lg:ml-0 w-full">
        <Outlet />
      </main>
    </div>
  );
}