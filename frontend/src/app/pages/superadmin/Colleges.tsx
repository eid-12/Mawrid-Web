import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { SuccessToast } from '../../components/SuccessToast';
import {
  Building2, Eye, Edit, Plus, Search, X,
  Users, Package, UserCog, Calendar, Hash,
  Mail, Phone, MapPin, Globe, Save, Trash2, AlertTriangle,
} from 'lucide-react';
import { isValidSaudiPhone, maskSaudiPhoneInput, normalizeSaudiPhoneForApi, SAUDI_PHONE_ERROR } from '../../lib/phoneValidation';

type College = {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  users: number;
  equipment: number;
  admins: number;
  created: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  description?: string;
};

function toCollege(d: { id: number; name: string; code: string; status: string; createdAt?: string; userCount?: number; equipmentCount?: number; adminCount?: number; email?: string; phone?: string; location?: string; website?: string; description?: string }): College {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    status: (d.status || 'ACTIVE').toLowerCase() === 'active' ? 'active' : 'inactive',
    users: d.userCount ?? 0,
    equipment: d.equipmentCount ?? 0,
    admins: d.adminCount ?? 0,
    created: d.createdAt ? d.createdAt.split('T')[0] : '',
    email: d.email,
    phone: d.phone,
    location: d.location,
    website: d.website,
    description: d.description,
  };
}

export default function Colleges() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewCollege, setViewCollege] = useState<College | null>(null);
  const [editCollege, setEditCollege] = useState<College | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingCollege, setIsDeletingCollege] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<College | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0 });

  // Form state
  const [form, setForm] = useState({ name: '', code: '', email: '', phone: '', location: '', website: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', code: '', email: '', phone: '', location: '', website: '', description: '' });

  const fetchColleges = (pageNum = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNum), size: String(itemsPerPage) });
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    api.get<{ content: Array<{ id: number; name: string; code: string; status: string; createdAt?: string; userCount?: number; equipmentCount?: number; adminCount?: number; email?: string; phone?: string; location?: string; website?: string; description?: string }>; totalElements: number; totalPages: number; number: number }>(`/api/tenants?${params.toString()}`)
      .then((data) => {
        setColleges((data.content ?? []).map(toCollege));
        setTotalElements(data.totalElements ?? 0);
        setTotalPages(data.totalPages ?? 0);
        setPage(data.number ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    api.get<{ total: number; active: number }>('/api/tenants/stats').then(setStats).catch(() => {});
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      fetchColleges(0);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [itemsPerPage, searchQuery]);

  const addPhoneValid = !form.phone.trim() || isValidSaudiPhone(form.phone);
  const addPhoneError = form.phone.trim() && !isValidSaudiPhone(form.phone) ? SAUDI_PHONE_ERROR : undefined;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPhoneValid) return;
    setIsSavingAdd(true);
    try {
      await api.post('/api/tenants', {
        name: form.name,
        code: form.code.toUpperCase(),
        status: 'ACTIVE',
        email: form.email || undefined,
        phone: form.phone.trim() ? normalizeSaudiPhoneForApi(form.phone) : undefined,
        location: form.location || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
      });
      fetchColleges(0);
      fetchStats();
      setShowAddModal(false);
      setForm({ name: '', code: '', email: '', phone: '', location: '', website: '', description: '' });
      setToastMessage('College added successfully!');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to add college');
      setShowToast(true);
    } finally {
      setIsSavingAdd(false);
    }
  };

  const editPhoneValid = !editForm.phone.trim() || isValidSaudiPhone(editForm.phone);
  const editPhoneError = editForm.phone.trim() && !isValidSaudiPhone(editForm.phone) ? SAUDI_PHONE_ERROR : undefined;

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCollege) return;
    if (!editPhoneValid) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/api/tenants/${editCollege.id}`, {
        name: editForm.name,
        code: editForm.code.toUpperCase(),
        email: editForm.email || undefined,
        phone: editForm.phone.trim() ? normalizeSaudiPhoneForApi(editForm.phone) : undefined,
        location: editForm.location || undefined,
        website: editForm.website || undefined,
        description: editForm.description || undefined,
      });
      fetchColleges(page);
      fetchStats();
      setEditCollege(null);
      setToastMessage('College updated successfully!');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to update college');
      setShowToast(true);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleCollegeStatus = async (college: College) => {
    const newStatus = college.status === 'active' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/api/tenants/${college.id}`, { name: college.name, code: college.code, status: newStatus });
      fetchColleges(page);
      fetchStats();
      setViewCollege(prev => prev?.id === college.id ? { ...prev, status: college.status === 'active' ? 'inactive' : 'active' } : prev);
      setToastMessage(college.status === 'active' ? 'College deactivated.' : 'College activated!');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to update status');
      setShowToast(true);
    }
  };

  const handleDelete = async (college: College) => {
    setIsDeletingCollege(true);
    try {
      await api.delete(`/api/tenants/${college.id}`);
      const nextPage = colleges.length === 1 && page > 0 ? page - 1 : page;
      setPage(nextPage);
      fetchColleges(nextPage);
      fetchStats();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setEditCollege(null);
      setViewCollege(null);
      setToastMessage('College permanently deleted.');
      setShowToast(true);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to delete college');
      setShowToast(true);
    } finally {
      setIsDeletingCollege(false);
    }
  };

  const openEdit = (college: College) => {
    const raw = college.phone ?? '';
    setEditForm({
      name: college.name,
      code: college.code,
      email: college.email ?? '',
      phone: raw ? maskSaudiPhoneInput(raw) : '',
      location: college.location ?? '',
      website: college.website ?? '',
      description: college.description ?? '',
    });
    setEditCollege(college);
  };

  const totalUsers = colleges.reduce((s, c) => s + c.users, 0);
  const totalEquipment = colleges.reduce((s, c) => s + c.equipment, 0);

  const buildPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(0, Math.min(page - 2, totalPages - maxVisible));
      for (let i = 0; i < maxVisible; i++) pages.push(start + i);
    }
    return pages;
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <SuccessToast isOpen={showToast} variant="success" message={toastMessage} onClose={() => setShowToast(false)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#0F172A] mb-2">Colleges Management</h1>
          <p className="text-sm md:text-base text-[#64748B]">Manage all colleges and their configurations</p>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)}>
          Add College
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Total Colleges</p>
          <p className="text-2xl font-semibold text-[#0F172A]">{stats.total}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Active</p>
          <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Total Users</p>
          <p className="text-2xl font-semibold text-[#8393DE]">{totalUsers.toLocaleString()}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-[#64748B] mb-1">Total Equipment</p>
          <p className="text-2xl font-semibold text-[#87ABE7]">{totalEquipment}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input type="text" placeholder="Search colleges..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={Search} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {colleges.map((college) => (
          <Card
            key={college.id}
            className={`hover:shadow-lg transition-shadow ${
              college.status === 'inactive' ? 'grayscale opacity-75' : ''
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-[#0F172A] text-base leading-tight">{college.name}</h3>
                  <Badge variant={college.status === 'active' ? 'success' : 'neutral'} size="sm">{college.status}</Badge>
                </div>
                <p className="text-sm text-[#64748B]">Code: {college.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-[#E2E8F0]">
              <div className="bg-[#F8FAFF] rounded-xl p-2.5 text-center">
                <Users className="w-4 h-4 text-[#8393DE] mx-auto mb-1" />
                <p className="text-base font-semibold text-[#0F172A]">{college.users}</p>
                <p className="text-xs text-[#64748B]">Users</p>
              </div>
              <div className="bg-[#F8FAFF] rounded-xl p-2.5 text-center">
                <Package className="w-4 h-4 text-[#87ABE7] mx-auto mb-1" />
                <p className="text-base font-semibold text-[#0F172A]">{college.equipment}</p>
                <p className="text-xs text-[#64748B]">Equipment</p>
              </div>
              <div className="bg-[#F8FAFF] rounded-xl p-2.5 text-center">
                <UserCog className="w-4 h-4 text-[#8CCDE6] mx-auto mb-1" />
                <p className="text-base font-semibold text-[#0F172A]">{college.admins}</p>
                <p className="text-xs text-[#64748B]">Admins</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[#94A3B8] dark:text-[#A0AEC0]">Created: {college.created}</p>
              <div className="flex items-center gap-1.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={Eye} 
                  className="text-[#8393DE] dark:text-[#A0AEC0] hover:bg-[#F0F4FF] dark:hover:bg-blue-950/20" 
                  onClick={() => setViewCollege(college)}
                >
                  View
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={Edit} 
                  className="text-[#64748B] dark:text-[#A0AEC0] hover:bg-[#F5F9FF] dark:hover:bg-gray-700/30" 
                  onClick={() => openEdit(college)}
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {colleges.length === 0 && (
        <Card className="text-center py-12">
          <Building2 className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No colleges found</h3>
          <p className="text-sm text-[#64748B]">Try adjusting your search criteria</p>
        </Card>
      )}

      {/* Pagination */}
      {totalElements > 0 && (
        <Card padding="sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-[#64748B]">
              Showing {colleges.length} of {totalElements} colleges
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
                onClick={() => { setPage(p => Math.max(0, p - 1)); fetchColleges(Math.max(0, page - 1)); }}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]"
              >
                &lt;
              </button>
              {buildPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); fetchColleges(p); }}
                  className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? 'bg-gradient-to-r from-[#8CCDE6] to-[#8393DE] text-white' : 'bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]'}`}
                >
                  {p + 1}
                </button>
              ))}
              {totalPages > 5 && page < totalPages - 2 && <span className="px-1 text-[#64748B]">...</span>}
              {totalPages > 5 && page < totalPages - 2 && (
                <button
                  onClick={() => { setPage(totalPages - 1); fetchColleges(totalPages - 1); }}
                  className="w-9 h-9 rounded-lg text-sm font-medium bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]"
                >
                  {totalPages}
                </button>
              )}
              <button
                onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); fetchColleges(Math.min(totalPages - 1, page + 1)); }}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-[#E2E8F0] hover:bg-[#F5F9FF] text-[#334155]"
              >
                &gt;
              </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── View Drawer ── */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{ background: viewCollege ? 'rgba(15,23,42,0.35)' : 'transparent', pointerEvents: viewCollege ? 'auto' : 'none', backdropFilter: viewCollege ? 'blur(2px)' : 'none' }}
        onClick={() => setViewCollege(null)}
      />
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: '420px', maxWidth: '95vw', transform: viewCollege ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', borderRadius: '20px 0 0 20px' }}
      >
        {viewCollege && (
          <>
            <div className="flex items-center justify-between px-6 py-5" style={{ background: 'linear-gradient(135deg,#8CCDE6 0%,#87ABE7 50%,#8393DE 100%)', borderRadius: '20px 0 0 0' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs">College Details</p>
                  <p className="text-white font-semibold">{viewCollege.name}</p>
                </div>
              </div>
              <button onClick={() => setViewCollege(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Users', value: viewCollege.users, icon: Users, color: '#8393DE' },
                  { label: 'Equipment', value: viewCollege.equipment, icon: Package, color: '#87ABE7' },
                  { label: 'Admins', value: viewCollege.admins, icon: UserCog, color: '#8CCDE6' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-[#F8FAFF] border border-[#E8EFFE] rounded-2xl p-3 text-center">
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                    <p className="text-lg font-bold text-[#0F172A]">{value}</p>
                    <p className="text-xs text-[#64748B]">{label}</p>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="rounded-2xl bg-[#F8FAFF] border border-[#E8EFFE] p-4 space-y-3">
                <p className="text-xs font-semibold text-[#8393DE] uppercase tracking-wide">Information</p>
                {[
                  { icon: Hash, label: 'Code', value: viewCollege.code },
                  { icon: Mail, label: 'Email', value: viewCollege.email ?? '–' },
                  { icon: Phone, label: 'Phone', value: viewCollege.phone ?? '–' },
                  { icon: MapPin, label: 'Location', value: viewCollege.location ?? '–' },
                  { icon: Globe, label: 'Website', value: viewCollege.website ?? '–' },
                  { icon: Calendar, label: 'Created', value: viewCollege.created },
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

              {/* Description */}
              {viewCollege.description && (
                <div className="rounded-2xl bg-[#F8FAFF] border border-[#E8EFFE] p-4">
                  <p className="text-xs font-semibold text-[#8393DE] uppercase tracking-wide mb-2">About</p>
                  <p className="text-sm text-[#334155] leading-relaxed">{viewCollege.description}</p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-between bg-[#F8FAFF] border border-[#E8EFFE] rounded-2xl p-4">
                <div>
                  <p className="text-xs text-[#94A3B8] mb-1">College Status</p>
                  <Badge variant={viewCollege.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {viewCollege.status}
                  </Badge>
                </div>
                {viewCollege.status === 'active' ? (
                  <button
                    onClick={() => handleToggleCollegeStatus(viewCollege)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleCollegeStatus(viewCollege)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setViewCollege(null)}>Close</Button>
              <Button fullWidth icon={Edit} onClick={() => { setViewCollege(null); openEdit(viewCollege); }}>Edit</Button>
            </div>
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editCollege && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && setEditCollege(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                  <Edit className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0F172A]">Edit College</h2>
                  <p className="text-xs text-[#64748B]">{editCollege.name}</p>
                </div>
              </div>
              <button onClick={() => setEditCollege(null)} className="w-8 h-8 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={handleEditSave} noValidate className="overflow-y-auto flex-1">
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">College Name *</label>
                    <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="e.g. College of Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">College Code *</label>
                    <input required value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm uppercase" placeholder="e.g. ENG" maxLength={6} />
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Official Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="college@university.edu" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Location</label>
                    <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="Building name, Campus" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Website</label>
                    <input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="college.university.edu" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Description</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm resize-none" placeholder="Brief description of the college..." />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="sm:whitespace-nowrap"
                  onClick={() => setEditCollege(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  icon={Trash2}
                  fullWidth
                  className="border-red-300 text-red-600 hover:bg-red-50 sm:whitespace-nowrap"
                  disabled={isSavingEdit || isDeletingCollege}
                  onClick={() => {
                    setDeleteTarget(editCollege);
                    setDeleteConfirmText('');
                    setShowDeleteConfirm(true);
                  }}
                >
                  Delete College
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  icon={Save}
                  className="sm:whitespace-nowrap"
                  disabled={isSavingEdit || !editPhoneValid}
                >
                  {isSavingEdit ? 'Processing...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add College Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8CCDE6] to-[#8393DE] flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0F172A]">Add New College</h2>
                  <p className="text-xs text-[#64748B]">Fill in the college details</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>

            <form onSubmit={(e) => handleAdd(e)} noValidate className="overflow-y-auto flex-1">
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">College Name *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="e.g. College of Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">College Code *</label>
                    <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm uppercase" placeholder="e.g. ENG" maxLength={6} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: maskSaudiPhoneInput(e.target.value) }))}
                      placeholder="05X XXX XXXX"
                      className={`w-full h-11 px-4 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm ${addPhoneError ? 'border-red-500' : 'border-[#E2E8F0]'}`}
                    />
                    {addPhoneError && <p className="text-xs text-red-600 mt-1">{addPhoneError}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Official Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="college@university.edu" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Location</label>
                    <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="Building name, Campus" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Website</label>
                    <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm" placeholder="college.university.edu" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#334155] mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40 text-[#334155] text-sm resize-none" placeholder="Brief description of the college..." />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAddModal(false)} disabled={isSavingAdd}>Cancel</Button>
                <Button type="submit" fullWidth icon={Plus} disabled={isSavingAdd || !addPhoneValid}>{isSavingAdd ? 'Processing...' : 'Add College'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
          onClick={(e) => e.target === e.currentTarget && !isDeletingCollege && setShowDeleteConfirm(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-700">Danger Zone: Permanent Deletion</h3>
                  <p className="text-xs text-red-600">This action cannot be reversed.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#334155] leading-relaxed">
                Warning: You are about to permanently delete <strong>{deleteTarget.name}</strong>. All equipment, requests,
                admins, and users will be permanently removed. This action CANNOT be reversed.
              </p>
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1.5">
                  Type <span className="font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-300 text-[#334155] text-sm"
                  placeholder="Type DELETE here"
                  disabled={isDeletingCollege}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingCollege}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="border-red-300 text-red-600 hover:bg-red-50"
                disabled={deleteConfirmText !== 'DELETE' || isDeletingCollege}
                onClick={() => handleDelete(deleteTarget)}
              >
                {isDeletingCollege ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}