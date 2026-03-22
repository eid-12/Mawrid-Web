import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Package, Clock, CheckCircle, AlertCircle, Search, FileText, Bell } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { formatDistanceToNow } from 'date-fns';
import { COLLEGE_REQUIRED_MESSAGE, useCollegeEligibility } from '../../hooks/useCollegeEligibility';

type BorrowRequestDto = {
  id: number;
  tenantId: number;
  userId: number;
  equipmentId: number;
  equipmentName?: string;
  equipmentCategory?: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return iso.split('T')[0];
  } catch {
    return '—';
  }
}

function formatTimeAgo(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
}

export default function UserDashboard() {
  const { user, refreshUserStatus } = useAuth();
  const [requests, setRequests] = useState<BorrowRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { loading: collegeEligibilityLoading, canAccessCoreFeatures, shouldShowRestriction } = useCollegeEligibility();

  useEffect(() => {
    if (!user?.userId) return;
    void refreshUserStatus();
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.userId) return;
    api
      .get<BorrowRequestDto[]>(`/api/users/${user.userId}/borrow-requests`)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [user?.userId]);

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const activeBorrows = requests.filter(
    (r) => r.status === 'APPROVED' || r.status === 'DELIVERED' || r.status === 'delivered'
  ).length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED' || r.status === 'delivered').length;
  const dueSoonCount = requests.filter((r) => {
    if (r.status !== 'APPROVED' && r.status !== 'DELIVERED' && r.status !== 'delivered') return false;
    const end = new Date(r.endDate);
    return end >= now && end <= in48h;
  }).length;

  const stats = [
    { icon: Package, label: 'Active Borrows', value: String(activeBorrows), color: 'indigo' as const },
    { icon: Clock, label: 'Pending Requests', value: String(pendingCount), color: 'orange' as const },
    { icon: CheckCircle, label: 'Approved Requests', value: String(approvedCount), color: 'green' as const },
    { icon: AlertCircle, label: 'Due Soon', value: String(dueSoonCount), color: 'red' as const },
  ];

  const notifications = requests
    .filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'rejected')
    .slice(0, 5)
    .map((r) => {
      const name = r.equipmentName || 'Equipment';
      if (r.status === 'APPROVED')
        return { id: r.id, type: 'success' as const, message: `Your request for ${name} has been approved`, time: formatTimeAgo(r.createdAt) };
      return { id: r.id, type: 'error' as const, message: `Your request for ${name} has been rejected`, time: formatTimeAgo(r.createdAt) };
    })
    .concat(
      requests
        .filter((r) => {
          if (r.status !== 'APPROVED' && r.status !== 'DELIVERED' && r.status !== 'delivered') return false;
          const end = new Date(r.endDate);
          return end >= now && end <= in48h;
        })
        .map((r) => ({
          id: `due-${r.id}`,
          type: 'warning' as const,
          message: `${r.equipmentName || 'Equipment'} is due for return soon`,
          time: formatTimeAgo(r.createdAt),
        }))
    )
    .sort((a, b) => {
      const aReq = requests.find((r) => String(r.id) === String(a.id) || `due-${r.id}` === a.id);
      const bReq = requests.find((r) => String(r.id) === String(b.id) || `due-${r.id}` === b.id);
      const aCreated = aReq?.createdAt ?? '';
      const bCreated = bReq?.createdAt ?? '';
      return bCreated.localeCompare(aCreated);
    })
    .slice(0, 6);

  const recentRequests = requests
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 3);

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'success';
    if (s === 'delivered') return 'info';
    if (s === 'pending') return 'pending';
    if (s === 'rejected' || s === 'cancelled') return 'error';
    return 'neutral';
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back! Here's an overview of your equipment requests.
        </p>
      </div>

      {shouldShowRestriction && (
        <Card className="mt-4 border border-amber-200 bg-amber-50/90 p-5 md:p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm md:text-base font-medium leading-relaxed text-amber-900 max-w-3xl">
              {COLLEGE_REQUIRED_MESSAGE} Selecting an active college is the key to unlocking Catalog and Requests.
            </p>
            <Link to="/user/settings">
              <Button size="sm" className="shrink-0">
                Go to Settings
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {collegeEligibilityLoading ? (
        <Card className="py-10 text-center text-muted-foreground">Loading...</Card>
      ) : canAccessCoreFeatures && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <Link to="/user/catalog">
                <Button variant="secondary" fullWidth icon={Search} iconPosition="left">
                  Browse Catalog
                </Button>
              </Link>
              <Link to="/user/requests">
                <Button variant="secondary" fullWidth icon={FileText} iconPosition="left">
                  View My Requests
                </Button>
              </Link>
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            {/* Notifications */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                  <Bell className="w-5 h-5" />
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <Badge variant="info">{notifications.length}</Badge>
                )}
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 bg-background rounded-xl border border-border hover:border-primary/30 transition-colors"
                    >
                      <p className="text-sm text-foreground mb-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Requests */}
            <Card>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                Recent Requests
              </h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : recentRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet</p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-background rounded-xl border border-border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-heading)' }}>
                          {request.equipmentName ?? 'Equipment'}
                        </p>
                        <p className="text-xs text-muted-foreground">Return: {formatDate(request.endDate)}</p>
                      </div>
                      <Badge variant={getStatusVariant(request.status)} size="sm">
                        {request.status.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/user/requests">
                <Button variant="ghost" fullWidth className="mt-4">
                  View All Requests
                </Button>
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
