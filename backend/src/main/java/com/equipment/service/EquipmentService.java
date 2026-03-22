package com.equipment.service;

import com.equipment.dto.CreateEquipmentRequest;
import com.equipment.dto.CreateEquipmentUnitRequest;
import com.equipment.dto.EquipmentDto;
import com.equipment.dto.EquipmentUnitDto;
import com.equipment.entity.Equipment;
import com.equipment.entity.EquipmentUnit;
import com.equipment.entity.Tenant;
import com.equipment.entity.User;
import com.equipment.exception.CollegeDeactivatedException;
import com.equipment.exception.ManualStatusChangeNotAllowedException;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.EquipmentUnitRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EquipmentService {
    private static final String COLLEGE_INACTIVE_ACTION_MESSAGE =
            "Action disabled. Your college is currently deactivated.";

    private final EquipmentRepository equipmentRepository;
    private final EquipmentUnitRepository equipmentUnitRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;
    private final RecommendationService recommendationService;

    // --- Equipment ---
    @Transactional
    public EquipmentDto createEquipment(CreateEquipmentRequest request) {
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + request.getTenantId()));
        ensureTenantIsActiveForWrite(tenant);
        String normalizedName = request.getName() != null ? request.getName().trim() : null;
        request.setName(normalizedName);
        int totalQuantity = request.getTotalQuantity() != null ? request.getTotalQuantity() : 0;
        Equipment existing = normalizedName == null ? null
                : equipmentRepository.findByTenantIdAndNormalizedName(tenant.getId(), normalizedName).orElse(null);
        if (existing != null) {
            int currentUnits = equipmentUnitRepository.findByEquipmentId(existing.getId()).size();
            syncUnitsWithQuantity(existing, currentUnits + totalQuantity, request.getDefaultUnitCondition());
            recalculateAvailableQuantity(existing);
            equipmentRepository.save(existing);
            return toEquipmentDto(existing, existing.getTenant().getName(), true);
        }
        Equipment eq = Equipment.builder()
                .tenant(tenant)
                .name(normalizedName)
                .category(request.getCategory())
                .description(request.getDescription())
                .totalQuantity(totalQuantity)
                .availableQuantity(0)
                .availableFrom(request.getAvailableFrom())
                .availableTo(request.getAvailableTo())
                .maxBorrowDays(resolveMaxBorrowDays(request.getMaxBorrowDays()))
                .createdByAdminId(request.getCreatedByAdminId())
                .build();
        eq = equipmentRepository.save(eq);
        syncUnitsWithQuantity(eq, totalQuantity, request.getDefaultUnitCondition());
        recalculateAvailableQuantity(eq);
        equipmentRepository.save(eq);
        String adminName = resolveActorName(request.getCreatedByAdminId(), "Admin");
        activityLogService.log(
                tenant.getId(),
                request.getCreatedByAdminId(),
                adminName,
                "ADMIN",
                "EQUIPMENT_CREATED",
                "New Equipment " + eq.getName() + " was added to the inventory by Admin " + adminName + ".",
                "success"
        );
        return toEquipmentDto(eq, eq.getTenant().getName(), false);
    }

    @Transactional
    public List<EquipmentDto> getEquipmentByTenant(Long tenantId) {
        List<Equipment> tenantEquipment = equipmentRepository.findByTenantId(tenantId);
        tenantEquipment.forEach(this::ensureUnitsBackfilledForLegacyRows);
        tenantEquipment.forEach(this::syncAvailableQuantityIfNeeded);
        return tenantEquipment.stream()
                .map(e -> toEquipmentDto(e, e.getTenant().getName(), false))
                .collect(Collectors.toList());
    }

    /**
     * Catalog for user: equipment from user's tenant first, then from other active tenants.
     * For USER role to browse equipment across colleges.
     */
    public List<EquipmentDto> getCatalogForUser(Long userId, Long userTenantId) {
        // A detached user (after college hard-delete) must not see any catalog data.
        if (userTenantId == null) return List.of();
        RecommendationService.RankedCatalog ranked = recommendationService.rankCatalogForUser(userId, userTenantId);
        List<EquipmentDto> dtos = ranked.equipmentOrdered().stream()
                .map(e -> toEquipmentDto(e, e.getTenant().getName(), false))
                .collect(Collectors.toList());
        recommendationService.enrichRecommendationMeta(dtos, ranked.scoreByEquipmentId(), ranked.recommendedCutoffCount());
        return dtos;
    }

    @Transactional
    public EquipmentDto getEquipmentById(Long id) {
        Equipment eq = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
        ensureUnitsBackfilledForLegacyRows(eq);
        syncAvailableQuantityIfNeeded(eq);
        return toEquipmentDto(eq, eq.getTenant().getName(), false);
    }

    @Transactional
    public EquipmentDto updateEquipment(Long id, CreateEquipmentRequest request) {
        Equipment eq = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
        ensureTenantIsActiveForWrite(eq.getTenant());
        if (request.getName() != null) eq.setName(request.getName());
        if (request.getCategory() != null) eq.setCategory(request.getCategory());
        if (request.getDescription() != null) eq.setDescription(request.getDescription());
        if (request.getAvailableFrom() != null) eq.setAvailableFrom(request.getAvailableFrom());
        if (request.getAvailableTo() != null) eq.setAvailableTo(request.getAvailableTo());
        if (request.getMaxBorrowDays() != null) eq.setMaxBorrowDays(resolveMaxBorrowDays(request.getMaxBorrowDays()));
        recalculateAvailableQuantity(eq);
        equipmentRepository.save(eq);
        return toEquipmentDto(eq, eq.getTenant().getName(), false);
    }

    @Transactional
    public void deleteEquipment(Long id, Long adminId) {
        Equipment eq = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + id));
        ensureTenantIsActiveForWrite(eq.getTenant());
        boolean hasBorrowedUnits = equipmentUnitRepository.findByEquipmentId(eq.getId()).stream()
                .anyMatch(u -> "BORROWED".equalsIgnoreCase(u.getStatus()));
        if (hasBorrowedUnits) {
            throw new ManualStatusChangeNotAllowedException(
                    "Cannot delete equipment while one or more units are on loan."
            );
        }
        String adminName = resolveActorName(adminId, "Admin");
        activityLogService.log(
                eq.getTenant().getId(),
                adminId,
                adminName,
                "ADMIN",
                "EQUIPMENT_DELETED",
                "Equipment " + eq.getName() + " was permanently removed from the inventory by Admin " + adminName + ".",
                "warning"
        );
        equipmentRepository.deleteById(id);
    }

    // --- Equipment Units ---
    @Transactional
    public EquipmentUnitDto createUnit(CreateEquipmentUnitRequest request) {
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + request.getTenantId()));
        ensureTenantIsActiveForWrite(tenant);
        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + request.getEquipmentId()));
        if (!equipment.getTenant().getId().equals(tenant.getId())) {
            throw new IllegalArgumentException("Equipment does not belong to tenant");
        }
        String normalizedStatus = (request.getStatus() == null || request.getStatus().isBlank())
                ? "AVAILABLE"
                : request.getStatus().trim().toUpperCase();
        if (isSystemManagedBorrowedStatus(normalizedStatus)) {
            throw new ManualStatusChangeNotAllowedException(
                    "Status 'Borrowed' cannot be set manually. Please use the Handover process."
            );
        }
        String normalizedCondition = (request.getUnitCondition() == null || request.getUnitCondition().isBlank())
                ? "Excellent"
                : request.getUnitCondition().trim();
        int currentCount = equipmentUnitRepository.findByEquipmentId(equipment.getId()).size();
        String generatedSerial = buildCountBasedSerial(equipment.getId(), currentCount + 1);
        EquipmentUnit unit = EquipmentUnit.builder()
                .tenant(tenant)
                .equipment(equipment)
                .assetTag(request.getAssetTag())
                .serialNo(generatedSerial)
                .status(normalizedStatus)
                .unitCondition(normalizedCondition)
                .notes(request.getNotes())
                .build();
        unit = equipmentUnitRepository.save(unit);
        syncEquipmentQuantities(equipment);
        return toUnitDto(unit);
    }

    public List<EquipmentUnitDto> getUnitsByTenant(Long tenantId) {
        return equipmentUnitRepository.findByTenantId(tenantId).stream()
                .map(this::toUnitDto)
                .collect(Collectors.toList());
    }

    public List<EquipmentUnitDto> getUnitsByEquipment(Long equipmentId) {
        return equipmentUnitRepository.findByEquipmentId(equipmentId).stream()
                .map(this::toUnitDto)
                .collect(Collectors.toList());
    }

    public EquipmentUnitDto getUnitById(Long id) {
        EquipmentUnit u = equipmentUnitRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment unit not found: " + id));
        return toUnitDto(u);
    }

    @Transactional
    public EquipmentUnitDto updateUnit(Long id, CreateEquipmentUnitRequest request) {
        EquipmentUnit u = equipmentUnitRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment unit not found: " + id));
        ensureTenantIsActiveForWrite(u.getTenant());
        if (request.getTenantId() != null && !request.getTenantId().equals(u.getTenant().getId())) {
            throw new IllegalArgumentException("Unit does not belong to tenant");
        }
        if (request.getEquipmentId() != null && !request.getEquipmentId().equals(u.getEquipment().getId())) {
            throw new IllegalArgumentException("Unit does not belong to equipment");
        }
        String previousStatus = u.getStatus() != null ? u.getStatus().trim().toUpperCase() : "";
        String nextStatus = request.getStatus() != null ? request.getStatus().trim().toUpperCase() : u.getStatus();
        if (nextStatus != null
                && isSystemManagedBorrowedStatus(nextStatus)
                && !isSystemManagedBorrowedStatus(previousStatus)) {
            throw new ManualStatusChangeNotAllowedException(
                    "Status 'Borrowed' cannot be set manually. Please use the Handover process."
            );
        }
        if (isSystemManagedBorrowedStatus(previousStatus)
                && nextStatus != null
                && !isSystemManagedBorrowedStatus(nextStatus)) {
            throw new ManualStatusChangeNotAllowedException(
                    "Manual status change not allowed for borrowed items. Use the Check-in process."
            );
        }
        String nextCondition = request.getUnitCondition();
        if (nextCondition != null) {
            nextCondition = nextCondition.trim();
        }
        // If admin moves a unit back to AVAILABLE without a healthy condition, auto-correct to Good.
        if ("AVAILABLE".equals(nextStatus) && !isHealthyCondition(nextCondition)) {
            nextCondition = "Good";
        }
        if (nextStatus != null) u.setStatus(nextStatus);
        if (nextCondition != null) u.setUnitCondition(nextCondition);
        if (request.getNotes() != null) u.setNotes(request.getNotes());
        if (request.getAssetTag() != null) u.setAssetTag(request.getAssetTag());
        if (request.getSerialNo() != null) u.setSerialNo(request.getSerialNo());
        equipmentUnitRepository.save(u);
        boolean wasAvailable = "AVAILABLE".equals(previousStatus);
        boolean isAvailable = "AVAILABLE".equals(nextStatus);
        if (wasAvailable != isAvailable) {
            int delta = isAvailable ? 1 : -1;
            equipmentRepository.adjustAvailableQuantity(
                    u.getTenant().getId(),
                    u.getEquipment().getId(),
                    delta
            );
        }
        return toUnitDto(u);
    }

    @Transactional
    public void deleteUnit(Long id) {
        EquipmentUnit u = equipmentUnitRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment unit not found: " + id));
        ensureTenantIsActiveForWrite(u.getTenant());
        if ("BORROWED".equalsIgnoreCase(u.getStatus())) {
            throw new IllegalArgumentException("Cannot delete a BORROWED unit. Return it first.");
        }
        Equipment eq = u.getEquipment();
        equipmentUnitRepository.delete(u);
        syncEquipmentQuantities(eq);
    }

    private void recalculateAvailableQuantity(Equipment equipment) {
        if (equipment == null) return;
        List<EquipmentUnit> allUnits = equipmentUnitRepository.findByEquipmentId(equipment.getId());
        int total = allUnits.size();
        equipment.setTotalQuantity(total);
        int available = (int) allUnits.stream().filter(u -> "AVAILABLE".equalsIgnoreCase(u.getStatus())).count();
        equipment.setAvailableQuantity(available);
    }

    private void syncUnitsWithQuantity(Equipment equipment, int targetQuantity, String defaultCondition) {
        List<EquipmentUnit> currentUnits = equipmentUnitRepository.findByEquipmentId(equipment.getId());
        int currentSize = currentUnits.size();

        if (targetQuantity > currentSize) {
            for (int i = currentSize + 1; i <= targetQuantity; i++) {
                EquipmentUnit unit = EquipmentUnit.builder()
                        .tenant(equipment.getTenant())
                        .equipment(equipment)
                        .serialNo(buildCountBasedSerial(equipment.getId(), i))
                        .status("AVAILABLE")
                        .unitCondition(defaultCondition)
                        .build();
                equipmentUnitRepository.save(unit);
            }
            return;
        }

        if (targetQuantity < currentSize) {
            long lockedUnits = currentUnits.stream()
                    .filter(u -> !"AVAILABLE".equalsIgnoreCase(u.getStatus()))
                    .count();
            if (targetQuantity < lockedUnits) {
                throw new IllegalArgumentException("Cannot reduce quantity below borrowed/maintenance units (" + lockedUnits + ")");
            }
            int toDelete = currentSize - targetQuantity;
            List<EquipmentUnit> removable = currentUnits.stream()
                    .filter(u -> "AVAILABLE".equalsIgnoreCase(u.getStatus()))
                    .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                    .limit(toDelete)
                    .collect(Collectors.toList());
            if (removable.size() < toDelete) {
                throw new IllegalArgumentException("Not enough AVAILABLE units to reduce quantity");
            }
            removable.forEach(equipmentUnitRepository::delete);
        }
    }

    private String buildCountBasedSerial(Long equipmentId, int sequence) {
        return String.format("EUT-%d-%03d", equipmentId, sequence);
    }

    private void syncAvailableQuantityIfNeeded(Equipment equipment) {
        if (equipment == null) return;
        int totalBefore = equipment.getTotalQuantity() != null ? equipment.getTotalQuantity() : 0;
        int availableBefore = equipment.getAvailableQuantity() != null ? equipment.getAvailableQuantity() : 0;
        int totalFromUnits = Math.toIntExact(equipmentUnitRepository.countByEquipmentId(equipment.getId()));
        int availableFromUnits = Math.toIntExact(equipmentUnitRepository.countAvailableByEquipmentId(equipment.getId()));
        if (totalBefore != totalFromUnits || availableBefore != availableFromUnits) {
            syncEquipmentQuantities(equipment);
        }
    }

    private void ensureUnitsBackfilledForLegacyRows(Equipment equipment) {
        if (equipment == null || equipment.getId() == null || equipment.getTenant() == null) return;
        int configuredTotal = equipment.getTotalQuantity() != null ? equipment.getTotalQuantity() : 0;
        if (configuredTotal <= 0) return;
        long existingUnits = equipmentUnitRepository.countByEquipmentId(equipment.getId());
        if (existingUnits > 0) return;

        int targetAvailable = equipment.getAvailableQuantity() != null
                ? Math.max(0, Math.min(equipment.getAvailableQuantity(), configuredTotal))
                : configuredTotal;

        for (int i = 1; i <= configuredTotal; i++) {
            EquipmentUnit unit = EquipmentUnit.builder()
                    .tenant(equipment.getTenant())
                    .equipment(equipment)
                    .serialNo(buildCountBasedSerial(equipment.getId(), i))
                    .status(i <= targetAvailable ? "AVAILABLE" : "MAINTENANCE")
                    .unitCondition("Good")
                    .build();
            equipmentUnitRepository.save(unit);
        }
        syncEquipmentQuantities(equipment);
    }

    private void syncEquipmentQuantities(Equipment equipment) {
        if (equipment == null || equipment.getId() == null || equipment.getTenant() == null) return;
        equipmentRepository.syncQuantitiesFromUnits(equipment.getTenant().getId(), equipment.getId());
    }

    private boolean isHealthyCondition(String condition) {
        if (condition == null || condition.isBlank()) return false;
        String normalized = condition.trim().toLowerCase();
        return "excellent".equals(normalized) || "good".equals(normalized);
    }

    private boolean isSystemManagedBorrowedStatus(String status) {
        if (status == null || status.isBlank()) return false;
        String normalized = status.trim().toUpperCase();
        return "BORROWED".equals(normalized) || "ON_LOAN".equals(normalized);
    }

    private void ensureTenantIsActiveForWrite(Tenant tenant) {
        if (tenant == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
            throw new CollegeDeactivatedException(COLLEGE_INACTIVE_ACTION_MESSAGE);
        }
    }

    private int resolveMaxBorrowDays(Integer requestedMaxBorrowDays) {
        return (requestedMaxBorrowDays == null || requestedMaxBorrowDays < 1) ? 7 : requestedMaxBorrowDays;
    }

    private String resolveActorName(Long userId, String fallback) {
        if (userId == null) return fallback;
        return userRepository.findById(userId).map(User::getName).orElse(fallback);
    }

    private EquipmentDto toEquipmentDto(Equipment e, String tenantName, boolean mergedIntoExisting) {
        List<EquipmentUnit> units = equipmentUnitRepository.findByEquipmentId(e.getId());
        return EquipmentDto.builder()
                .id(e.getId())
                .tenantId(e.getTenant().getId())
                .tenantName(tenantName)
                .name(e.getName())
                .category(e.getCategory())
                .description(e.getDescription())
                .totalQuantity(e.getTotalQuantity())
                .availableQuantity(e.getAvailableQuantity())
                .status(calculateAggregateStatus(units))
                .availableFrom(e.getAvailableFrom())
                .availableTo(e.getAvailableTo())
                .maxBorrowDays(resolveMaxBorrowDays(e.getMaxBorrowDays()))
                .maintenanceNotes(null)
                .mergedIntoExisting(mergedIntoExisting)
                .createdByAdminId(e.getCreatedByAdminId())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private String calculateAggregateStatus(List<EquipmentUnit> units) {
        if (units == null || units.isEmpty()) return "RETIRED";
        long available = units.stream().filter(u -> "AVAILABLE".equalsIgnoreCase(u.getStatus())).count();
        if (available > 0) return "AVAILABLE";
        long maintenance = units.stream().filter(u -> "MAINTENANCE".equalsIgnoreCase(u.getStatus())).count();
        if (maintenance == units.size()) return "MAINTENANCE";
        long borrowed = units.stream().filter(u -> "BORROWED".equalsIgnoreCase(u.getStatus())).count();
        if (borrowed == units.size()) return "BORROWED";
        return maintenance >= borrowed ? "MAINTENANCE" : "BORROWED";
    }

    private EquipmentUnitDto toUnitDto(EquipmentUnit u) {
        return EquipmentUnitDto.builder()
                .id(u.getId())
                .tenantId(u.getTenant().getId())
                .equipmentId(u.getEquipment().getId())
                .assetTag(u.getAssetTag())
                .serialNo(u.getSerialNo())
                .status(u.getStatus())
                .unitCondition(u.getUnitCondition())
                .notes(u.getNotes())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
