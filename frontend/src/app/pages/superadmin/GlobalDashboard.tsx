import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { Building2, Users, Package, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../api/client';

type DashboardStats = {
  totalColleges: number;
  totalUsers: number;
  totalEquipment: number;
  totalRequests: number;
  activeUsers: number;
  systemUtilizationPercent: number;
};

type CollegeStatRow = { name: string; users: number; equipment: number; requests: number };
type RecentActivityItem = { id: number; college: string; action: string; details: string; time: string };
type SystemHealth = {
  averageResponseTimePercent: number;
  averageResponseTimeLabel: string;
  databasePerformancePercent: number;
  databasePerformanceLabel: string;
  apiUptimePercent: number;
};

function fetchDashboard() {
  return Promise.all([
    api.get<DashboardStats>('/api/dashboard/stats'),
    api.get<CollegeStatRow[]>('/api/dashboard/college-stats'),
    api.get<RecentActivityItem[]>('/api/dashboard/recent-activity?limit=5'),
    api.get<SystemHealth>('/api/dashboard/system-health'),
  ]);
}

export default function GlobalDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [collegeData, setCollegeData] = useState<CollegeStatRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(([s, c, r, h]) => {
        setStats(s);
        setCollegeData(c);
        setRecentActivity((r ?? []).slice(0, 5));
        setSystemHealth(h);
      })
      .catch(() => {});
  }, []);

  // Refetch when tab becomes visible (e.g. after deactivating user in User Management)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard()
          .then(([s, c, r, h]) => {
            setStats(s);
            setCollegeData(c);
            setRecentActivity((r ?? []).slice(0, 5));
            setSystemHealth(h);
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const displayStats = [
    { icon: Building2, label: 'Total Colleges', value: stats?.totalColleges?.toString() ?? '–', color: 'indigo' as const },
    { icon: Users, label: 'Total Users', value: stats?.totalUsers?.toLocaleString() ?? '–', color: 'sky' as const },
    { icon: Package, label: 'Total Equipment', value: stats?.totalEquipment?.toString() ?? '–', color: 'green' as const },
    { icon: TrendingUp, label: 'System Utilization', value: stats ? `${stats.systemUtilizationPercent}%` : '–', color: 'orange' as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">Global Dashboard</h1>
        <p className="text-[#64748B]">System-wide overview and analytics across all colleges</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-[#0F172A] mb-6">College Statistics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={collegeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
            <Legend />
            <Bar dataKey="users" fill="#8CCDE6" name="Users" radius={[8, 8, 0, 0]} />
            <Bar dataKey="equipment" fill="#8393DE" name="Equipment" radius={[8, 8, 0, 0]} />
            <Bar dataKey="requests" fill="#BAE1F0" name="Requests" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[520px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h3>
          </div>
          <div className="space-y-3 flex-1">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[#64748B]">No recent activity</p>
            ) : (
              recentActivity.slice(0, 5).map((a) => (
                <div key={a.id} className="p-3 bg-[#F5F9FF] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-[#0F172A]">{a.college}</p>
                    <p className="text-xs text-[#64748B]">{a.time}</p>
                  </div>
                  <p className="text-sm text-[#334155] mb-1">{a.action}</p>
                  <p className="text-xs text-[#64748B]">{a.details}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-4">System Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">Average Response Time</span>
                <span className="text-sm font-medium text-green-600">{systemHealth?.averageResponseTimeLabel ?? '–'}</span>
              </div>
              <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8CCDE6] to-[#8393DE]" style={{ width: `${systemHealth?.averageResponseTimePercent ?? 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">Database Performance</span>
                <span className="text-sm font-medium text-green-600">{systemHealth?.databasePerformanceLabel ?? '–'}</span>
              </div>
              <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8CCDE6] to-[#8393DE]" style={{ width: `${systemHealth?.databasePerformancePercent ?? 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">API Uptime</span>
                <span className="text-sm font-medium text-green-600">{systemHealth?.apiUptimePercent ?? '–'}%</span>
              </div>
              <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#8CCDE6] to-[#8393DE]" style={{ width: `${systemHealth?.apiUptimePercent ?? 0}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {collegeData.slice(0, 4).map((college) => (
          <Card key={college.name} hover>
            <div className="text-center">
              <Building2 className="w-8 h-8 text-[#8393DE] mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-[#0F172A] mb-2">{college.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-[#64748B]">Users</p><p className="font-medium text-[#0F172A]">{college.users}</p></div>
                <div><p className="text-[#64748B]">Items</p><p className="font-medium text-[#0F172A]">{college.equipment}</p></div>
                <div><p className="text-[#64748B]">Requests</p><p className="font-medium text-[#0F172A]">{college.requests}</p></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
