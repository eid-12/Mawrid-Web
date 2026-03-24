import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Search, CheckCircle, XCircle, X, FileText } from 'lucide-react';
import { AlertDialog } from '../../components/AlertDialog';
import { SuccessToast } from '../../components/SuccessToast';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { useAdminLiveData, useAdminTenantState } from '../../hooks/useAdminLiveData';

type RequestDto = {
  id: number;
  userId: number;
  equipmentId: number;
  equipmentUnitId?: number | null;
  equipmentUnitSerialNo?: string | null;
  userName?: string;
  userEmail?: string;
  equipmentName?: string;
  equipmentCategory?: string;
  startDate: string;
  endDate: string;
  status: string;
  requestNote?: string;
  decidedAt?: string;
  createdAt?: string;
};

type RequestSearchResponse = {
  items: RequestDto[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

const PAGE_SIZE = 7;
const STATUS_FILTERS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'RETURNED', label: 'Returned' },
  { key: 'ON_LOAN', label: 'On Loan' },
] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function Requests() {
  const { user } = useAuth();
  const { tenantId, tenantStatus } = useAdminTenantState(user?.tenantId);
  const isReadOnlyCollege = tenantStatus === 'INACTIVE';
  const [requests, setRequests] = useState<RequestDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveRequestId, setApproveRequestId] = useState<number | null>(null);
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  const [viewRequest, setViewRequest] = useState<RequestDto | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel' | 'warning'>('success');

  const buildQuery = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('size', String(itemsPerPage));
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (activeStatuses.length > 0) params.set('statuses', activeStatuses.join(','));
    return params.toString();
  };

  const loadData = useCallback(
    async (targetPage: number) => {
      if (!tenantId) return;
      setIsLoading(true);
      try {
        const query = buildQuery(targetPage);
        const res = await api.get<RequestSearchResponse>(`/api/tenants/${tenantId}/borrow-requests/search?${query}`);
        setRequests(res.items ?? []);
        setPage(res.page ?? 0);
        setTotalPages(res.totalPages ?? 0);
        setTotalItems(res.totalItems ?? 0);
      } catch {
        setRequests([]);
        setTotalPages(0);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, searchQuery, activeStatuses, itemsPerPage]
  );

  useAdminLiveData(() => void loadData(page), Boolean(tenantId));

  useEffect(() => {
    if (!tenantId) return;
    const timer = window.setTimeout(() => {
      void loadData(page);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [tenantId, page, loadData]);

  useEffect(() => {
    if (!tenantId) return;
    const timer = window.setTimeout(() => {
      if (page !== 0) {
        setPage(0);
        return;
      }
      void loadData(0);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [tenantId, searchQuery, activeStatuses, itemsPerPage, loadData]);

  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const approvedToday = requests.filter((r) => {
    if ((r.status !== 'APPROVED' && r.status !== 'ON_LOAN') || !r.decidedAt) return false;
    const d = new Date(r.decidedAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;
  const totalWeek = totalItems;

  const handleApprove = async (id: number) => {
    if (isReadOnlyCollege) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('cancel');
      setShowToast(true);
      return;
    }
    try {
      await api.post(`/api/tenants/${tenantId}/borrow-requests/${id}/approve`, {});
      setApproveRequestId(null);
      setToastMessage('Request approved successfully!');
      setToastVariant('success');
      setShowToast(true);
      loadData(page);
    } catch {
      setToastMessage('Failed to approve');
      setShowToast(true);
    }
  };

  const handleReject = async () => {
    if (isReadOnlyCollege) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('cancel');
      setShowToast(true);
      return;
    }
    if (!rejectionReason.trim()) {
      setToastMessage('Please provide a rejection reason.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    if (!rejectRequestId || !tenantId) return;
    try {
      await api.post(`/api/tenants/${tenantId}/borrow-requests/${rejectRequestId}/reject`, {
        decisionReason: rejectionReason,
        decidedByAdminId: user?.userId,
      });
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectRequestId(null);
      setToastMessage('Request rejected.');
      setToastVariant('cancel');
      setShowToast(true);
      loadData(page);
    } catch {
      setToastVariant('cancel');
      setToastMessage('Failed to reject');
      setShowToast(true);
    }
  };

  const statusVariant = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === 'pending') return 'pending';
    if (lower === 'approved' || lower === 'on_loan') return 'success';
    return 'error';
  };

  const statusLabel = (s: string) => {
    const lower = s.toLowerCase();
    if (lower === 'on_loan') return 'Borrowed';
    return lower
      .replace(/_/g, ' ')
      .split(' ')
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(' ');
  };

  const durationDays = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
  const notePreview = (note?: string) => (note && note.trim() ? note.trim() : '—');
  const compactReasonPreview = (note?: string) => {
    const normalized = notePreview(note);
    if (normalized === '—') return normalized;
    return normalized.length > 5 ? `${normalized.slice(0, 5)}...` : normalized;
  };
  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    const start = Math.max(0, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    const nums: number[] = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const toggleStatus = (status: string) => {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <div className="space-y-6">
      <SuccessToast isOpen={showToast} variant={toastVariant} message={toastMessage} onClose={() => setShowToast(false)} />

      <div>
        <h1 className="text-3xl font-semibold text-foreground mb-2">Request Management</h1>
        <p className="text-muted-foreground">Review and process equipment borrowing requests</p>
      </div>

      <Card>
        <Input
          type="text"
            placeholder="Search by serial number or equipment name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((item) => {
          const active = activeStatuses.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleStatus(item.key)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                active
                  ? 'bg-[#8393DE]/15 border-[#8393DE] text-[#3949AB] font-medium'
                  : 'bg-white dark:bg-[#111a2e] border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94a3b8] hover:border-[#CBD5E1] dark:hover:border-[#475569]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        {activeStatuses.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveStatuses([])}
            className="px-3 py-1.5 rounded-full text-xs border bg-white dark:bg-[#111a2e] border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94a3b8] hover:border-[#CBD5E1] dark:hover:border-[#475569]"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-semibold text-orange-500">{pending}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground mb-1">Approved Today</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-emerald-300">{approvedToday}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-muted-foreground mb-1">Total This Week</p>
          <p className="text-2xl font-semibold text-foreground">{totalWeek}</p>
        </Card>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground">User</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground">Equipment</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap">Borrow Period</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap">Request Date</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground">Reason</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap">Status</th>
                <th className="text-left align-middle px-4 py-2.5 text-sm font-semibold text-foreground whitespace-nowrap min-w-[260px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-sm text-center text-muted-foreground">Loading requests...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-sm text-center text-muted-foreground">No requests found.</td>
                </tr>
              ) : (
                requests.map((request, index) => (
                  <tr
                    key={request.id}
                    className={`border-b border-border hover:bg-hover-bg transition-colors ${index === requests.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="align-middle px-4 py-2.5">
                      <p className="text-sm font-medium text-foreground leading-5">{request.userName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground leading-5">{request.userEmail ?? ''}</p>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-foreground leading-5">{request.equipmentName ?? '—'}</p>
                      {request.equipmentUnitSerialNo ? (
                        <p className="text-xs text-muted-foreground leading-5">{request.equipmentUnitSerialNo}</p>
                      ) : null}
                    </div>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                      <p className="text-sm text-muted-foreground leading-5 whitespace-nowrap">{formatDate(request.startDate)}</p>
                      <p className="text-xs text-muted-foreground leading-5 whitespace-nowrap">to {formatDate(request.endDate)}</p>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                      <p className="text-sm text-muted-foreground leading-5 whitespace-nowrap">{formatDate(request.createdAt)}</p>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                      <p
                        className="text-sm text-muted-foreground max-w-[220px] truncate leading-5"
                        title={notePreview(request.requestNote)}
                      >
                        {compactReasonPreview(request.requestNote)}
                      </p>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                      <Badge variant={statusVariant(request.status) as any} size="sm">{statusLabel(request.status)}</Badge>
                    </td>
                    <td className="align-middle px-4 py-2.5">
                      {request.status === 'PENDING' ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap min-w-[250px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={FileText}
                            className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => setViewRequest(request)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={CheckCircle}
                            className="!text-green-600 dark:!text-emerald-300 hover:!text-green-700 dark:hover:!text-emerald-200 hover:bg-green-100 dark:hover:bg-emerald-700/35 font-semibold"
                            onClick={() => setApproveRequestId(request.id)}
                            disabled={isReadOnlyCollege}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            className="!text-red-600 dark:!text-rose-300 hover:!text-red-700 dark:hover:!text-rose-200 hover:bg-red-100 dark:hover:bg-rose-700/35 font-semibold"
                            onClick={() => { setRejectRequestId(request.id); setShowRejectModal(true); }}
                            disabled={isReadOnlyCollege}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={FileText}
                          className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          onClick={() => setViewRequest(request)}
                        >
                          View
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing page {totalPages > 0 ? page + 1 : 0} of {totalPages} ({totalItems} total)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 rounded-lg text-xs bg-white dark:bg-slate-900 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page <= 0 || totalPages === 0}
            >
              Previous
            </Button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-8 h-8 px-2 rounded-lg text-sm border ${
                  p === page
                    ? 'bg-[#8393DE] text-white border-[#8393DE]'
                    : 'bg-white dark:bg-[#111a2e] text-[#334155] dark:text-[#e2e8f0] border-[#E2E8F0] dark:border-[#334155] hover:border-[#CBD5E1] dark:hover:border-[#475569]'
                }`}
              >
                {p + 1}
              </button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(Math.max(totalPages - 1, 0), p + 1))}
              disabled={totalPages === 0 || page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-md w-[90vw] sm:w-full">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Reject Request</h2>
            <p className="text-sm text-muted-foreground mb-6">Please provide a reason for rejecting this request.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/50 text-foreground resize-none"
                  placeholder="e.g., Equipment is reserved..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button fullWidth className="bg-red-600 hover:bg-red-700" onClick={handleReject} disabled={isReadOnlyCollege}>Confirm Rejection</Button>
                <Button fullWidth variant="secondary" onClick={() => { setShowRejectModal(false); setRejectionReason(''); setRejectRequestId(null); }}>Cancel</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {viewRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-2xl w-[90vw] sm:w-full">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Request Details</h2>
              <Button variant="ghost" size="sm" icon={X} onClick={() => setViewRequest(null)}>Close</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="p-3 rounded-xl bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">User</p>
                <p className="text-sm font-medium text-foreground">{viewRequest.userName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{viewRequest.userEmail ?? '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Equipment</p>
                <p className="text-sm font-medium text-foreground">{viewRequest.equipmentName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {viewRequest.equipmentUnitSerialNo
                    ? `Serial: ${viewRequest.equipmentUnitSerialNo}`
                    : (viewRequest.equipmentCategory ?? '—')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Borrow Period</p>
                <p className="text-sm text-foreground">{formatDate(viewRequest.startDate)} to {formatDate(viewRequest.endDate)}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={statusVariant(viewRequest.status) as any} size="sm">
                  {statusLabel(viewRequest.status)}
                </Badge>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Request Note</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {notePreview(viewRequest.requestNote)}
              </p>
            </div>
          </Card>
        </div>
      )}

      <AlertDialog
        isOpen={approveRequestId !== null}
        onClose={() => setApproveRequestId(null)}
        onConfirm={() => handleApprove(approveRequestId!)}
        title="Approve Request"
        description="Are you sure you want to approve this equipment borrowing request?"
        confirmText="Yes, Approve"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
}
