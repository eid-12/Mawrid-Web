import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { AlertDialog } from '../../components/AlertDialog';
import { SuccessToast } from '../../components/SuccessToast';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { useAdminLiveData, useAdminTenantState } from '../../hooks/useAdminLiveData';
import { getEquipmentIcon } from '../../lib/equipmentIconMapper';

const MANUAL_UNIT_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'] as const;
const ENGLISH_EQUIPMENT_NAME_REGEX = /^[\x20-\x7E]+$/;
const INITIAL_ADD_FORM = {
  name: '',
  category: '',
  quantity: 1,
  availableFrom: '',
  availableTo: '',
  maxBorrowDays: 7,
};

type EquipmentDto = {
  id: number;
  tenantId: number;
  name: string;
  category: string | null;
  totalQuantity: number;
  availableQuantity: number;
  status?: string | null;
  availableFrom?: string | null;
  availableTo?: string | null;
  maxBorrowDays?: number | null;
  mergedIntoExisting?: boolean | null;
};

type EquipmentUnitDto = {
  id: number;
  equipmentId: number;
  serialNo: string | null;
  status: string;
  unitCondition: string | null;
  notes?: string | null;
};

type EquipmentWithUnits = EquipmentDto & {
  units: EquipmentUnitDto[];
  serialSummary: string | null;
  statusSummary: string;
  conditionSummary: string;
  inUse: number;
  maintenanceUnits: number;
  availableByUnits: number;
};

export default function Inventory() {
  const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  const { user } = useAuth();
  const { tenantId, tenantStatus } = useAdminTenantState(user?.tenantId);
  const isReadOnlyCollege = tenantStatus === 'INACTIVE';
  const [equipment, setEquipment] = useState<EquipmentDto[]>([]);
  const [units, setUnits] = useState<EquipmentUnitDto[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [unitListEquipmentId, setUnitListEquipmentId] = useState<number | null>(null);
  const [editUnitId, setEditUnitId] = useState<number | null>(null);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({
    status: 'AVAILABLE',
    unitCondition: '',
    notes: '',
  });
  const [addUnitForm, setAddUnitForm] = useState({
    unitCondition: 'Excellent',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'cancel'>('success');
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [addFormTouched, setAddFormTouched] = useState<Record<string, boolean>>({});
  const [addFormSubmitted, setAddFormSubmitted] = useState(false);

  const coerceArray = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object') {
      const obj = payload as { content?: unknown; data?: unknown; items?: unknown };
      if (Array.isArray(obj.content)) return obj.content as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
      if (Array.isArray(obj.items)) return obj.items as T[];
    }
    return [];
  };

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    const [eqResult, unitResult] = await Promise.allSettled([
      api.get<unknown>(`/api/tenants/${tenantId}/equipment`),
      api.get<unknown>(`/api/tenants/${tenantId}/equipment-units`),
    ]);

    if (eqResult.status === 'fulfilled') {
      const eqList = coerceArray<EquipmentDto>(eqResult.value);
      console.log('Inventory Data (equipment):', eqResult.value);
      setEquipment(eqList);
    } else {
      console.error('Inventory fetch failed (equipment):', eqResult.reason);
      setEquipment([]);
    }

    if (unitResult.status === 'fulfilled') {
      const unitList = coerceArray<EquipmentUnitDto>(unitResult.value);
      console.log('Inventory Data (units):', unitResult.value);
      setUnits(unitList);
    } else {
      console.error('Inventory fetch failed (units):', unitResult.reason);
      setUnits([]);
    }
  }, [tenantId]);

  useAdminLiveData(() => void loadData(), Boolean(tenantId));

  const normalizeLabel = (v: string | null | undefined) =>
    (v ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const toDisplayLabel = (v: string) => {
    if (!v) return '—';
    return v.split(' ').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : '')).join(' ');
  };

  const summarizeStatus = (eqUnits: EquipmentUnitDto[]) => {
    if (!eqUnits.length) return 'No Units';
    const total = eqUnits.length;
    const available = eqUnits.filter((u) => (u.status ?? '').toUpperCase() === 'AVAILABLE').length;
    const maintenance = eqUnits.filter((u) => (u.status ?? '').toUpperCase() === 'MAINTENANCE').length;
    const borrowed = eqUnits.filter((u) => (u.status ?? '').toUpperCase() === 'BORROWED').length;
    if (available === total) return 'Available';
    if (maintenance === total) return 'Maintenance';
    if (borrowed === total) return 'Borrowed';
    if (available > 0) return 'Mixed (Available)';
    if (borrowed > 0 && maintenance > 0) return 'Mixed (In Use/Maintenance)';
    if (maintenance > 0) return 'Mostly Maintenance';
    if (borrowed > 0) return 'Mostly Borrowed';
    return 'Mixed';
  };

  const summarizeCondition = (eqUnits: EquipmentUnitDto[]) => {
    if (!eqUnits.length) return '—';
    const counts = new Map<string, number>();
    for (const unit of eqUnits) {
      const key = normalizeLabel(unit.unitCondition);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (counts.size === 0) return '—';
    let topKey = '';
    let topCount = 0;
    counts.forEach((count, key) => {
      if (count > topCount) {
        topCount = count;
        topKey = key;
      }
    });
    if (counts.size === 1) return toDisplayLabel(topKey);
    if (topCount / eqUnits.length >= 0.7) return `Mostly ${toDisplayLabel(topKey)}`;
    return 'Mixed';
  };

  const summaryBadgeVariant = (statusSummary: string): 'success' | 'warning' | 'error' | 'neutral' => {
    const s = statusSummary.toLowerCase();
    if (s.includes('available')) return 'success';
    if (s.includes('borrowed') || s.includes('in use')) return 'warning';
    if (s.includes('maintenance')) return 'error';
    return 'neutral';
  };

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const items = useMemo(() => {
    const unitsByEq = new Map<number, EquipmentUnitDto[]>();
    units.forEach((u) => {
      const list = unitsByEq.get(u.equipmentId) ?? [];
      list.push(u);
      unitsByEq.set(u.equipmentId, list);
    });
    return equipment.map((e) => {
      const eqUnits = unitsByEq.get(e.id) ?? [];
      const first = eqUnits[0];
      const borrowed = eqUnits.filter((u) => u.status === 'BORROWED').length;
      const maint = eqUnits.filter((u) => u.status === 'MAINTENANCE').length;
      const availableByUnits = eqUnits.filter((u) => u.status === 'AVAILABLE').length;
      return {
        ...e,
        units: eqUnits,
        serialSummary: first?.serialNo ?? null,
        statusSummary: summarizeStatus(eqUnits),
        conditionSummary: summarizeCondition(eqUnits),
        inUse: borrowed,
        maintenanceUnits: maint,
        availableByUnits,
      };
    });
  }, [equipment, units]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) =>
        (i.name?.toLowerCase().includes(q) ?? false) ||
        (i.units.some((u) => (u.serialNo?.toLowerCase().includes(q) ?? false))) ||
        (i.category?.toLowerCase().includes(q) ?? false) ||
        (i.conditionSummary?.toLowerCase().includes(q) ?? false) ||
        (i.statusSummary?.toLowerCase().includes(q) ?? false)
    );
  }, [items, searchQuery]);

  const totalPages = useMemo(
    () => Math.ceil(filteredItems.length / itemsPerPage),
    [filteredItems.length, itemsPerPage]
  );
  const paginatedItems = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, page, itemsPerPage]);
  const pageNumbers = useMemo(() => {
    if (totalPages <= 0) return [];
    const start = Math.max(0, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    const nums: number[] = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  }, [page, totalPages]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 0) setPage(0);
      return;
    }
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const handleDeleteItem = async (id: number) => {
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    try {
      await api.delete(`/api/equipment/${id}`);
      setDeleteItemId(null);
      setSuccessMessage('Equipment deleted successfully!');
      setToastVariant('success');
      setShowSuccess(true);
      loadData();
    } catch {
      setSuccessMessage('Failed to delete');
      setShowSuccess(true);
    }
  };

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    if (!tenantId) return;
    const errs = validateAddEquipmentForm(addForm);
    setAddFormErrors(errs);
    setAddFormSubmitted(true);
    setAddFormTouched({
      name: true,
      category: true,
      quantity: true,
      availableFrom: true,
      availableTo: true,
      maxBorrowDays: true,
    });
    if (Object.keys(errs).length > 0) {
      setToastVariant('cancel');
      setSuccessMessage('Please fix the highlighted errors before submitting.');
      setShowSuccess(true);
      return;
    }
    try {
      const created = await api.post<EquipmentDto>(`/api/tenants/${tenantId}/equipment`, {
        tenantId,
        name: addForm.name,
        category: addForm.category || null,
        description: null,
        totalQuantity: addForm.quantity,
        availableFrom: addForm.availableFrom || null,
        availableTo: addForm.availableTo || null,
        maxBorrowDays: addForm.maxBorrowDays,
        serialNoPrefix: null,
        defaultUnitCondition: null,
        createdByAdminId: user?.userId,
      });
      closeAddFormModal();
      setSuccessMessage(
        created?.mergedIntoExisting
          ? 'Equipment already exists. New units have been added to the existing record.'
          : 'Equipment added successfully!'
      );
      setToastVariant('success');
      setShowSuccess(true);
      loadData();
    } catch {
      setToastVariant('cancel');
      setSuccessMessage('Failed to add equipment');
      setShowSuccess(true);
    }
  };

  const markAddFormTouched = (field: string) => {
    setAddFormTouched((prev) => ({ ...prev, [field]: true }));
    setAddFormErrors(validateAddEquipmentForm(addForm));
  };

  const updateAddFormField = (field: keyof typeof addForm, value: string | number) => {
    setAddForm((prev) => {
      const next = { ...prev, [field]: value };
      if (addFormTouched[field] || addFormSubmitted) {
        setAddFormErrors(validateAddEquipmentForm(next));
      }
      return next;
    });
  };

  const shouldShowAddFieldError = (field: string) => Boolean(addFormSubmitted || addFormTouched[field]);

  const validateAddEquipmentForm = (form: typeof addForm) => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Equipment Name is required';
    else if (!ENGLISH_EQUIPMENT_NAME_REGEX.test(form.name.trim())) {
      errs.name = 'Please enter the equipment name in English only (e.g., MacBook Pro).';
    }
    if (!form.category.trim()) errs.category = 'Category is required';
    if (!Number.isFinite(form.quantity) || form.quantity < 1) errs.quantity = 'Quantity must be at least 1';
    if (!form.availableFrom) errs.availableFrom = 'Available From is required';
    if (!form.availableTo) errs.availableTo = 'Available To is required';
    if (!Number.isFinite(form.maxBorrowDays) || form.maxBorrowDays < 1) {
      errs.maxBorrowDays = 'Max Borrow Days must be at least 1';
    }
    if (form.availableFrom && form.availableTo && form.availableTo < form.availableFrom) {
      errs.availableTo = 'Return date cannot be before start date.';
    }
    return errs;
  };

  const resetAddForm = () => {
    setAddForm(INITIAL_ADD_FORM);
    setAddFormErrors({});
    setAddFormTouched({});
    setAddFormSubmitted(false);
  };

  const closeAddFormModal = () => {
    resetAddForm();
    setShowAddForm(false);
  };

  const openAddFormModal = () => {
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    resetAddForm();
    setShowAddForm(true);
  };

  const handleEditSave = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    const form = e.target as HTMLFormElement;
    const name = (form.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const category = (form.querySelector('[name="category"]') as HTMLInputElement)?.value;
    const availableFrom = (form.querySelector('[name="availableFrom"]') as HTMLInputElement)?.value || null;
    const availableTo = (form.querySelector('[name="availableTo"]') as HTMLInputElement)?.value || null;
    const maxBorrowDaysRaw = (form.querySelector('[name="maxBorrowDays"]') as HTMLInputElement)?.value;
    const maxBorrowDays = maxBorrowDaysRaw ? Math.max(1, parseInt(maxBorrowDaysRaw, 10) || 1) : 7;
    try {
      await api.put(`/api/equipment/${id}`, {
        tenantId,
        name,
        category: category || null,
        availableFrom: availableFrom || null,
        availableTo: availableTo || null,
        maxBorrowDays,
        createdByAdminId: user?.userId,
      });
      setEditItemId(null);
      setSuccessMessage('Equipment updated successfully!');
      setToastVariant('success');
      setShowSuccess(true);
      loadData();
    } catch {
      setSuccessMessage('Failed to update');
      setShowSuccess(true);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    if (!tenantId || !unitListEquipmentId) return;
    try {
      await api.post('/api/equipment-units', {
        tenantId,
        equipmentId: unitListEquipmentId,
        serialNo: null,
        status: 'AVAILABLE',
        unitCondition: addUnitForm.unitCondition.trim() || 'Excellent',
        notes: null,
      });
      setShowAddUnitForm(false);
      setAddUnitForm({ unitCondition: 'Excellent' });
      setSuccessMessage('Unit added successfully!');
      setToastVariant('success');
      setShowSuccess(true);
      await loadData();
    } catch {
      setToastVariant('cancel');
      setSuccessMessage('Failed to add unit');
      setShowSuccess(true);
    }
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    if ((unit.status ?? '').toUpperCase() === 'BORROWED') {
      setToastVariant('cancel');
      setSuccessMessage('Cannot delete a BORROWED unit. Return it first.');
      setShowSuccess(true);
      setDeleteUnitId(null);
      return;
    }
    try {
      await api.delete(`/api/equipment-units/${unitId}`);
      setDeleteUnitId(null);
      setSuccessMessage('Unit deleted successfully!');
      setToastVariant('success');
      setShowSuccess(true);
      await loadData();
    } catch {
      setToastVariant('cancel');
      setSuccessMessage('Failed to delete unit');
      setShowSuccess(true);
      setDeleteUnitId(null);
    }
  };

  const openUnitList = (equipmentId: number) => {
    setUnitListEquipmentId(equipmentId);
  };

  const openUnitEditor = (unit: EquipmentUnitDto) => {
    if (isReadOnlyCollege) return;
    setEditUnitId(unit.id);
    setUnitForm({
      status: (unit.status ?? 'AVAILABLE').toUpperCase(),
      unitCondition: unit.unitCondition ?? '',
      notes: unit.notes ?? '',
    });
  };

  const handleUnitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnlyCollege) {
      setToastVariant('cancel');
      setSuccessMessage('Action disabled. Your college is currently deactivated.');
      setShowSuccess(true);
      return;
    }
    if (!tenantId || !unitListEquipmentId || !editUnitId) return;
    const nextStatus = (unitForm.status ?? '').trim().toUpperCase();
    const typedCondition = (unitForm.unitCondition ?? '').trim();
    const conditionNeedsAutoFix =
      nextStatus === 'AVAILABLE' &&
      !['excellent', 'good'].includes(typedCondition.toLowerCase());
    const nextCondition = conditionNeedsAutoFix ? 'Good' : (typedCondition || null);
    try {
      await api.put(`/api/equipment-units/${editUnitId}`, {
        tenantId,
        equipmentId: unitListEquipmentId,
        status: nextStatus,
        unitCondition: nextCondition,
        notes: unitForm.notes || null,
      });
      setEditUnitId(null);
      if (conditionNeedsAutoFix) {
        setSuccessMessage('Unit updated. Condition was auto-set to Good so status can be AVAILABLE.');
        setToastVariant('cancel');
      } else {
        setSuccessMessage('Unit details updated successfully!');
        setToastVariant('success');
      }
      setShowSuccess(true);
      await loadData();
    } catch (err: unknown) {
      setToastVariant('cancel');
      const message = (err as { message?: string })?.message;
      setSuccessMessage(message || 'Failed to update unit');
      setShowSuccess(true);
    }
  };

  const editItem = items.find((i) => i.id === editItemId);
  const selectedEquipment = items.find((i) => i.id === unitListEquipmentId);
  const selectedUnit = selectedEquipment?.units.find((u) => u.id === editUnitId) ?? null;
  const isSelectedUnitBorrowed = ['BORROWED', 'ON_LOAN'].includes((selectedUnit?.status ?? '').toUpperCase());
  const selectedDeleteUnit = selectedEquipment?.units.find((u) => u.id === deleteUnitId) ?? null;
  const selectedUnits = useMemo(
    () => [...(selectedEquipment?.units ?? [])].sort((a, b) => (a.serialNo ?? '').localeCompare(b.serialNo ?? '')),
    [selectedEquipment]
  );
  const totalItems = items.reduce((s, i) => s + i.totalQuantity, 0);
  const availableCount = items.reduce((s, i) => s + (i.availableByUnits ?? i.availableQuantity), 0);
  const inUseCount = items.reduce((s, i) => s + i.inUse, 0);
  const maintenanceCount = items.reduce((s, i) => s + i.maintenanceUnits, 0);

  return (
    <div className="space-y-6">
      <SuccessToast isOpen={showSuccess} variant={toastVariant} message={successMessage} onClose={() => setShowSuccess(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>Inventory Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage equipment in your college</p>
        </div>
        <Button icon={Plus} onClick={openAddFormModal} disabled={!tenantId || isReadOnlyCollege}>Add Equipment</Button>
      </div>

      <Card>
        <Input
          type="text"
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Items</p>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>{totalItems}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Available</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{availableCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>In Use</p>
          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{inUseCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Maintenance</p>
          <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">{maintenanceCount}</p>
        </Card>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-background border-b dark:border-b-white/10 border-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Equipment</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Serial Number</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Quantity</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Condition</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No equipment found matching your search
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`border-b dark:border-b-white/10 border-border hover:bg-hover-bg transition-colors ${index === paginatedItems.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const EquipmentIcon = getEquipmentIcon(item.name ?? '', item.category ?? '');
                          return <EquipmentIcon className="w-5 h-5 text-slate-600 dark:text-sky-300 flex-shrink-0" />;
                        })()}
                        <button
                          type="button"
                          onClick={() => openUnitList(item.id)}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer hover:underline transition-all"
                        >
                          {item.name}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4"><p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{item.serialSummary ?? '—'}</p></td>
                    <td className="px-6 py-4"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.category ?? '—'}</p></td>
                    <td className="px-6 py-4"><p className="text-sm" style={{ color: 'var(--text-body)' }}>{item.availableByUnits ?? item.availableQuantity}/{item.totalQuantity}</p></td>
                    <td className="px-6 py-4">
                      <Badge variant={summaryBadgeVariant(item.statusSummary)} size="sm">{item.statusSummary}</Badge>
                    </td>
                    <td className="px-6 py-4"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.conditionSummary}</p></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" icon={Edit} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => setEditItemId(item.id)} disabled={isReadOnlyCollege}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className={item.inUse > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'}
                          onClick={() => setDeleteItemId(item.id)}
                          disabled={item.inUse > 0 || isReadOnlyCollege}
                          title={item.inUse > 0 ? 'Cannot delete while item is on loan.' : 'Delete equipment'}
                        >
                          Delete
                        </Button>
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
            Page {totalPages > 0 ? page + 1 : 0} of {totalPages} ({filteredItems.length} equipment)
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
              Prev
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

      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
          onClick={closeAddFormModal}
        >
          <Card className="max-w-2xl w-[90vw] sm:w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>Add New Equipment</h2>
            <form className="space-y-4" onSubmit={handleAddEquipment} noValidate>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">Icon Preview</p>
                <div className="flex items-center gap-3">
                  {(() => {
                    const PreviewIcon = getEquipmentIcon(addForm.name, addForm.category);
                    return (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F9FCFE] via-background to-[#F9FAFD] dark:from-[#2D3748] dark:via-background dark:to-[#374151] border border-border flex items-center justify-center">
                        <PreviewIcon className="w-12 h-12 text-slate-600 dark:text-sky-300" />
                      </div>
                    );
                  })()}
                  <p className="text-sm text-muted-foreground">
                    Updates automatically based on equipment name.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Equipment Name"
                  placeholder="e.g., MacBook Pro 16&quot;"
                  value={addForm.name}
                  onChange={(e) => updateAddFormField('name', e.target.value)}
                  onBlur={() => markAddFormTouched('name')}
                  error={shouldShowAddFieldError('name') ? addFormErrors.name : undefined}
                  required
                />
                <Input label="Serial Number" placeholder="Auto-generated upon save." value="" disabled />
                <Input
                  label="Category"
                  placeholder="e.g., Computers"
                  value={addForm.category}
                  onChange={(e) => updateAddFormField('category', e.target.value)}
                  onBlur={() => markAddFormTouched('category')}
                  error={shouldShowAddFieldError('category') ? addFormErrors.category : undefined}
                  required
                />
                <Input
                  type="number"
                  label="Quantity"
                  placeholder="1"
                  min={1}
                  value={addForm.quantity}
                  onChange={(e) => updateAddFormField('quantity', parseInt(e.target.value, 10) || 0)}
                  onBlur={() => markAddFormTouched('quantity')}
                  error={shouldShowAddFieldError('quantity') ? addFormErrors.quantity : undefined}
                  required
                />
                <Input
                  type="number"
                  label="Max Borrow Days"
                  placeholder="7"
                  min={1}
                  value={addForm.maxBorrowDays}
                  onChange={(e) => updateAddFormField('maxBorrowDays', parseInt(e.target.value, 10) || 0)}
                  onBlur={() => markAddFormTouched('maxBorrowDays')}
                  error={shouldShowAddFieldError('maxBorrowDays') ? addFormErrors.maxBorrowDays : undefined}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                    Available From <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={addForm.availableFrom}
                    onChange={(e) => updateAddFormField('availableFrom', e.target.value)}
                    onBlur={() => markAddFormTouched('availableFrom')}
                    className={`w-full px-4 py-3 bg-input-background border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 ${(shouldShowAddFieldError('availableFrom') && addFormErrors.availableFrom) ? 'border-red-500' : 'border-border'}`}
                    required
                  />
                  {(shouldShowAddFieldError('availableFrom') && addFormErrors.availableFrom) && <p className="mt-1.5 text-sm text-red-600">{addFormErrors.availableFrom}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
                    Available To <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={addForm.availableTo}
                    onChange={(e) => updateAddFormField('availableTo', e.target.value)}
                    onBlur={() => markAddFormTouched('availableTo')}
                    className={`w-full px-4 py-3 bg-input-background border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 ${(shouldShowAddFieldError('availableTo') && addFormErrors.availableTo) ? 'border-red-500' : 'border-border'}`}
                    required
                  />
                  {(shouldShowAddFieldError('availableTo') && addFormErrors.availableTo) && <p className="mt-1.5 text-sm text-red-600">{addFormErrors.availableTo}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  fullWidth
                  icon={Package}
                  disabled={!tenantId}
                >
                  Add Equipment
                </Button>
                <Button type="button" variant="secondary" fullWidth onClick={closeAddFormModal}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editItemId && editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-2xl w-[90vw] sm:w-full">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-heading)' }}>Edit Equipment</h2>
            <form className="space-y-4" onSubmit={(e) => handleEditSave(e, editItem.id)} noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input name="name" label="Equipment Name" defaultValue={editItem.name} required />
                <Input label="Serial Number" defaultValue={editItem.serialSummary ?? ''} disabled />
                <Input name="category" label="Category" defaultValue={editItem.category ?? ''} />
                <Input name="quantity" type="number" label="Quantity (Calculated)" defaultValue={editItem.totalQuantity} disabled />
                <Input label="Status Summary" defaultValue={editItem.statusSummary} disabled />
                <Input
                  name="maxBorrowDays"
                  type="number"
                  min={1}
                  label="Max Borrow Days"
                  defaultValue={editItem.maxBorrowDays ?? 7}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Available From</label>
                  <input
                    name="availableFrom"
                    type="date"
                    defaultValue={editItem.availableFrom ?? ''}
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Available To</label>
                  <input
                    name="availableTo"
                    type="date"
                    defaultValue={editItem.availableTo ?? ''}
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" fullWidth icon={Package}>Save Changes</Button>
                <Button type="button" variant="secondary" fullWidth onClick={() => setEditItemId(null)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {selectedEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-5xl w-[90vw] sm:w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Unit List - {selectedEquipment.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage each physical unit independently (status, condition, and maintenance notes).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button icon={Plus} onClick={() => setShowAddUnitForm(true)}>
                  Add Unit
                </Button>
                <Button variant="secondary" onClick={() => { setUnitListEquipmentId(null); setEditUnitId(null); setDeleteUnitId(null); setShowAddUnitForm(false); }}>
                  Close
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto border border-border rounded-2xl">
              <table className="w-full min-w-[720px]">
                <thead className="bg-background border-b dark:border-b-white/10 border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Serial Number</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Condition</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Current Status</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Maintenance Notes</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUnits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No units found for this equipment.
                      </td>
                    </tr>
                  ) : (
                    selectedUnits.map((unit, index) => (
                      <tr key={unit.id} className={`border-b dark:border-b-white/10 border-border ${index === selectedUnits.length - 1 ? 'border-b-0' : ''}`}>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{unit.serialNo ?? '—'}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{unit.unitCondition ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={summaryBadgeVariant(toDisplayLabel((unit.status ?? '').toLowerCase()))} size="sm">
                            {toDisplayLabel((unit.status ?? '').toLowerCase())}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{unit.notes ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit}
                              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              onClick={() => openUnitEditor(unit)}
                              disabled={isReadOnlyCollege}
                            >
                              Edit Unit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              className={(unit.status ?? '').toUpperCase() === 'BORROWED'
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'}
                              onClick={() => setDeleteUnitId(unit.id)}
                              disabled={isReadOnlyCollege || ['BORROWED', 'ON_LOAN'].includes((unit.status ?? '').toUpperCase())}
                              title={(unit.status ?? '').toUpperCase() === 'BORROWED'
                                ? 'Cannot delete while item is on loan.'
                                : 'Delete unit'}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {selectedEquipment && showAddUnitForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]">
          <Card className="max-w-lg w-[90vw] sm:w-full">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              Add Unit - {selectedEquipment.name}
            </h3>
            <form className="space-y-4" onSubmit={handleAddUnit} noValidate>
              <Input
                label="Serial Number"
                value=""
                placeholder="Auto-generated (e.g., EUT-6-0051)"
                disabled
              />
              <Input
                label="Initial Condition"
                value={addUnitForm.unitCondition}
                onChange={(e) => setAddUnitForm((prev) => ({ ...prev, unitCondition: e.target.value }))}
                placeholder="e.g., Excellent"
              />
              <Input label="Default Status" value="AVAILABLE" disabled />
              <div className="flex gap-3">
                <Button type="submit" fullWidth icon={Plus}>Add Unit</Button>
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowAddUnitForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {selectedEquipment && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[60]">
          <Card className="max-w-xl w-[90vw] sm:w-full">
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
              Edit Unit Details
            </h3>
            <p className="text-sm mb-4 text-muted-foreground">
              Equipment: <span className="font-medium" style={{ color: 'var(--text-heading)' }}>{selectedEquipment.name}</span>
            </p>
            <form className="space-y-4" onSubmit={handleUnitSave} noValidate>
              <Input label="Serial Number" value={selectedUnit.serialNo ?? ''} disabled />
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Current Status</label>
                {isSelectedUnitBorrowed ? (
                  <input
                    value="BORROWED"
                    disabled
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl text-foreground disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={unitForm.status}
                    onChange={(e) => setUnitForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {MANUAL_UNIT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
                {isSelectedUnitBorrowed && (
                  <p className="mt-2 text-xs text-[#64748B]">
                    Borrowed units are locked. Status can only be updated via the Check In/Out page.
                  </p>
                )}
                <p className="mt-2 text-xs text-[#64748B]">
                  Borrowed status is assigned automatically during handover.
                </p>
              </div>
              <Input
                label="Condition"
                value={unitForm.unitCondition}
                onChange={(e) => setUnitForm((prev) => ({ ...prev, unitCondition: e.target.value }))}
                placeholder="e.g., Excellent / Good / Fair / Poor"
              />
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-heading)' }}>Maintenance Notes</label>
                <textarea
                  value={unitForm.notes}
                  onChange={(e) => setUnitForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none"
                  placeholder="Optional serial-specific maintenance notes..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" fullWidth icon={Package}>Save Unit</Button>
                <Button type="button" variant="secondary" fullWidth onClick={() => setEditUnitId(null)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <AlertDialog
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => handleDeleteItem(deleteItemId!)}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <AlertDialog
        isOpen={deleteUnitId !== null}
        onClose={() => setDeleteUnitId(null)}
        onConfirm={() => handleDeleteUnit(deleteUnitId!)}
        title="Delete Unit"
        description={
          selectedDeleteUnit && (selectedDeleteUnit.status ?? '').toUpperCase() === 'BORROWED'
            ? `Unit ${selectedDeleteUnit.serialNo ?? ''} is BORROWED and cannot be deleted.`
            : `Are you sure you want to delete unit ${selectedDeleteUnit?.serialNo ?? ''}?`
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
