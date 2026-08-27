import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Input } from '../../components/Input';
import { SuccessToast } from '../../components/SuccessToast';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { useCollegeEligibility } from '../../hooks/useCollegeEligibility';
import { getEquipmentIcon } from '../../lib/equipmentIconMapper';
import { addDaysToIsoDate, formatDisplayDate, inclusiveDurationDays, localIsoDate } from '../../lib/dateUtils';

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
};

type TenantSettings = {
  tenantId: number;
  maxBorrowDays?: number | null;
};

export default function ItemDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { canAccessCoreFeatures } = useCollegeEligibility();
  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [toastMessage, setToastMessage] = useState('');

  const today = () => localIsoDate();

  const loadItem = () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    api
      .get<EquipmentItem>(`/api/catalog/equipment/${id}`)
      .then((data) => {
        setItem(data);
        const minStart =
          data.availableFrom && data.availableFrom > today() ? data.availableFrom : today();
        setStartDate(minStart);
        setEndDate('');
        if (data.tenantId) {
          api
            .get<TenantSettings>(`/api/tenants/${data.tenantId}/settings`)
            .then(setTenantSettings)
            .catch(() => setTenantSettings(null));
        }
      })
      .catch((err: { message?: string }) => {
        setItem(null);
        setLoadError(err?.message ?? 'Failed to load this item.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  const getStatus = (eq: EquipmentItem): string => {
    const normalizedStatus = (eq.status ?? '').trim().toUpperCase();
    if (normalizedStatus === 'MAINTENANCE') return 'maintenance';
    const now = today();
    if (eq.availableFrom && now < eq.availableFrom) return 'unavailable';
    if (eq.availableTo && now > eq.availableTo) return 'unavailable';
    if (normalizedStatus === 'BORROWED' || normalizedStatus === 'ON_LOAN') return 'borrowed';
    if (normalizedStatus === 'RETIRED') return 'unavailable';
    if (eq.availableQuantity > 0) return 'available';
    return 'unavailable';
  };

  const getUnavailabilityReason = (eq: EquipmentItem): string => {
    const normalizedStatus = (eq.status ?? '').trim().toUpperCase();
    if (normalizedStatus === 'MAINTENANCE') return 'In Maintenance';
    if (normalizedStatus === 'RETIRED') return 'Retired';
    const now = today();
    if (eq.availableFrom && now < eq.availableFrom) return `Available from ${formatDisplayDate(eq.availableFrom)}`;
    if (eq.availableTo && now > eq.availableTo) return 'No longer available';
    if (normalizedStatus === 'BORROWED' || normalizedStatus === 'ON_LOAN') return 'Currently borrowed';
    return eq.availableQuantity > 0 ? '' : 'Out of stock';
  };

  const getDateConstraints = () => {
    if (!item) return { minStart: today(), maxEnd: '' };
    const minStart =
      item.availableFrom && item.availableFrom > today() ? item.availableFrom : today();
    const effectiveStart = startDate || minStart;
    let maxEnd = item.availableTo || '';
    const effectiveMaxBorrowDays =
      item.maxBorrowDays && item.maxBorrowDays > 0
        ? item.maxBorrowDays
        : tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0
          ? tenantSettings.maxBorrowDays
          : null;
    if (effectiveMaxBorrowDays) {
      const maxByRuleIso = addDaysToIsoDate(effectiveStart, effectiveMaxBorrowDays - 1);
      maxEnd = maxEnd ? (maxEnd < maxByRuleIso ? maxEnd : maxByRuleIso) : maxByRuleIso;
    }
    return { minStart, maxEnd };
  };

  const validateRequest = () => {
    if (!item) return 'Item not found.';
    if (!canAccessCoreFeatures) {
      return 'Action Required: Please select an active college in Settings to start borrowing equipment.';
    }
    if (!user?.emailVerified) return 'Please verify your email before borrowing equipment.';
    if (!startDate || !endDate) return 'Please choose both start and end date.';
    if (endDate < startDate) return 'End date must be after or same as start date.';
    const effectiveMaxBorrowDays =
      item.maxBorrowDays && item.maxBorrowDays > 0
        ? item.maxBorrowDays
        : tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0
          ? tenantSettings.maxBorrowDays
          : null;
    if (effectiveMaxBorrowDays && inclusiveDurationDays(startDate, endDate) > effectiveMaxBorrowDays) {
      return `Maximum borrow period for this item is ${effectiveMaxBorrowDays} days.`;
    }
    return '';
  };

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!item || !user?.userId) return;
    const error = validateRequest();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    setSubmitting(true);
    try {
      await api.post(`/api/users/${user.userId}/borrow-requests`, {
        equipmentId: item.id,
        startDate,
        endDate,
        requestNote: requestNote.trim() || undefined,
      });
      setToastMessage('Request submitted successfully!');
      setToastVariant('success');
      setShowSuccessToast(true);
      setTimeout(() => navigate('/user/requests'), 1600);
    } catch (err: unknown) {
      setToastMessage((err as { message?: string })?.message ?? 'Failed to submit request');
      setToastVariant('cancel');
      setShowSuccessToast(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Card className="py-12 text-center text-muted-foreground">Loading item...</Card>;
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/user/catalog')}>
          Back to Catalog
        </Button>
        <Card className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">{loadError ?? 'Item not found.'}</p>
          <Button variant="secondary" onClick={loadItem}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const ItemIcon = getEquipmentIcon(item.name, item.category);
  const status = getStatus(item);
  const requestable = status === 'available' && canAccessCoreFeatures;
  const unavailReason = status !== 'available' ? getUnavailabilityReason(item) : '';
  const { minStart, maxEnd } = getDateConstraints();
  const maxDays =
    item.maxBorrowDays && item.maxBorrowDays > 0
      ? item.maxBorrowDays
      : tenantSettings?.maxBorrowDays && tenantSettings.maxBorrowDays > 0
        ? tenantSettings.maxBorrowDays
        : 7;

  return (
    <div className="space-y-6">
      <SuccessToast
        isOpen={showSuccessToast}
        variant={toastVariant}
        message={toastMessage}
        duration={2000}
        onClose={() => setShowSuccessToast(false)}
      />

      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/user/catalog')}>
        Back to Catalog
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                  {item.name}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="info" size="sm">{item.category}</Badge>
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
                  >
                    {status === 'unavailable' ? unavailReason || 'Unavailable' : status}
                  </Badge>
                  {item.tenantName ? (
                    <Badge variant="neutral" size="sm">{item.tenantName}</Badge>
                  ) : null}
                </div>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F9FCFE] to-[#F9FAFD] dark:from-[#2D3748] dark:to-[#374151] flex items-center justify-center border border-border shrink-0">
                <ItemIcon className="w-10 h-10 text-primary" />
              </div>
            </div>

            <p className="text-foreground leading-relaxed mb-6">
              {item.description || 'No description provided for this equipment.'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Available units</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                  {item.availableQuantity} / {item.totalQuantity}
                </p>
              </div>
              <div className="p-3 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Max borrow period</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                  {maxDays} days
                </p>
              </div>
              <div className="p-3 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Available from</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                  {formatDisplayDate(item.availableFrom)}
                </p>
              </div>
              <div className="p-3 bg-background rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Available until</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                  {formatDisplayDate(item.availableTo)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <Calendar className="w-5 h-5" />
              Request to Borrow
            </h3>

            {!requestable ? (
              <div className="p-4 bg-sidebar-accent rounded-xl border border-border">
                <p className="text-sm text-foreground">
                  {unavailReason ||
                    (!canAccessCoreFeatures
                      ? 'Select an active college in Settings before requesting equipment.'
                      : 'This item cannot be requested right now.')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} noValidate className="space-y-4">
                {!user?.emailVerified && (
                  <p className="text-sm text-red-600">Verify your email first to submit borrowing requests.</p>
                )}
                <Input
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value && endDate < e.target.value) setEndDate('');
                  }}
                  required
                  min={minStart}
                />
                <Input
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate || minStart}
                  max={maxEnd || undefined}
                />
                {maxEnd && (
                  <p className="text-xs text-muted-foreground">
                    This equipment is available until {formatDisplayDate(maxEnd)}.
                  </p>
                )}
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Note (optional)"
                />
                {validationError && <p className="text-sm text-red-600">{validationError}</p>}
                <Button type="submit" fullWidth disabled={submitting || !user?.emailVerified}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
