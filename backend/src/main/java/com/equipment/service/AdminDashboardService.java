package com.equipment.service;

import com.equipment.entity.ActivityLog;
import com.equipment.entity.BorrowRequest;
import com.equipment.entity.DismissedDashboardAlert;
import com.equipment.entity.Equipment;
import com.equipment.entity.EquipmentUnit;
import com.equipment.repository.ActivityLogRepository;
import com.equipment.repository.BorrowRequestRepository;
import com.equipment.repository.DismissedDashboardAlertRepository;
import com.equipment.repository.EquipmentRepository;
import com.equipment.repository.EquipmentUnitRepository;
import com.equipment.repository.TenantRepository;
import com.equipment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final EquipmentRepository equipmentRepository;
    private final EquipmentUnitRepository equipmentUnitRepository;
    private final BorrowRequestRepository borrowRequestRepository;
    private final ActivityLogRepository activityLogRepository;
    private final DismissedDashboardAlertRepository dismissedDashboardAlertRepository;
    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public AdminDashboardStats getStats(Long tenantId) {
        int totalEquipment = (int) equipmentUnitRepository.findByTenantId(tenantId).stream().count();
        int activeUsers = (int) userRepository.findByTenantId(tenantId).stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .count();
        List<BorrowRequest> pending = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "PENDING");
        List<BorrowRequest> approved = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "APPROVED");
        int itemsInUse = (int) equipmentUnitRepository.findByTenantIdAndStatus(tenantId, "BORROWED").stream().count();
        if (itemsInUse == 0 && !approved.isEmpty()) {
            itemsInUse = approved.size();
        }
        int availableCount = (int) equipmentUnitRepository.findByTenantIdAndStatus(tenantId, "AVAILABLE").stream().count();
        int maintenanceCount = (int) equipmentUnitRepository.findByTenantIdAndStatus(tenantId, "MAINTENANCE").stream().count();

        ZoneId zone = ZoneId.systemDefault();
        LocalDate monthStartDate = LocalDate.now(zone).withDayOfMonth(1);
        Instant monthStart = monthStartDate.atStartOfDay(zone).toInstant();
        Instant nextMonthStart = monthStartDate.plusMonths(1).atStartOfDay(zone).toInstant();

        Map<String, Long> statusCounts = new HashMap<>();
        for (Object[] row : borrowRequestRepository.countDecidedStatusesInPeriod(tenantId, monthStart, nextMonthStart)) {
            if (row == null || row.length < 2) continue;
            String status = row[0] != null ? row[0].toString().toUpperCase() : "";
            long count = row[1] instanceof Number n ? n.longValue() : 0L;
            statusCounts.put(status, count);
        }
        long approvedDecisions = statusCounts.getOrDefault("APPROVED", 0L)
                + statusCounts.getOrDefault("ON_LOAN", 0L)
                + statusCounts.getOrDefault("RETURNED", 0L);
        long rejectedDecisions = statusCounts.getOrDefault("REJECTED", 0L);
        long totalDecided = approvedDecisions + rejectedDecisions;
        int approvalRate = totalDecided > 0
                ? (int) Math.round((approvedDecisions * 100.0) / totalDecided)
                : 0;

        double avgDays = 0;
        List<BorrowRequest> allReqs = borrowRequestRepository.findByTenantId(tenantId);
        if (!allReqs.isEmpty()) {
            avgDays = allReqs.stream()
                    .filter(r -> r.getStartDate() != null && r.getEndDate() != null)
                    .mapToLong(r -> ChronoUnit.DAYS.between(r.getStartDate(), r.getEndDate()))
                    .average()
                    .orElse(0);
        }

        int utilization = (totalEquipment > 0)
                ? (int) Math.min(100, Math.round(100.0 * itemsInUse / totalEquipment))
                : 0;

        return AdminDashboardStats.builder()
                .totalEquipment(totalEquipment)
                .activeUsers(activeUsers)
                .pendingRequests(pending.size())
                .itemsInUse(itemsInUse)
                .availableCount(availableCount)
                .maintenanceCount(maintenanceCount)
                .approvalRatePercent(approvalRate)
                .avgBorrowDurationDays(Math.round(avgDays * 10) / 10.0)
                .equipmentUtilizationPercent(utilization)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AdminRecentActivityItem> getRecentActivity(Long tenantId, int limit) {
        // Dashboard shows the latest 5 activities only.
        List<ActivityLog> logs = activityLogRepository.findTop5ByTenantIdOrderByCreatedAtDesc(tenantId);
        return logs.stream()
                .map(l -> new AdminRecentActivityItem(
                        l.getId(),
                        l.getActorName() != null ? l.getActorName() : "System",
                        toHumanReadableMessage(l.getMessage()),
                        l.getStatus() != null ? l.getStatus() : "info",
                        formatTimeAgo(l.getCreatedAt())
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminAlertResponse getAlerts(Long tenantId) {
        List<AlertCandidate> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();

        List<BorrowRequest> approved = borrowRequestRepository.findByTenantIdAndStatus(tenantId, "APPROVED");
        long overdue = approved.stream()
                .filter(r -> r.getEndDate() != null && r.getEndDate().isBefore(today))
                .count();
        if (overdue > 0) {
            String key = "overdue:" + overdue;
            alerts.add(new AlertCandidate(
                    key,
                    "overdue",
                    (int) overdue + " items are overdue for return",
                    "high",
                    Instant.now()
            ));
        }

        List<Equipment> equipment = equipmentRepository.findByTenantId(tenantId);
        for (Equipment e : equipment) {
            List<EquipmentUnit> units = equipmentUnitRepository.findByEquipmentId(e.getId());
            int totalQty = units.size();
            if (totalQty <= 0) continue;
            int availableQty = (int) units.stream().filter(u -> "AVAILABLE".equalsIgnoreCase(u.getStatus())).count();
            String equipmentName = getEquipmentDisplayName(e);
            Instant createdAt = e.getUpdatedAt() != null ? e.getUpdatedAt() : (e.getCreatedAt() != null ? e.getCreatedAt() : Instant.now());
            if (availableQty == 0) {
                String key = "stock:critical:" + e.getId() + ":" + availableQty + ":" + createdAt.getEpochSecond();
                alerts.add(new AlertCandidate(
                        key,
                        "critical-stock",
                        "Out of Stock: " + equipmentName + " is no longer available!",
                        "high",
                        createdAt
                ));
            } else if (availableQty == 1) {
                String key = "stock:low:" + e.getId() + ":" + availableQty + ":" + createdAt.getEpochSecond();
                alerts.add(new AlertCandidate(
                        key,
                        "low-stock",
                        "Critical: Only 1 unit of " + equipmentName + " remaining!",
                        "medium",
                        createdAt
                ));
            }
        }

        Set<String> dismissed = new HashSet<>(
                dismissedDashboardAlertRepository.findByTenantId(tenantId).stream()
                        .map(DismissedDashboardAlert::getAlertKey)
                        .collect(Collectors.toSet())
        );

        List<AlertCandidate> active = alerts.stream()
                .filter(a -> !dismissed.contains(a.key()))
                .sorted(
                        Comparator.comparingInt((AlertCandidate a) -> severityRank(a.priority())).reversed()
                                .thenComparing(AlertCandidate::createdAt, Comparator.reverseOrder())
                )
                .collect(Collectors.toList());

        int totalCount = active.size();
        List<AdminAlertItem> visible = active.stream()
                .limit(5)
                .map(a -> new AdminAlertItem(a.key(), a.type(), a.message(), a.priority()))
                .collect(Collectors.toList());
        return new AdminAlertResponse(totalCount, visible);
    }

    @Transactional
    public void dismissAlert(Long tenantId, String alertKey) {
        if (alertKey == null || alertKey.isBlank()) return;
        if (dismissedDashboardAlertRepository.existsByTenantIdAndAlertKey(tenantId, alertKey)) return;
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found: " + tenantId));
        dismissedDashboardAlertRepository.save(
                DismissedDashboardAlert.builder()
                        .tenant(tenant)
                        .alertKey(alertKey)
                        .dismissedAt(Instant.now())
                        .build()
        );
    }

    private static int severityRank(String priority) {
        if ("high".equalsIgnoreCase(priority)) return 3;
        if ("medium".equalsIgnoreCase(priority)) return 2;
        return 1;
    }

    private static String toHumanReadableMessage(String message) {
        if (message == null || message.isBlank()) return "Activity updated.";
        String trimmed = message.trim().replaceFirst("(?i)^Student\\s+", "User ");
        if (!trimmed.contains(" moved to ")) return trimmed;
        // Legacy format: "<equipment> moved to <STATUS> by Admin <name>"
        String[] parts = trimmed.split(" moved to ", 2);
        if (parts.length < 2) return trimmed;
        String equipment = parts[0].trim();
        String rest = parts[1].trim();
        String status = rest;
        String adminSuffix = "";
        int idx = rest.indexOf(" by Admin ");
        if (idx >= 0) {
            status = rest.substring(0, idx).trim();
            adminSuffix = rest.substring(idx).trim();
        }
        return equipment + " was marked as " + status + (adminSuffix.isEmpty() ? "" : " " + adminSuffix) + ".";
    }

    private static String getEquipmentDisplayName(Equipment equipment) {
        if (equipment == null) return "equipment";
        String name = equipment.getName();
        if (name != null && !name.trim().isBlank()) {
            return name.trim();
        }
        return "Equipment #" + equipment.getId();
    }

    private static String formatTimeAgo(Instant instant) {
        long sec = java.time.Duration.between(instant, Instant.now()).getSeconds();
        if (sec < 60) return "Just now";
        if (sec < 3600) return (sec / 60) + " minutes ago";
        if (sec < 86400) return (sec / 3600) + " hours ago";
        if (sec < 604800) return (sec / 86400) + " days ago";
        return (sec / 604800) + " weeks ago";
    }

    @lombok.Data
    @lombok.Builder
    public static class AdminDashboardStats {
        private int totalEquipment;
        private int activeUsers;
        private int pendingRequests;
        private int itemsInUse;
        private int availableCount;
        private int maintenanceCount;
        private int approvalRatePercent;
        private double avgBorrowDurationDays;
        private int equipmentUtilizationPercent;
    }

    public record AdminRecentActivityItem(long id, String actorName, String message, String status, String time) {}

    public record AdminAlertItem(String key, String type, String message, String priority) {}
    public record AdminAlertResponse(int totalCount, List<AdminAlertItem> alerts) {}
    private record AlertCandidate(String key, String type, String message, String priority, Instant createdAt) {}
}
