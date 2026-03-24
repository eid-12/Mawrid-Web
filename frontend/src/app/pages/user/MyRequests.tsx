import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Search, Eye, X } from 'lucide-react';
import { Input } from '../../components/Input';
import { AlertDialog } from '../../components/AlertDialog';
import { SuccessToast } from '../../components/SuccessToast';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';

type BorrowRequestDto = {
  id: number;
  tenantId: number;
  userId: number;
  equipmentId: number;
  equipmentName?: string;
  equipmentCategory?: string;
  equipmentUnitId?: number | null;
  equipmentUnitSerialNo?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  requestNote?: string | null;
  decisionReason?: string | null;
  createdAt?: string;
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

export default function MyRequests() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const { user } = useAuth();
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const isCollegeInactive = tenantStatus === 'INACTIVE';
  const [requests, setRequests] = useState<BorrowRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelRequestId, setCancelRequestId] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [toastMessage, setToastMessage] = useState('');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const fetchRequests = () => {
    if (!user?.userId) return;
    api
      .get<BorrowRequestDto[]>(`/api/users/${user.userId}/borrow-requests`)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.tenantId) {
      setTenantStatus(null);
      return;
    }
    api
      .get<{ status?: string | null }>('/api/auth/tenant-status')
      .then((res) => setTenantStatus((res?.status ?? '').toUpperCase() || null))
      .catch(() => setTenantStatus(null));
  }, [user?.tenantId]);

  const filtered = requests.filter(
    (r) =>
      (r.equipmentName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.equipmentCategory ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
  const paginated = sortedFiltered.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, requests.length]);

  const getStatusVariant = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'success';
    if (s === 'pending') return 'pending';
    if (s === 'rejected' || s === 'cancelled') return 'error';
    if (s === 'delivered') return 'info';
    if (s === 'returned') return 'neutral';
    return 'neutral';
  };

  const statusLabel = (status: string) => {
    const normalized = (status ?? '').toUpperCase();
    if (normalized === 'ON_LOAN' || normalized === 'BORROWED') return 'borrowed';
    return (status ?? '').toLowerCase();
  };

  const shouldShowSerial = (status: string) => {
    const normalized = (status ?? '').toUpperCase();
    return normalized === 'ON_LOAN' || normalized === 'BORROWED' || normalized === 'RETURNED';
  };

  const selectedRequestData = requests.find((r) => r.id === selectedRequest);

  const handleCancelRequest = async () => {
    if (isCollegeInactive) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('cancel');
      setShowToast(true);
      return;
    }
    if (!cancelRequestId || !user?.userId) {
      setCancelRequestId(null);
      return;
    }
    try {
      await api.post(`/api/users/${user.userId}/borrow-requests/${cancelRequestId}/cancel`);
      setToastMessage('Request has been cancelled.');
      setToastVariant('success');
      setShowToast(true);
      fetchRequests();
      setCancelRequestId(null);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to cancel request');
      setToastVariant('cancel');
      setShowToast(true);
    }
  };

  return (
    <div className="space-y-6">
      <SuccessToast
        isOpen={showToast}
        variant={toastVariant}
        message={toastMessage}
        duration={3500}
        onClose={() => setShowToast(false)}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
          My Requests
        </h1>
        <p className="text-muted-foreground">Track and manage your equipment borrowing requests</p>
      </div>

      {/* Search */}
      <Card>
        <Input
          type="text"
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
      </Card>

      {/* Requests Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Item
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Category
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Request Date
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Borrow Period
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No requests found
                  </td>
                </tr>
              ) : (
                paginated.map((request, index) => (
                  <tr
                    key={request.id}
                    className={`border-b border-border hover:bg-hover-bg transition-colors ${
                      index === paginated.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                        {request.equipmentName ?? '—'}
                      </p>
                      {shouldShowSerial(request.status) && request.equipmentUnitSerialNo && (
                        <p className="text-xs mt-1 text-muted-foreground font-mono">
                          {request.equipmentUnitSerialNo}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">{request.equipmentCategory ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">{formatDate(request.createdAt ?? '')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusVariant(request.status)} size="sm">
                        {statusLabel(request.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          onClick={() => setSelectedRequest(request.id)}
                        >
                          View
                        </Button>
                        {request.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={X}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => setCancelRequestId(request.id)}
                            disabled={isCollegeInactive}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Page {totalPages > 0 ? page + 1 : 0} of {totalPages} ({sortedFiltered.length} requests)
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setPage(0);
                }}
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

      {/* Request Detail Modal */}
      {selectedRequestData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-2xl w-[90vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                  Request Details
                </h2>
                <Badge variant={getStatusVariant(selectedRequestData.status)}>
                  {statusLabel(selectedRequestData.status)}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full hover:bg-hover-bg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Item</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                    {selectedRequestData.equipmentName ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Category</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                    {selectedRequestData.equipmentCategory ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Serial Number</p>
                  <p className="text-sm font-medium font-mono" style={{ color: 'var(--text-heading)' }}>
                    {selectedRequestData.equipmentUnitSerialNo ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Request Date</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                    {formatDate(selectedRequestData.createdAt ?? '')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Borrow Period</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                    {formatDate(selectedRequestData.startDate)} - {formatDate(selectedRequestData.endDate)}
                  </p>
                </div>
              </div>

              {selectedRequestData.status === 'APPROVED' && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-900">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Approved</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Your request has been approved. Check with your college admin for pickup.
                  </p>
                </div>
              )}

              {selectedRequestData.status === 'REJECTED' && selectedRequestData.decisionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{selectedRequestData.decisionReason}</p>
                </div>
              )}

              {selectedRequestData.decisionReason && selectedRequestData.status !== 'REJECTED' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Admin Notes</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{selectedRequestData.decisionReason}</p>
                </div>
              )}

              {selectedRequestData.requestNote && (
                <div className="p-4 bg-background rounded-xl border border-border">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Your Note</p>
                  <p className="text-sm text-muted-foreground">{selectedRequestData.requestNote}</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button variant="secondary" fullWidth onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AlertDialog
        isOpen={cancelRequestId !== null}
        onClose={() => setCancelRequestId(null)}
        onConfirm={handleCancelRequest}
        title="Cancel Request"
        description="Are you sure you want to cancel this request? This action cannot be undone."
        confirmText="Yes, Cancel Request"
        cancelText="No, Keep Request"
        variant="danger"
      />
    </div>
  );
}
