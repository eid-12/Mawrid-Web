import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Search, Filter, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { SuccessToast } from '../../components/SuccessToast';
import { useCollegeEligibility } from '../../hooks/useCollegeEligibility';
import { getEquipmentIcon } from '../../lib/equipmentIconMapper';

type EquipmentItem = {
  id: number;
  tenantId: number;
  tenantName?: string | null;
  name: string;
  category: string;
  description?: string | null;
  totalQuantity: number;
  availableQuantity: number;
  status?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  maxBorrowDays?: number | null;
  maintenanceNotes?: string | null;
  relevanceScore?: number | null;
  recommended?: boolean | null;
};

type TenantSettings = {
  tenantId: number;
  maxBorrowDays?: number | null;
};

export default function Catalog() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const { user, refreshUserStatus } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState<EquipmentItem | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [toastMessage, setToastMessage] = useState('');
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [requestValidationError, setRequestValidationError] = useState('');
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const { canAccessCoreFeatures } = useCollegeEligibility();
  const isCollegeInactive = tenantStatus === 'INACTIVE';

  const statusOptions = ['All', 'Available', 'Borrowed', 'Maintenance', 'Unavailable'];

  useEffect(() => {
    if (!user?.userId) return;
    void refreshUserStatus();
  }, [user?.userId]);

  useEffect(() => {
    api.get<EquipmentItem[]>('/api/catalog/equipment')
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

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

  const today = () => new Date().toISOString().split('T')[0];

  const getStatus = (item: EquipmentItem): string => {
    const normalizedStatus = (item.status ?? '').trim().toUpperCase();
    if (normalizedStatus === 'MAINTENANCE') return 'maintenance';
    const from = item.availableFrom;
    const now = today();
    if (from && now < from) return 'unavailable';
    const to = item.availableTo;
    if (to && now > to) return 'unavailable';
    if (normalizedStatus === 'BORROWED' || normalizedStatus === 'ON_LOAN') return 'borrowed';
    if (normalizedStatus === 'RETIRED') return 'unavailable';
    if (item.availableQuantity > 0) return 'available';
    return 'unavailable';
  };

  const isRequestable = (item: EquipmentItem): boolean =>
    getStatus(item) === 'available';

  const getUnavailabilityReason = (item: EquipmentItem): string => {
    const normalizedStatus = (item.status ?? '').trim().toUpperCase();
    if (normalizedStatus === 'MAINTENANCE') return 'In Maintenance';
    if (normalizedStatus === 'RETIRED') return 'Retired';
    const from = item.availableFrom;
    const now = today();
    if (from && now < from) return `Available from ${formatDisplayDate(from)}`;
    const to = item.availableTo;
    if (to && now > to) return 'No longer available';
    if (normalizedStatus === 'BORROWED' || normalizedStatus === 'ON_LOAN') return 'Currently borrowed';
    return item.availableQuantity > 0 ? '' : 'Out of stock';
  };

  const collegeOptions = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (item.tenantId && item.tenantName) {
        map.set(item.tenantId, item.tenantName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getMinStartDate = () => new Date().toISOString().split('T')[0];

  const getRequestModalDateConstraints = () => {
    if (!requestModal) return { minStart: getMinStartDate(), maxEnd: '' };
    const minStart = requestModal.availableFrom
      ? (new Date(requestModal.availableFrom) < new Date() ? getMinStartDate() : requestModal.availableFrom)
      : getMinStartDate();
    const effectiveStart = startDate || minStart;
    let maxEnd = requestModal.availableTo || '';
    const effectiveMaxBorrowDays = requestModal.maxBorrowDays && requestModal.maxBorrowDays > 0
      ? requestModal.maxBorrowDays
      : (tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0 ? tenantSettings.maxBorrowDays : null);
    if (effectiveMaxBorrowDays) {
      const maxByRule = new Date(effectiveStart);
      maxByRule.setDate(maxByRule.getDate() + effectiveMaxBorrowDays - 1);
      const maxByRuleIso = maxByRule.toISOString().split('T')[0];
      maxEnd = maxEnd ? (maxEnd < maxByRuleIso ? maxEnd : maxByRuleIso) : maxByRuleIso;
    }
    return { minStart, maxEnd };
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModal || !user?.userId) return;
    if (isCollegeInactive) {
      setRequestValidationError('Action disabled. Your college is currently deactivated.');
      return;
    }
    if (!canAccessCoreFeatures) {
      setRequestValidationError(
        'Action Required: Please select an active college in Settings to start borrowing equipment.'
      );
      return;
    }
    const validationError = validateRequestWithTenantSettings();
    if (validationError) {
      setRequestValidationError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/users/${user.userId}/borrow-requests`, {
        equipmentId: requestModal.id,
        startDate,
        endDate,
        requestNote: requestNote.trim() || undefined,
      });
      setRequestModal(null);
      setStartDate('');
      setEndDate('');
      setRequestNote('');
      setToastMessage('Request submitted successfully!');
      setToastVariant('success');
      setShowToast(true);
      api.get<EquipmentItem[]>('/api/catalog/equipment').then(setItems);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to submit request');
      setToastVariant('cancel');
      setShowToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  const openRequestModal = (item: EquipmentItem) => {
    if (isCollegeInactive) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('cancel');
      setShowToast(true);
      return;
    }
    if (!canAccessCoreFeatures) {
      setToastMessage('Select an active college in settings to enable requests.');
      setToastVariant('cancel');
      setShowToast(true);
      return;
    }
    setRequestModal(item);
    const minStart = item.availableFrom && item.availableFrom > getMinStartDate() ? item.availableFrom : getMinStartDate();
    setStartDate(minStart);
    setEndDate('');
    setRequestNote('');
    setRequestValidationError('');
    setTenantSettings(null);
    api.get<TenantSettings>(`/api/tenants/${item.tenantId}/settings`)
      .then((s) => setTenantSettings(s))
      .catch(() => setTenantSettings(null));
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && new Date(endDate) < new Date(value)) setEndDate('');
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
  };

  const getBorrowDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  };

  const validateRequestWithTenantSettings = () => {
    if (isCollegeInactive) {
      return 'Action disabled. Your college is currently deactivated.';
    }
    if (!canAccessCoreFeatures) {
      return 'Action Required: Please select an active college in Settings to start borrowing equipment.';
    }
    if (!user?.emailVerified) return 'Please verify your email before borrowing equipment.';
    if (!startDate || !endDate) return 'Please choose both start and end date.';
    if (new Date(endDate) < new Date(startDate)) return 'End date must be after or same as start date.';
    const effectiveMaxBorrowDays = requestModal?.maxBorrowDays && requestModal.maxBorrowDays > 0
      ? requestModal.maxBorrowDays
      : (tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0 ? tenantSettings.maxBorrowDays : null);
    if (effectiveMaxBorrowDays) {
      const selectedDays = getBorrowDays();
      if (selectedDays > effectiveMaxBorrowDays) {
        return `Maximum borrow period for this item is ${effectiveMaxBorrowDays} days.`;
      }
    }
    return '';
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCollege =
      selectedCollege === 'all' || String(item.tenantId) === selectedCollege;
    const status = getStatus(item);
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'available' && status === 'available') ||
      (selectedStatus === 'borrowed' && status === 'borrowed') ||
      (selectedStatus === 'maintenance' && status === 'maintenance') ||
      (selectedStatus === 'unavailable' && status === 'unavailable');
    return matchesSearch && matchesCollege && matchesStatus;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, selectedCollege, selectedStatus, items.length]);

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 0) setPage(0);
      return;
    }
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);
  
  return (
    <div className="space-y-6 w-full max-w-[1200px] mx-auto">
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
          Equipment Catalog
        </h1>
        <p className="text-muted-foreground">
          Browse and request available equipment from your college
        </p>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Search by equipment name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>
                Filters:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">College:</span>
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="px-3 py-1.5 rounded-full text-sm bg-card border border-border hover:border-primary/30"
                style={{ color: 'var(--text-body)' }}
              >
                <option value="all">All</option>
                {collegeOptions.map((college) => (
                  <option key={college.id} value={String(college.id)}>
                    {college.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Status:</span>
              {statusOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedStatus(option.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedStatus === option.toLowerCase()
                      ? 'bg-gradient-to-r from-[#8CCDE6] to-[#8393DE] text-white'
                      : 'bg-card border border-border hover:border-primary/30'
                  }`}
                  style={selectedStatus !== option.toLowerCase() ? { color: 'var(--text-body)' } : {}}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Items Grid */}
      {loading ? (
        <Card className="py-12 text-center text-muted-foreground">Loading...</Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedItems.map((item) => {
            const ItemIcon = getEquipmentIcon(item.name, item.category);
            const status = getStatus(item);
            const availableByStatus = isRequestable(item);
            const blockedByCollege = !canAccessCoreFeatures || isCollegeInactive;
            const requestable = availableByStatus && !blockedByCollege;
            const unavailReason = !availableByStatus ? getUnavailabilityReason(item) : '';
            const specs = item.description || 'Equipment';
          return (
              <Card
                key={item.id}
                hover
                padding="none"
                className={`h-full overflow-hidden ${requestable ? 'cursor-pointer' : ''} ${item.recommended ? 'ring-1 ring-blue-300/80 dark:ring-blue-500/50 shadow-[0_0_0_1px_rgba(59,130,246,0.20)]' : ''}`}
                onClick={() => requestable && openRequestModal(item)}
              >
                <div className="aspect-video bg-gradient-to-br from-[#F9FCFE] via-background to-[#F9FAFD] dark:from-[#2D3748] dark:via-background dark:to-[#374151] flex items-center justify-center border-b border-border">
                  <ItemIcon className="w-12 h-12 text-slate-600 dark:text-sky-300" />
                </div>
                <div className="p-5 flex flex-col h-[230px]">
                  <div className="mb-3 space-y-2">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {item.recommended ? (
                        <Badge variant="info" size="sm">Recommended</Badge>
                      ) : null}
                      <Badge
                        variant={
                          status === 'available'
                            ? 'success'
                            : status === 'borrowed'
                              ? 'warning'
                              : status === 'maintenance'
                                ? 'error'
                                : 'neutral'
                        }
                        size="sm"
                      >
                        {status === 'unavailable' ? (unavailReason || 'Unavailable') : status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{specs}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Max period: {(item.maxBorrowDays && item.maxBorrowDays > 0 ? item.maxBorrowDays : 7)} days
                    </span>
                    {item.tenantName && (
                      <span className="truncate max-w-[120px]" title={item.tenantName}>
                        {item.tenantName}
                      </span>
                    )}
                  </div>
                  {availableByStatus ? (
                    <Button
                      size="sm"
                      className="mt-3 w-full mt-auto"
                      disabled={blockedByCollege}
                      title={
                        blockedByCollege
                          ? (isCollegeInactive
                            ? 'Action disabled. Your college is currently deactivated.'
                            : 'Select an active college in settings to enable requests.')
                          : undefined
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        openRequestModal(item);
                      }}
                    >
                      Request Borrow
                    </Button>
                  ) : (
                    <p
                      className="text-xs mt-3 text-muted-foreground"
                    >
                      {unavailReason || 'Unavailable'}
                    </p>
                  )}
                </div>
              </Card>
          );
        })}
      </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {totalPages > 0 ? page + 1 : 0} of {totalPages} ({filteredItems.length} items)
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
      )}

      {!loading && filteredItems.length === 0 && (
        <Card className="py-12 text-center text-muted-foreground">No equipment found</Card>
      )}

      {/* Request Borrowing Modal */}
      {requestModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setRequestModal(null)}
        >
          <Card className="max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
                Request to Borrow: {requestModal.name}
              </h2>
              <button
                onClick={() => setRequestModal(null)}
                className="w-8 h-8 rounded-full hover:bg-hover-bg flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRequestSubmit} noValidate className="space-y-4">
              {!user?.emailVerified && (
                <p className="text-sm text-red-600">
                  Verify your email first to submit borrowing requests.
                </p>
              )}
              {(() => {
                const { minStart, maxEnd } = getRequestModalDateConstraints();
                return (
                  <>
                    <Input
                      type="date"
                      label="Start Date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      required
                      min={minStart}
                    />
                    <Input
                      type="date"
                      label="End Date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      required
                      min={startDate || minStart}
                      max={maxEnd || undefined}
                    />
                    {maxEnd && (
                      <p className="text-xs text-muted-foreground">
                        This equipment is available until {formatDisplayDate(maxEnd)}.
                      </p>
                    )}
                    {(requestModal.maxBorrowDays && requestModal.maxBorrowDays > 0) || (tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0) ? (
                      <p className="text-xs text-muted-foreground">
                        Maximum borrow period: {(requestModal.maxBorrowDays && requestModal.maxBorrowDays > 0 ? requestModal.maxBorrowDays : tenantSettings?.maxBorrowDays)} day(s).
                      </p>
                    ) : null}
                  </>
                );
              })()}
              {requestValidationError && (
                <p className="text-sm text-red-600">{requestValidationError}</p>
              )}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                  Note (optional)
                </label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. For project presentation"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" fullWidth onClick={() => setRequestModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" fullWidth disabled={submitting || !user?.emailVerified || isCollegeInactive}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
