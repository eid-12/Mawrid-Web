import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { AlertDialog } from '../../components/AlertDialog';
import { SuccessToast } from '../../components/SuccessToast';
import { formatDistanceToNow } from 'date-fns';
import {
  Search, Filter, Eye, Shield, User, X,
  Mail, Building2, Calendar, Edit2, Trash2,
  UserCheck, UserX, Lock, Save, Plus, Phone,
} from 'lucide-react';
import { isValidSaudiPhone, maskSaudiPhoneInput, normalizeSaudiPhoneForApi, SAUDI_PHONE_ERROR } from '../../lib/phoneValidation';

type UserRole = 'user' | 'admin' | 'superadmin';
type UserStatus = 'active' | 'inactive';

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  college: string;
  status: UserStatus;
  joined: string;
  lastActive: string;
  department: string;
  phone?: string;
};

const ROLES: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
];

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '—';
  }
}

function toUserRecord(d: { id: number; name: string; email: string; role: string; tenantName?: string; active: boolean; createdAt?: string; lastActiveAt?: string | null; phone?: string | null }): UserRecord {
  const role = (d.role || 'USER').toLowerCase().replace('super_admin', 'superadmin').replace('_', '') as UserRole;
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    role: role as UserRole,
    college: d.tenantName ?? 'System',
    status: d.active ? 'active' : 'inactive',
    joined: d.createdAt ? d.createdAt.split('T')[0] : '',
    lastActive: formatLastActive(d.lastActiveAt),
    department: '',
    phone: d.phone ?? undefined,
  };
}

export default function UserManagement() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tenants, setTenants] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [stats, setStats] = useState({ total: 0, collegeAdmins: 0, superAdmins: 0, active: 0 });
  const [viewUser, setViewUser] = useState<UserRecord | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' as UserRole, college: '', department: '', password: '', phone: '' });
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'USER' as string, password: '', tenantId: null as number | null, phone: '' });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchUsers = (pageNum = page) => {
    setLoading(true);
    const roleParam = selectedRole === 'all' ? '' : selectedRole;
    const params = new URLSearchParams({ page: String(pageNum), size: String(itemsPerPage) });
    if (roleParam) params.set('role', roleParam);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    api.get<{ content: Array<{ id: number; name: string; email: string; role: string; tenantName?: string; active: boolean; createdAt?: string; lastActiveAt?: string | null; phone?: string | null }>; totalElements: number; totalPages: number; number: number }>(`/api/users?${params}`)
      .then((data) => {
        setUsers((data.content ?? []).map(toUserRecord));
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setPage(data.number ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    api.get<{ total: number; collegeAdmins: number; superAdmins: number; active: number }>('/api/users/stats')
      .then(setStats).catch(() => {});
  };

  const fetchTenants = () => {
    api.get<Array<{ id: number; name: string }>>('/api/tenants/active').then(setTenants).catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      fetchUsers(0);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [selectedRole, itemsPerPage, searchQuery]);

  useEffect(() => {
    fetchTenants();
  }, []);

  // When Add User or Edit modal opens, ensure tenants are loaded for College dropdown
  useEffect(() => {
    if (showAddModal || editUser) fetchTenants();
  }, [showAddModal, editUser]);

  // When Role changes in Add form: clear college selection immediately so UI re-validates
  useEffect(() => {
    if (!showAddModal) return;
    const requiresCollege = addForm.role === 'ADMIN' || addForm.role === 'USER';
    if (!requiresCollege) {
      setAddForm(f => (f.tenantId != null ? { ...f, tenantId: null } : f));
    }
  }, [addForm.role, showAddModal]);

  const getRoleBadgeVariant = (role: UserRole) => {
    if (role === 'superadmin') return 'error';
    if (role === 'admin') return 'info';
    return 'neutral';
  };

  const getRoleLabel = (role: UserRole) =>
    role === 'superadmin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1);

  const openEdit = (u: UserRecord) => {
    const raw = u.phone ?? '';
    setEditForm({ name: u.name, email: u.email, role: u.role, college: u.college, department: u.department, password: '', phone: raw ? maskSaudiPhoneInput(raw) : '' });
    setEditUser(u);
  };

  const editPhoneValid = !editForm.phone.trim() || isValidSaudiPhone(editForm.phone);
  const editPhoneError = editForm.phone.trim() && !isValidSaudiPhone(editForm.phone) ? SAUDI_PHONE_ERROR : undefined;

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if ((editForm.role === 'admin' || editForm.role === 'user') && (editForm.college === 'System' || !editForm.college)) {
      setToastMessage('College is required for Admin and User roles');
      setShowToast(true);
      return;
    }
    if (!editPhoneValid) {
      setToastMessage(SAUDI_PHONE_ERROR);
      setShowToast(true);
      return;
    }
    setIsSavingEdit(true);
    try {
      const role = editForm.role === 'superadmin' ? 'SUPER_ADMIN' : (editForm.role as string).toUpperCase().replace(' ', '_');
      const tenantId = editForm.college === 'System' ? 0 : (tenants.find(t => t.name === editForm.college)?.id ?? null);
      const payload: Record<string, unknown> = { name: editForm.name, email: editForm.email.trim(), role, tenantId };
      if (editForm.password.trim()) payload.password = editForm.password;
      payload.phone = editForm.phone.trim() ? normalizeSaudiPhoneForApi(editForm.phone) : null;
      await api.put(`/api/users/${editUser.id}`, payload);
      fetchUsers(page);
      fetchStats();
      setEditUser(null);
      setToastMessage('User updated successfully!');
      setToastVariant('success');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to update user');
      setShowToast(true);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    const newActive = u.status !== 'active';
    try {
      const updated = await api.put<{ id: number; name: string; email: string; role: string; tenantName?: string; active: boolean; createdAt?: string; lastActiveAt?: string | null }>(`/api/users/${id}`, { isActive: newActive });
      fetchUsers(page);
      fetchStats();
      if (viewUser?.id === id) {
        setViewUser(toUserRecord(updated));
      }
      setToastMessage(u.status === 'active' ? 'User deactivated.' : 'User activated!');
      setToastVariant(u.status === 'active' ? 'cancel' : 'success');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to update status');
      setShowToast(true);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/users/${id}`);
      const nextPage = users.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      fetchUsers(nextPage);
      fetchStats();
      setDeleteUserId(null);
      setToastMessage('User removed successfully.');
      setToastVariant('cancel');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to delete user');
      setShowToast(true);
    }
  };

  const addPhoneValid = !addForm.phone.trim() || isValidSaudiPhone(addForm.phone);
  const addPhoneError = addForm.phone.trim() && !isValidSaudiPhone(addForm.phone) ? SAUDI_PHONE_ERROR : undefined;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.password.trim()) {
      setToastMessage('Password is required');
      setShowToast(true);
      return;
    }
    if ((addForm.role === 'ADMIN' || addForm.role === 'USER') && !addForm.tenantId) {
      setToastMessage('College is required for Admin and User roles');
      setShowToast(true);
      return;
    }
    if (!addPhoneValid) {
      setToastMessage(SAUDI_PHONE_ERROR);
      setShowToast(true);
      return;
    }
    setIsSavingAdd(true);
    try {
      await api.post('/api/users', {
        name: addForm.name,
        email: addForm.email,
        role: addForm.role,
        password: addForm.password,
        tenantId: addForm.tenantId || null,
        phone: addForm.phone.trim() ? normalizeSaudiPhoneForApi(addForm.phone) : null,
      });
      fetchUsers(0);
      fetchStats();
      setShowAddModal(false);
      setAddForm({ name: '', email: '', role: 'USER', password: '', tenantId: null, phone: '' });
      setToastMessage('User created successfully. A welcome email has been sent.');
      setToastVariant('success');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to add user');
      setShowToast(true);
    } finally {
      setIsSavingAdd(false);
    }
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <SuccessToast isOpen={showToast} variant={toastVariant} message={toastMessage} onClose={() => setShowToast(false)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">User Management</h1>
          <p className="text-[#64748B]">Manage user accounts and permissions across all colleges</p>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Add User
        </Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <div className="space-y-4">
          <Input type="text" placeholder="Search users by name, email or college..." icon={Search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#64748B]" />
              <span className="text-sm font-medium text-[#334155]">Role:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ROLES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setSelectedRole(value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${selectedRole === value ? 'bg-gradient-to-r from-[#8CCDE6] to-[#8393DE] text-white' : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#8393DE]/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Total Users</p>
          <p className="text-2xl font-semibold text-[#0F172A]">{stats.total}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">College Admins</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.collegeAdmins}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Super Admins</p>
          <p className="text-2xl font-semibold text-red-500">{stats.superAdmins}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Active</p>
          <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F9FF] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">College</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">Joined</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#0F172A]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className={`border-b border-[#E2E8F0] hover:bg-[#F5F9FF] transition-colors ${index === users.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">{initials(user.name)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">{user.name}</p>
                        <p className="text-xs text-[#64748B]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getRoleBadgeVariant(user.role) as any} size="sm">
                      {user.role === 'superadmin' || user.role === 'admin'
                        ? <Shield className="w-3 h-3 mr-1 inline" />
                        : <User className="w-3 h-3 mr-1 inline" />}
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#334155]">{user.college}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-[#64748B]">{user.joined}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewUser(user)}
                        title="View Details"
                        className="w-8 h-8 rounded-xl hover:bg-[#F0F4FF] flex items-center justify-center transition-colors text-[#8393DE]"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        title="Edit User"
                        className="w-8 h-8 rounded-xl hover:bg-[#F5F9FF] flex items-center justify-center transition-colors text-[#64748B]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${user.status === 'active' ? 'hover:bg-orange-50 text-orange-400' : 'hover:bg-green-50 text-green-500'}`}
                      >
                        {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setDeleteUserId(user.id)}
                        title="Delete User"
                        className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center transition-colors text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
              <p className="text-[#64748B]">No users match your filters</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-[#E2E8F0]">
            <p className="text-sm text-[#64748B]">
              Showing {users.length} of {totalElements} users
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B]">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-border text-[#334155] dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
              <button
                onClick={() => { setPage(p => Math.max(0, p - 1)); fetchUsers(Math.max(0, page - 1)); }}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]"
              >
                &lt;
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i;
                else if (page < 3) p = i;
                else if (page >= totalPages - 2) p = totalPages - 5 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => { setPage(p); fetchUsers(p); }}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? 'bg-gradient-to-r from-[#8CCDE6] to-[#8393DE] text-white' : 'bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]'}`}
                  >
                    {p + 1}
                  </button>
                );
              })}
              {totalPages > 5 && page < totalPages - 2 && <span className="px-1 text-[#64748B]">...</span>}
              {totalPages > 5 && (
                <button
                  onClick={() => { setPage(totalPages - 1); fetchUsers(totalPages - 1); }}
                  className={`w-9 h-9 rounded-lg text-sm font-medium ${page === totalPages - 1 ? 'bg-gradient-to-r from-[#8CCDE6] to-[#8393DE] text-white' : 'bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]'}`}
                >
                  {totalPages}
                </button>
              )}
              <button
                onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); fetchUsers(Math.min(totalPages - 1, page + 1)); }}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]"
              >
                &gt;
              </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── View Drawer ── */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{ background: viewUser ? 'rgba(15,23,42,0.35)' : 'transparent', pointerEvents: viewUser ? 'auto' : 'none', backdropFilter: viewUser ? 'blur(2px)' : 'none' }}
        onClick={() => setViewUser(null)}
      />
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: '380px', maxWidth: '95vw', transform: viewUser ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', borderRadius: '20px 0 0 20px' }}
      >
        {viewUser && (
          <>
            {/* Drawer Header */}
            <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center" style={{ background: 'linear-gradient(135deg,#8CCDE6 0%,#87ABE7 50%,#8393DE 100%)', borderRadius: '20px 0 0 0' }}>
              <button onClick={() => setViewUser(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center mb-3">
                <span className="text-white text-xl font-bold">{initials(viewUser.name)}</span>
              </div>
              <p className="text-white font-semibold text-lg">{viewUser.name}</p>
              <div className="mt-2">
                <Badge variant={getRoleBadgeVariant(viewUser.role) as any} size="sm">
                  {getRoleLabel(viewUser.role)}
                </Badge>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-2xl bg-[#F8FAFF] border border-[#E8EFFE] p-4 space-y-3">
                <p className="text-xs font-semibold text-[#8393DE] uppercase tracking-wide">Account Info</p>
                {[
                  { icon: Mail, label: 'Email', value: viewUser.email },
                  { icon: Building2, label: 'College', value: viewUser.college },
                  { icon: Calendar, label: 'Joined', value: viewUser.joined },
                  { icon: Lock, label: 'Last Active', value: viewUser.lastActive },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-[#8393DE]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">{label}</p>
                      <p className="text-sm text-[#334155]">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between bg-[#F8FAFF] border border-[#E8EFFE] rounded-2xl p-4">
                <div>
                  <p className="text-xs text-[#94A3B8] mb-1">Account Status</p>
                  <Badge variant={viewUser.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {viewUser.status}
                  </Badge>
                </div>
                {viewUser.status === 'active' ? (
                  <button
                    onClick={() => { handleToggleStatus(viewUser.id); setViewUser(null); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => { handleToggleStatus(viewUser.id); setViewUser(null); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setViewUser(null)}>Close</Button>
              <Button fullWidth icon={Edit2} onClick={() => { setViewUser(null); openEdit(viewUser); }}>Edit</Button>
            </div>
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{initials(editUser.name)}</span>
                </div>
                <div>
                  <h2 className="font-semibold text-[#0F172A]">Edit User</h2>
                  <p className="text-xs text-[#64748B]">{editUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="w-8 h-8 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={handleEditSave} noValidate>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Full Name *</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Email *</label>
                  <input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Role *</label>
                  <select
                    required
                    value={editForm.role}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      setEditForm(f => ({
                        ...f,
                        role: newRole,
                        college: (newRole === 'admin' || newRole === 'user') ? '' : 'System',
                      }));
                      if (newRole === 'admin' || newRole === 'user') fetchTenants();
                    }}
                    className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: maskSaudiPhoneInput(e.target.value) }))}
                    placeholder="05X XXX XXXX"
                    className={`w-full h-11 px-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm ${editPhoneError ? 'border-red-500' : 'border-[#E2E8F0]'}`}
                  />
                  {editPhoneError && <p className="text-xs text-red-600 mt-1">{editPhoneError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">College</label>
                  <select
                    value={editForm.college}
                    onChange={e => setEditForm(f => ({ ...f, college: e.target.value }))}
                    required={editForm.role === 'admin' || editForm.role === 'user'}
                    className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm"
                  >
                    {(editForm.role !== 'admin' && editForm.role !== 'user') ? (
                      <option value="System">No College / System-wide</option>
                    ) : (
                      <option value="">Select a college...</option>
                    )}
                    {tenants.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  {(editForm.role === 'admin' || editForm.role === 'user') && (!editForm.college || editForm.college === 'System') && (
                    <p className="text-xs text-amber-600 mt-1">Admin and User roles must be assigned to a college.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">New Password</label>
                  <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setEditUser(null)} disabled={isSavingEdit}>Cancel</Button>
                <Button type="submit" fullWidth icon={Save} disabled={isSavingEdit || !editPhoneValid}>{isSavingEdit ? 'Processing...' : 'Save Changes'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0F172A]">Add New User</h2>
                  <p className="text-xs text-[#64748B]">Create a new account</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
            <form onSubmit={handleAddUser} noValidate>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Full Name *</label>
                  <input required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Email *</label>
                  <input required type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="user@university.edu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={e => setAddForm(f => ({ ...f, phone: maskSaudiPhoneInput(e.target.value) }))}
                    placeholder="05X XXX XXXX"
                    className={`w-full h-11 px-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm ${addPhoneError ? 'border-red-500' : 'border-[#E2E8F0]'}`}
                  />
                  {addPhoneError && <p className="text-xs text-red-600 mt-1">{addPhoneError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Password *</label>
                  <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="Initial password (required)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">Role *</label>
                  <select
                    value={addForm.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setAddForm(f => ({ ...f, role: newRole, tenantId: null }));
                      if (newRole === 'ADMIN' || newRole === 'USER') fetchTenants();
                    }}
                    className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">College</label>
                  <select
                    value={addForm.tenantId ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setAddForm(f => ({ ...f, tenantId: val ? Number(val) : null }));
                    }}
                    required={addForm.role === 'ADMIN' || addForm.role === 'USER'}
                    className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm"
                  >
                    {(addForm.role !== 'ADMIN' && addForm.role !== 'USER') ? (
                      <option value="">No College / System-wide</option>
                    ) : (
                      <option value="">Select a college...</option>
                    )}
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {(addForm.role === 'ADMIN' || addForm.role === 'USER') && (addForm.tenantId == null || addForm.tenantId === 0) && (
                    <p className="text-xs text-amber-600 mt-1">Admin and User roles must be assigned to a college.</p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAddModal(false)} disabled={isSavingAdd}>Cancel</Button>
                <Button
                  type="submit"
                  fullWidth
                  icon={Plus}
                  disabled={
                    isSavingAdd ||
                    !addPhoneValid ||
                    ((addForm.role === 'ADMIN' || addForm.role === 'USER') && (addForm.tenantId == null || addForm.tenantId === 0))
                  }
                >
                  {isSavingAdd ? 'Processing...' : 'Add User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={() => handleDelete(deleteUserId!)}
        title="Delete User"
        description="Are you sure you want to permanently delete this user? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}