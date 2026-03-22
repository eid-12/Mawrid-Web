package com.equipment.service;

import com.equipment.dto.*;
import com.equipment.entity.BorrowRequest;
import com.equipment.entity.CheckTransaction;
import com.equipment.entity.EquipmentUnit;
import com.equipment.entity.Tenant;
import com.equipment.exception.CollegeDeactivatedException;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.CheckTransactionRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.EquipmentUnitRepository;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CheckTransactionService {
    private static final String COLLEGE_INACTIVE_ACTION_MESSAGE =
            "Action disabled. Your college is currently deactivated.";

    private final CheckTransactionRepository checkTransactionRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final EquipmentUnitRepository equipmentUnitRepository;
    private final EquipmentRepository equipmentRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    @Transactional
    public CheckTransactionDto create(Long tenantId, CreateCheckTransactionRequest request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));
        ensureTenantIsActive(tenant);
        BorrowRequest borrowRequest = borrowRequestRepository.findById(request.getRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + request.getRequestId()));
        EquipmentUnit unit = equipmentUnitRepository.findById(request.getEquipmentUnitId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment unit not found: " + request.getEquipmentUnitId()));
        if (!borrowRequest.getTenant().getId().equals(tenantId) || !unit.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Request or unit does not belong to tenant");
        }
        if (!borrowRequest.getEquipment().getId().equals(unit.getEquipment().getId())) {
            throw new IllegalArgumentException("Selected unit does not belong to requested equipment");
        }
        String action = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        if ("CHECK_OUT".equals(action)) {
            if (!"APPROVED".equalsIgnoreCase(borrowRequest.getStatus())) {
                throw new IllegalArgumentException("Only APPROVED requests can be handed over");
            }
            if (!"AVAILABLE".equalsIgnoreCase(unit.getStatus())) {
                throw new IllegalArgumentException("Selected unit is not available");
            }
            String studentName = borrowRequest.getUser() != null ? borrowRequest.getUser().getName() : "Student";
            String equipmentName = borrowRequest.getEquipment() != null ? borrowRequest.getEquipment().getName() : "equipment";
            String serialNo = unit.getSerialNo() != null ? unit.getSerialNo() : ("UNIT-" + unit.getId());
            unit.setStatus("BORROWED");
            equipmentUnitRepository.save(unit);
            equipmentRepository.adjustAvailableQuantity(
                    tenantId,
                    unit.getEquipment().getId(),
                    -1
            );
            borrowRequest.setEquipmentUnit(unit);
            borrowRequest.setStatus("ON_LOAN");
            borrowRequestRepository.save(borrowRequest);
            activityLogService.log(
                    tenantId,
                    resolveAdminName(request.getAdminId()),
                    "ADMIN",
                    "CHECK_OUT",
                    "User " + studentName + " checked out " + equipmentName + " (Serial: " + serialNo + ")",
                    "approved"
            );
        } else if ("CHECK_IN".equals(action)) {
            String studentName = borrowRequest.getUser() != null ? borrowRequest.getUser().getName() : "Student";
            String equipmentName = borrowRequest.getEquipment() != null ? borrowRequest.getEquipment().getName() : "equipment";
            String serialNo = unit.getSerialNo() != null ? unit.getSerialNo() : ("UNIT-" + unit.getId());
            if (borrowRequest.getEquipmentUnit() != null && !borrowRequest.getEquipmentUnit().getId().equals(unit.getId())) {
                throw new IllegalArgumentException("Returned unit does not match the handed over unit");
            }
            String returnStatus = request.getReturnUnitStatus() != null ? request.getReturnUnitStatus().toUpperCase() : "AVAILABLE";
            if (!"AVAILABLE".equals(returnStatus) && !"MAINTENANCE".equals(returnStatus)) {
                throw new IllegalArgumentException("Return unit status must be AVAILABLE or MAINTENANCE");
            }
            if (!"AVAILABLE".equalsIgnoreCase(unit.getStatus()) || "MAINTENANCE".equals(returnStatus)) {
                unit.setStatus(returnStatus);
                equipmentUnitRepository.save(unit);
                if ("AVAILABLE".equals(returnStatus)) {
                    equipmentRepository.adjustAvailableQuantity(
                            tenantId,
                            unit.getEquipment().getId(),
                            1
                    );
                }
            }
            borrowRequest.setStatus("RETURNED");
            borrowRequestRepository.save(borrowRequest);
            activityLogService.log(
                    tenantId,
                    resolveAdminName(request.getAdminId()),
                    "ADMIN",
                    "RETURN",
                    "User " + studentName + " returned " + equipmentName + " (Serial: " + serialNo + ")",
                    "returned"
            );
        } else {
            throw new IllegalArgumentException("Unsupported action: " + request.getAction());
        }
        CheckTransaction tx = CheckTransaction.builder()
                .tenant(tenant)
                .request(borrowRequest)
                .equipmentUnit(unit)
                .action(action)
                .adminId(request.getAdminId())
                .actionAt(Instant.now())
                .notes(request.getNotes())
                .build();
        tx = checkTransactionRepository.save(tx);
        return toDto(tx);
    }

    public List<CheckTransactionDto> getByRequestId(Long requestId) {
        return checkTransactionRepository.findByRequestId(requestId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<CheckTransactionDto> getByTenantId(Long tenantId) {
        return checkTransactionRepository.findByTenantId(tenantId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public PendingCheckPageDto getPendingCheckouts(Long tenantId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        Page<BorrowRequest> approvedPage = borrowRequestRepository.findByTenantIdAndStatusAndEquipmentUnitIsNull(
                tenantId,
                "APPROVED",
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "startDate")))
        );
        List<PendingCheckItemDto> result = new ArrayList<>();
        for (BorrowRequest req : approvedPage.getContent()) {
            if (req.getEquipmentUnit() == null) {
                result.add(PendingCheckItemDto.builder()
                        .id(req.getId())
                        .requestId(req.getId())
                        .equipmentId(req.getEquipment().getId())
                        .equipmentUnitId(null)
                        .userName(req.getUser().getName())
                        .userEmail(req.getUser().getEmail())
                        .equipmentName(req.getEquipment().getName())
                        .serialNo(null)
                        .status("approved")
                        .startDate(req.getStartDate())
                        .endDate(req.getEndDate())
                        .build());
            }
        }
        return PendingCheckPageDto.builder()
                .items(result)
                .page(approvedPage.getNumber())
                .size(approvedPage.getSize())
                .totalItems(approvedPage.getTotalElements())
                .totalPages(approvedPage.getTotalPages())
                .build();
    }

    public PendingCheckPageDto getPendingReturns(Long tenantId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));
        List<PendingCheckItemDto> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        Page<BorrowRequest> onLoanPage = borrowRequestRepository.findByTenantIdAndStatusAndEquipmentUnitIsNotNull(
                tenantId,
                "ON_LOAN",
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "endDate").and(Sort.by(Sort.Direction.DESC, "updatedAt")))
        );
        for (BorrowRequest req : onLoanPage.getContent()) {
            if (req.getEquipmentUnit() == null) continue;
            long days = req.getEndDate() != null ? ChronoUnit.DAYS.between(today, req.getEndDate()) : 0;
            result.add(PendingCheckItemDto.builder()
                    .id(req.getId())
                    .requestId(req.getId())
                    .equipmentId(req.getEquipment().getId())
                    .equipmentUnitId(req.getEquipmentUnit().getId())
                    .userName(req.getUser().getName())
                    .equipmentName(req.getEquipment().getName())
                    .serialNo(req.getEquipmentUnit().getSerialNo())
                    .status("on_loan")
                    .endDate(req.getEndDate())
                    .daysLeft(days)
                    .build());
        }
        return PendingCheckPageDto.builder()
                .items(result)
                .page(onLoanPage.getNumber())
                .size(onLoanPage.getSize())
                .totalItems(onLoanPage.getTotalElements())
                .totalPages(onLoanPage.getTotalPages())
                .build();
    }

    public ScanResultDto scan(Long tenantId, String serialNo, Long adminId) {
        if (!isTenantActive(tenantId)) {
            throw new CollegeDeactivatedException(COLLEGE_INACTIVE_ACTION_MESSAGE);
        }
        String trimmed = serialNo != null ? serialNo.trim() : "";
        if (trimmed.isEmpty()) throw new IllegalArgumentException("Serial number is required");
        Optional<EquipmentUnit> maybeUnit = equipmentUnitRepository.findByTenantIdAndSerialNoIgnoreCase(tenantId, trimmed);
        if (maybeUnit.isEmpty()) {
            return scanByUserOrEquipmentName(tenantId, trimmed);
        }
        EquipmentUnit unit = maybeUnit.get();

        Optional<CheckTransaction> latestUnitTransaction = checkTransactionRepository.findByTenantId(tenantId).stream()
                .filter(t -> t.getEquipmentUnit() != null && unit.getId().equals(t.getEquipmentUnit().getId()))
                .max(Comparator
                        .comparing(CheckTransaction::getActionAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(CheckTransaction::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        // If latest action for this serial is CHECK_OUT, it is currently on loan and ready for CHECK_IN.
        if (latestUnitTransaction.isPresent() && "CHECK_OUT".equalsIgnoreCase(latestUnitTransaction.get().getAction())) {
            BorrowRequest req = latestUnitTransaction.get().getRequest();
            long days = req.getEndDate() != null ? ChronoUnit.DAYS.between(LocalDate.now(), req.getEndDate()) : 0;
            return ScanResultDto.builder()
                    .action("CHECK_IN")
                    .requestId(req.getId())
                    .equipmentUnitId(unit.getId())
                    .equipmentName(unit.getEquipment().getName())
                    .serialNo(unit.getSerialNo())
                    .userName(req.getUser().getName())
                    .endDate(req.getEndDate())
                    .daysLeft(days)
                    .build();
        }

        List<BorrowRequest> approved = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "APPROVED").stream()
                .filter(r -> r.getEquipment().getId().equals(unit.getEquipment().getId()))
                .filter(r -> r.getEquipmentUnit() == null)
                .collect(Collectors.toList());
        for (BorrowRequest req : approved) {
            if ("AVAILABLE".equalsIgnoreCase(unit.getStatus())) {
                return ScanResultDto.builder()
                        .action("CHECK_OUT")
                        .requestId(req.getId())
                        .equipmentUnitId(unit.getId())
                        .equipmentName(unit.getEquipment().getName())
                        .serialNo(unit.getSerialNo())
                        .userName(req.getUser().getName())
                        .startDate(req.getStartDate())
                        .endDate(req.getEndDate())
                        .build();
            }
        }
        throw new IllegalArgumentException("No pending checkout or return found for this item.");
    }

    private ScanResultDto scanByUserOrEquipmentName(Long tenantId, String query) {
        String q = query.toLowerCase();

        List<BorrowRequest> pendingReturns = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "ON_LOAN").stream()
                .filter(r -> r.getEquipmentUnit() != null)
                .filter(r -> matchesTextQuery(r, q))
                .sorted(Comparator
                        .comparing(BorrowRequest::getEndDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(BorrowRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        if (!pendingReturns.isEmpty()) {
            BorrowRequest req = pendingReturns.get(0);
            EquipmentUnit unit = req.getEquipmentUnit();
            long days = req.getEndDate() != null ? ChronoUnit.DAYS.between(LocalDate.now(), req.getEndDate()) : 0;
            return ScanResultDto.builder()
                    .action("CHECK_IN")
                    .requestId(req.getId())
                    .equipmentUnitId(unit.getId())
                    .equipmentName(req.getEquipment().getName())
                    .serialNo(unit.getSerialNo())
                    .userName(req.getUser().getName())
                    .endDate(req.getEndDate())
                    .daysLeft(days)
                    .build();
        }

        List<BorrowRequest> pendingCheckouts = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "APPROVED").stream()
                .filter(r -> r.getEquipmentUnit() == null)
                .filter(r -> matchesTextQuery(r, q))
                .sorted(Comparator.comparing(BorrowRequest::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        if (!pendingCheckouts.isEmpty()) {
            BorrowRequest req = pendingCheckouts.get(0);
            EquipmentUnit availableUnit = equipmentUnitRepository
                    .findByEquipmentIdAndStatus(req.getEquipment().getId(), "AVAILABLE")
                    .stream()
                    .filter(u -> u.getTenant() != null && tenantId.equals(u.getTenant().getId()))
                    .sorted(Comparator.comparing(EquipmentUnit::getSerialNo, Comparator.nullsLast(String::compareToIgnoreCase)))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("No pending checkout or return found for this item."));
            return ScanResultDto.builder()
                    .action("CHECK_OUT")
                    .requestId(req.getId())
                    .equipmentUnitId(availableUnit.getId())
                    .equipmentName(req.getEquipment().getName())
                    .serialNo(availableUnit.getSerialNo())
                    .userName(req.getUser().getName())
                    .startDate(req.getStartDate())
                    .endDate(req.getEndDate())
                    .build();
        }

        throw new IllegalArgumentException("No pending checkout or return found for this item.");
    }

    private boolean matchesTextQuery(BorrowRequest request, String queryLowerCase) {
        if (request == null || queryLowerCase == null || queryLowerCase.isBlank()) return false;
        String userName = request.getUser() != null && request.getUser().getName() != null
                ? request.getUser().getName().toLowerCase()
                : "";
        String equipmentName = request.getEquipment() != null && request.getEquipment().getName() != null
                ? request.getEquipment().getName().toLowerCase()
                : "";
        return userName.contains(queryLowerCase) || equipmentName.contains(queryLowerCase);
    }

    private CheckTransactionDto toDto(CheckTransaction t) {
        return CheckTransactionDto.builder()
                .id(t.getId())
                .tenantId(t.getTenant().getId())
                .requestId(t.getRequest().getId())
                .equipmentUnitId(t.getEquipmentUnit().getId())
                .action(t.getAction())
                .adminId(t.getAdminId())
                .actionAt(t.getActionAt())
                .notes(t.getNotes())
                .build();
    }

    private String resolveAdminName(Long adminId) {
        if (adminId == null) return "Admin";
        return userRepository.findById(adminId).map(u -> u.getName() != null ? u.getName() : "Admin").orElse("Admin");
    }

    public List<EquipmentUnitDto> getAvailableUnitsForRequest(Long tenantId, Long requestId) {
        BorrowRequest req = borrowRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Borrow request not found: " + requestId));
        if (!req.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Borrow request does not belong to tenant");
        }
        if (!"APPROVED".equalsIgnoreCase(req.getStatus())) {
            return List.of();
        }
        return equipmentUnitRepository.findByEquipmentIdAndStatus(req.getEquipment().getId(), "AVAILABLE").stream()
                .map(u -> EquipmentUnitDto.builder()
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
                        .build())
                .collect(Collectors.toList());
    }

    private void ensureTenantIsActive(Tenant tenant) {
        if (tenant == null || !"ACTIVE".equalsIgnoreCase(tenant.getStatus())) {
            throw new CollegeDeactivatedException(COLLEGE_INACTIVE_ACTION_MESSAGE);
        }
    }

    private boolean isTenantActive(Long tenantId) {
        if (tenantId == null) return false;
        return tenantRepository.findById(tenantId)
                .map(t -> "ACTIVE".equalsIgnoreCase(t.getStatus()))
                .orElse(false);
    }
}
