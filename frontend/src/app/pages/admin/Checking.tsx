import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Search, CheckCircle, Package } from 'lucide-react';
import { AlertDialog } from '../../components/AlertDialog';
import { SuccessToast } from '../../components/SuccessToast';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { useAdminLiveData, useAdminTenantState } from '../../hooks/useAdminLiveData';

type PendingItem = {
  id: number;
  requestId: number;
  equipmentId?: number;
  equipmentUnitId: number | null;
  userName: string;
  userEmail?: string;
  equipmentName: string;
  serialNo: string | null;
  status: string;
  startDate?: string;
  endDate?: string;
  daysLeft?: number;
};

type PendingPageResponse = {
  items: PendingItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

type ScanResult = {
  action: string;
  requestId: number;
  equipmentUnitId: number | null;
  equipmentId?: number;
  equipmentName: string;
  serialNo: string;
  userName: string;
  startDate?: string;
  endDate?: string;
  daysLeft?: number;
};

type EquipmentUnitOption = {
  id: number;
  serialNo: string | null;
  status: string;
  unitCondition?: string | null;
};

export default function Checking() {
  const PAGE_SIZE = 5;
  const { user } = useAuth();
  const { tenantId, tenantStatus } = useAdminTenantState(user?.tenantId);
  const isReadOnlyCollege = tenantStatus === 'INACTIVE';
  const [scanInput, setScanInput] = useState('');
  const [selectedItem, setSelectedItem] = useState<ScanResult | null>(null);
  const [checkOutId, setCheckOutId] = useState<number | null>(null);
  const [checkInId, setCheckInId] = useState<number | null>(null);
  const [pendingCheckouts, setPendingCheckouts] = useState<PendingItem[]>([]);
  const [pendingReturns, setPendingReturns] = useState<PendingItem[]>([]);
  const [checkoutPage, setCheckoutPage] = useState(0);
  const [returnPage, setReturnPage] = useState(0);
  const [checkoutTotalPages, setCheckoutTotalPages] = useState(0);
  const [returnTotalPages, setReturnTotalPages] = useState(0);
  const [checkoutTotalItems, setCheckoutTotalItems] = useState(0);
  const [returnTotalItems, setReturnTotalItems] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'warning' | 'danger'>('success');
  const [availableUnits, setAvailableUnits] = useState<EquipmentUnitOption[]>([]);
  const [selectedCheckoutUnitId, setSelectedCheckoutUnitId] = useState<number | null>(null);
  const [returnUnitStatus, setReturnUnitStatus] = useState<'AVAILABLE' | 'MAINTENANCE'>('AVAILABLE');

  const loadData = useCallback(() => {
    if (!tenantId) return;
    api.get<PendingPageResponse>(`/api/tenants/${tenantId}/check-transactions/pending-checkouts?page=${checkoutPage}&size=${PAGE_SIZE}`)
      .then((res) => {
        setPendingCheckouts(res.items ?? []);
        setCheckoutTotalPages(res.totalPages ?? 0);
        setCheckoutTotalItems(res.totalItems ?? 0);
      })
      .catch(() => {
        setPendingCheckouts([]);
        setCheckoutTotalPages(0);
        setCheckoutTotalItems(0);
      });
    api.get<PendingPageResponse>(`/api/tenants/${tenantId}/check-transactions/pending-returns?page=${returnPage}&size=${PAGE_SIZE}`)
      .then((res) => {
        setPendingReturns(res.items ?? []);
        setReturnTotalPages(res.totalPages ?? 0);
        setReturnTotalItems(res.totalItems ?? 0);
      })
      .catch(() => {
        setPendingReturns([]);
        setReturnTotalPages(0);
        setReturnTotalItems(0);
      });
  }, [tenantId, checkoutPage, returnPage]);

  useAdminLiveData(loadData, Boolean(tenantId));

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setCheckoutPage(0);
    setReturnPage(0);
  }, [tenantId]);

  useEffect(() => {
    if (checkoutTotalPages === 0) {
      if (checkoutPage !== 0) setCheckoutPage(0);
      return;
    }
    if (checkoutPage > checkoutTotalPages - 1) {
      setCheckoutPage(checkoutTotalPages - 1);
    }
  }, [checkoutPage, checkoutTotalPages]);

  useEffect(() => {
    if (returnTotalPages === 0) {
      if (returnPage !== 0) setReturnPage(0);
      return;
    }
    if (returnPage > returnTotalPages - 1) {
      setReturnPage(returnTotalPages - 1);
    }
  }, [returnPage, returnTotalPages]);

  const getDaysLeft = (endDate?: string, fallback?: number) => {
    if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
    if (!endDate) return null;
    const dueDate = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(dueDate.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  };

  const toFriendlyHandoverMessage = (raw?: string, action?: 'CHECK_OUT' | 'CHECK_IN') => {
    if (!raw) {
      return action === 'CHECK_IN'
        ? 'Unable to complete return. Please try again.'
        : 'Unable to complete handover. Please ensure equipment details are complete.';
    }
    const normalized = raw.toLowerCase();
    const looksLikeEquipmentValidation =
      normalized.includes('validation failed for classes [com.equipment.entity.equipment]') ||
      normalized.includes('constraintviolation') ||
      normalized.includes('propertypath=category') ||
      normalized.includes('propertypath=availablefrom') ||
      normalized.includes('propertypath=availableto');
    const looksLikeLazySessionError =
      normalized.includes('could not initialize proxy') ||
      normalized.includes('no session') ||
      normalized.includes('lazyinitializationexception');
    if (looksLikeEquipmentValidation || looksLikeLazySessionError) {
      return action === 'CHECK_IN'
        ? 'Unable to complete return. Please ensure equipment details are complete.'
        : 'Unable to complete handover. Please ensure equipment details are complete.';
    }
    return raw;
  };

  const handleScan = async () => {
    if (isReadOnlyCollege) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    if (!tenantId || !scanInput.trim()) return;
    try {
      const result = await api.post<ScanResult>(`/api/tenants/${tenantId}/check-transactions/scan`, { serialNo: scanInput.trim() });
      setSelectedItem(result);
      setScanInput('');
    } catch (e: unknown) {
      setToastMessage((e as { message?: string })?.message ?? 'Item not found. Please check the serial number.');
      setToastVariant('warning');
      setShowToast(true);
      setScanInput('');
    }
  };

  const handleCheckOut = async () => {
    if (isReadOnlyCollege) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    if (!selectedItem || !tenantId) return;
    const unitId = selectedCheckoutUnitId ?? selectedItem.equipmentUnitId;
    if (!unitId) {
      setToastMessage('Please select a serial number for handover.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    try {
      await api.post(`/api/tenants/${tenantId}/check-transactions`, {
        requestId: selectedItem.requestId,
        equipmentUnitId: unitId,
        action: 'CHECK_OUT',
      });
      setCheckOutId(null);
      setSelectedItem(null);
      setAvailableUnits([]);
      setSelectedCheckoutUnitId(null);
      setToastMessage('Equipment checked out successfully!');
      setToastVariant('success');
      setShowToast(true);
      loadData();
    } catch (e: unknown) {
      const rawMessage = (e as { message?: string })?.message;
      setToastMessage(toFriendlyHandoverMessage(rawMessage, 'CHECK_OUT'));
      setToastVariant('danger');
      setShowToast(true);
    }
  };

  const handleCheckIn = async () => {
    if (isReadOnlyCollege) {
      setToastMessage('Action disabled. Your college is currently deactivated.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    if (!selectedItem || !tenantId) return;
    if (!selectedItem.equipmentUnitId) {
      setToastMessage('Invalid return item. Missing serial number.');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }
    try {
      await api.post(`/api/tenants/${tenantId}/check-transactions`, {
        requestId: selectedItem.requestId,
        equipmentUnitId: selectedItem.equipmentUnitId,
        action: 'CHECK_IN',
        returnUnitStatus,
      });
      setCheckInId(null);
      setSelectedItem(null);
      setReturnUnitStatus('AVAILABLE');
      setToastMessage('Equipment returned successfully!');
      setToastVariant('success');
      setShowToast(true);
      loadData();
    } catch (e: unknown) {
      const rawMessage = (e as { message?: string })?.message;
      setToastMessage(toFriendlyHandoverMessage(rawMessage, 'CHECK_IN'));
      setToastVariant('danger');
      setShowToast(true);
    }
  };

  const toSelectable = (p: PendingItem): ScanResult | null => {
    return {
      action: p.status === 'approved' ? 'CHECK_OUT' : 'CHECK_IN',
      requestId: p.requestId,
      equipmentUnitId: p.equipmentUnitId ?? null,
      equipmentId: p.equipmentId,
      equipmentName: p.equipmentName,
      serialNo: p.serialNo ?? '',
      userName: p.userName,
      startDate: p.startDate,
      endDate: p.endDate,
      daysLeft: getDaysLeft(p.endDate, p.daysLeft) ?? undefined,
    };
  };

  const openPendingCheckout = async (item: PendingItem) => {
    const sel = toSelectable(item);
    if (!sel || !tenantId) return;
    setSelectedItem(sel);
    setSelectedCheckoutUnitId(null);
    try {
      const units = await api.get<EquipmentUnitOption[]>(`/api/tenants/${tenantId}/check-transactions/requests/${item.requestId}/available-units`);
      setAvailableUnits(units);
      if (units.length === 1) setSelectedCheckoutUnitId(units[0].id);
    } catch {
      setAvailableUnits([]);
    }
  };

  const selectedDaysLeft = selectedItem ? getDaysLeft(selectedItem.endDate, selectedItem.daysLeft) : null;
  const checkoutPageNumbers = Array.from({ length: Math.max(checkoutTotalPages, 0) }, (_, i) => i);
  const returnPageNumbers = Array.from({ length: Math.max(returnTotalPages, 0) }, (_, i) => i);

  return (
    <div className="space-y-6">
      <SuccessToast isOpen={showToast} variant={toastVariant} message={toastMessage} onClose={() => setShowToast(false)} />

      <div>
        <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">Check In/Out</h1>
        <p className="text-[#64748B]">Quickly confirm equipment delivery and returns</p>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Quick Scan</h3>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="Scan barcode or enter serial number..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleScan()}
            icon={Search}
            className="flex-1"
          />
          <Button onClick={handleScan} disabled={!tenantId || isReadOnlyCollege}>Scan</Button>
        </div>
      </Card>

      {selectedItem && (
        <Card className="border-2 border-[#8393DE]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{selectedItem.equipmentName}</h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info" size="sm">{selectedItem.serialNo}</Badge>
                <Badge variant={selectedItem.action === 'CHECK_OUT' ? 'success' : 'warning'}>
                  {selectedItem.action === 'CHECK_OUT' ? 'approved' : 'return'}
                </Badge>
              </div>
            </div>
            <Package className="w-12 h-12 text-[#8393DE]" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-[#64748B] mb-1">User</p>
              <p className="text-sm font-medium text-[#0F172A]">{selectedItem.userName}</p>
            </div>
            {selectedItem.startDate && (
              <div>
                <p className="text-sm text-[#64748B] mb-1">Start Date</p>
                <p className="text-sm font-medium text-[#0F172A]">{selectedItem.startDate}</p>
              </div>
            )}
            {selectedItem.endDate && (
              <div>
                <p className="text-sm text-[#64748B] mb-1">Return Date</p>
                <p className="text-sm font-medium text-[#0F172A]">{selectedItem.endDate}</p>
              </div>
            )}
            {selectedDaysLeft !== null && (
              <div>
                <p className="text-sm text-[#64748B] mb-1">Days Left</p>
                <p className={`text-sm font-medium ${selectedDaysLeft <= 1 ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedDaysLeft} days
                </p>
              </div>
            )}
            {selectedItem.action === 'CHECK_OUT' && (
              <div className="col-span-2">
                <p className="text-sm text-[#64748B] mb-1">Select Serial Number for Handover</p>
                <select
                  value={selectedCheckoutUnitId ?? ''}
                  onChange={(e) => setSelectedCheckoutUnitId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-11 px-3 bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40"
                >
                  <option value="">Choose available serial...</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.serialNo ?? `UNIT-${u.id}`} {u.unitCondition ? `(${u.unitCondition})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedItem.action === 'CHECK_IN' && (
              <div className="col-span-2">
                <p className="text-sm text-[#64748B] mb-1">Return Unit Status</p>
                <select
                  value={returnUnitStatus}
                  onChange={(e) => setReturnUnitStatus(e.target.value as 'AVAILABLE' | 'MAINTENANCE')}
                  className="w-full h-11 px-3 bg-white border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8393DE]/40"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE (Damaged)</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {selectedItem.action === 'CHECK_OUT' ? (
              <Button fullWidth icon={CheckCircle} onClick={() => setCheckOutId(1)} disabled={isReadOnlyCollege}>Confirm Delivery (Check Out)</Button>
            ) : (
              <Button fullWidth icon={CheckCircle} onClick={() => setCheckInId(1)} disabled={isReadOnlyCollege}>Confirm Return (Check In)</Button>
            )}
            <Button variant="secondary" fullWidth onClick={() => setSelectedItem(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[560px] flex flex-col">
          <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pending Check-Outs
          </h3>
          <div className="space-y-2 flex-1 overflow-auto pr-1">
            {pendingCheckouts.length === 0 ? (
              <p className="text-sm text-[#64748B]">No pending check-outs</p>
            ) : (
              pendingCheckouts.map((item) => {
                const sel = toSelectable(item);
                if (!sel) return null;
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F5F9FF] rounded-xl border border-[#E2E8F0] hover:border-[#8393DE]/30 transition-all cursor-pointer"
                    onClick={() => openPendingCheckout(item)}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A] mb-0.5">{item.equipmentName}</p>
                        <p className="text-xs text-[#64748B]">User: {item.userName}</p>
                      </div>
                      <Badge variant="success" size="sm">{item.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#64748B]">{item.serialNo ?? 'Select at handover'}</p>
                      <p className="text-xs text-[#64748B]">Start: {item.startDate ?? '—'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
            <p className="text-xs text-[#64748B]">
              Page {checkoutTotalPages > 0 ? checkoutPage + 1 : 0} / {checkoutTotalPages} ({checkoutTotalItems})
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCheckoutPage((p) => Math.max(0, p - 1))}
                disabled={checkoutPage <= 0 || checkoutTotalPages === 0}
              >
                Prev
              </Button>
              {checkoutPageNumbers.slice(Math.max(0, checkoutPage - 1), Math.min(checkoutTotalPages, checkoutPage + 2)).map((p) => (
                <button
                  key={`co-${p}`}
                  type="button"
                  onClick={() => setCheckoutPage(p)}
                  className={`min-w-7 h-7 px-2 rounded-md text-xs border ${
                    p === checkoutPage
                      ? 'bg-[#8393DE] text-white border-[#8393DE]'
                      : 'bg-white text-[#334155] border-[#E2E8F0]'
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCheckoutPage((p) => Math.min(Math.max(checkoutTotalPages - 1, 0), p + 1))}
                disabled={checkoutTotalPages === 0 || checkoutPage >= checkoutTotalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>

        <Card className="h-[560px] flex flex-col">
          <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Pending Returns
          </h3>
          <div className="space-y-2 flex-1 overflow-auto pr-1">
            {pendingReturns.length === 0 ? (
              <p className="text-sm text-[#64748B]">No pending returns</p>
            ) : (
              pendingReturns.map((item) => {
                const sel = toSelectable(item);
                if (!sel) return null;
                const itemDaysLeft = getDaysLeft(item.endDate, item.daysLeft) ?? 0;
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F5F9FF] rounded-xl border border-[#E2E8F0] hover:border-[#8393DE]/30 transition-all cursor-pointer"
                    onClick={() => setSelectedItem(sel)}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A] mb-0.5">{item.equipmentName}</p>
                        <p className="text-xs text-[#64748B]">User: {item.userName}</p>
                      </div>
                      <Badge variant={itemDaysLeft <= 1 ? 'error' : 'warning'} size="sm">
                        {itemDaysLeft} days left
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#64748B]">{item.serialNo ?? '—'}</p>
                      <p className="text-xs text-[#64748B]">Due: {item.endDate ?? '—'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
            <p className="text-xs text-[#64748B]">
              Page {returnTotalPages > 0 ? returnPage + 1 : 0} / {returnTotalPages} ({returnTotalItems})
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReturnPage((p) => Math.max(0, p - 1))}
                disabled={returnPage <= 0 || returnTotalPages === 0}
              >
                Prev
              </Button>
              {returnPageNumbers.slice(Math.max(0, returnPage - 1), Math.min(returnTotalPages, returnPage + 2)).map((p) => (
                <button
                  key={`re-${p}`}
                  type="button"
                  onClick={() => setReturnPage(p)}
                  className={`min-w-7 h-7 px-2 rounded-md text-xs border ${
                    p === returnPage
                      ? 'bg-[#8393DE] text-white border-[#8393DE]'
                      : 'bg-white text-[#334155] border-[#E2E8F0]'
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReturnPage((p) => Math.min(Math.max(returnTotalPages - 1, 0), p + 1))}
                disabled={returnTotalPages === 0 || returnPage >= returnTotalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog
        isOpen={checkOutId !== null}
        onClose={() => setCheckOutId(null)}
        onConfirm={() => { handleCheckOut(); setCheckOutId(null); }}
        title="Confirm Equipment Delivery"
        description="Are you sure you want to mark this equipment as delivered (checked out)?"
        confirmText="Yes, Confirm Delivery"
        cancelText="Cancel"
        variant="info"
      />

      <AlertDialog
        isOpen={checkInId !== null}
        onClose={() => setCheckInId(null)}
        onConfirm={() => { handleCheckIn(); setCheckInId(null); }}
        title="Confirm Equipment Return"
        description="Are you sure you want to mark this equipment as returned (checked in)?"
        confirmText="Yes, Confirm Return"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
}
