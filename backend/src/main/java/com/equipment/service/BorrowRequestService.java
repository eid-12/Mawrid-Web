package com.equipment.service;

import com.equipment.dto.BorrowRequestDto;
import com.equipment.dto.BorrowRequestPageDto;
import com.equipment.dto.CreateBorrowRequestDto;
import com.equipment.dto.DecisionRequestDto;
import com.equipment.entity.BorrowRequest;
import com.equipment.entity.Equipment;
import com.equipment.entity.Tenant;
import com.equipment.entity.TenantSettings;
import com.equipment.entity.User;
import com.equipment.exception.CollegeDeactivatedException;
import com.equipment.exception.CollegeRemovedException;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BorrowRequestService {
    private static final String COLLEGE_INACTIVE_ACTION_MESSAGE =
            "Action disabled. Your college is currently deactivated.";
    private static final String COLLEGE_REMOVED_MESSAGE =
            "Access Denied: Your college has been permanently removed from the system.";
    private static final int MAX_ACTIVE_ITEMS_PER_USER = 3;
    private static final List<String> DUPLICATE_BLOCKING_STATUSES = List.of("PENDING", "APPROVED", "BORROWED", "ON_LOAN");
    private static final List<String> ACTIVE_ITEM_LIMIT_STATUSES = List.of("APPROVED", "BORROWED", "ON_LOAN");
    private static final List<String> OVERDUE_BLOCKING_STATUSES = List.of("BORROWED", "ON_LOAN");

    private final BorrowRequestRepository borrowRequestRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;
    private final ActivityLogService activityLogService;

    @Transactional
    public BorrowRequestDto createRequest(Long tenantId, CreateBorrowRequestDto dto) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + dto.getUserId()));
        ensureUserHasActiveCollege(user);
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + dto.getEquipmentId()));
        ensureTenantIsActive(tenant);
        if (equipment.getAvailableQuantity() < 1) {
            throw new IllegalArgumentException("No available units for this equipment");
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Please verify your email before requesting equipment");
        }
        enforceBorrowingConstraints(user.getId(), equipment.getId());
        validateEquipmentAvailability(equipment, dto.getStartDate(), dto.getEndDate());
        TenantSettings settings = equipment.getTenant() != null ? equipment.getTenant().getTenantSettings() : null;
        validateBorrowDurationRules(equipment, settings, dto.getStartDate(), dto.getEndDate());
        BorrowRequest req = BorrowRequest.builder()
                .tenant(tenant)
                .user(user)
                .equipment(equipment)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(isApprovalRequired(settings) ? "PENDING" : "APPROVED")
                .requestNote(dto.getRequestNote())
                .decidedAt(isApprovalRequired(settings) ? null : Instant.now())
                .decisionReason(isApprovalRequired(settings) ? null : "Auto-approved by tenant settings")
                .build();
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        req = borrowRequestRepository.save(req);
        activityLogService.log(
                tenant.getId(),
                user.getName(),
                user.getRole() != null ? user.getRole().name() : "USER",
                "BORROW_REQUEST_CREATED",
                "User " + user.getName() + " requested " + equipment.getName(),
                req.getStatus() != null ? req.getStatus().toLowerCase() : "pending"
        );
        return toDto(req);
    }

    /**
     * User creates a borrow request for equipment. Tenant is derived from the equipment.
     */
    @Transactional
    public BorrowRequestDto createRequestByUser(Long userId, com.equipment.dto.UserCreateBorrowRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        ensureUserHasActiveCollege(user);
        Equipment equipment = equipmentRepository.findById(dto.getEquipmentId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment not found: " + dto.getEquipmentId()));
        Tenant tenant = equipment.getTenant();
        ensureTenantIsActive(tenant);
        if (equipment.getAvailableQuantity() < 1) {
            throw new IllegalArgumentException("No available units for this equipment");
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new IllegalArgumentException("Please verify your email before requesting equipment");
        }
        enforceBorrowingConstraints(user.getId(), equipment.getId());
        validateEquipmentAvailability(equipment, dto.getStartDate(), dto.getEndDate());
        TenantSettings settings = tenant != null ? tenant.getTenantSettings() : null;
        validateBorrowDurationRules(equipment, settings, dto.getStartDate(), dto.getEndDate());
        BorrowRequest req = BorrowRequest.builder()
                .tenant(tenant)
                .user(user)
                .equipment(equipment)
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(isApprovalRequired(settings) ? "PENDING" : "APPROVED")
                .requestNote(dto.getRequestNote())
                .decidedAt(isApprovalRequired(settings) ? null : Instant.now())
                .decisionReason(isApprovalRequired(settings) ? null : "Auto-approved by tenant settings")
                .build();
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        req = borrowRequestRepository.save(req);
        activityLogService.log(
                tenant.getId(),
                user.getName(),
                user.getRole() != null ? user.getRole().name() : "USER",
                "BORROW_REQUEST_CREATED",
                "User " + user.getName() + " requested " + equipment.getName(),
                req.getStatus() != null ? req.getStatus().toLowerCase() : "pending"
        );
        return toDto(req);
    }

    public List<BorrowRequestDto> getByTenant(Long tenantId) {
        return borrowRequestRepository.findByTenantId(tenantId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public BorrowRequestPageDto searchByTenant(Long tenantId, String search, List<String> statuses, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        String normalizedSearch = (search == null || search.trim().isBlank()) ? null : search.trim();
        List<String> normalizedStatuses = normalizeStatuses(statuses);
        boolean applyStatuses = !normalizedStatuses.isEmpty();
        // JPA "IN (:statuses)" cannot be empty. Keep one harmless token when filtering is disabled.
        List<String> queryStatuses = applyStatuses ? normalizedStatuses : List.of("__NO_FILTER__");

        Page<BorrowRequest> resultPage = borrowRequestRepository.searchByTenantWithFilters(
                tenantId,
                normalizedSearch,
                applyStatuses,
                queryStatuses,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        return BorrowRequestPageDto.builder()
                .items(resultPage.getContent().stream().map(this::toDto).collect(Collectors.toList()))
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .totalItems(resultPage.getTotalElements())
                .totalPages(resultPage.getTotalPages())
                .build();
    }

    public List<BorrowRequestDto> getByUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        if (isCollegeRemovedAccount(user)) {
            return List.of();
        }
        return borrowRequestRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public BorrowRequestDto getById(Long id) {
        BorrowRequest req = borrowRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + id));
        return toDto(req);
    }

    @Transactional
    public BorrowRequestDto approve(Long requestId, DecisionRequestDto dto) {
        BorrowRequest req = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + requestId));
        ensureTenantIsActive(req.getTenant());
        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Request is not pending");
        }
        req.setStatus("APPROVED");
        req.setDecisionReason(dto.getDecisionReason());
        req.setDecidedByAdminId(dto.getDecidedByAdminId());
        req.setDecidedAt(Instant.now());
        req.setEquipmentUnit(null);
        borrowRequestRepository.save(req);
        return toDto(req);
    }

    @Transactional
    public BorrowRequestDto cancel(Long requestId, Long userId) {
        BorrowRequest req = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + requestId));
        ensureTenantIsActive(req.getTenant());
        if (!req.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Forbidden");
        }
        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Only pending requests can be cancelled");
        }
        req.setStatus("CANCELLED");
        borrowRequestRepository.save(req);
        return toDto(req);
    }

    @Transactional
    public BorrowRequestDto reject(Long requestId, DecisionRequestDto dto) {
        BorrowRequest req = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + requestId));
        ensureTenantIsActive(req.getTenant());
        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Request is not pending");
        }
        req.setStatus("REJECTED");
        req.setDecisionReason(dto.getDecisionReason());
        req.setDecidedByAdminId(dto.getDecidedByAdminId());
        req.setDecidedAt(Instant.now());
        borrowRequestRepository.save(req);
        return toDto(req);
    }

    private void validateEquipmentAvailability(Equipment equipment, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("End date must be the same as or after start date");
        }
        LocalDate from = equipment.getAvailableFrom();
        LocalDate to = equipment.getAvailableTo();
        if (from != null && startDate != null && startDate.isBefore(from)) {
            throw new IllegalArgumentException("Equipment is not available until " + from + ". Please select a start date on or after this date.");
        }
        if (to != null && endDate != null && endDate.isAfter(to)) {
            throw new IllegalArgumentException("Equipment is not available after " + to + ". Please select an end date on or before this date.");
        }
    }

    private void validateBorrowDurationRules(Equipment equipment, TenantSettings settings, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) return;
        Integer itemMax = equipment != null ? equipment.getMaxBorrowDays() : null;
        Integer tenantMax = settings != null ? settings.getMaxBorrowDays() : null;
        int effectiveMax = (itemMax != null && itemMax > 0)
                ? itemMax
                : (tenantMax != null && tenantMax > 0 ? tenantMax : 0);
        if (effectiveMax <= 0) return;
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (days > effectiveMax) {
            throw new IllegalArgumentException("Maximum borrow period for this item is " + effectiveMax + " days.");
        }
    }

    private boolean isApprovalRequired(TenantSettings settings) {
        return settings == null || settings.getApprovalRequired() == null || settings.getApprovalRequired();
    }

    private void ensureTenantIsActive(Tenant tenant) {
        if (tenant == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
            throw new CollegeDeactivatedException(COLLEGE_INACTIVE_ACTION_MESSAGE);
        }
    }

    private void ensureUserHasActiveCollege(User user) {
        if (isCollegeRemovedAccount(user)) {
            throw new CollegeRemovedException(COLLEGE_REMOVED_MESSAGE);
        }
        if (user == null || user.getTenant() == null) {
            throw new IllegalArgumentException(
                    "Action Required: Please select an active college in Settings to start borrowing equipment."
            );
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getTenant().getStatus())) {
            throw new CollegeDeactivatedException(COLLEGE_INACTIVE_ACTION_MESSAGE);
        }
    }

    private boolean isCollegeRemovedAccount(User user) {
        if (user == null) return false;
        boolean detachedFromCollege = user.getTenant() == null;
        boolean inactive = !Boolean.TRUE.equals(user.getIsActive());
        return detachedFromCollege && inactive;
    }

    private void enforceBorrowingConstraints(Long userId, Long equipmentId) {
        if (userId == null || equipmentId == null) return;

        boolean hasDuplicateActiveRequest = borrowRequestRepository.existsByUserIdAndEquipmentIdAndStatusIn(
                userId,
                equipmentId,
                DUPLICATE_BLOCKING_STATUSES
        );
        if (hasDuplicateActiveRequest) {
            throw new IllegalArgumentException("You already have an active request or possession of this item.");
        }

        long activeItemsCount = borrowRequestRepository.countByUserIdAndStatusIn(
                userId,
                ACTIVE_ITEM_LIMIT_STATUSES
        );
        if (activeItemsCount >= MAX_ACTIVE_ITEMS_PER_USER) {
            throw new IllegalArgumentException(
                    "You have reached the maximum limit of borrowed items (" + MAX_ACTIVE_ITEMS_PER_USER + " items)."
            );
        }

        boolean hasOverdueItem = borrowRequestRepository.existsByUserIdAndStatusInAndEndDateBefore(
                userId,
                OVERDUE_BLOCKING_STATUSES,
                LocalDate.now()
        );
        if (hasOverdueItem) {
            throw new IllegalArgumentException("Please return your overdue items before making new requests.");
        }
    }

    private List<String> normalizeStatuses(List<String> statuses) {
        if (statuses == null || statuses.isEmpty()) return List.of();
        Set<String> allowed = Set.of("PENDING", "APPROVED", "REJECTED", "RETURNED", "ON_LOAN", "CANCELLED");
        return statuses.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.trim().toUpperCase())
                .filter(allowed::contains)
                .distinct()
                .collect(Collectors.toList());
    }

    private BorrowRequestDto toDto(BorrowRequest r) {
        return BorrowRequestDto.builder()
                .id(r.getId())
                .tenantId(r.getTenant().getId())
                .userId(r.getUser().getId())
                .equipmentId(r.getEquipment().getId())
                .equipmentUnitId(r.getEquipmentUnit() != null ? r.getEquipmentUnit().getId() : null)
                .equipmentUnitSerialNo(r.getEquipmentUnit() != null ? r.getEquipmentUnit().getSerialNo() : null)
                .startDate(r.getStartDate())
                .endDate(r.getEndDate())
                .status(r.getStatus())
                .requestNote(r.getRequestNote())
                .decisionReason(r.getDecisionReason())
                .decidedByAdminId(r.getDecidedByAdminId())
                .decidedAt(r.getDecidedAt())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .userName(r.getUser().getName())
                .userEmail(r.getUser().getEmail())
                .equipmentName(r.getEquipment().getName())
                .equipmentCategory(r.getEquipment().getCategory())
                .build();
    }
}
