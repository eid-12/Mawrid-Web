package com.equipment.service;

import com.equipment.dto.CreateTenantRequest;
import com.equipment.dto.TenantDto;
import com.equipment.dto.TenantSettingsDto;
import com.equipment.entity.UserRole;
import com.equipment.entity.Tenant;
import com.equipment.entity.TenantSettings;
import com.equipment.repository.EquipmentUnitRepository;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.CheckTransactionRepository;
import com.equipment.repository.ActivityLogRepository;
import com.equipment.repository.DismissedDashboardAlertRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.Instant;
import java.util.Map;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EquipmentUnitRepository equipmentUnitRepository;
    private final EquipmentRepository equipmentRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final CheckTransactionRepository checkTransactionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final DismissedDashboardAlertRepository dismissedDashboardAlertRepository;
    private final EmailService emailService;

    @Transactional
    public TenantDto registerTenant(CreateTenantRequest request) {
        if (tenantRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Tenant with code " + request.getCode() + " already exists");
        }
        Tenant tenant = Tenant.builder()
                .name(request.getName())
                .code(request.getCode())
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .email(request.getEmail())
                .phone(request.getPhone())
                .location(request.getLocation())
                .website(request.getWebsite())
                .description(request.getDescription())
                .build();
        tenant = tenantRepository.save(tenant);

        TenantSettings settings = TenantSettings.builder()
                .tenant(tenant)
                .maxBorrowDays(request.getMaxBorrowDays() != null ? request.getMaxBorrowDays() : 7)
                .approvalRequired(request.getApprovalRequired() != null ? request.getApprovalRequired() : true)
                .cutoffTime(parseCutoffTime(request.getCutoffTime()))
                .build();
        tenant.setTenantSettings(settings);
        tenantRepository.save(tenant);

        // On create with email: send Official Registration email
        if (tenant.getEmail() != null && !tenant.getEmail().isBlank()) {
            emailService.sendCollegeRegistrationEmail(
                    tenant.getEmail(), tenant.getName(), tenant.getCode());
        }
        return toDto(tenant);
    }

    private static final Sort DEFAULT_SORT = Sort.by(
            Sort.Order.asc("status"),   // ACTIVE before INACTIVE
            Sort.Order.asc("name")
    );

    public List<TenantDto> findAll() {
        return tenantRepository.findAll(DEFAULT_SORT).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<TenantDto> findAllActive() {
        return tenantRepository.findByStatusOrderByNameAsc("ACTIVE").stream().map(this::toDto).collect(Collectors.toList());
    }

    public Page<TenantDto> findAllPaginated(Pageable pageable, String query) {
        Sort sort = pageable.getSort().isSorted() ? pageable.getSort() : DEFAULT_SORT;
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.trim();
        return tenantRepository.search(normalizedQuery, sorted).map(this::toDto);
    }

    public Map<String, Long> getStats() {
        long total = tenantRepository.count();
        long active = tenantRepository.countByStatus("ACTIVE");
        return Map.of("total", total, "active", active);
    }

    public TenantDto findById(Long id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        return toDto(tenant);
    }

    public TenantSettingsDto getSettings(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));
        TenantSettings s = tenant.getTenantSettings();
        if (s == null) return null;
        return TenantSettingsDto.builder()
                .tenantId(s.getTenantId())
                .maxBorrowDays(s.getMaxBorrowDays())
                .approvalRequired(s.getApprovalRequired())
                .cutoffTime(s.getCutoffTime())
                .build();
    }

    @Transactional
    public TenantSettingsDto updateSettings(Long tenantId, TenantSettingsDto dto) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));
        TenantSettings s = tenant.getTenantSettings();
        if (s == null) {
            s = TenantSettings.builder().tenant(tenant).build();
            tenant.setTenantSettings(s);
        }
        if (dto.getMaxBorrowDays() != null) s.setMaxBorrowDays(dto.getMaxBorrowDays());
        if (dto.getApprovalRequired() != null) s.setApprovalRequired(dto.getApprovalRequired());
        if (dto.getCutoffTime() != null) s.setCutoffTime(dto.getCutoffTime());
        tenantRepository.save(tenant);
        return getSettings(tenantId);
    }

    private static LocalTime parseCutoffTime(String cutoffTime) {
        if (cutoffTime == null || cutoffTime.isBlank()) return LocalTime.of(17, 0);
        try {
            return LocalTime.parse(cutoffTime.trim(), DateTimeFormatter.ISO_LOCAL_TIME);
        } catch (Exception e) {
            return LocalTime.of(17, 0);
        }
    }

    @Transactional
    @CacheEvict(
            value = {"tenant-status", "tenant-equipment", "tenant-requests", "tenant-dashboard", "tenant-activity"},
            allEntries = true
    )
    public TenantDto updateTenant(Long id, CreateTenantRequest request) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));
        String oldEmail = tenant.getEmail();
        if (request.getName() != null) tenant.setName(request.getName());
        if (request.getCode() != null && !request.getCode().equals(tenant.getCode())) {
            if (tenantRepository.existsByCode(request.getCode()))
                throw new IllegalArgumentException("Tenant with code " + request.getCode() + " already exists");
            tenant.setCode(request.getCode());
        }
        if (request.getStatus() != null) tenant.setStatus(request.getStatus());
        if (request.getEmail() != null) tenant.setEmail(request.getEmail());
        if (request.getPhone() != null) tenant.setPhone(request.getPhone());
        if (request.getLocation() != null) tenant.setLocation(request.getLocation());
        if (request.getWebsite() != null) tenant.setWebsite(request.getWebsite());
        if (request.getDescription() != null) tenant.setDescription(request.getDescription());
        tenant = tenantRepository.save(tenant);

        if ("INACTIVE".equalsIgnoreCase(tenant.getStatus())) {
            borrowRequestRepository.cancelPendingByTenantId(
                    tenant.getId(),
                    "College Deactivated",
                    Instant.now()
            );
        }

        // On email update: send confirmation to new address
        String newEmail = tenant.getEmail();
        if (newEmail != null && !newEmail.isBlank() && !newEmail.equals(oldEmail)) {
            emailService.sendCollegeEmailUpdateConfirmation(
                    newEmail, tenant.getName(), newEmail);
        }
        return toDto(tenant);
    }

    @Transactional
    public void deleteTenant(Long id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + id));

        // 1) Soft-cancel pending requests first (for audit clarity before hard deletion)
        borrowRequestRepository.cancelPendingByTenantId(
                tenant.getId(),
                "College Deactivated",
                Instant.now()
        );

        // 2) Remove dependent rows that keep strict FK references to tenant
        checkTransactionRepository.deleteByTenantId(tenant.getId());
        dismissedDashboardAlertRepository.deleteByTenantId(tenant.getId());
        activityLogRepository.deleteByTenantId(tenant.getId());

        // 3) Remove transactional/inventory data
        borrowRequestRepository.deleteByTenantId(tenant.getId());
        equipmentUnitRepository.deleteByTenantId(tenant.getId());
        equipmentRepository.deleteByTenantId(tenant.getId());

        // 4) Detach users/admins from deleted tenant
        userRepository.lockAndDetachByTenantId(tenant.getId());

        // 5) Finally delete tenant record
        tenantRepository.delete(tenant);
    }

    private TenantDto toDto(Tenant t) {
        int users = userRepository.findByTenantId(t.getId()).size();
        int admins = (int) userRepository.findByTenantId(t.getId()).stream()
                .filter(u -> UserRole.ADMIN.equals(u.getRole()) || UserRole.SUPER_ADMIN.equals(u.getRole()))
                .count();
        int equipment = equipmentUnitRepository.findByTenantId(t.getId()).size();
        return TenantDto.builder()
                .id(t.getId())
                .name(t.getName())
                .code(t.getCode())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .userCount(users)
                .equipmentCount(equipment)
                .adminCount(admins)
                .email(t.getEmail())
                .phone(t.getPhone())
                .location(t.getLocation())
                .website(t.getWebsite())
                .description(t.getDescription())
                .build();
    }
}
