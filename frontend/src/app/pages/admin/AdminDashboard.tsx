import { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { Package, Users, Clock, CheckCircle, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { useAdminLiveData, useAdminTenantState } from '../../hooks/useAdminLiveData';

type DashboardStats = {
  totalEquipment: number;
  activeUsers: number;
  pendingRequests: number;
  itemsInUse: number;
  availableCount: number;
  maintenanceCount: number;
  approvalRatePercent: number;
  avgBorrowDurationDays: number;
  equipmentUtilizationPercent: number;
};

type ActivityItem = {
  id: number;
  actorName: string;
  message: string;
  status: string;
  time: string;
};

type AlertItem = {
  key: string;
  type: string;
  message: string;
  priority: string;
};

type AlertsResponse = {
  totalCount: number;
  alerts: AlertItem[];
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { tenantId } = useAdminTenantState(user?.tenantId);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsTotalCount, setAlertsTotalCount] = useState(0);

  const loadData = useCallback(() => {
    if (!tenantId) return;
    api.get<DashboardStats>(`/api/tenants/${tenantId}/dashboard/stats`).then(setStats).catch(() => {});
    api.get<ActivityItem[]>(`/api/tenants/${tenantId}/dashboard/recent-activity?limit=5`)
      .then((items) => setActivity(items.slice(0, 5)))
      .catch(() => {});
    api.get<AlertsResponse>(`/api/tenants/${tenantId}/dashboard/alerts`)
      .then((res) => {
        setAlerts(res.alerts.slice(0, 5));
        setAlertsTotalCount(res.totalCount);
      })
      .catch(() => {
        setAlerts([]);
        setAlertsTotalCount(0);
      });
  }, [tenantId]);

  useAdminLiveData(loadData, Boolean(tenantId));

  const dismissAlert = async (alertKey: string) => {
    if (!tenantId) return;
    try {
      await api.post(`/api/tenants/${tenantId}/dashboard/alerts/dismiss`, { alertKey });
      loadData();
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    loadData();
    if (!tenantId) return;
    const timer = window.setInterval(loadData, 10000);
    return () => {
      window.clearInterval(timer);
    };
  }, [tenantId, loadData]);

  const statCards = stats ? [
    { icon: Package, label: 'Total Equipment', value: String(stats.totalEquipment), color: 'indigo' as const },
    { icon: Users, label: 'Active Users', value: String(stats.activeUsers), color: 'sky' as const },
    { icon: Clock, label: 'Pending Requests', value: String(stats.pendingRequests), color: 'orange' as const },
    { icon: CheckCircle, label: 'Items in Use', value: String(stats.itemsInUse), color: 'green' as const },
  ] : [];
  const approvalRateColor = !stats
    ? 'text-foreground'
    : stats.approvalRatePercent > 70
      ? 'text-green-600'
      : stats.approvalRatePercent >= 40
        ? 'text-orange-500'
        : 'text-red-600';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">{user?.tenantName ?? 'College'} - Equipment Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              activity.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 bg-background rounded-xl border border-border"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {a.message}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                  <Badge
                    variant={
                      a.status === 'approved' || a.status === 'success' ? 'success' :
                      a.status === 'pending' ? 'pending' :
                      a.status === 'returned' ? 'neutral' :
                      'neutral'
                    }
                    size="sm"
                  >
                    {a.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alerts & Notifications
            </h3>
            {alertsTotalCount > 0 && <Badge variant="warning">{alertsTotalCount}</Badge>}
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts</p>
            ) : (
              alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.key}
                  className={`p-3 rounded-xl border ${
                    alert.priority === 'high' ? 'bg-red-50 border-red-200' :
                    alert.priority === 'medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.priority === 'high' ? 'text-red-600' :
                      alert.priority === 'medium' ? 'text-amber-600' :
                      'text-blue-600'
                    }`} />
                    <p className={`text-sm ${
                      alert.priority === 'high' ? 'text-red-700 dark:text-red-300' :
                      alert.priority === 'medium' ? 'text-amber-700 dark:text-amber-300' :
                      'text-blue-700'
                    }`}>
                      {alert.message}
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissAlert(alert.key)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Dismiss"
                      aria-label="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Approval Rate</p>
              <p className={`text-3xl font-semibold mb-1 ${approvalRateColor}`}>{stats.approvalRatePercent}%</p>
              <p className="text-xs text-muted-foreground">Based on decisions this month</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Avg. Borrow Duration</p>
              <p className="text-3xl font-semibold text-foreground mb-1">{stats.avgBorrowDurationDays} days</p>
              <p className="text-xs text-muted-foreground">Across all equipment</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Equipment Utilization</p>
              <p className="text-3xl font-semibold text-foreground mb-1">{stats.equipmentUtilizationPercent}%</p>
              <p className="text-xs text-blue-600">Optimal range</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
